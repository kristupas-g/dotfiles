// thanos: a Thanos (Prometheus API) tab, a column of PromQL panels over one
// time range, with graphs drawn by the mod (view.js, chart.js) and queries
// through the app's fetch (thanos.js). cmd-shift-k (`thanos.open`, taken by
// the `thanos-commands` floating block in the layout; also from the palette
// and `herdr-app do thanos.open`) opens a new tab in the shown space, named
// "thanos · <first query>" by the view. `tab.new` with `mod: "thanos"` takes
// props { query } or { queries: [...] } and { range: "3h" }.
//
// With props { role: "commands" } it draws nothing: the floating block that
// takes `thanos.open`. The view copies take `thanos.link` (⌘S: a Thanos URL
// to the clipboard), `thanos.shot` (⇧⌘S: a screenshot of the focused panel to
// the clipboard), `thanos.run`, `thanos.new`, `thanos.duplicate`, `thanos.refresh`.

import { View, div } from "gpui-kit";
import { nextCommand, props, run, spaces } from "herdr";
import { ThanosView, TAB } from "./view.js";

export function openTab(p = {}) {
  const sp = spaces().find((s) => s.active);
  run("tab.new", { name: TAB, ...(sp ? { space: sp.id } : {}), mod: "thanos", props: p });
}

export default class Thanos extends View {
  init(p, cx) {
    if (props()?.role === "commands") {
      cx.spawn(async () => {
        for (;;) {
          const c = await nextCommand();
          if (c === "open") openTab();
        }
      });
      return;
    }
    this.view = new ThanosView();
    this.view.init(props() ?? p ?? {}, cx);
  }

  render(cx) {
    return this.view ? this.view.render(cx) : div();
  }
}
