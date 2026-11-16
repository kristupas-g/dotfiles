// The Thanos tab: a column of panels, each a PromQL query with its graph (a
// range query) or table (an instant query), all over the same time range so
// they compare. The crosshair is shared: hovering one chart marks the same
// moment on every panel. Nothing here waits: every query runs in its own task,
// panels run in parallel, and a reply for a panel that has moved on is dropped.
//
// Keys while the tab has the keyboard (the footer lists them):
//   n new panel   d duplicate   x remove   j/k ↑/↓ panel   1–9 panel   ↵ edit the query
//   r run all   t table/graph   l labels   e expand the table   R range   a auto-refresh
//   o overlay (every panel's series in one chart)   % each series as a share of its max
//   -/= chart height   Esc clear   ⌘S copy the Thanos link   ⇧⌘S screenshot to the clipboard
// In the query box: Tab completes (an alias, a metric, a label, a value), ↑↓ pick,
// ↵ runs (or takes the picked suggestion), Esc leaves the box.

import { div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, Popup, ScrollHandle, VirtualListScrollHandle, Scrollbar, v_virtual_list } from "gpui-base";
import { exec, focused, nextCommand, notify, panes, run, setShared, settings, shared, spaces, theme } from "herdr";
import * as T from "./thanos.js";
import { chart, legend, drawable, MAX_DRAWN } from "./chart.js";

const EVERY = 60_000;
const RECENT = "thanos.recent";
const SAMPLE = 50;
const ROW = 24;
const PICK_ROW = 28;
export const TAB = "thanos";
const ICON = "mods/thanos/icons/";

const short = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export class ThanosView {
  init(p, cx) {
    this.panels = [];
    this.range = T.seconds(p.range) ? p.range : "1h";
    this.hoverT = null;
    this.norm = false;
    this.overlay = false;
    this.auto = true;
    this.chartH = 220;
    this.at = 0;
    this.focusAt = 0;
    this.typing = null;
    this.comp = null;
    this.compGen = 0;
    this.quietUntil = 0;
    this.skipSubmit = 0;
    this.picker = null;
    this.pickAt = 0;
    this.pickText = "";
    this.confirm = null;
    this.nameLists = {};
    this.labels = {};
    this.aliases = {};
    this.aliasFile = "";
    this.aliasErr = null;
    this.rootBounds = null;
    this.width = 0;
    this.seq = 0;
    this.busy = null;
    this.handle = cx.focus_handle();
    this.scroll = ScrollHandle.new();
    this.pickScroll = ScrollHandle.new();
    this.compScroll = ScrollHandle.new();
    this.pick = InputState.new({ placeholder: "" });
    this.pick.on("change", (_e, cx) => { this.pickText = this.pick.value(); this.pickAt = 0; cx.notify(); });
    this.pick.on("submit", (_e, cx) => this.choose(cx));
    const exprs = Array.isArray(p.queries) && p.queries.length ? p.queries.map(String) : [String(p.query ?? "")];
    for (const e of exprs) this.addPanel(e, cx, false);
    this.focusAt = 0;
    cx.timer.every(EVERY, (cx) => { if (this.auto && !this.typing && !this.picker) this.runAll(cx); });
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        this.command(c, cx);
        cx.notify();
      }
    });
    this.configErr = null;
    this.ready = T.loadConfig().then((c) => { this.configErr = c.error; return c; });
    cx.spawn(async (cx) => { await this.ready; cx.notify(); });
    cx.spawn(async (cx) => {
      const a = await T.loadAliases();
      this.aliases = a.aliases;
      this.aliasFile = a.file;
      this.aliasErr = a.error;
      cx.notify();
    });
    if (exprs.some((e) => e.trim())) this.runAll(cx);
    else cx.timer.after(80, (cx) => this.edit(this.panels[0], cx));
  }

  command(c, cx) {
    const p = this.panels[this.focusAt];
    if (c === "focus") this.handle.focus();
    else if (c === "link") this.copyLink(cx);
    else if (c === "shot") this.shot(cx);
    else if (c === "new") this.addPanel("", cx, true, this.focusAt);
    else if (c === "duplicate" && p) this.duplicate(p, cx);
    else if (c === "refresh") this.runAll(cx);
    else if (c === "run" && p) this.run(p, cx);
  }

  // ---- panels ----

  addPanel(expr, cx, focus = true, after = null) {
    const id = `p${++this.seq}`;
    const panel = {
      id, expr, mode: "graph", list: [], labels: [], error: null, loading: false, gen: 0, ran: null,
      hidden: new Set(), expanded: false, labelsOpen: false, bounds: null, plotW: 0,
      input: InputState.new({ placeholder: "PromQL · an alias and its arguments (r5 metric) · Tab completes", value: expr }),
      tableScroll: VirtualListScrollHandle.new(),
    };
    panel.input.on("change", (_e, cx) => {
      panel.expr = panel.input.value();
      if (Date.now() < this.quietUntil) return;
      this.suggest(panel, cx);
    });
    panel.input.on("submit", (_e, cx) => this.submit(panel, cx));
    panel.input.on("focus", (_e, cx) => { this.typing = panel.id; this.focusAt = this.panels.indexOf(panel); cx.notify(); });
    panel.input.on("blur", (_e, cx) => {
      if (this.typing === panel.id) this.typing = null;
      // Not at once: a click on a suggestion blurs the box before the click lands.
      cx.timer.after(150, (cx) => { if (this.typing !== panel.id && this.comp?.panel === panel) { this.comp = null; cx.notify(); } });
      cx.notify();
    });
    const at = after === null ? this.panels.length : after + 1;
    this.panels.splice(at, 0, panel);
    if (focus) {
      this.focusAt = at;
      this.edit(panel, cx);
    }
    cx.notify();
    return panel;
  }

  duplicate(p, cx) {
    const i = this.panels.indexOf(p);
    const copy = this.addPanel(p.expr, cx, true, i);
    copy.mode = p.mode;
    copy.hidden = new Set(p.hidden);
    copy.list = p.list;
    copy.labels = p.labels;
    copy.ran = p.ran;
    cx.timer.after(60, (cx) => { const n = copy.input.value().length; copy.input.set_selected_range({ start: n, end: n }); cx.notify(); });
  }

  remove(p, cx) {
    const i = this.panels.indexOf(p);
    const go = (cx) => {
      p.gen++;
      this.panels.splice(i, 1);
      if (!this.panels.length) this.addPanel("", cx, true);
      this.focusAt = Math.max(0, Math.min(this.focusAt, this.panels.length - 1));
      if (this.comp?.panel === p) this.comp = null;
      this.rename();
      cx.notify();
    };
    if (!p.expr.trim() && !p.ran) return go(cx);
    this.confirm = { text: `Remove panel ${i + 1} (${short(p.expr.trim() || "empty", 40)})?`, fn: go };
    cx.notify();
  }

  focusPanel(i, cx) {
    if (!this.panels.length) return;
    this.focusAt = Math.max(0, Math.min(i, this.panels.length - 1));
    this.scroll.scroll_to_item(this.focusAt + (this.overlay ? 1 : 0));
    cx.notify();
  }

  edit(p, cx) {
    if (!p) return;
    this.focusAt = this.panels.indexOf(p);
    cx.timer.after(40, (cx) => { p.input.focus(); cx.notify(); });
    cx.notify();
  }

  leave(cx) {
    this.comp = null;
    this.typing = null;
    this.handle.focus();
    cx.notify();
  }

  toggleMode(p, cx) {
    p.mode = p.mode === "graph" ? "table" : "graph";
    if (p.ran) this.run(p, cx);
    cx.notify();
  }

  setExpr(p, expr, cx) {
    p.expr = expr;
    this.quietUntil = Date.now() + 100;
    p.input.set_value(expr);
    cx.notify();
  }

  // ---- running ----

  window() {
    const end = Math.floor(Date.now() / 1000);
    const sec = T.seconds(this.range) ?? 3600;
    const points = Math.max(150, Math.min(600, Math.floor((this.width || 900) / 2)));
    return { start: end - sec, end, step: T.stepFor(sec, points) };
  }

  runAll(cx) {
    for (const p of this.panels) if (p.expr.trim()) this.run(p, cx);
  }

  run(p, cx) {
    const expr = p.expr.trim();
    if (!expr) return;
    const gen = ++p.gen;
    p.loading = true;
    p.error = null;
    const w = this.window();
    this.remember(expr);
    cx.notify();
    cx.spawn(async (cx) => {
      await this.ready;
      const t0 = Date.now();
      try {
        const data = p.mode === "table" ? await T.queryInstant(expr, w.end) : await T.queryRange(expr, w.start, w.end, w.step);
        if (gen !== p.gen) return;
        p.list = T.series(data);
        p.labels = T.labelSummary(p.list);
        p.ran = { ...w, expr, mode: p.mode, ms: Date.now() - t0, type: data.resultType };
        p.expanded = false;
      } catch (e) {
        if (gen !== p.gen) return;
        p.error = String(e?.message ?? e);
      }
      p.loading = false;
      this.at = Date.now();
      this.rename();
      cx.notify();
    });
  }

  remember(expr) {
    const list = this.recent().filter((e) => e !== expr);
    list.unshift(expr);
    setShared(RECENT, list.slice(0, 40));
  }

  recent() {
    const r = shared(RECENT);
    return Array.isArray(r) ? r : [];
  }

  rename() {
    const tab = focused()?.tab;
    if (!tab || !panes().some((p) => p.tab === tab && p.mod === "thanos")) return;
    const t = spaces().flatMap((s) => s.tabs).find((x) => x.id === tab);
    if (!t) return;
    const first = this.panels.find((p) => p.ran)?.ran.expr ?? this.panels.find((p) => p.expr.trim())?.expr.trim();
    const name = first ? `${TAB} · ${short(first, 36)}` : TAB;
    if (t.name !== name && (t.name === TAB || t.name.startsWith(`${TAB} · `))) run("tab.rename", { id: tab, name });
  }

  // Metric names for a word, by its first two characters, fetched once each
  // (a prefix is filtered by Thanos; the full list is over fetch's size limit).
  nameList(word) {
    const key = word.slice(0, 2);
    if (!this.nameLists[key]) this.nameLists[key] = this.ready.then(() => T.metricNames(key)).then((l) => l.sort()).catch((e) => { delete this.nameLists[key]; throw e; });
    return this.nameLists[key];
  }

  // ---- completion ----

  suggest(p, cx) {
    const text = p.input.value();
    const caret = p.input.selected_range().end;
    const c = T.context(text, caret);
    if (!c) { this.comp = null; return cx.notify(); }
    const gen = ++this.compGen;
    if (c.kind === "metric") {
      const items = [];
      const trimmed = text.trim();
      const firstWord = trimmed.split(/\s+/)[0] ?? "";
      const w = c.word.toLowerCase();
      if (!trimmed) {
        for (const e of this.recent().slice(0, 12)) items.push({ kind: "recent", label: e, text: e, hint: "" });
        for (const [k, def] of Object.entries(this.aliases)) items.push({ kind: "alias", label: k, def, hint: def.hint || def.expand });
      } else {
        if (this.aliases[firstWord] && (!c.first || c.word !== firstWord)) items.push({ kind: "alias", label: firstWord, def: this.aliases[firstWord], whole: true, hint: `→ ${T.expandAlias(this.aliases[firstWord], trimmed.split(/\s+/).slice(1)).text}` });
        if (c.first && w) for (const [k, def] of Object.entries(this.aliases)) if (k.toLowerCase().startsWith(w) && !(k === firstWord && items.length)) items.push({ kind: "alias", label: k, def, whole: true, hint: def.hint || def.expand });
      }
      const names = w.length >= 2 ? this.nameLists[w.slice(0, 2)] : null;
      const ready = Array.isArray(names) ? names : null;
      if (ready) {
        const pre = [], sub = [];
        for (const n of ready) {
          const l = n.toLowerCase();
          if (l.startsWith(w)) pre.push(n);
          else if (l.includes(w)) sub.push(n);
          if (pre.length >= 40) break;
        }
        for (const n of [...pre, ...sub].slice(0, 40)) items.push({ kind: "metric", label: n, hint: "" });
      }
      const loading = w.length >= 2 && !ready;
      if (!items.length && !loading) { this.comp = null; return cx.notify(); }
      this.comp = { panel: p, items, at: -1, ctx: c, loading, error: null };
      if (loading) {
        cx.spawn(async (cx) => {
          try {
            const list = await this.nameList(w);
            this.nameLists[w.slice(0, 2)] = list;
          } catch (e) {
            if (gen !== this.compGen) return;
            this.comp.loading = false;
            this.comp.error = String(e?.message ?? e);
            return cx.notify();
          }
          if (gen !== this.compGen) return;
          this.suggest(p, cx);
        });
      }
      return cx.notify();
    }
    const prev = this.comp?.panel === p && this.comp.ctx.kind === c.kind ? this.comp : null;
    this.comp = { panel: p, items: prev?.items ?? [], at: -1, ctx: c, loading: true, error: null };
    cx.notify();
    cx.spawn(async (cx) => {
      let list;
      try {
        list = await this.labelList(c);
      } catch (e) {
        if (gen !== this.compGen) return;
        this.comp.loading = false;
        this.comp.error = String(e?.message ?? e);
        return cx.notify();
      }
      if (gen !== this.compGen) return;
      const w = c.word.toLowerCase();
      const pre = [], sub = [];
      for (const n of list) {
        const l = n.toLowerCase();
        if (!w || l.startsWith(w)) pre.push(n);
        else if (l.includes(w)) sub.push(n);
        if (pre.length >= 60) break;
      }
      this.comp.items = [...pre, ...sub].slice(0, 60).map((n) => ({ kind: c.kind, label: n, hint: "" }));
      this.comp.loading = false;
      cx.notify();
    });
  }

  // Label names or values for a selector, fetched once per metric (and label).
  labelList(c) {
    const key = c.kind === "label" ? `L:${c.metric}` : `V:${c.metric}:${c.label}`;
    if (!this.labels[key]) {
      const match = c.metric && /^[A-Za-z_:][A-Za-z0-9_:]*$/.test(c.metric) ? c.metric : undefined;
      this.labels[key] = this.ready.then(() => (c.kind === "label" ? T.labelNames(match) : T.labelValues(c.label, match))).catch((e) => { delete this.labels[key]; throw e; });
    }
    return this.labels[key];
  }

  accept(cx, idx = null) {
    const comp = this.comp;
    if (!comp) return;
    const it = comp.items[idx ?? (comp.at >= 0 ? comp.at : 0)];
    if (!it) return;
    const p = comp.panel;
    const st = p.input;
    const text = st.value();
    const caret = st.selected_range().end;
    const c = comp.ctx;
    let next, pos, again = false;
    if (it.kind === "alias") {
      const words = text.trim().split(/\s+/);
      const args = it.whole && words[0] === it.label ? words.slice(1) : [];
      const ex = T.expandAlias(it.def, args);
      next = ex.text;
      pos = ex.caret;
    } else if (it.kind === "recent") {
      next = it.text;
      pos = next.length;
    } else if (it.kind === "metric") {
      next = text.slice(0, c.from) + it.label + text.slice(caret);
      pos = c.from + it.label.length;
    } else if (it.kind === "label") {
      const ins = `${it.label}="`;
      const tail = text.slice(caret);
      next = text.slice(0, c.from) + ins + (tail.startsWith('"') ? "" : '"') + tail;
      pos = c.from + ins.length;
      again = true;
    } else {
      next = text.slice(0, c.from) + it.label + text.slice(caret);
      pos = c.from + it.label.length;
      if (next[pos] === '"') pos++;
      else { next = `${next.slice(0, pos)}"${next.slice(pos)}`; pos++; }
    }
    this.quietUntil = Date.now() + 100;
    this.skipSubmit = Date.now() + 200;
    st.set_value(next);
    st.set_selected_range({ start: pos, end: pos });
    p.expr = next;
    this.comp = null;
    if (this.typing !== p.id) st.focus();
    if (again) cx.timer.after(20, (cx) => this.suggest(p, cx));
    cx.notify();
  }

  submit(p, cx) {
    if (this.comp?.panel === p && this.comp.at >= 0) return this.accept(cx);
    if (Date.now() < this.skipSubmit) return;
    this.comp = null;
    this.run(p, cx);
  }

  // ---- the range picker ----

  openPicker(kind, cx) {
    this.picker = kind;
    this.pickText = "";
    this.pickAt = Math.max(0, T.RANGES.indexOf(this.range));
    this.pick.set_value("");
    cx.notify();
    cx.timer.after(60, () => this.pick.focus());
  }

  closePicker(cx) {
    this.picker = null;
    this.handle.focus();
    cx.notify();
  }

  pickItems() {
    const q = this.pickText.trim().toLowerCase();
    const items = T.RANGES.filter((r) => !q || r.includes(q)).map((r) => ({ id: r, label: r, hint: `${T.stepFor(T.seconds(r))}s step` }));
    if (q && T.seconds(q) && !T.RANGES.includes(q)) items.unshift({ id: q, label: q, hint: "as typed", typed: true });
    return items;
  }

  choose(cx) {
    const it = this.pickItems()[this.pickAt];
    if (!it) return;
    this.range = it.id;
    this.closePicker(cx);
    this.runAll(cx);
  }

  // ---- sharing ----

  copyLink(cx) {
    const list = this.panels.filter((p) => p.expr.trim()).map((p) => ({ expr: p.expr.trim(), mode: p.mode }));
    if (!list.length) return notify({ title: "Nothing to share", body: "No panel has a query yet", level: "warning", timeout: 3000 });
    const w = this.window();
    cx.spawn(async () => {
      await this.ready;
      if (!T.BASE) return notify({ title: "No Thanos URL", body: this.configErr ?? "", level: "warning", timeout: 5000 });
      const url = T.shareUrl(list, this.range, w.end, w.step);
      const r = await exec("/bin/sh", ["-c", 'printf "%s" "$1" | pbcopy', "sh", url], { timeout: 5000 }).catch((e) => ({ code: 1, stderr: String(e) }));
      if (r.code === 0) notify({ title: "Thanos link copied", body: `${list.length} ${list.length === 1 ? "query" : "queries"} over ${this.range}, ending now`, level: "info", timeout: 3000 });
      else notify({ title: "Couldn't copy the link", body: r.stderr || "pbcopy failed", level: "error", timeout: 5000 });
    });
  }

  // The window's last frame (`herdr-app shot`), cropped to the focused panel
  // when the pointer has been over it (its window bounds come with mouse
  // moves), else to the tab, as a PNG on the clipboard.
  shot(cx) {
    const p = this.panels[this.focusAt];
    const b = p?.bounds ?? this.rootBounds;
    const what = p?.bounds ? `panel ${this.focusAt + 1}` : this.rootBounds ? "the Thanos tab" : "the whole window";
    this.busy = "screenshot";
    cx.notify();
    cx.spawn(async (cx) => {
      const file = `/tmp/herdr-thanos-${Date.now()}.png`;
      try {
        const r = await exec("herdr-app", ["shot", file], { timeout: 15000 });
        if (r.code !== 0) throw new Error((r.stderr || r.stdout || "").trim() || `herdr-app shot exited ${r.code}`);
        if (b) {
          const info = await exec("sips", ["-g", "pixelWidth", file], { timeout: 10000 });
          const pw = Number(/pixelWidth:\s*(\d+)/.exec(info.stdout)?.[1]);
          const vw = window.viewport_size().width;
          const s = pw && vw ? pw / vw : 1;
          const c = await exec("sips", ["-c", String(Math.round(b.height * s)), String(Math.round(b.width * s)), "--cropOffset", String(Math.round(b.y * s)), String(Math.round(b.x * s)), file, "--out", file], { timeout: 10000 });
          if (c.code !== 0) throw new Error((c.stderr || "").trim() || "sips couldn't crop");
        }
        const o = await exec("osascript", ["-e", `set the clipboard to (read (POSIX file "${file}") as «class PNGf»)`], { timeout: 10000 });
        if (o.code !== 0) throw new Error((o.stderr || "").trim() || "osascript couldn't set the clipboard");
        notify({ title: "Screenshot copied", body: `${what[0].toUpperCase()}${what.slice(1)}, as a PNG on the clipboard${b ? "" : ". Move the pointer over a panel first to crop to it"}`, level: "info", timeout: 4000 });
      } catch (e) {
        notify({ title: "Couldn't take the screenshot", body: String(e?.message ?? e), level: "error", timeout: 6000 });
      }
      exec("rm", ["-f", file]).catch(() => {});
      this.busy = null;
      cx.notify();
    });
  }

  // ---- keys ----

  key(e, cx) {
    const k = e.key;
    const m = e.modifiers ?? {};
    if (m.platform) return;
    if (this.picker) {
      const n = this.pickItems().length;
      if (k === "escape") this.closePicker(cx);
      else if (k === "down" || (m.control && k === "n")) this.pickAt = n ? (this.pickAt + 1) % n : 0;
      else if (k === "up" || (m.control && k === "p")) this.pickAt = n ? (this.pickAt + n - 1) % n : 0;
      else if (k === "enter") return this.choose(cx);
      else return;
      this.pickScroll.scroll_to_item(this.pickAt);
      cx.stop_propagation();
      return cx.notify();
    }
    if (this.typing) {
      const comp = this.comp?.panel.id === this.typing ? this.comp : null;
      const n = comp?.items.length ?? 0;
      if (k === "escape") { if (comp) this.comp = null; else this.leave(cx); }
      else if (comp && (k === "down" || (m.control && k === "n"))) { comp.at = n ? (comp.at + 1) % n : -1; this.compScroll.scroll_to_item(Math.max(0, comp.at)); }
      else if (comp && (k === "up" || (m.control && k === "p"))) { comp.at = n ? (comp.at <= 0 ? n - 1 : comp.at - 1) : -1; this.compScroll.scroll_to_item(Math.max(0, comp.at)); }
      else if (k === "tab" && comp && n) this.accept(cx);
      else if (k === "enter" && comp && comp.at >= 0) this.accept(cx);
      else if (k === "tab" && !comp) { const p = this.panels.find((x) => x.id === this.typing); if (p) this.suggest(p, cx); }
      else return;
      cx.stop_propagation();
      return cx.notify();
    }
    if (this.confirm) {
      if (k === "y" || k === "enter") { const fn = this.confirm.fn; this.confirm = null; fn(cx); }
      else if (k === "n" || k === "escape") this.confirm = null;
      else return;
      cx.stop_propagation();
      return cx.notify();
    }
    if (m.alt || m.control) return;
    const p = this.panels[this.focusAt];
    if (k === "escape") this.hoverT = null;
    else if (k === "n") this.addPanel("", cx, true, this.focusAt);
    else if (k === "d" && p) this.duplicate(p, cx);
    else if (k === "x" && p) this.remove(p, cx);
    else if (k === "j" || k === "down") this.focusPanel(this.focusAt + 1, cx);
    else if (k === "k" || k === "up") this.focusPanel(this.focusAt - 1, cx);
    else if (k === "enter" && p) this.edit(p, cx);
    else if (k === "r") this.runAll(cx);
    else if (k === "t" && p) this.toggleMode(p, cx);
    else if (k === "l" && p) p.labelsOpen = !p.labelsOpen;
    else if (k === "e" && p) p.expanded = !p.expanded;
    else if (k === "o") this.overlay = !this.overlay;
    else if (k === "%" || (m.shift && k === "5")) this.norm = !this.norm;
    else if (k === "R" || (m.shift && k === "r")) this.openPicker("range", cx);
    else if (k === "a") this.auto = !this.auto;
    else if (k === "-" || k === "_") this.chartH = Math.max(120, this.chartH - 40);
    else if (k === "=" || k === "+") this.chartH = Math.min(600, this.chartH + 40);
    else if (/^[1-9]$/.test(k)) this.focusPanel(Number(k) - 1, cx);
    else return;
    cx.stop_propagation();
    cx.notify();
  }

  // ---- UI ----

  iconButton(t, id, icon, tip, onClick, { spin = false, on = false, label = null } = {}) {
    return h_flex()
      .id(id)
      .h(26)
      .px(label ? 7 : 0)
      .when(!label, (el) => el.w(26))
      .gap(5)
      .flex_none()
      .items_center()
      .justify_center()
      .rounded(6)
      .text_color(on ? t.accent : t.dim)
      .cursor_pointer()
      .hover((s) => s.text_color(t.foreground).bg(t.hover))
      .tooltip(tip)
      .on_click((_e, cx) => { cx.stop_propagation(); onClick(cx); })
      .child(spin ? svg("mods/workspace-chrome/spinner.svg").size(14).spin(900) : svg(icon).size(14))
      .when(Boolean(label), (el) => el.child(div().text_size(11.5).child(label)));
  }

  dropButton(t, id, label, tip, onClick) {
    return h_flex()
      .id(id)
      .h(26)
      .px(8)
      .gap(5)
      .flex_none()
      .items_center()
      .rounded(6)
      .border_1()
      .border_color(t.border)
      .bg(t.background)
      .text_size(12.5)
      .text_color(t.foreground)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .tooltip(tip)
      .on_click((_e, cx) => onClick(cx))
      .child(div().max_w(260).truncate().font_medium().child(label))
      .child(svg("mods/workspace-chrome/chevron-down.svg").size(11).text_color(t.dim));
  }

  chip(t, text, tone) {
    return div().flex_none().px(5).h(16).rounded(4).bg(t[tone] + "26").text_size(10).font_medium().text_color(t[tone]).flex().items_center().child(text);
  }

  header(t) {
    const w = this.window();
    const loading = this.panels.filter((p) => p.loading).length;
    const working = this.busy ? `${this.busy}…` : loading ? `${loading} ${loading === 1 ? "query" : "queries"} running…` : null;
    return v_flex()
      .flex_none()
      .px(14)
      .pt(10)
      .pb(8)
      .gap(6)
      .border_b(1)
      .border_color(t.border)
      .child(
        h_flex()
          .gap(8)
          .items_center()
          .child(svg(`${ICON}thanos.svg`).size(16).flex_none().text_color(t.accent))
          .child(this.dropButton(t, "th-range", `last ${this.range}`, "Time range (R). Every panel uses it; ends now", (cx) => this.openPicker("range", cx)))
          .child(div().text_size(11).text_color(t.dim).child(`step ${w.step}s`))
          .child(this.iconButton(t, "th-refresh", `${ICON}refresh.svg`, `Run every panel again (r)${this.auto ? ` · auto every ${EVERY / 1000}s (a)` : " · auto-refresh is off (a)"}`, (cx) => this.runAll(cx), { spin: loading > 0 }))
          .child(this.iconButton(t, "th-auto", "mods/workspace-chrome/clock.svg", this.auto ? `Auto-refresh every ${EVERY / 1000} s is on (a turns it off)` : "Auto-refresh is off (a turns it on)", (cx) => { this.auto = !this.auto; cx.notify(); }, { on: this.auto }))
          .child(div().w(1).h(16).bg(t.border))
          .child(this.iconButton(t, "th-new", `${ICON}plus.svg`, "New panel under the focused one (n)", (cx) => this.addPanel("", cx, true, this.focusAt), { label: "panel" }))
          .child(this.iconButton(t, "th-overlay", "mods/workspace-chrome/layers.svg", this.overlay ? "Overlay is on: every panel's series in one chart at the top (o)" : "Overlay every panel's series in one chart, to compare them (o)", (cx) => { this.overlay = !this.overlay; cx.notify(); }, { on: this.overlay, label: "overlay" }))
          .child(this.iconButton(t, "th-norm", "mods/workspace-chrome/git-compare.svg", this.norm ? "Each series is drawn as a share of its own maximum (% turns it off)" : "Draw each series as a share of its own maximum, so different scales compare (%)", (cx) => { this.norm = !this.norm; cx.notify(); }, { on: this.norm, label: "normalise" }))
          .child(div().flex_1())
          .when(Boolean(working), (el) => el.child(h_flex().gap(6).items_center().px(8).h(22).rounded(6).bg(t.accent + "1f").child(svg("mods/workspace-chrome/spinner.svg").size(12).text_color(t.accent).spin(900)).child(div().text_size(11.5).text_color(t.accent).child(working))))
          .child(this.iconButton(t, "th-link", `${ICON}link.svg`, "Copy a Thanos link to these queries (⌘S)", (cx) => this.copyLink(cx)))
          .child(this.iconButton(t, "th-shot", `${ICON}camera.svg`, "Copy a screenshot of the focused panel to the clipboard (⇧⌘S)", (cx) => this.shot(cx))),
      )
      .when(Boolean(this.configErr), (el) => el.child(div().text_size(11.5).text_color(t.blocked).child(this.configErr)))
      .when(Boolean(this.aliasErr), (el) => el.child(div().text_size(11.5).text_color(t.blocked).child(this.aliasErr)));
  }

  status(t, p) {
    if (p.error) return [p.error, t.blocked];
    if (p.loading && !p.ran) return ["Running…", t.dim];
    const r = p.ran;
    if (!r) return ["Not run yet · Enter runs, Tab completes, an alias expands", t.dim];
    const n = p.list.length;
    const pts = p.list.reduce((a, s) => a + s.points.length, 0);
    const parts = [`${n} ${n === 1 ? "series" : "series"}`];
    if (r.mode === "graph") parts.push(`${pts} points`, `step ${r.step}s`);
    else parts.push(`at ${T.clock(r.end, true)}`);
    parts.push(`${(r.ms / 1000).toFixed(1)} s`);
    if (r.mode === "graph" && n > MAX_DRAWN) parts.push(`first ${MAX_DRAWN} drawn`);
    if (p.hidden.size) parts.push(`${p.hidden.size} hidden`);
    if (p.loading) parts.push("running again…");
    return [parts.join(" · "), t.dim];
  }

  plotWidth(p) {
    return p.plotW || Math.max(200, this.width - 130);
  }

  graph(t, p) {
    const r = p.ran;
    const ds = drawable(t, p.list, p.hidden, this.plotWidth(p));
    return [
      chart(t, {
        id: p.id, series: ds, start: r.start, end: r.end, step: r.step, hoverT: this.hoverT, norm: this.norm, height: this.chartH, width: this.plotWidth(p),
        onHover: (ts, bounds, cx) => {
          p.plotW = bounds.width;
          const q = Math.round(ts / r.step) * r.step;
          if (q !== this.hoverT) { this.hoverT = q; cx.notify(); }
        },
        onLeave: (cx) => { if (this.hoverT !== null) { this.hoverT = null; cx.notify(); } },
      }),
      legend(t, {
        id: p.id, series: drawable(t, p.list, new Set(), this.plotWidth(p)), hidden: p.hidden, hoverT: this.hoverT, step: r.step,
        onToggle: (name, cx) => { if (p.hidden.has(name)) p.hidden.delete(name); else p.hidden.add(name); cx.notify(); },
        onOnly: (name, cx) => {
          const others = p.list.slice(0, MAX_DRAWN).map((s) => s.name).filter((n) => n !== name);
          const solo = others.every((n) => p.hidden.has(n)) && !p.hidden.has(name);
          p.hidden = solo ? new Set() : new Set(others);
          cx.notify();
        },
      }),
    ];
  }

  table(t, p) {
    const rows = p.list;
    const mono = settings().font_family;
    const all = p.expanded || rows.length <= SAMPLE;
    const shown = all ? rows : rows.slice(0, SAMPLE);
    const row = (s, i) => h_flex()
      .h(ROW)
      .px(8)
      .gap(12)
      .items_center()
      .bg(i % 2 ? t.background : t.surface)
      .child(div().flex_1().min_w(0).truncate().font_family(mono).text_size(11.5).text_color(t.foreground).child(s.name))
      .child(div().flex_none().font_family(mono).text_size(11.5).font_medium().text_color(t.foreground).child(s.points.length ? T.fmt(s.points[s.points.length - 1][1]) : "–"));
    const more = rows.length - shown.length;
    const foot = (label, tip, fn) => h_flex().id(`${p.id}-more`).h(26).px(8).gap(8).items_center().cursor_pointer().hover((s) => s.bg(t.hover)).tooltip(tip)
      .on_click((_e, cx) => { fn(); cx.notify(); })
      .child(div().text_size(11.5).text_color(t.accent).child(label));
    const body = rows.length && shown.length > 200
      ? div().relative().h(Math.min(560, shown.length * ROW))
        .child(v_virtual_list(`${p.id}-table`, shown.length, ROW, (i) => `${i}:${shown[i].name}`, (range) => shown.slice(range.start, range.end).map((s, j) => row(s, range.start + j))).size_full().track_scroll(p.tableScroll))
        .child(Scrollbar.vertical(`${p.id}-table`).absolute().inset_0())
      : v_flex().children(shown.map(row));
    return v_flex()
      .rounded(6)
      .border_1()
      .border_color(t.border)
      .overflow_hidden()
      .when(!rows.length, (el) => el.child(div().px(8).py(6).text_size(11.5).text_color(t.dim).child("Empty result")))
      .child(body)
      .when(more > 0, (el) => el.child(foot(`${more} more · show all (e)`, "Draw every row", () => { p.expanded = true; })))
      .when(p.expanded && rows.length > SAMPLE, (el) => el.child(foot(`show the first ${SAMPLE} (e)`, "Back to the sample", () => { p.expanded = false; })));
  }

  labelsDrawer(t, p) {
    const mono = settings().font_family;
    const MAXV = 24;
    if (!p.labels.length) return div().px(8).py(4).text_size(11.5).text_color(t.dim).child("No labels in the result");
    return v_flex()
      .gap(3)
      .p(8)
      .rounded(6)
      .bg(t.background)
      .border_1()
      .border_color(t.border)
      .child(div().text_size(11).text_color(t.dim).child("Labels in the result · click a value to add it to the query's selector and run again"))
      .children(p.labels.map((l) => h_flex().gap(6).items_center().flex_wrap().gap_y(2)
        .child(div().w(150).flex_none().truncate().font_family(mono).text_size(11.5).text_color(t.accent).child(`${l.label} (${l.values.length})`))
        .children(l.values.slice(0, MAXV).map(([v, n]) => h_flex()
          .id(`${p.id}-lv-${l.label}-${v}`)
          .h(20)
          .px(6)
          .gap(4)
          .items_center()
          .rounded(4)
          .bg(t.raised)
          .cursor_pointer()
          .hover((s) => s.bg(t.hover))
          .tooltip(`${l.label}="${v}" · in ${n} series`)
          .on_click((_e, cx) => { cx.stop_propagation(); this.setExpr(p, T.withLabel(p.expr, l.label, v), cx); this.run(p, cx); })
          .child(div().max_w(260).truncate().font_family(mono).text_size(11).text_color(t.foreground).child(v))
          .child(div().text_size(10).text_color(t.dim).child(String(n)))))
        .when(l.values.length > MAXV, (el) => el.child(div().text_size(10.5).text_color(t.dim).child(`+${l.values.length - MAXV}`)))));
  }

  compPanel(t, p) {
    const comp = this.comp;
    const items = comp.items;
    comp.at = Math.min(comp.at, items.length - 1);
    const mono = settings().font_family;
    const tone = { alias: "accent", metric: "foreground", label: "working", value: "selected", recent: "dim" };
    const row = (it, i) => {
      const sel = i === comp.at;
      return h_flex()
        .id(`${p.id}-c-${i}`)
        .h(PICK_ROW)
        .flex_none()
        .px(8)
        .gap(8)
        .items_center()
        .rounded(5)
        .bg(sel ? t.selected : t.popover)
        .cursor_pointer()
        .hover((s) => s.bg(sel ? t.selected : t.hover))
        .on_click((_e, cx) => this.accept(cx, i))
        .child(div().w(44).flex_none().text_size(10).text_color(t.dim).child(it.kind))
        .child(div().flex_none().max_w(460).truncate().font_family(mono).text_size(12).text_color(t.foreground).child(it.label))
        .when(Boolean(it.hint), (el) => el.child(div().flex_1().min_w(0).truncate().font_family(mono).text_size(11).text_color(t.dim).child(it.hint)));
    };
    const kindHint = comp.ctx.kind === "label" ? `labels of ${comp.ctx.metric || "every series"}` : comp.ctx.kind === "value" ? `values of ${comp.ctx.label}` : "aliases, recent queries and metric names";
    return v_flex()
      .id(`${p.id}-comp`)
      .mt(4)
      .w(640)
      .p(6)
      .gap(2)
      .rounded(8)
      .border_1()
      .border_color(t.border)
      .bg(t.popover)
      .shadow_lg()
      .on_mouse_down_out((_e, cx) => { if (this.comp === comp) { this.comp = null; cx.notify(); } })
      .child(h_flex().px(8).h(20).flex_none().gap(6).items_center().text_size(10.5).text_color(t.dim)
        .child(div().child(kindHint))
        .when(comp.loading, (el) => el.child(svg("mods/workspace-chrome/spinner.svg").size(10).text_color(t.accent).spin(900)))
        .child(div().flex_1())
        .child(div().child("Tab takes it · ↑↓ · ↵ runs · Esc")))
      .when(Boolean(comp.error), (el) => el.child(div().px(8).py(4).text_size(11).text_color(t.blocked).child(comp.error)))
      .when(!items.length && !comp.loading && !comp.error, (el) => el.child(div().px(8).py(4).text_size(11).text_color(t.dim).child("Nothing matches")))
      .when(items.length > 0, (el) => el.child(v_flex().id(`${p.id}-comp-list`).h(Math.min(300, items.length * PICK_ROW)).min_h(0).overflow_y_scrollbar().track_scroll(this.compScroll).children(items.map(row))));
  }

  card(t, p, i) {
    const on = i === this.focusAt;
    const mono = settings().font_family;
    const st = this.status(t, p);
    return v_flex()
      .id(`card-${p.id}`)
      .relative()
      .flex_none()
      .mx(12)
      .my(4)
      .p(10)
      .gap(8)
      .rounded(10)
      .border_1()
      .border_color(on ? t.accent + "99" : t.border)
      .bg(t.surface)
      .on_mouse_move((e) => { p.bounds = e.bounds; })
      .on_mouse_down("left", (_e, cx) => { if (this.focusAt !== i) { this.focusAt = i; cx.notify(); } })
      .child(
        h_flex()
          .gap(6)
          .items_center()
          .child(div().w(20).flex_none().text_size(11.5).font_medium().text_color(on ? t.accent : t.dim).child(`${i + 1}`))
          .child(
            // The box is the popup's trigger: the suggestions hang under it, in a layer above the charts.
            Popup.new(`${p.id}-popup`, div().w_full().h(28).px(8).rounded(6).border_1().border_color(this.typing === p.id ? t.accent : t.border).bg(t.background).flex().items_center()
              .child(Input.new(p.input).flex_1().h_full().text_size(12.5).font_family(mono).text_color(t.foreground)))
              .anchor("top_left")
              .flex_1()
              .min_w(0)
              .when(this.comp?.panel === p, (el) => el.content(this.compPanel(t, p))),
          )
          .child(this.iconButton(t, `${p.id}-run`, `${ICON}play.svg`, "Run (↵ in the box)", (cx) => this.run(p, cx), { spin: p.loading }))
          .child(this.iconButton(t, `${p.id}-mode`, `${ICON}table.svg`, p.mode === "graph" ? "Show as a table: an instant query at the end of the range (t)" : "Show as a graph: a range query (t)", (cx) => this.toggleMode(p, cx), { on: p.mode === "table" }))
          .child(this.iconButton(t, `${p.id}-labels`, `${ICON}tag.svg`, "The result's labels and values, to narrow the query (l)", (cx) => { p.labelsOpen = !p.labelsOpen; cx.notify(); }, { on: p.labelsOpen }))
          .child(this.iconButton(t, `${p.id}-dup`, `${ICON}copy.svg`, "Duplicate this panel under it, to alter the query (d)", (cx) => this.duplicate(p, cx)))
          .child(this.iconButton(t, `${p.id}-x`, "mods/workspace-chrome/x.svg", "Remove this panel (x)", (cx) => this.remove(p, cx))),
      )
      .child(div().text_size(11).text_color(st[1]).truncate().child(st[0]))
      .when(p.mode === "graph" && Boolean(p.ran) && p.list.length > 0, (el) => el.children(this.graph(t, p)))
      .when(p.mode === "graph" && Boolean(p.ran) && !p.list.length && !p.error, (el) => el.child(div().h(60).flex().items_center().justify_center().text_size(11.5).text_color(t.dim).child("No series")))
      .when(p.mode === "table" && Boolean(p.ran), (el) => el.child(this.table(t, p)))
      .when(p.labelsOpen && Boolean(p.ran), (el) => el.child(this.labelsDrawer(t, p)))
  }

  overlayCard(t) {
    const ran = this.panels.filter((p) => p.ran && p.mode === "graph" && p.list.length);
    if (!ran.length) return v_flex().flex_none().mx(12).my(4).p(10).rounded(10).border_1().border_color(t.border).bg(t.surface).child(div().text_size(11.5).text_color(t.dim).child("Overlay: run some graph panels first"));
    const start = Math.min(...ran.map((p) => p.ran.start)), end = Math.max(...ran.map((p) => p.ran.end)), step = Math.min(...ran.map((p) => p.ran.step));
    const w = Math.max(200, this.width - 130);
    const all = [];
    ran.forEach((p) => {
      const i = this.panels.indexOf(p) + 1;
      for (const s of p.list.slice(0, MAX_DRAWN)) if (!p.hidden.has(s.name)) all.push({ ...s, name: `#${i} ${s.name}` });
    });
    const ds = drawable(t, all, new Set(), w);
    return v_flex()
      .flex_none()
      .mx(12)
      .my(4)
      .p(10)
      .gap(8)
      .rounded(10)
      .border_1()
      .border_color(t.accent + "66")
      .bg(t.surface)
      .child(h_flex().gap(8).items_center().child(div().text_size(12).font_medium().text_color(t.accent).child("Overlay")).child(div().text_size(11).text_color(t.dim).child(`${all.length} series from ${ran.length} panels${all.length > MAX_DRAWN ? ` · first ${MAX_DRAWN} drawn` : ""}${this.norm ? " · each as a share of its max" : ""}`)))
      .child(chart(t, {
        id: "overlay", series: ds, start, end, step, hoverT: this.hoverT, norm: this.norm, height: Math.max(this.chartH, 260), width: w,
        onHover: (ts, _b, cx) => { const q = Math.round(ts / step) * step; if (q !== this.hoverT) { this.hoverT = q; cx.notify(); } },
        onLeave: (cx) => { if (this.hoverT !== null) { this.hoverT = null; cx.notify(); } },
      }))
      .child(legend(t, { id: "overlay", series: ds, hidden: new Set(), hoverT: this.hoverT, step, onToggle: () => {}, onOnly: () => {} }));
  }

  pickerPanel(t) {
    const items = this.pickItems();
    this.pickAt = Math.max(0, Math.min(this.pickAt, items.length - 1));
    const row = (it, i) => {
      const sel = i === this.pickAt;
      return h_flex()
        .id(`th-pick-${it.id}`)
        .h(PICK_ROW)
        .flex_none()
        .px(10)
        .gap(8)
        .items_center()
        .rounded(6)
        .bg(sel ? t.selected : t.popover)
        .cursor_pointer()
        .hover((s) => s.bg(sel ? t.selected : t.hover))
        .on_click((_e, cx) => { this.pickAt = i; this.choose(cx); })
        .child(div().w(40).flex_none().text_size(12.5).font_medium().text_color(t.foreground).child(it.label))
        .child(div().flex_1().text_size(11).text_color(t.dim).child(it.hint))
        .when(it.id === this.range, (el) => el.child(div().text_size(11).text_color(t.dim).child("shown")));
    };
    return v_flex()
      .id("th-picker")
      .absolute()
      .top(44)
      .left(36)
      .w(340)
      .p(8)
      .gap(6)
      .rounded(10)
      .border_1()
      .border_color(t.border)
      .bg(t.popover)
      .child(h_flex().h(28).px(8).rounded(6).border_1().border_color(t.border).bg(t.background).items_center()
        .child(Input.new(this.pick).flex_1().h_full().text_size(12.5).text_color(t.foreground)))
      .child(v_flex().id("th-pick-list").max_h(300).overflow_y_scrollbar().track_scroll(this.pickScroll).gap(1).children(items.map(row)))
      .child(div().px(8).text_size(10.5).text_color(t.dim).child("↑↓ · Enter · a duration can be typed (45m, 4h, 3d)"));
  }

  footer(t) {
    const key = (cap, label) => h_flex().gap(4).items_center().flex_none()
      .child(div().px(4).h(16).rounded(3).bg(t.raised).text_size(10).text_color(t.muted).flex().items_center().child(cap))
      .child(div().text_size(11).text_color(t.dim).child(label));
    let hints;
    if (this.confirm) {
      hints = h_flex().gap(10).items_center().child(div().text_size(12).text_color(t.working).child(this.confirm.text)).child(key("y", "yes")).child(key("n", "no"));
    } else if (this.typing) {
      hints = h_flex().gap(10).items_center().children([key("Tab", "complete"), key("↑↓", "pick"), key("↵", "run"), key("Esc", "leave the box"), key("alias args", "r5 metric label")]);
    } else {
      hints = h_flex().gap(10).items_center().children([key("n", "new"), key("d", "duplicate"), key("x", "remove"), key("j/k", "panel"), key("↵", "edit"), key("r", "run all"), key("t", "table"), key("l", "labels"), key("R", "range"), key("o", "overlay"), key("%", "normalise"), key("-/=", "height"), key("⌘S", "link"), key("⇧⌘S", "shot")]);
    }
    const n = this.panels.length;
    return h_flex()
      .flex_none()
      .h(30)
      .px(14)
      .gap(12)
      .items_center()
      .border_t(1)
      .border_color(t.border)
      .child(div().flex_1().min_w(0).overflow_hidden().child(hints))
      .child(div().flex_none().text_size(11).text_color(t.dim).child(`${n} ${n === 1 ? "panel" : "panels"} · ${this.range}${this.at ? ` · ran ${T.clock(Math.floor(this.at / 1000))}` : ""}`));
  }

  render() {
    const t = theme();
    const cards = this.panels.map((p, i) => this.card(t, p, i));
    return v_flex()
      .id("thanos-root")
      .track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .on_size_change((s, cx) => { const changed = Math.abs(s.width - this.width) > 40; this.width = s.width; for (const p of this.panels) p.bounds = null; this.rootBounds = null; if (changed) cx.notify(); })
      .on_mouse_move((e) => { this.rootBounds = e.bounds; })
      .relative()
      .size_full()
      .min_h(0)
      .bg(t.background)
      .text_color(t.foreground)
      .text_size(13)
      .child(this.header(t))
      .child(
        v_flex()
          .id("thanos-panels")
          .flex_1()
          .min_h(0)
          .py(6)
          .overflow_y_scrollbar()
          .track_scroll(this.scroll)
          .on_scroll_wheel(() => { for (const p of this.panels) p.bounds = null; })
          .when(this.overlay, (el) => el.child(this.overlayCard(t)))
          .children(cards),
      )
      .child(this.footer(t))
      .when(Boolean(this.picker), (el) => el.child(this.pickerPanel(t)));
  }
}
