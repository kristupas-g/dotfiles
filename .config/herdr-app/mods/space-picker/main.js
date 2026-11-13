// space-picker: go to a space. Opened with cmd-p (`mod.open:space-picker` in
// keys.json). Lists every space with its folder, branch and agent state; type
// to filter, ↑/↓ to move, Enter shows it, Esc closes. The shipped picker (tabs
// and agents too) stays in the palette as "Go to space or tab…".

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, ScrollHandle } from "gpui-base";
import { closeOverlay, home, props, run, spaces, theme } from "herdr";

const ROW = 34;

// Every character of `q` in order somewhere in `s`; a plain substring ranks first.
function score(s, q) {
  if (!q) return 1;
  const at = s.indexOf(q);
  if (at >= 0) return 1000 - at;
  let i = 0;
  for (const ch of s) if (ch === q[i]) i++;
  return i === q.length ? 1 : 0;
}

const short = (folder) => (folder ?? "").replace(home(), "~");

export default class SpacePicker extends View {
  init(_props, cx) {
    this.filter = "";
    this.at = null;
    this.scroll = ScrollHandle.new();
    this.input = InputState.new({ placeholder: "Go to a space…" });
    this.input.on("change", (_e, cx) => {
      this.filter = this.input.value();
      this.at = 0;
      cx.notify();
    });
    this.input.on("submit", (_e, cx) => this.go(this.shown()[this.at], cx));
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.handle = cx.focus_handle();
  }

  close() {
    closeOverlay(props().overlay);
  }

  shown() {
    const q = this.filter.trim().toLowerCase();
    return spaces()
      .map((s) => ({ s, score: Math.max(score(s.name.toLowerCase(), q), score(short(s.folder).toLowerCase(), q) / 2, score((s.branch ?? "").toLowerCase(), q) / 2) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.s);
  }

  go(s, _cx) {
    if (!s) return;
    this.close();
    run("space.select", { id: s.id });
  }

  render() {
    const t = theme();
    const shown = this.shown();
    // Opens on the next space, so Enter alone cycles.
    if (this.at === null) this.at = Math.max(0, shown.findIndex((s) => s.active) + 1) % Math.max(1, shown.length);
    this.at = Math.max(0, Math.min(this.at, shown.length - 1));
    const row = (s, i) => {
      const sel = i === this.at;
      const st = s.status;
      return h_flex()
        .id(`space-${s.id}`)
        .h(ROW)
        .flex_none()
        .px(10)
        .gap(8)
        .items_center()
        .rounded(7)
        .bg(sel ? t.selected : t.popover)
        .cursor_pointer()
        .hover((x) => x.bg(sel ? t.selected : t.hover))
        .on_click((_e, cx) => this.go(s, cx))
        .child(st === "working" ? svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900) : div().w(12).flex_none().text_color(t[st] ?? t.dim).child(st ? "●" : "·"))
        .child(div().flex_none().text_color(s.active ? t.foreground : t.foreground).font_medium().child(s.name))
        .when(Boolean(s.branch) && /\w/.test(s.branch), (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(s.branch)))
        .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.dim).text_ellipsis_start().child(short(s.folder)))
        .when(Boolean(s.machine), (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(s.machine)))
        .when(s.active, (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child("here")));
    };
    return v_flex()
      .id("space-picker")
      .track_focus(this.handle)
      .w_full()
      .min_h(0)
      .p(18)
      .gap(10)
      .bg(t.popover)
      .text_size(13)
      .on_key_down((e, cx) => {
        const k = e.key;
        if (k === "escape") return this.close();
        if (k === "down") this.at = shown.length ? (this.at + 1) % shown.length : 0;
        else if (k === "up") this.at = shown.length ? (this.at + shown.length - 1) % shown.length : 0;
        else return;
        this.scroll.scroll_to_item(this.at);
        cx.stop_propagation();
        cx.notify();
      })
      .child(
        h_flex()
          .items_center()
          .child(div().flex_1().text_size(15).font_semibold().text_color(t.foreground).child("Go to space"))
          .child(div().id("sp-esc").px(6).py(2).rounded(5).text_size(11).text_color(t.dim).cursor_pointer().hover((x) => x.bg(t.hover).text_color(t.foreground)).on_click(() => this.close()).child("Esc")),
      )
      .child(
        h_flex()
          .h(36)
          .flex_none()
          .px(10)
          .gap(8)
          .items_center()
          .rounded(9)
          .border_1()
          .border_color(t.accent)
          .bg(t.background)
          .child(svg("mods/workspace-chrome/search.svg").size(15).text_color(t.dim))
          .child(Input.new(this.input).flex_1().h_full().text_size(12.8).text_color(t.foreground)),
      )
      .when(!shown.length, (el) => el.child(div().px(10).text_size(12).text_color(t.dim).child("No space matches.")))
      .child(
        v_flex()
          .id("sp-list")
          .h(Math.min(400, shown.length * ROW))
          .min_h(0)
          .overflow_y_scrollbar()
          .mode("always")
          .track_scroll(this.scroll)
          .children(shown.map(row)),
      )
      .child(div().text_size(11).text_color(t.dim).child("↑↓ move · Enter goes · cmd-n makes a new space"));
  }
}
