// glade: a glen at the bottom of the sidebar. glen.svg is the illustration
// (line-art ferns, three gruvbox-red mushrooms, a soft rise of ground, no
// glow); over it a few dim gold fireflies pulse natively (`loop` on opacity, each with its own period),
// so nothing re-renders. Draws nothing else.

import { View, div, image } from "gpui-kit";

// x and y as a share of the block, size in px, period in ms.
const FIREFLIES = [
  { x: 0.10, y: 0.30, size: 3, period: 2600 },
  { x: 0.22, y: 0.55, size: 2, period: 3300 },
  { x: 0.38, y: 0.26, size: 2.5, period: 2100 },
  { x: 0.50, y: 0.48, size: 2, period: 3900 },
  { x: 0.61, y: 0.36, size: 3, period: 2900 },
  { x: 0.72, y: 0.20, size: 2, period: 3700 },
  { x: 0.86, y: 0.50, size: 2.5, period: 2400 },
  { x: 0.94, y: 0.30, size: 2, period: 3100 },
];

export default class Glade extends View {
  render() {
    const fly = (f, i) => div().absolute().left(`${f.x * 100}%`).top(`${f.y * 100}%`)
      .size(f.size * 3).rounded(f.size * 1.5).bg("#d8a65726")
      .flex().items_center().justify_center()
      .child(div().size(f.size).rounded(f.size / 2).bg("#e9d19a"))
      .loop("opacity", { from: 0.15, to: 1, period: f.period, easing: "ease-in-out" });
    return div().size_full().relative().overflow_hidden()
      .child(image("mods/glade/glen.svg").absolute().left(0).bottom(0).w_full().h_full())
      .children(FIREFLIES.map(fly));
  }
}
