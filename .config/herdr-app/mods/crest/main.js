// crest: line art in the sidebar's top block, to the right of the window
// buttons: a moonlit ridge with pines (scene.svg, in dim), a fern frond
// (fern.svg, in accent) or a row of pines (pines.svg, in dim), chosen by ART.
// Draws nothing else: the block stays the window-drag area.

import { View, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme } from "herdr";

const ART = "scene"; // "scene" | "fern" | "pines"

export default class Crest extends View {
  render() {
    const t = theme();
    const art = {
      scene: () => svg("mods/crest/scene.svg").w(170).h(48).text_color(t.dim).opacity(0.85),
      fern: () => svg("mods/crest/fern.svg").w(100).h(20).text_color(t.accent).opacity(0.85),
      pines: () => svg("mods/crest/pines.svg").w(96).h(16).text_color(t.dim).opacity(0.8),
    };
    return h_flex().size_full().items_end().justify_end().pr(12).pb(2).child((art[ART] ?? art.scene)());
  }
}
