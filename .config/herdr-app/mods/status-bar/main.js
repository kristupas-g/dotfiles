// status-bar: the bottom bar, from Herdr's workspace-status without the machine
// name and the agent count: the FortiClient VPN state (green with the profile
// when connected, red "VPN off" when not; a click toggles it), the branch,
// "N needs you" when an agent is blocked, and the palette hint (palette-plus,
// as keys.json binds it).
//
// FortiClient has two kinds of tunnel. SSL profiles run in its network
// extension, the "VPN" service of `scutil --nc list`, whose state is `scutil
// --nc status VPN` and which `scutil --nc stop VPN` ends. IPsec profiles
// ("vinted-vpn v2") run FortiClient's own iked / fct_tunnel_ctl processes
// instead, so "up" is either of those. Nothing starts a tunnel from the
// command line (the service ignores `scutil --nc start`, FortiClient's CLIs
// need root, its fabricagent://vpn URL only opens the VPN page), so connecting
// and IPsec disconnecting press the buttons in FortiClient's window through
// vpn.applescript, which needs Accessibility permission for Herdr. FortiClient
// hides its window once connected (its "minimize on connect").

import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, theme, run, window, keys, exec, notify, appHome, home, nextCommand } from "herdr";

const firstLine = (t) => (t ?? "").split("\n").find((l) => l.trim()) ?? "";

const VPN_SERVICE = "VPN";
const VPN_PROFILE = "vinted-vpn v2";
const VPN_PREFS = "com.fortinet.forticlient.macos.vpn";
const POLL = 5000;
// One line per VPN action, for when a click seems to do nothing.
const trace = (m) => exec("/bin/sh", ["-c", 'printf "%s %s\\n" "$(date +%T)" "$1" >> "$2"', "sh", String(m), `${appHome()}/data/status-bar.log`]).catch(() => {});

export default class StatusBar extends View {
  init(_props, cx) {
    this.vpn = { state: "unknown", name: null, how: null };
    this.connecting = false;
    cx.timer.every(POLL, (cx) => this.poll(cx));
    this.poll(cx);
    // `status-bar.vpn` (toggle), `status-bar.connect`, `status-bar.disconnect`: from a key or `herdr-app do`.
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "vpn") this.toggle(cx);
        else if (c === "connect" && this.vpn.state !== "Connected") this.toggle(cx);
        else if (c === "disconnect" && this.vpn.state === "Connected") this.toggle(cx);
      }
    });
  }

  // Up when the SSL extension says Connected, or FortiClient's IPsec tunnel
  // processes are running. The profile is the one FortiClient last connected.
  poll(cx) {
    cx.spawn(async (cx) => {
      const ne = await exec("/usr/sbin/scutil", ["--nc", "status", VPN_SERVICE], { timeout: 5000 }).catch(() => null);
      const neState = ne?.code === 0 ? (ne.stdout.split("\n")[0] ?? "").trim() : "unknown";
      const ipsec = (await exec("/usr/bin/pgrep", ["-f", "FortiClient/bin/(fct_tunnel_ctl|iked)"], { timeout: 5000 }).catch(() => ({ code: 1 }))).code === 0;
      const state = neState === "Connected" ? "Connected" : ipsec ? "Connected" : neState === "unknown" && !ipsec ? "unknown" : neState === "Disconnected" || neState === "unknown" ? "Disconnected" : neState;
      const how = neState === "Connected" ? "ssl" : ipsec ? "ipsec" : null;
      const name = state === "Connected" ? (await exec("/usr/bin/plutil", ["-extract", "VPNLastTimeConnection", "raw", "-o", "-", `${home()}/Library/Application Support/Fortinet/FortiClient/fct.plist`], { timeout: 5000 }).catch(() => null))?.stdout.trim() || null : null;
      this.vpn = { state, name, how };
      if (state === "Connected") this.connecting = false;
      cx.notify();
    });
  }

  // FortiClient's window, driven by vpn.applescript: the profile's Connect or Disconnect button.
  async press(profile, action) {
    // -g: without bringing FortiClient to the front; the script hides it again after the press.
    await exec("/usr/bin/open", ["-g", "fabricagent://vpn"], { timeout: 5000 }).catch(() => exec("/usr/bin/open", ["-g", "-a", "FortiClient"]));
    const t0 = Date.now();
    const r = await exec("/usr/bin/osascript", [`${appHome()}/mods/status-bar/vpn.applescript`, profile, action], { timeout: 30000 }).catch((e) => ({ code: -1, stdout: "", stderr: `osascript didn't finish: ${String(e?.message ?? e)}` }));
    trace(`${action} ${profile}: code ${r.code} in ${Date.now() - t0} ms; ${r.stdout.trim()}${r.stderr.trim() ? ` / ${r.stderr.trim()}` : ""}`);
    if (r.code !== 0) {
      const why = firstLine(r.stderr);
      if (/assistive access/i.test(why)) throw new Error("Herdr needs Accessibility permission to press buttons in FortiClient: System Settings → Privacy & Security → Accessibility → add Herdr");
      throw new Error(why || "couldn't drive FortiClient's window");
    }
  }

  // Waits up to `ms` for the VPN to reach `state`; true if it did.
  async settle(state, ms, cx) {
    for (let waited = 0; waited < ms; waited += 1200) {
      await cx.sleep(1000);
      this.poll(cx);
      await cx.sleep(200);
      if (this.vpn.state === state) return true;
    }
    return false;
  }

  // Connected: disconnect (the SSL extension through scutil, IPsec through
  // FortiClient's window). Otherwise: connect to VPN_PROFILE.
  toggle(cx) {
    if (this.connecting) return;
    const was = this.vpn;
    this.connecting = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        if (was.state === "Connected") {
          if (was.how === "ssl") {
            const r = await exec("/usr/sbin/scutil", ["--nc", "stop", VPN_SERVICE], { timeout: 10000 });
            if (r.code !== 0) throw new Error(r.stderr.trim() || "scutil couldn't stop the VPN");
          } else await this.press(was.name ?? VPN_PROFILE, "Disconnect");
          if (!(await this.settle("Disconnected", 15000, cx))) notify({ title: "VPN", body: "Still connected; see FortiClient", level: "warning" });
        } else {
          await exec("/usr/bin/defaults", ["write", VPN_PREFS, "VpnName", VPN_PROFILE], { timeout: 5000 }).catch(() => {});
          await this.press(VPN_PROFILE, "Connect");
          if (!(await this.settle("Connected", 30000, cx))) notify({ title: "VPN", body: `FortiClient is connecting to ${VPN_PROFILE}; it may be waiting for a login`, level: "warning" });
        }
      } catch (e) {
        trace(`error: ${String(e?.message ?? e)}`);
        notify({ title: "VPN", body: String(e?.message ?? e), level: "error", timeout: 12000 });
      } finally {
        trace(`toggle: ${was.state}${was.how ? ` (${was.how})` : ""} -> ${this.vpn.state}${this.vpn.how ? ` (${this.vpn.how})` : ""}`);
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
    const text = busy ? "VPN…" : on ? `VPN ${this.vpn.name ?? "on"}` : "VPN off";
    return h_flex()
      .id("vpn")
      .h(20)
      .px(6)
      .gap(6)
      .items_center()
      .rounded(5)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .tooltip(on ? `FortiClient: connected to ${this.vpn.name ?? "the VPN"}. Click to disconnect` : `FortiClient: ${this.vpn.state.toLowerCase()}. Click to connect to ${VPN_PROFILE}`)
      .on_click((_e, cx) => this.toggle(cx))
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
