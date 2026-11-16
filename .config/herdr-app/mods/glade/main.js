// glade: a mystical glen at the bottom of the sidebar. glen.svg is the
// illustration (ferns in three layers, glowing mushrooms, mist); over it a
// few fireflies pulse natively (`loop` on opacity, each with its own period),
// so nothing re-renders. Draws nothing else.

import { View, div, image } from "gpui-kit";

// x and y as a share of the block, size in px, period in ms.
const FIREFLIES = [
  { x: 0.12, y: 0.30, size: 3, period: 2600 },
  { x: 0.27, y: 0.52, size: 2, period: 3300 },
  { x: 0.41, y: 0.22, size: 2.5, period: 2100 },
  { x: 0.58, y: 0.40, size: 3, period: 2900 },
  { x: 0.70, y: 0.18, size: 2, period: 3700 },
  { x: 0.84, y: 0.46, size: 2.5, period: 2400 },
  { x: 0.93, y: 0.26, size: 2, period: 3100 },
];

export default class Glade extends View {
  render() {
    const fly = (f, i) => div().absolute().left(`${f.x * 100}%`).top(`${f.y * 100}%`)
      .size(f.size * 3).rounded(f.size * 1.5).bg("#9ff5c033")
      .flex().items_center().justify_center()
      .child(div().size(f.size).rounded(f.size / 2).bg("#d6ffe6"))
      .loop("opacity", { from: 0.15, to: 1, period: f.period, easing: "ease-in-out" });
    return div().size_full().relative().overflow_hidden()
      .child(image("mods/glade/glen.svg").absolute().left(0).bottom(0).w_full().h_full())
      .children(FIREFLIES.map(fly));
  }
}
