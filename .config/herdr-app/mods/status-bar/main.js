// status-bar: the bottom bar, from Herdr's workspace-status without the machine
// name and the agent count: the FortiClient VPN state (green connected, red
// not; a click connects to the "vinted-vpn v2" profile), the branch, "N needs
// you" when an agent is blocked, and the palette hint (palette-plus, as
// keys.json binds it).
//
// The VPN is FortiClient's network extension, the one service `scutil --nc
// list` shows as "VPN"; its state is `scutil --nc status VPN`. Which profile
// it dials is the VpnName in the extension's preferences (defaults domain
// com.fortinet.forticlient.macos.vpn): a click sets it to VPN_PROFILE and
// starts the service. If that doesn't take within a few seconds, FortiClient
// itself is opened to connect from.

import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, theme, run, window, keys, exec, notify } from "herdr";

const VPN_SERVICE = "VPN";
const VPN_PROFILE = "vinted-vpn v2";
const VPN_PREFS = "com.fortinet.forticlient.macos.vpn";
const POLL = 5000;

export default class StatusBar extends View {
  init(_props, cx) {
    this.vpn = { state: "unknown", name: null };
    this.connecting = false;
    cx.timer.every(POLL, (cx) => this.poll(cx));
    this.poll(cx);
  }

  poll(cx) {
    cx.spawn(async (cx) => {
      const r = await exec("/usr/sbin/scutil", ["--nc", "status", VPN_SERVICE], { timeout: 5000 }).catch(() => null);
      const state = r?.code === 0 ? (r.stdout.split("\n")[0] ?? "").trim() : "unknown";
      const name = (await exec("/usr/bin/defaults", ["read", VPN_PREFS, "VpnName"], { timeout: 5000 }).catch(() => null))?.stdout.trim() || null;
      this.vpn = { state, name };
      if (state === "Connected") this.connecting = false;
      cx.notify();
    });
  }

  connect(cx) {
    if (this.connecting) return;
    if (this.vpn.state === "Connected") return notify({ title: "VPN", body: `Connected to ${this.vpn.name ?? "the VPN"}`, level: "info" });
    this.connecting = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        await exec("/usr/bin/defaults", ["write", VPN_PREFS, "VpnName", VPN_PROFILE], { timeout: 5000 });
        const r = await exec("/usr/sbin/scutil", ["--nc", "start", VPN_SERVICE], { timeout: 10000 });
        if (r.code !== 0) throw new Error(r.stderr.trim() || "scutil couldn't start the VPN");
        for (let i = 0; i < 8; i++) {
          await cx.sleep(1000);
          this.poll(cx);
          await cx.sleep(200);
          if (this.vpn.state === "Connected") return;
        }
        // Not up by itself: FortiClient's window, with the profile selected.
        await exec("/usr/bin/open", ["-a", "FortiClient"]).catch(() => {});
        notify({ title: "VPN", body: `Connect to ${VPN_PROFILE} in FortiClient`, level: "warning" });
      } catch (e) {
        await exec("/usr/bin/open", ["-a", "FortiClient"]).catch(() => {});
        notify({ title: "VPN", body: String(e?.message ?? e), level: "error" });
      } finally {
        this.connecting = false;
        cx.notify();
      }
    });
  }

  // The palette key as actually bound.
  hint() {
    const mac = window()?.platform === "macos";
    const mod = { cmd: mac ? "⌘" : "Ctrl+", ctrl: mac ? "⌃" : "Ctrl+", shift: mac ? "⇧" : "Shift+", alt: mac ? "⌥" : "Alt+", option: mac ? "⌥" : "Alt+" };
    const b = keys().find((k) => k.section === "global" && (k.action === "mod.open:palette-plus" || k.action === "app.palette"));
    const parts = b && b.keys.endsWith("--") ? [...b.keys.slice(0, -2).split("-"), "-"] : b?.keys.split("-");
    const key = parts && parts.map((p) => mod[p.toLowerCase()] ?? p.toUpperCase()).join("");
    return { text: key ? `${key}  commands` : "commands", action: b?.action ?? "app.palette" };
  }

  vpnChip(t) {
    const on = this.vpn.state === "Connected";
    const busy = this.connecting || this.vpn.state === "Connecting";
    const color = on ? t.ansi2 : this.vpn.state === "unknown" ? t.dim : t.blocked;
    const text = busy ? "VPN connecting…" : on ? `VPN ${this.vpn.name ?? "on"}` : "VPN off";
    return h_flex()
      .id("vpn")
      .h(20)
      .px(6)
      .gap(6)
      .items_center()
      .rounded(5)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .tooltip(on ? `FortiClient: connected to ${this.vpn.name ?? "the VPN"}` : `FortiClient: ${this.vpn.state.toLowerCase()}. Click to connect to ${VPN_PROFILE}`)
      .on_click((_e, cx) => this.connect(cx))
      .child(busy ? svg("mods/workspace-chrome/spinner.svg").size(11).text_color(t.working).spin(900) : div().size(8).rounded_full().bg(color))
      .child(div().text_color(on ? t.muted : t.blocked).child(text));
  }

  render() {
    const t = theme();
    const space = spaces().find((s) => s.active);
    const needs = agents().filter((a) => a.status === "blocked").length;
    const hint = this.hint();
    const open = () => (hint.action.startsWith("mod.open:") ? run("mod.open", { name: hint.action.slice(9) }) : run(hint.action));
    return h_flex().size_full().px(10).gap(14).items_center().bg(t.chrome).border_t(1).border_color(t.border).text_size(11.8).text_color(t.muted)
      .child(this.vpnChip(t))
      .when(Boolean(space?.branch), (el) => el.child(h_flex().gap(6).items_center().child(svg("mods/workspace-chrome/branch.svg").size(13)).child(space.branch)))
      .when(needs > 0, (el) => el.child(div().text_color(t.blocked).child(`${needs} needs you`)))
      .child(div().flex_1())
      .child(div().id("palette").text_color(t.dim).cursor_pointer().on_click(open).child(hint.text));
  }
}
