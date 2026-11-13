// repo-picker: a new space from a repo in ~/vinted. Opened with cmd-n
// (`mod.open:repo-picker` in keys.json). Type to filter, ↑/↓ to move, Enter
// makes a space named after the repo with the repo as its folder (space-tabs
// then fills it); a repo that already has a space is shown as "open" and Enter
// goes there instead. Esc closes.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, ScrollHandle } from "gpui-base";
import { closeOverlay, exec, home, props, run, spaces, theme } from "herdr";

const ROOT = () => `${home()}/vinted`;
const ROW = 30;

// Every character of `q` in order somewhere in `s`; a plain substring ranks first.
function score(s, q) {
  if (!q) return 1;
  const at = s.indexOf(q);
  if (at >= 0) return 1000 - at;
  let i = 0;
  for (const ch of s) if (ch === q[i]) i++;
  return i === q.length ? 1 : 0;
}

export default class RepoPicker extends View {
  init(_props, cx) {
    this.repos = [];
    this.error = null;
    this.filter = "";
    this.at = 0;
    this.scroll = ScrollHandle.new();
    this.input = InputState.new({ placeholder: "New space from a repo in ~/vinted…" });
    this.input.on("change", (_e, cx) => {
      this.filter = this.input.value();
      this.at = 0;
      cx.notify();
    });
    this.input.on("submit", (_e, cx) => this.go(this.shown()[this.at], cx));
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.handle = cx.focus_handle();
    cx.spawn(async (cx) => {
      try {
        const r = await exec("/usr/bin/find", [ROOT(), "-mindepth", "1", "-maxdepth", "1", "-type", "d", "-not", "-name", ".*"]);
        if (r.code !== 0) throw new Error(r.stderr.trim() || `find exited with ${r.code}`);
        this.repos = r.stdout.split("\n").filter(Boolean).map((p) => p.split("/").pop()).sort((a, b) => a.localeCompare(b));
      } catch (e) {
        this.error = String(e?.message ?? e);
      }
      cx.notify();
    });
  }

  close() {
    closeOverlay(props().overlay);
  }

  shown() {
    const q = this.filter.trim().toLowerCase();
    return this.repos
      .map((name) => ({ name, s: score(name.toLowerCase(), q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || a.name.localeCompare(b.name))
      .map((r) => r.name);
  }

  spaceFor(name) {
    const folder = `${ROOT()}/${name}`;
    return spaces().find((s) => !s.machine && s.folder === folder) ?? null;
  }

  go(name, _cx) {
    if (!name) return;
    this.close();
    const open = this.spaceFor(name);
    if (open) return run("space.select", { id: open.id });
    run("space.new", { name, folder: `${ROOT()}/${name}` });
  }

  render() {
    const t = theme();
    const shown = this.shown();
    this.at = Math.max(0, Math.min(this.at, shown.length - 1));
    const row = (name, i) => {
      const open = this.spaceFor(name);
      const sel = i === this.at;
      return h_flex()
        .id(`repo-${name}`)
        .h(ROW)
        .flex_none()
        .px(10)
        .gap(8)
        .items_center()
        .rounded(7)
        .bg(sel ? t.selected : t.popover)
        .cursor_pointer()
        .hover((s) => s.bg(sel ? t.selected : t.hover))
        .on_click((_e, cx) => this.go(name, cx))
        .child(svg("mods/workspace-chrome/folder.svg").size(14).flex_none().text_color(t.dim))
        .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(name))
        .when(Boolean(open), (el) => el.child(div().text_size(11).text_color(t.dim).child("open")));
    };
    return v_flex()
      .id("repo-picker")
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
          .child(div().flex_1().text_size(15).font_semibold().text_color(t.foreground).child("New space"))
          .child(div().id("rp-esc").px(6).py(2).rounded(5).text_size(11).text_color(t.dim).cursor_pointer().hover((s) => s.bg(t.hover).text_color(t.foreground)).on_click(() => this.close()).child("Esc")),
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
      .when(Boolean(this.error), (el) => el.child(div().text_size(12).text_color(t.blocked).child(`Couldn't list ~/vinted: ${this.error}`)))
      .when(!this.error && !shown.length, (el) => el.child(div().px(10).text_size(12).text_color(t.dim).child(this.repos.length ? "No repo matches." : "Looking for repos…")))
      .child(
        v_flex()
          .id("rp-list")
          .h(Math.min(360, shown.length * ROW))
          .min_h(0)
          .overflow_y_scrollbar()
          .mode("always")
          .track_scroll(this.scroll)
          .children(shown.map(row)),
      )
      .child(div().text_size(11).text_color(t.dim).child(`${shown.length} of ${this.repos.length} · ↑↓ move · Enter opens`));
  }
}
