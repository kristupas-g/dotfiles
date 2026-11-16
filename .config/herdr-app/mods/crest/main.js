// crest: the sidebar's top block. At the left the time of day (HH:MM, in the
// sidebar font, redrawn once a minute); at the right line art: a moonlit ridge
// with pines (scene.svg, in dim), a fern frond (fern.svg, in accent) or a row
// of pines (pines.svg, in dim), chosen by ART. Nothing is clickable: the
// block stays the window-drag area (the window buttons sit off-window).

import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme, checking } from "herdr";

const ART = "scene"; // "scene" | "fern" | "pines"

const clock = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default class Crest extends View {
  init(_props, cx) {
    this.time = clock();
    if (checking()) return;
    // Every redraw of a mod redraws the window, so notify only when the minute turns.
    cx.timer.every(1000, (cx) => {
      const now = clock();
      if (now !== this.time) { this.time = now; cx.notify(); }
    });
  }

  render() {
    const t = theme();
    const art = {
      scene: () => svg("mods/crest/scene.svg").w(170).h(48).text_color(t.dim).opacity(0.85),
      fern: () => svg("mods/crest/fern.svg").w(100).h(20).text_color(t.accent).opacity(0.85),
      pines: () => svg("mods/crest/pines.svg").w(96).h(16).text_color(t.dim).opacity(0.8),
    };
    return h_flex().size_full().items_end().justify_between().pl(16).pr(12).pb(2)
      .child(div().pb(6).text_size(22).text_color(t.muted).child(this.time))
      .child((art[ART] ?? art.scene)());
  }
}
