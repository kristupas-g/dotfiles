// kube: a k9s-like view of a Kubernetes namespace as a tab. Without props it's
// the tab (view.js): a context and a namespace picked from dropdowns, the
// namespace's deployments, rollouts and statefulsets with replicas and HPA, and
// its troubled pods. Reads clusters through `kubectl --context …` (kubectl.js),
// authenticated by kubelogin as the shells are.
//
// With props { role: "commands" } it draws nothing: the floating block in the
// layout that takes `kube.open` (cmd-k in keys.json; also from the palette and
// `herdr-app do kube.open`) and opens, or goes to, the "k8s" tab of the shown
// space.

import { View, div } from "gpui-kit";
import { nextCommand, props, run, spaces } from "herdr";
import { KubeView } from "./view.js";

const TAB = "k8s";

export function openTab() {
  const sp = spaces().find((s) => s.active);
  const tab = sp?.tabs.find((t) => t.name === TAB);
  if (tab) return run("tab.select", { id: tab.id });
  run("tab.new", { name: TAB, ...(sp ? { space: sp.id } : {}), mod: "kube", props: {} });
}

export default class Kube extends View {
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
    this.view = new KubeView();
    this.view.init(p, cx);
  }

  render(cx) {
    return this.view ? this.view.render(cx) : div();
  }
}
