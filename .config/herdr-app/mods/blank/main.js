// blank: draws nothing. Fills a layout block that should stay (the sidebar top keeps
// its height as the window-drag area under the traffic lights) but show nothing.

import { View, div } from "gpui-kit";

export default class Blank extends View {
  render() {
    return div();
  }
}
