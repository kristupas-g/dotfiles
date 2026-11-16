// The line chart: one stroked path per series through `window.paint_path`,
// in percent coordinates so the element scales them and no pixel size is
// needed before the first draw. The grid, axis labels, crosshair, tooltip and
// legend are ordinary elements. The crosshair's time is the view's, shared by
// every panel, so hovering one chart marks the same moment on all of them.
//
// Found while probing (keep): the global `window` owns `paint_path`; don't
// import `window` from "herdr", that shadows it. `PathBuilder.dash_array` is
// in the typings but not in the app. gpui-base's `h_flex` centres its
// children, so the plot box needs `h_full()` or it collapses to its border.

import { div, PathBuilder } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { fmt, clock, thin } from "./thanos.js";

export const PALETTE = (t) => [t.ansi4, t.ansi2, t.ansi3, t.ansi5, t.ansi6, t.ansi1, t.ansi12, t.ansi10, t.ansi11, t.ansi13, t.ansi14, t.ansi9];
export const MAX_DRAWN = 30;
const TIP_ROWS = 12;

/** The nearest sample to `ts` in `points` (sorted by time), or null. */
export function nearest(points, ts) {
  if (!points.length) return null;
  let lo = 0, hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid][0] < ts) lo = mid + 1;
    else hi = mid;
  }
  const a = points[lo], b = points[lo - 1];
  return b && Math.abs(b[0] - ts) < Math.abs(a[0] - ts) ? b : a;
}

/** `lo`/`hi` of the axis for the series (each as a share of its own max when `norm`). */
export function axis(list, norm) {
  let lo = Infinity, hi = -Infinity;
  for (const s of list) {
    const max = norm ? s.max || 1 : 1;
    for (const [, v] of s.points) {
      const y = v / max;
      if (y < lo) lo = y;
      if (y > hi) hi = y;
    }
  }
  if (!Number.isFinite(lo)) return { lo: 0, hi: 1 };
  if (lo > 0) lo = 0;
  if (hi < 0) hi = 0;
  if (hi === lo) hi = lo + 1;
  const pad = (hi - lo) * 0.05;
  return { lo: lo < 0 ? lo - pad : lo, hi: hi + pad };
}

/**
 * The chart element. `series`: [{ name, points, color, max }] (already thinned
 * and without the hidden ones); `start`/`end` seconds; `step` seconds (a gap
 * wider than two steps breaks the line); `hoverT` the shared crosshair time or
 * null; `norm` draws each series as a share of its own max; `height` px.
 * `onHover(ts, bounds)` and `onLeave()` come from the plot's mouse events.
 */
export function chart(t, { id, series, start, end, step, hoverT, norm, height, width, onHover, onLeave }) {
  const { lo, hi } = axis(series, norm);
  const span = end - start || 1;
  const X = (ts) => `${Math.max(0, Math.min(100, ((ts - start) / span) * 100))}%`;
  const Y = (v) => `${(1 - (v - lo) / (hi - lo)) * 100}%`;
  const N = 4;
  const yLabels = Array.from({ length: N + 1 }, (_, i) => {
    const v = hi - (i / N) * (hi - lo);
    return norm ? `${(v * 100).toFixed(0)}%` : fmt(v);
  });
  const ticks = Math.max(2, Math.min(8, Math.floor((width || 600) / 110)));
  const withDate = span > 86400;
  const xLabels = Array.from({ length: ticks + 1 }, (_, i) => clock(start + (i / ticks) * span, withDate));

  const grid = [];
  for (let i = 0; i <= N; i++) {
    const y = `${(i / N) * 100}%`;
    grid.push(window.paint_path(PathBuilder.stroke(1).move_to("0%", y).line_to("100%", y).build(), t.border).absolute().top(0).left(0).size_full());
  }
  if (lo < 0 && hi > 0) grid.push(window.paint_path(PathBuilder.stroke(1).move_to("0%", Y(0)).line_to("100%", Y(0)).build(), t.dim).absolute().top(0).left(0).size_full());

  const lines = series.map((s) => {
    const max = norm ? s.max || 1 : 1;
    let b = PathBuilder.stroke(1.5);
    let prev = null;
    for (const [ts, v] of s.points) {
      const x = X(ts), y = Y(v / max);
      b = prev === null || ts - prev > step * 2.5 ? b.move_to(x, y) : b.line_to(x, y);
      prev = ts;
    }
    return window.paint_path(b.build(), s.color).absolute().top(0).left(0).size_full();
  });

  let cross = null;
  if (hoverT !== null && hoverT >= start && hoverT <= end) {
    const frac = (hoverT - start) / span;
    const rows = series.map((s) => ({ s, p: nearest(s.points, hoverT) })).filter((r) => r.p && Math.abs(r.p[0] - hoverT) <= step * 2.5);
    rows.sort((a, b) => b.p[1] - a.p[1]);
    const shown = rows.slice(0, TIP_ROWS);
    const right = frac > 0.55;
    const tip = v_flex()
      .absolute()
      .top(6)
      .when(!right, (el) => el.left(`${frac * 100}%`).ml(10))
      .when(right, (el) => el.right(`${(1 - frac) * 100}%`).mr(10))
      .p(7)
      .gap(3)
      .rounded(6)
      .bg(t.popover)
      .border_1()
      .border_color(t.border)
      .text_size(11)
      .whitespace_nowrap()
      .child(div().text_color(t.muted).child(clock(shown[0]?.p[0] ?? hoverT, true)))
      .children(shown.map(({ s, p }) => h_flex().gap(6).items_center()
        .child(div().w(8).h(8).rounded(4).flex_none().bg(s.color))
        .child(div().max_w(420).truncate().text_color(t.foreground).child(s.name))
        .child(div().flex_1())
        .child(div().text_color(t.foreground).font_medium().child(norm ? `${fmt(p[1])} (${((p[1] / (s.max || 1)) * 100).toFixed(0)}%)` : fmt(p[1])))))
      .when(rows.length > shown.length, (el) => el.child(div().text_color(t.dim).child(`${rows.length - shown.length} more`)));
    cross = [
      div().absolute().top(0).left(`${frac * 100}%`).w(1).h_full().bg(t.muted),
      ...(shown.length ? [tip] : []),
    ];
  }

  return v_flex()
    .flex_none()
    .gap(4)
    .child(
      h_flex()
        .h(height)
        .gap(6)
        .child(v_flex().w(48).h_full().flex_none().justify_between().text_size(10.5).text_color(t.muted).children(yLabels.map((l, i) => div().w_full().text_right().child(l))))
        .child(
          div()
            .id(`${id}-plot`)
            .relative()
            .flex_1()
            .h_full()
            .min_w(0)
            .border_l(1)
            .border_b(1)
            .border_color(t.border)
            .on_mouse_move((e, cx) => onHover(start + (e.local_position.x / Math.max(1, e.bounds.width)) * span, e.bounds, cx))
            .on_hover((h, cx) => { if (!h) onLeave(cx); })
            .children(grid)
            .children(lines)
            .when(Boolean(cross), (el) => el.children(cross)),
        ),
    )
    .child(h_flex().pl(54).justify_between().text_size(10.5).text_color(t.muted).children(xLabels.map((l) => div().child(l))));
}

/** The series rows under a chart: a swatch, the name and the value at the crosshair (or the last). Click hides or shows one. */
export function legend(t, { id, series, hidden, hoverT, step, onToggle, onOnly, onAll = null, onNone = null }) {
  const small = (key, label, tip, fn) => div()
    .id(`${id}-leg-${key}`)
    .px(5)
    .h(16)
    .rounded(3)
    .bg(t.raised)
    .text_size(10)
    .text_color(t.muted)
    .cursor_pointer()
    .hover((st) => st.bg(t.hover).text_color(t.foreground))
    .tooltip(tip)
    .on_click((_e, cx) => fn(cx))
    .flex()
    .items_center()
    .child(label);
  return h_flex()
    .flex_wrap()
    .gap_x(14)
    .gap_y(3)
    .pl(54)
    .text_size(11)
    .items_center()
    .when(Boolean(onAll && onNone) && series.length > 1, (el) => el.child(h_flex().gap(4).items_center()
      .child(small("all", "all", "Show every series", onAll))
      .child(small("none", "none", "Hide every series, then click the ones to show", onNone))))
    .children(series.map((s, i) => {
      const off = hidden.has(s.name);
      const p = hoverT !== null ? nearest(s.points, hoverT) : s.points[s.points.length - 1];
      const near = p && (hoverT === null || Math.abs(p[0] - hoverT) <= step * 2.5);
      return h_flex()
        .id(`${id}-leg-${i}`)
        .gap(5)
        .items_center()
        .cursor_pointer()
        .opacity(off ? 0.45 : 1)
        .hover((st) => st.opacity(0.8))
        .tooltip(off ? "Show (click) · only this one (⌥ click)" : "Hide (click) · only this one (⌥ click)")
        .on_click((e, cx) => (e.modifiers?.alt ? onOnly(s.name, cx) : onToggle(s.name, cx)))
        .child(div().w(10).h(2).flex_none().bg(s.color))
        .child(div().max_w(480).truncate().text_color(off ? t.dim : t.foreground).child(s.name))
        .child(div().text_color(t.muted).child(near ? fmt(p[1]) : "–"));
    }));
}

/** The series of a panel ready to draw: colored, thinned to the plot's width, the hidden ones out. */
export function drawable(t, list, hidden, width) {
  const palette = PALETTE(t);
  const max = Math.max(60, Math.min(2000, Math.floor((width || 800) / 1.5)));
  return list.slice(0, MAX_DRAWN).map((s, i) => ({ ...s, color: palette[i % palette.length], max: s.points.reduce((m, p) => Math.max(m, Math.abs(p[1])), 0) }))
    .filter((s) => !hidden.has(s.name))
    .map((s) => ({ ...s, points: thin(s.points, max) }));
}
