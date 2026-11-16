// status-bar: the bottom bar, from Herdr's workspace-status without the machine
// name, the agent count and the palette hint: the FortiClient VPN state (green
// with the profile when connected, red "VPN off" when not; a click toggles it),
// the branch, "N needs you" when an agent is blocked, and Spotify on the right.
//
// Spotify: the logo, the album art, "track — artist", previous, play or
// pause, next, shuffle (green when on) and a volume slider (drag it, or scroll
// over it), all through spotify.applescript, the desktop app's own scripting,
// polled every SP_POLL ms and right after an action. When Spotify isn't
// running the cluster is one button, "Turn on the grooves", which opens it in
// the background and presses play. (No liked-songs heart: the app doesn't
// script it, its window is closed to Accessibility, and the Web API needs an
// app registration of your own.)
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

import { View, div, svg, image } from "gpui-kit";
import { h_flex, Slider, SliderState, SliderTrack, SliderIndicator, SliderThumb } from "gpui-base";
import { spaces, agents, theme, exec, notify, appHome, home, nextCommand, checking } from "herdr";
import { createHash } from "crypto";

const firstLine = (t) => (t ?? "").split("\n").find((l) => l.trim()) ?? "";

const VPN_SERVICE = "VPN";
const VPN_PROFILE = "vinted-vpn v2";
const VPN_PREFS = "com.fortinet.forticlient.macos.vpn";
const POLL = 5000;
const SP_POLL = 3000;
const SPOTIFY_GREEN = "#1db954";
const spotify = (...args) => exec("/usr/bin/osascript", [`${appHome()}/mods/status-bar/spotify.applescript`, ...args], { timeout: 10000 });
// One line per VPN action, for when a click seems to do nothing.
const trace = (m) => exec("/bin/sh", ["-c", 'printf "%s %s\\n" "$(date +%T)" "$1" >> "$2"', "sh", String(m), `${appHome()}/data/status-bar.log`]).catch(() => {});

export default class StatusBar extends View {
  init(_props, cx) {
    this.vpn = { state: "unknown", name: null, how: null };
    this.connecting = false;
    this.sp = { running: false, state: "stopped", name: "", artist: "", art: "", artPath: null, volume: 0, shuffle: false, id: "" };
    this.starting = false; // "Turn on the grooves" pressed
    this.sliding = false; // the volume thumb is being dragged: polls don't move it
    this.volume = SliderState.new({ min: 0, max: 100, step: 1, value: 0 });
    this.volume.on("change", () => { this.sliding = true; });
    this.volume.on("release", (v, cx) => { this.sliding = false; this.setVolume(Number(v), cx); });
    if (checking()) return;
    cx.timer.every(POLL, (cx) => this.poll(cx));
    this.poll(cx);
    cx.timer.every(SP_POLL, (cx) => this.pollSpotify(cx));
    this.pollSpotify(cx);
    // `status-bar.vpn` (toggle), `status-bar.connect`, `status-bar.disconnect`, and
    // `status-bar.playpause` / `.next` / `.previous`: from a key or `herdr-app do`.
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "vpn") this.toggle(cx);
        else if (c === "connect" && this.vpn.state !== "Connected") this.toggle(cx);
        else if (c === "disconnect" && this.vpn.state === "Connected") this.toggle(cx);
        else if (c === "playpause" || c === "next" || c === "previous") this.act(c, cx);
      }
    });
  }

  // The player as spotify.applescript reports it. The art is fetched when the
  // picture changes; the slider follows the volume unless it's being dragged.
  pollSpotify(cx) {
    if (this.pollingSpotify) return;
    this.pollingSpotify = true;
    cx.spawn(async (cx) => {
      try {
        const r = await spotify("state").catch(() => null);
        const lines = r?.code === 0 ? r.stdout.replace(/\n$/, "").split("\n") : ["off"];
        const was = this.sp;
        if (lines[0] !== "on") {
          this.sp = { ...was, running: false, state: "stopped", name: "", artist: "", art: "", artPath: null, id: "" };
        } else {
          const [, state, name, artist, art, volume, shuffle, id] = lines;
          this.sp = { ...was, running: true, state, name, artist, art, volume: Number(volume) || 0, shuffle: shuffle === "true", id };
          this.starting = false;
          if (!this.sliding && this.volume.value() !== this.sp.volume) this.volume.set_value(this.sp.volume);
          if (art !== was.art) this.fetchArt(art, cx);
        }
        cx.notify();
      } finally { this.pollingSpotify = false; }
    });
  }

  // The album art, downloaded once per picture into data/status-bar/art/ (only
  // the current one is kept), then shown through image().
  fetchArt(url, cx) {
    this.sp.artPath = null;
    if (!url) return;
    cx.spawn(async (cx) => {
      const dir = `${appHome()}/data/status-bar/art`;
      const name = `${createHash("sha1").update(url).digest("hex").slice(0, 16)}.jpg`;
      const r = await exec("/bin/sh", ["-c", 'mkdir -p "$1" && find "$1" -type f ! -name "$2" -delete; [ -s "$1/$2" ] || /usr/bin/curl -sfL -o "$1/$2" "$3"', "sh", dir, name, url], { timeout: 15000 }).catch(() => null);
      if (r?.code === 0 && this.sp.art === url) { this.sp.artPath = `data/status-bar/art/${name}`; cx.notify(); }
    });
  }

  // playpause, next, previous, shuffle <bool>, volume <n>: then a fresh poll.
  act(cmd, cx, ...args) {
    if (cmd === "playpause") this.sp.state = this.sp.state === "playing" ? "paused" : "playing"; // shown at once, the poll confirms
    cx.notify();
    cx.spawn(async (cx) => {
      const r = await spotify(cmd, ...args).catch((e) => ({ code: -1, stderr: String(e?.message ?? e) }));
      if (r.code !== 0) notify({ title: "Spotify", body: firstLine(r.stderr) || `${cmd} didn't work`, level: "error" });
      this.pollSpotify(cx);
    });
  }

  setVolume(v, cx) {
    const vol = Math.max(0, Math.min(100, Math.round(v)));
    this.sp.volume = vol;
    this.act("volume", cx, String(vol));
  }

  // The wheel over the slider: 5 a notch, applied once the notches pause.
  wheelVolume(e, cx) {
    const dy = e.delta_lines?.y ?? (e.delta?.y ?? 0) / 20;
    if (!dy) return;
    const vol = Math.max(0, Math.min(100, Math.round(this.sp.volume + (dy > 0 ? 5 : -5))));
    if (vol === this.sp.volume) return;
    this.sp.volume = vol;
    this.volume.set_value(vol);
    cx.notify();
    if (this.wheeling) return;
    this.wheeling = true;
    cx.spawn(async (cx) => {
      await cx.sleep(250);
      this.wheeling = false;
      this.act("volume", cx, String(this.sp.volume));
    });
  }

  // "Turn on the grooves": open Spotify in the background and press play once it answers.
  grooves(cx) {
    if (this.starting) return;
    this.starting = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const o = await exec("/usr/bin/open", ["-g", "-a", "Spotify"], { timeout: 10000 });
        if (o.code !== 0) throw new Error(firstLine(o.stderr) || "couldn't open Spotify");
        let played = false;
        for (let i = 0; i < 30 && !played; i++) {
          await cx.sleep(1000);
          played = (await spotify("play").catch(() => ({ code: 1 }))).code === 0;
        }
        if (!played) notify({ title: "Spotify", body: "Spotify is taking a while to start; press play there", level: "warning" });
      } catch (e) {
        notify({ title: "Spotify", body: String(e?.message ?? e), level: "error" });
      } finally {
        this.starting = false;
        this.pollSpotify(cx);
      }
    });
  }

  spotifyBar(t) {
    const s = this.sp;
    const button = (id, icon, tip, onClick, color) => div().id(id).size(18).flex().items_center().justify_center().rounded(4).cursor_pointer()
      .text_color(color ?? t.muted).hover((h) => h.bg(t.hover).text_color(t.foreground)).tooltip(tip)
      .on_click((_e, cx) => onClick(cx)).child(svg(`mods/status-bar/${icon}.svg`).size(13));
    if (!s.running) {
      return h_flex().id("grooves").h(20).px(8).gap(6).items_center().rounded(5).cursor_pointer().hover((h) => h.bg(t.hover))
        .tooltip("Open Spotify and play").on_click((_e, cx) => this.grooves(cx))
        .child(this.starting ? svg("mods/workspace-chrome/spinner.svg").size(12).text_color(t.working).spin(900) : svg("mods/status-bar/spotify.svg").size(13).text_color(SPOTIFY_GREEN))
        .child(div().text_color(t.muted).child(this.starting ? "Starting the grooves…" : "Turn on the grooves"));
    }
    const playing = s.state === "playing";
    const title = s.name ? `${s.name} — ${s.artist}` : "Nothing playing";
    return h_flex().gap(3).items_center()
      .child(svg("mods/status-bar/spotify.svg").size(13).text_color(SPOTIFY_GREEN).mr(3))
      .when(Boolean(s.artPath), (el) => el.child(image(s.artPath).size(16).rounded(3).mr(3)))
      .child(div().id("sp-title").max_w(280).truncate().mr(4).text_color(playing ? t.foreground : t.muted).tooltip(title).child(title))
      .child(button("sp-prev", "prev", "Previous", (cx) => this.act("previous", cx)))
      .child(button("sp-play", playing ? "pause" : "play", playing ? "Pause" : "Play", (cx) => this.act("playpause", cx), t.foreground))
      .child(button("sp-next", "next", "Next", (cx) => this.act("next", cx)))
      .child(button("sp-shuffle", "shuffle", s.shuffle ? "Shuffle on · click to turn off" : "Shuffle off · click to turn on", (cx) => { this.sp.shuffle = !s.shuffle; this.act("shuffle", cx, String(!s.shuffle)); }, s.shuffle ? SPOTIFY_GREEN : t.dim))
      .child(h_flex().id("sp-volume").ml(4).gap(4).items_center().tooltip(`Volume ${s.volume}`).on_scroll_wheel((e, cx) => this.wheelVolume(e, cx))
        .child(svg("mods/status-bar/volume.svg").size(13).text_color(t.dim))
        .child(Slider.new(this.volume).child(
          SliderTrack.new(this.volume).flex().items_center().h(20).w(64).child(
            SliderIndicator.new(this.volume).relative().w_full().h(4).rounded(2).bg(t.input)
              .range_style((fill) => fill.rounded(2).bg(t.muted))
              .child(SliderThumb.new(this.volume).size(10).rounded(5).bg(t.foreground).ml(-5).mt(-3))))));
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
    return h_flex().size_full().px(10).gap(14).items_center().bg(t.chrome).border_t(1).border_color(t.border).text_size(11.8).text_color(t.muted)
      .child(this.vpnChip(t))
      .when(Boolean(space?.branch), (el) => el.child(h_flex().gap(6).items_center().child(svg("mods/workspace-chrome/branch.svg").size(13)).child(space.branch)))
      .when(needs > 0, (el) => el.child(div().text_color(t.blocked).child(`${needs} needs you`)))
      .child(div().flex_1())
      .child(this.spotifyBar(t));
  }
}
