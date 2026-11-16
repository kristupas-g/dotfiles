// crest: a line-art mountain ridge in the sidebar's top block, to the right of
// the window buttons. Draws nothing else: the block stays the window-drag area.

import { View, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme } from "herdr";

export default class Crest extends View {
  render() {
    const t = theme();
    return h_flex().size_full().items_end().justify_end().pr(16).pb(5)
      .child(svg("mods/crest/ridge.svg").w(96).h(16).text_color(t.dim).opacity(0.8));
  }
}
