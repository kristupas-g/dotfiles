// crest: line art in the sidebar's top block, to the right of the window
// buttons: a fern frond in the accent colour (ART), or the mountain ridge
// (ridge.svg, dim). Draws nothing else: the block stays the window-drag area.

import { View, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme } from "herdr";

const ART = "fern"; // "fern" | "ridge"

export default class Crest extends View {
  render() {
    const t = theme();
    return h_flex().size_full().items_end().justify_end().pr(14).pb(4)
      .child(ART === "fern"
        ? svg("mods/crest/fern.svg").w(100).h(20).text_color(t.accent).opacity(0.85)
        : svg("mods/crest/pines.svg").w(96).h(16).text_color(t.dim).opacity(0.8));
  }
}
