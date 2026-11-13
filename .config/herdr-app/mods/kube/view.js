// The Kubernetes tab, k9s-style: one context and one namespace at a time,
// picked from dropdowns at the top (type to filter) or with keys, and a list
// under them:
//   Workloads   (w, :workloads / :wl) the namespace's Deployments, Argo Rollouts
//               and StatefulSets with ready/up-to-date/available replicas, their
//               HPA (min–max and the metric now/target) and a health word.
//   Problems    (p, :problems / :pp) the troubled pods of the namespace (not
//               Running, Terminating, or a container not ready), or every pod of
//               the workload that was opened with Enter.
//   :<resource> any kind the cluster has (`kubectl api-resources`, with its
//               short names and k9s aliases like dp), as kubectl's wide table.
// Keys while the tab has the keyboard (the footer lists the ones that apply):
//   :  command (a resource, `ctx <name>`, `ns <name>`)   c / n  context / namespace pickers
//   0  all namespaces   1–9  recent namespaces   /  filter   r  refresh   Esc  back
//   j/k ↑/↓  move   Enter  open (a workload's pods, a pod's details, a namespace)
//   d describe   y yaml   l logs   e edit (nvim)   s shell   ⌃d delete   D delete every troubled pod listed
//   R restart   P promote   F promote fully   A abort   U retry (rollouts)   h edit the HPA
// describe and yaml show in the tab (a read-only code view; Esc goes back, e
// edits). logs is a log view in the tab: the last 500 lines, then every 2 s
// the lines since (`--since-time`), one container or all, following the end
// (f), with timestamps (t) and the filter. edit and shell run in a new terminal
// tab of the space (started through hc, so the tab closes when the program ends).

import { div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, ScrollHandle, EditorState, Editor, VirtualListScrollHandle, Scrollbar, v_virtual_list } from "gpui-base";
import { exec, focused, home, nextCommand, notify, panes, props, run, setShared, settings, shared, spaces, theme } from "herdr";
import { randomBytes } from "crypto";
import { PATH, kubectl, contexts, namespaces, workloads, pods, table, apiResources, useContext, health, hpaLine, age, authError, RESOURCE, del, restart, rolloutAction } from "./kubectl.js";

const EVERY = 30_000;
const LAST = "kube.last";
const RECENT = "kube.recent";
const KIND = { Deployment: "deploy", Rollout: "rollout", StatefulSet: "sts" };
const ROW = 28;
const PICK_ROW = 30;
const LOG_ROW = 18;
const LOG_MAX = 5000;
const LOG_TAIL = 500;
const VIEWS = [
  { id: "workloads", name: "workloads", aliases: ["wl", "workloads"], hint: "deployments, rollouts and statefulsets with HPA" },
  { id: "pods", name: "problems", aliases: ["pp", "problems", "problem"], hint: "pods that aren't running and ready" },
];
// k9s aliases on top of the cluster's short names.
const ALIASES = { dp: "deployments", sec: "secrets", jo: "jobs", no: "nodes" };

// Every character of `q` in order somewhere in `s`; a plain substring ranks first.
function score(s, q) {
  if (!q) return 1;
  const at = s.indexOf(q);
  if (at >= 0) return 1000 - at;
  let i = 0;
  for (const ch of s) if (ch === q[i]) i++;
  return i === q.length ? 1 : 0;
}

const isProd = (c) => /prod/i.test(c?.user ?? "") || /pr\d*$/.test(c?.name ?? "");
const sh = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
const shell = (...parts) => parts.map(sh).join(" ");

export class KubeView {
  init(_p, cx) {
    const p = props() ?? {};
    const last = shared(LAST) ?? {};
    this.context = p.context ?? last.context ?? null;
    this.namespace = p.namespace ?? last.namespace ?? null;
    this.view = p.tab === "pods" ? { kind: "pods" } : { kind: "workloads" };
    this.allNs = Boolean(p.allNs);
    this.pendingResource = p.resource ?? null;
    this.pendingPod = p.pod && ["logs", "describe", "yaml"].includes(p.action) ? { name: p.pod, action: p.action } : null;
    this.back = null;
    this.text = null;
    this.log = null;
    this.logScroll = VirtualListScrollHandle.new();
    this.podsOf = null;
    this.contexts = [];
    this.current = null;
    this.nsCache = {};
    this.nsError = null;
    this.resources = {};
    this.resError = null;
    this.workloads = [];
    this.pods = [];
    this.table = { columns: [], rows: [] };
    this.loaded = null;
    this.loading = false;
    this.slow = false;
    this.paused = false;
    this.error = null;
    this.at = 0;
    this.picker = null;
    this.pickAt = 0;
    this.pickText = "";
    this.expanded = new Set();
    this.selKey = null;
    this.confirm = null;
    this.busy = null;
    this.typing = false;
    this.filterText = "";
    this.filter = InputState.new({ placeholder: "Filter by name…  (/)" });
    this.filter.on("change", (_e, cx) => { this.filterText = this.filter.value(); cx.notify(); });
    this.filter.on("focus", (_e, cx) => { this.typing = true; cx.notify(); });
    this.filter.on("blur", (_e, cx) => { this.typing = false; cx.notify(); });
    this.pick = InputState.new({ placeholder: "" });
    this.pick.on("change", (_e, cx) => { this.pickText = this.pick.value(); this.pickAt = 0; cx.notify(); });
    this.pick.on("submit", (_e, cx) => this.choose(cx));
    this.handle = cx.focus_handle();
    this.scroll = ScrollHandle.new();
    this.pickScroll = ScrollHandle.new();
    cx.timer.every(EVERY, (cx) => { if (!this.paused && !this.picker && !this.confirm && !["text", "logs"].includes(this.view.kind)) this.refresh(cx); });
    cx.timer.every(2000, (cx) => { if (this.view.kind === "logs" && this.log && !this.log.busy && !this.log.error) this.loadLogs(cx); });
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "focus") this.handle.focus();
        else if (c === "refresh") this.refresh(cx, true);
        cx.notify();
      }
    });
    this.boot(cx);
  }

  // The kubeconfig's contexts; the view starts on the last one used, else the current one.
  boot(cx) {
    cx.spawn(async (cx) => {
      try {
        const { current, contexts: list } = await contexts();
        this.contexts = list;
        this.current = current;
        if (!this.context || !list.some((c) => c.name === this.context)) this.context = current ?? list[0]?.name ?? null;
        if (!this.namespace) this.namespace = list.find((c) => c.name === this.context)?.namespace ?? "default";
        setShared(LAST, { context: this.context, namespace: this.namespace });
        this.rename(true);
      } catch (e) {
        this.error = `kubeconfig: ${String(e?.message ?? e)}`;
      }
      cx.notify();
      if (this.pendingResource) {
        const name = this.pendingResource;
        this.pendingResource = null;
        await this.loadResources(cx);
        const res = this.findResource(name);
        if (res) return this.openResource(res, cx);
      }
      if (this.pendingPod) {
        const { name, action } = this.pendingPod;
        this.pendingPod = null;
        const r = { key: `${this.namespace}/${name}`, name, ns: this.namespace, kind: "Pod", res: "pods" };
        return action === "logs" ? this.openLogs(r, cx) : this.openText(action, r, cx);
      }
      this.refresh(cx, true);
    });
  }

  persist() {
    setShared(LAST, { context: this.context, namespace: this.namespace });
    this.rename();
  }

  // Names this copy's tab "<context> - <namespace>". The tab is the focused
  // one when it holds a kube pane: at boot the fresh tab (still named "k8s"
  // by kube.open), later the tab the person is changing. Any other tab is left alone.
  rename(fresh = false) {
    const tab = focused()?.tab;
    if (!tab || !panes().some((p) => p.tab === tab && p.mod === "kube")) return;
    const t = spaces().flatMap((s) => s.tabs).find((x) => x.id === tab);
    if (!t || (fresh && t.name !== "k8s")) return;
    const name = `${this.context ?? "k8s"} - ${this.allNs ? "all" : this.namespace ?? "?"}`;
    if (t.name !== name) run("tab.rename", { id: tab, name });
  }

  recent() {
    const r = shared(RECENT);
    return Array.isArray(r) ? r : [];
  }

  // What the shown list needs, as one key; a load whose key is stale is thrown away.
  want() {
    return JSON.stringify([this.context, this.namespace, this.view.kind, this.view.res?.full ?? null, this.allNs, this.podsOf?.key ?? null, this.text?.key ?? null, this.log?.key ?? null]);
  }

  refresh(cx, manual = false) {
    if (manual) this.paused = false;
    if (this.view.kind === "text") return this.loadText(cx);
    if (this.view.kind === "logs") return this.loadLogs(cx, true);
    if (this.loading || !this.context || !this.namespace) return;
    this.loading = true;
    this.slow = false;
    cx.notify();
    cx.timer.after(4000, (cx) => { if (this.loading) { this.slow = true; cx.notify(); } });
    cx.spawn(async (cx) => {
      const key = this.want();
      const { context, namespace, view, allNs, podsOf } = this;
      const ns = allNs ? null : namespace;
      try {
        if (view.kind === "workloads") {
          const list = await workloads(context, ns);
          if (key === this.want()) this.workloads = list;
        } else if (view.kind === "pods") {
          const list = await pods(context, podsOf ? podsOf.ns : ns, { selector: podsOf?.selector });
          if (key === this.want()) this.pods = list;
        } else {
          const t = await table(context, view.res, ns);
          if (key === this.want()) this.table = t;
        }
        if (key === this.want()) {
          this.loaded = key;
          this.error = null;
          this.at = Date.now();
        }
      } catch (e) {
        this.error = String(e?.message ?? e);
        this.paused = true; // no silent retries: a failed login would open the browser again
      }
      this.loading = false;
      this.slow = false;
      cx.notify();
      if (key !== this.want() && !this.paused) this.refresh(cx);
    });
  }

  // ---- changing what's shown ----

  reset() {
    this.workloads = [];
    this.pods = [];
    this.table = { columns: [], rows: [] };
    this.podsOf = null;
    this.expanded.clear();
    this.selKey = null;
    this.confirm = null;
  }

  setContext(name, cx) {
    if (name === this.context) return;
    this.context = name;
    this.reset();
    this.persist();
    this.refresh(cx, true);
  }

  setNamespace(ns, cx) {
    if (ns !== this.namespace) {
      this.namespace = ns;
      this.reset();
      this.persist();
    }
    this.allNs = false;
    setShared(RECENT, [ns, ...this.recent().filter((n) => n !== ns)].slice(0, 9));
    this.refresh(cx, true);
  }

  setView(view, cx) {
    this.view = view;
    this.podsOf = null;
    this.expanded.clear();
    this.selKey = null;
    this.confirm = null;
    cx.notify();
    if (this.loaded !== this.want()) this.refresh(cx, true);
  }

  openResource(res, cx) {
    this.table = { columns: [], rows: [] };
    this.setView({ kind: "resource", res }, cx);
  }

  showPodsOf(w, cx) {
    this.podsOf = { key: w.key, kind: w.kind, name: w.name, ns: w.ns, selector: w.selector };
    this.view = { kind: "pods" };
    this.pods = [];
    this.expanded.clear();
    this.selKey = null;
    cx.notify();
    this.refresh(cx, true);
  }

  toggleAll(cx) {
    this.allNs = !this.allNs;
    this.reset();
    this.rename();
    cx.notify();
    this.refresh(cx, true);
  }

  makeCurrent(cx) {
    const name = this.context;
    cx.spawn(async (cx) => {
      try {
        await useContext(name);
        this.current = name;
        notify({ title: "kubectl context set", body: `${name} is now the current context in your shells`, level: "info", timeout: 3000 });
      } catch (e) {
        notify({ title: "Couldn't set the context", body: String(e?.message ?? e), level: "error" });
      }
      cx.notify();
    });
  }

  // ---- the rows and the selected one ----

  matches(name) {
    const q = this.filterText.trim().toLowerCase();
    return !q || name.toLowerCase().includes(q);
  }

  // The shown rows, each as { key, name, ns, kind, res, ... } with what its actions need.
  rows() {
    const v = this.view;
    if (v.kind === "text" || v.kind === "logs") return [];
    if (v.kind === "workloads") return this.workloads.filter((w) => this.matches(w.name)).map((w) => ({ key: w.key, name: w.name, ns: w.ns, kind: w.kind, res: RESOURCE[w.kind], w }));
    if (v.kind === "pods") return this.pods.filter((p) => this.matches(p.name)).map((p) => ({ key: p.key, name: p.name, ns: p.ns, kind: "Pod", res: "pods", pod: p }));
    return this.table.rows.filter((r) => this.matches(r.name)).map((r) => ({ key: `${r.ns ?? ""}/${r.name}`, name: r.name, ns: v.res.namespaced ? r.ns : null, kind: v.res.kind, res: v.res.full, cells: r.cells }));
  }

  selected(rows = this.rows()) {
    return rows.find((r) => r.key === this.selKey) ?? null;
  }

  move(delta, cx) {
    const rows = this.rows();
    if (!rows.length) return;
    let i = rows.findIndex((r) => r.key === this.selKey);
    i = i < 0 ? (delta > 0 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, i + delta));
    this.selKey = rows[i].key;
    this.scroll.scroll_to_item(i);
    cx.notify();
  }

  // Enter: a workload's pods, a pod's details, a namespace row as the namespace, else describe.
  enter(cx) {
    const r = this.selected();
    if (!r) return;
    if (r.w) return this.showPodsOf(r.w, cx);
    if (r.pod) {
      this.expanded.has(r.key) ? this.expanded.delete(r.key) : this.expanded.add(r.key);
      return cx.notify();
    }
    if (this.view.res?.name === "namespaces") return this.setNamespace(r.name, cx);
    this.describe(r, cx);
  }

  // ---- actions on the selected row ----

  // hc (herdr-core) as a program, like kubectl: never on the UI thread.
  hcx(args, timeout = 30000) {
    return exec("/bin/sh", ["-c", `${PATH}:$HOME/.local/bin; exec hc "$@"`, "sh", ...args], { timeout });
  }

  // A terminal tab of the shown space running `script` (sh), started through
  // hc so the tab closes when the program ends. Resolves with the terminal's
  // address.
  async program(title, script, cx) {
    const sp = spaces().find((s) => s.active);
    if (!sp || sp.machine) throw new Error("No local space is shown");
    const id = `tbk${randomBytes(6).toString("hex")}`;
    const cwd = focused()?.cwd || sp.folder || home();
    const r = await this.hcx(["run", "--bg", "--json", "--no-parent", "--cwd", cwd, "--label", `herdr.space=${sp.id}`, "--label", `herdr.tab=${id}`, "--", "sh", "-c", `${PATH}; export PATH; ${script}`]);
    if (r.code !== 0) throw new Error(r.stderr?.trim() || "hc run failed");
    for (let i = 0; i < 30 && !spaces().some((s) => s.tabs.some((t) => t.id === id)); i++) await cx.sleep(100);
    run("tab.rename", { id, name: title });
    run("tab.select", { id });
    try {
      return JSON.parse(r.stdout).address;
    } catch {
      return null;
    }
  }

  // Runs one action at a time; errors become toasts.
  act(what, fn, cx) {
    if (this.busy) return;
    this.busy = what;
    this.confirm = null;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        await fn(cx);
      } catch (e) {
        notify({ title: `Couldn't ${what}`, body: String(e?.message ?? e), level: "error", timeout: 8000 });
      }
      this.busy = null;
      cx.notify();
    });
  }

  kube(r) {
    return ["kubectl", "--context", this.context, ...(r.ns ? ["-n", r.ns] : [])];
  }

  describe(r, cx) {
    this.openText("describe", r, cx);
  }

  yaml(r, cx) {
    this.openText("yaml", r, cx);
  }

  // Leaves the list view for a text or log view; Esc comes back to it.
  leave(view) {
    if (!["text", "logs"].includes(this.view.kind)) this.back = { view: this.view, selKey: this.selKey, podsOf: this.podsOf };
    this.view = view;
    this.confirm = null;
  }

  goBack(cx) {
    const b = this.back;
    this.text = null;
    this.log = null;
    this.view = b?.view ?? { kind: "workloads" };
    this.selKey = b?.selKey ?? null;
    this.podsOf = b?.podsOf ?? null;
    this.back = null;
    cx.notify();
    if (this.loaded !== this.want()) this.refresh(cx, true);
  }

  // describe or yaml of a resource, as a read-only code view in the tab.
  openText(kind, r, cx) {
    this.leave({ kind: "text" });
    this.text = { kind, r, key: `${kind}:${r.res}/${r.ns ?? ""}/${r.name}`, state: null, error: null, busy: false, lines: 0 };
    cx.notify();
    this.loadText(cx);
  }

  loadText(cx) {
    const t = this.text;
    if (!t || t.busy) return;
    t.busy = true;
    cx.notify();
    cx.spawn(async (cx) => {
      const r = t.r;
      const args = t.kind === "yaml" ? ["get", r.res, r.name, "-o", "yaml"] : ["describe", r.res, r.name];
      try {
        const out = await kubectl(this.context, [...args, ...(r.ns ? ["-n", r.ns] : []), "--request-timeout=25s"], { parse: false, timeout: 60000 });
        if (this.text !== t) return;
        t.state = EditorState.new({ ...(t.kind === "yaml" ? { language: "yaml" } : {}), value: out, readonly: true, line_numbers: t.kind === "yaml", folding: t.kind === "yaml", font_family: settings().font_family ?? "JetBrains Mono", font_size: 12 });
        t.lines = out.split("\n").length;
        t.error = null;
      } catch (e) {
        t.error = String(e?.message ?? e);
      }
      t.busy = false;
      cx.notify();
    });
  }

  // Shows a pod's logs in the tab: the last LOG_TAIL lines, then the lines
  // since every 2 s (the timer in init). One container, or all with a prefix.
  openLogs(r, cx) {
    if (r.res !== "pods") return;
    this.leave({ kind: "logs" });
    this.log = { r, key: `logs:${r.ns}/${r.name}`, containers: [], init: [], container: null, lines: [], since: null, follow: true, timestamps: false, busy: false, error: null, loaded: false };
    cx.notify();
    cx.spawn(async (cx) => {
      const l = this.log;
      try {
        const names = await kubectl(this.context, ["get", "pod", r.name, "-n", r.ns, "-o", "jsonpath={range .spec.initContainers[*]}i:{.name}{\"\\n\"}{end}{range .spec.containers[*]}c:{.name}{\"\\n\"}{end}", "--request-timeout=25s"], { parse: false });
        if (this.log !== l) return;
        for (const line of names.split("\n")) {
          if (line.startsWith("i:")) l.init.push(line.slice(2));
          else if (line.startsWith("c:")) l.containers.push(line.slice(2));
        }
        if (l.containers.length === 1) l.container = l.containers[0];
      } catch (e) {
        l.error = String(e?.message ?? e);
      }
      cx.notify();
      this.loadLogs(cx, true);
    });
  }

  // The log lines: all from the tail (initial), else those since the last one seen.
  loadLogs(cx, initial = false) {
    const l = this.log;
    if (!l || l.busy || (!initial && !l.loaded)) return;
    l.busy = true;
    if (initial) l.error = null;
    cx.notify();
    cx.spawn(async (cx) => {
      const r = l.r;
      const which = l.container ? ["-c", l.container] : ["--all-containers", "--prefix"];
      const range = initial || !l.since ? [`--tail=${LOG_TAIL}`] : [`--since-time=${l.since}`];
      try {
        const out = await kubectl(this.context, ["logs", r.name, "-n", r.ns, ...which, ...range, "--timestamps", "--request-timeout=25s"], { parse: false, timeout: 60000 });
        if (this.log !== l) return;
        const fresh = [];
        for (const raw of out.split("\n")) {
          if (!raw) continue;
          let line = raw;
          let c = l.container ?? "";
          const m = /^\[pod\/[^/\]]+\/([^\]]+)\] (.*)$/.exec(line);
          if (m) [c, line] = [m[1], m[2]];
          const sp = line.indexOf(" ");
          const ts = sp > 0 ? line.slice(0, sp) : "";
          fresh.push({ c, ts, text: sp > 0 ? line.slice(sp + 1) : line });
        }
        if (initial) l.lines = fresh;
        else {
          // --since-time includes the last second again: drop what's already there.
          const seen = new Set(l.lines.slice(-200).map((x) => `${x.c}|${x.ts}|${x.text}`));
          for (const x of fresh) if (!seen.has(`${x.c}|${x.ts}|${x.text}`)) l.lines.push(x);
        }
        if (l.lines.length > LOG_MAX) l.lines.splice(0, l.lines.length - LOG_MAX);
        const last = l.lines.map((x) => x.ts).filter(Boolean).sort().pop();
        if (last) l.since = last;
        l.loaded = true;
        l.error = null;
        if (l.follow && fresh.length) this.logScroll.scroll_to_bottom();
      } catch (e) {
        l.error = String(e?.message ?? e);
      }
      l.busy = false;
      cx.notify();
    });
  }

  // The next container to show: all → each container → all.
  nextContainer(cx) {
    const l = this.log;
    if (!l) return;
    const all = [null, ...l.containers, ...l.init];
    l.container = all[(all.indexOf(l.container) + 1) % all.length];
    l.lines = [];
    l.since = null;
    l.loaded = false;
    cx.notify();
    this.loadLogs(cx, true);
  }

  // The old way: `kubectl logs -f` in a terminal tab.
  logsTerminal(r, cx) {
    this.act("show logs in a terminal", (cx) => this.program(`logs ${r.name}`, `exec ${shell(...this.kube(r), "logs", "-f", "--all-containers", "--tail=500", r.name)}`, cx), cx);
  }

  // `kubectl edit` with nvim; when it ends, the list is read again and the
  // result is a toast. On an error kubectl's message stays until Enter.
  edit(r, cx, res = r.res, name = r.name) {
    this.act("edit", async (cx) => {
      const addr = await this.program(`edit ${name}`, `KUBE_EDITOR=nvim ${shell(...this.kube(r), "edit", `${res}/${name}`)} || { echo; echo "Press Enter to close"; read -r _; exit 1; }`, cx);
      if (!addr) return;
      cx.spawn(async (cx) => {
        for (;;) {
          const w = await this.hcx(["wait", addr, "--json", "--timeout", "170"], 200000);
          let j = null;
          try { j = JSON.parse(w.stdout); } catch { break; }
          const ended = j?.ended ?? j?.wait?.ended;
          if (ended) {
            const code = j?.exit_code ?? j?.wait?.exit_code;
            notify({ title: code === 0 ? `${name} edited` : `Edit of ${name} ended`, body: code === 0 ? "Reading the list again" : "nvim was quit, or kubectl refused the change", level: code === 0 ? "info" : "warning", timeout: 4000 });
            this.refresh(cx, true);
            break;
          }
          if (w.code !== 0) break;
        }
      });
    }, cx);
  }

  logs(r, cx) {
    this.openLogs(r, cx);
  }

  shellInto(r, cx) {
    this.act("open a shell", (cx) => this.program(`sh ${r.name}`, `exec ${shell(...this.kube(r), "exec", "-it", r.name, "--", "sh", "-c", "command -v bash >/dev/null && exec bash || exec sh")}`, cx), cx);
  }

  // Asks in the footer first; y or Enter runs it.
  ask(text, tone, fn, cx) {
    this.confirm = { text, tone, fn };
    cx.notify();
  }

  prodNote() {
    return isProd(this.contexts.find((c) => c.name === this.context)) ? " on PROD" : "";
  }

  remove(r, cx) {
    this.ask(`Delete ${r.kind.toLowerCase()} ${r.name}${this.prodNote()}?`, "blocked", (cx) => this.act("delete", async (cx) => {
      await del(this.context, r.ns, r.res, r.name);
      notify({ title: `${r.name} deleted`, body: `${r.kind} in ${r.ns ?? this.context}`, level: "info", timeout: 3000 });
      this.refresh(cx, true);
    }, cx), cx);
  }

  // Every troubled pod in the shown list (the filter narrows it), one
  // `kubectl delete` per namespace. Only in the problem pods view: a workload's
  // pods have R for that.
  removeAll(cx) {
    if (this.view.kind !== "pods" || this.podsOf) return;
    const rows = this.rows().filter((r) => r.pod && !r.pod.deleting);
    if (!rows.length) return notify({ title: "Nothing to delete", body: "No troubled pods in the list (terminating ones are left alone)", level: "info", timeout: 3000 });
    const byNs = new Map();
    for (const r of rows) byNs.set(r.ns, [...(byNs.get(r.ns) ?? []), r.name]);
    const where = byNs.size === 1 ? [...byNs.keys()][0] : `${byNs.size} namespaces`;
    this.ask(`Delete ${rows.length} troubled pod${rows.length === 1 ? "" : "s"} in ${where}${this.prodNote()}?${this.filterText.trim() ? " (the filtered ones)" : ""}`, "blocked", (cx) => this.act(`delete ${rows.length} pods`, async (cx) => {
      let done = 0;
      const errors = [];
      for (const [ns, names] of byNs) {
        try {
          await del(this.context, ns, "pods", names);
          done += names.length;
        } catch (e) {
          errors.push(`${ns}: ${String(e?.message ?? e)}`);
        }
      }
      notify({ title: `${done} pod${done === 1 ? "" : "s"} deleted`, body: errors.join("\n") || `Their controllers will make new ones`, level: errors.length ? "warning" : "info", timeout: 5000 });
      this.refresh(cx, true);
    }, cx), cx);
  }

  restartRow(r, cx) {
    if (!r.w) return;
    this.ask(`Restart ${KIND[r.kind]} ${r.name}${this.prodNote()}? (a rolling restart of its pods)`, "working", (cx) => this.act("restart", async (cx) => {
      await restart(this.context, r.w);
      notify({ title: `${r.name} restarting`, level: "info", timeout: 3000 });
      this.refresh(cx, true);
    }, cx), cx);
  }

  rollout(r, action, cx, full = false) {
    if (r.kind !== "Rollout" || !r.w) return;
    const words = { promote: full ? "Promote fully (skip all steps)" : "Promote", abort: "Abort", retry: "Retry (undo the abort of)" };
    this.ask(`${words[action]} rollout ${r.name}${this.prodNote()}?`, action === "abort" ? "blocked" : "working", (cx) => this.act(action, async (cx) => {
      const out = await rolloutAction(this.context, r.w, action, { full });
      notify({ title: `${r.name}: ${action}${full ? " --full" : ""}`, body: String(out ?? "").trim().split("\n")[0] || "done", level: "info", timeout: 4000 });
      this.refresh(cx, true);
    }, cx), cx);
  }

  // ---- the pickers ----

  openPicker(kind, cx) {
    this.picker = kind;
    this.pickText = "";
    this.pickAt = 0;
    this.pick.set_value("");
    cx.notify();
    cx.timer.after(60, () => this.pick.focus());
    if (kind === "namespace" && !this.nsCache[this.context]) this.loadNamespaces(cx);
    if (kind === "command" && !this.resources[this.context]) cx.spawn((cx) => this.loadResources(cx));
  }

  loadNamespaces(cx) {
    const ctx = this.context;
    this.nsError = null;
    cx.spawn(async (cx) => {
      try {
        this.nsCache[ctx] = await namespaces(ctx);
      } catch (e) {
        this.nsError = String(e?.message ?? e);
      }
      cx.notify();
    });
  }

  async loadResources(cx) {
    const ctx = this.context;
    if (this.resources[ctx]) return;
    this.resError = null;
    try {
      this.resources[ctx] = await apiResources(ctx);
    } catch (e) {
      this.resError = String(e?.message ?? e);
    }
    cx.notify();
  }

  findResource(word) {
    const q = (ALIASES[word] ?? word).toLowerCase();
    const list = this.resources[this.context] ?? [];
    return list.find((r) => r.name === q || r.full === q) ?? list.find((r) => r.short.includes(q)) ?? list.find((r) => r.kind.toLowerCase() === q) ?? null;
  }

  closePicker(cx) {
    this.picker = null;
    this.handle.focus();
    cx.notify();
  }

  pickItems() {
    const q = this.pickText.trim().toLowerCase();
    if (this.picker === "context") {
      return this.contexts
        .map((c) => ({ c, s: Math.max(score(c.name.toLowerCase(), q), score((c.cluster ?? "").toLowerCase(), q) / 2) }))
        .filter((r) => r.s > 0)
        .sort((a, b) => b.s - a.s || a.c.name.localeCompare(b.c.name))
        .map((r) => ({ id: r.c.name, label: r.c.name, ctx: r.c }));
    }
    if (this.picker === "namespace") {
      const recent = this.recent();
      const list = this.nsCache[this.context] ?? [];
      const rows = [...recent, ...list.filter((n) => !recent.includes(n))]
        .map((n) => ({ n, s: score(n.toLowerCase(), q), r: recent.indexOf(n) }))
        .filter((r) => r.s > 0)
        .sort((a, b) => (a.r >= 0 && b.r >= 0 ? a.r - b.r : a.r >= 0 ? -1 : b.r >= 0 ? 1 : b.s - a.s || a.n.localeCompare(b.n)))
        .map((r) => ({ id: r.n, label: r.n, digit: r.r >= 0 && r.r < 9 ? String(r.r + 1) : null }));
      // A namespace the list doesn't have (no permission to list them, say) can still be typed.
      if (q && !rows.some((r) => r.id === q)) rows.push({ id: q, label: q, typed: true });
      return rows;
    }
    // Command mode: `ctx name`, `ns name`, a view, or a resource (name, short name, kind, alias).
    const [word, ...rest] = q.split(/\s+/);
    if ((word === "ctx" || word === "ns") && rest.length) {
      const arg = rest.join(" ");
      const names = word === "ctx" ? this.contexts.map((c) => c.name) : [...new Set([...this.recent(), ...(this.nsCache[this.context] ?? [])])];
      const rows = names.map((n) => ({ n, s: score(n.toLowerCase(), arg) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).map((r) => ({ id: `${word} ${r.n}`, label: r.n, cmd: word, arg: r.n, hint: word === "ctx" ? "context" : "namespace" }));
      if (word === "ns" && !rows.some((r) => r.arg === arg)) rows.push({ id: `ns ${arg}`, label: arg, cmd: "ns", arg, hint: "namespace, as typed" });
      return rows;
    }
    const builtins = [
      ...VIEWS.map((v) => ({ id: `view:${v.id}`, label: v.name, aliases: v.aliases.filter((a) => a !== v.name), hint: v.hint, view: v.id, s: Math.max(...v.aliases.map((a) => (a === word ? 2000 : a.startsWith(word) ? 500 : 0))) })),
      { id: "cmd:ctx", label: "ctx", aliases: [], hint: "switch context (ctx <name>, or the picker)", cmd: "ctx", s: "ctx".startsWith(word) ? 400 : 0 },
      { id: "cmd:ns", label: "ns", aliases: [], hint: "switch namespace (ns <name>, or the picker)", cmd: "ns", s: "ns".startsWith(word) ? 400 : 0 },
    ];
    const alias = ALIASES[word];
    const resources = (this.resources[this.context] ?? []).map((r) => {
      const names = [r.name, ...r.short, r.kind.toLowerCase()];
      let s = 0;
      if (!word) s = 1;
      else if (alias === r.name || r.short.includes(word) || r.name === word) s = 2000;
      else if (names.some((n) => n.startsWith(word))) s = 500 - r.name.length;
      else if (names.some((n) => n.includes(word))) s = 100 - r.name.length;
      return { id: `res:${r.full}`, label: r.name, aliases: [...r.short, ...Object.keys(ALIASES).filter((a) => ALIASES[a] === r.name)], hint: `${r.kind}${r.group ? ` · ${r.group}` : ""}${r.namespaced ? "" : " · cluster-wide"}`, res: r, s };
    });
    return [...builtins, ...resources].filter((i) => i.s > 0).sort((a, b) => b.s - a.s || a.label.localeCompare(b.label));
  }

  choose(cx) {
    const items = this.pickItems();
    const item = items[this.pickAt] ?? items[0];
    const kind = this.picker;
    const text = this.pickText.trim();
    this.closePicker(cx);
    if (kind === "context") return item && this.setContext(item.id, cx);
    if (kind === "namespace") return item && this.setNamespace(item.id, cx);
    if (!item) {
      if (text) notify({ title: `No resource "${text}"`, body: this.resError ?? "Not in this cluster's api-resources", level: "warning", timeout: 3000 });
      return;
    }
    if (item.cmd === "ctx") return item.arg ? this.setContext(item.arg, cx) : this.openPicker("context", cx);
    if (item.cmd === "ns") return item.arg ? this.setNamespace(item.arg, cx) : this.openPicker("namespace", cx);
    if (item.view) return this.setView({ kind: item.view }, cx);
    if (item.res) return this.openResource(item.res, cx);
  }

  // ---- keys ----

  key(e, cx) {
    const k = e.key;
    const m = e.modifiers ?? {};
    if (m.platform || m.alt) return;
    if (this.picker) {
      const n = this.pickItems().length;
      if (k === "escape") this.closePicker(cx);
      else if (k === "down" || (m.control && k === "n")) this.pickAt = n ? (this.pickAt + 1) % n : 0;
      else if (k === "up" || (m.control && k === "p")) this.pickAt = n ? (this.pickAt + n - 1) % n : 0;
      else if (k === "enter") return this.choose(cx);
      else return;
      this.pickScroll.scroll_to_item(this.pickAt);
      cx.stop_propagation();
      return cx.notify();
    }
    if (this.typing) {
      if (k === "enter") { this.handle.focus(); this.typing = false; cx.stop_propagation(); return cx.notify(); }
      if (k !== "escape") return;
      this.filter.set_value("");
      this.filterText = "";
      this.typing = false;
      this.handle.focus();
      cx.stop_propagation();
      return cx.notify();
    }
    if (this.confirm) {
      if (k === "y" || k === "enter") { const fn = this.confirm.fn; this.confirm = null; fn(cx); }
      else if (k === "n" || k === "escape") this.confirm = null;
      else return;
      cx.stop_propagation();
      return cx.notify();
    }
    if (this.view.kind === "text" && this.text) {
      const tr = this.text.r;
      if (k === "escape") this.goBack(cx);
      else if (k === "e") this.edit(tr, cx);
      else if (k === "r") this.loadText(cx);
      else if (k === "y" && this.text.kind !== "yaml") this.openText("yaml", tr, cx);
      else if (k === "d" && this.text.kind !== "describe") this.openText("describe", tr, cx);
      else if (k === "l" && tr.res === "pods") this.openLogs(tr, cx);
      else if (k === "s" && tr.res === "pods") this.shellInto(tr, cx);
      else return;
      cx.stop_propagation();
      return cx.notify();
    }
    if (this.view.kind === "logs" && this.log) {
      const l = this.log;
      if (k === "escape") this.goBack(cx);
      else if (k === "f") { l.follow = !l.follow; if (l.follow) this.logScroll.scroll_to_bottom(); }
      else if (k === "c") this.nextContainer(cx);
      else if (k === "t") l.timestamps = !l.timestamps;
      else if (k === "r") this.loadLogs(cx, true);
      else if (k === "/") this.filter.focus();
      else if (k === "o") this.logsTerminal(l.r, cx);
      else if (k === "C") { l.lines = []; }
      else if (k === "d") this.openText("describe", l.r, cx);
      else if (k === "y") this.openText("yaml", l.r, cx);
      else if (k === "s") this.shellInto(l.r, cx);
      else if (k === "g") this.logScroll.scroll_to_item(0);
      else if (k === "G") this.logScroll.scroll_to_bottom();
      else return;
      cx.stop_propagation();
      return cx.notify();
    }
    const r = this.selected();
    if (m.control) {
      if (k === "d" && r) this.remove(r, cx);
      else return;
      cx.stop_propagation();
      return cx.notify();
    }
    if (k === ":" || (m.shift && k === ";")) this.openPicker("command", cx);
    else if (k === "c") this.openPicker("context", cx);
    else if (k === "n") this.openPicker("namespace", cx);
    else if (k === "/") this.filter.focus();
    else if (k === "r") this.refresh(cx, true);
    else if (k === "w") this.setView({ kind: "workloads" }, cx);
    else if (k === "p") this.setView({ kind: "pods" }, cx);
    else if (k === "0") this.toggleAll(cx);
    else if (/^[1-9]$/.test(k)) { const ns = this.recent()[Number(k) - 1]; if (ns) this.setNamespace(ns, cx); }
    else if (k === "j" || k === "down") this.move(1, cx);
    else if (k === "k" || k === "up") this.move(-1, cx);
    else if (k === "enter") this.enter(cx);
    else if (k === "d" && r) this.describe(r, cx);
    else if (k === "y" && r) this.yaml(r, cx);
    else if (k === "e" && r) this.edit(r, cx);
    else if (k === "l" && r?.res === "pods") this.logs(r, cx);
    else if (k === "s" && r?.res === "pods") this.shellInto(r, cx);
    else if (k === "h" && r?.w?.hpa) this.edit(r, cx, RESOURCE.HorizontalPodAutoscaler, r.w.hpa.name);
    else if (k === "R" && r?.w) this.restartRow(r, cx);
    else if (k === "D") this.removeAll(cx);
    else if (k === "P" && r?.kind === "Rollout") this.rollout(r, "promote", cx);
    else if (k === "F" && r?.kind === "Rollout") this.rollout(r, "promote", cx, true);
    else if (k === "A" && r?.kind === "Rollout") this.rollout(r, "abort", cx);
    else if (k === "U" && r?.kind === "Rollout") this.rollout(r, "retry", cx);
    else if (k === "escape") {
      if (this.podsOf) this.setView({ kind: "pods" }, cx);
      else if (this.filterText) { this.filter.set_value(""); this.filterText = ""; }
      else if (this.expanded.size) this.expanded.clear();
      else if (this.view.kind === "resource") this.setView({ kind: "workloads" }, cx);
      else this.selKey = null;
    } else return;
    cx.stop_propagation();
    cx.notify();
  }

  // ---- drawing ----

  iconButton(t, id, icon, tip, onClick, { spin = false, on = false } = {}) {
    return div()
      .id(id)
      .size(26)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(6)
      .text_color(on ? t.accent : t.dim)
      .cursor_pointer()
      .hover((s) => s.text_color(t.foreground).bg(t.hover))
      .tooltip(tip)
      .on_click((_e, cx) => onClick(cx))
      .child(spin ? svg("mods/workspace-chrome/spinner.svg").size(14).spin(900) : svg(icon).size(14));
  }

  // A header dropdown button: a label and a chevron.
  dropButton(t, id, label, tip, onClick, { tone = null, tag = null } = {}) {
    return h_flex()
      .id(id)
      .h(26)
      .px(8)
      .gap(5)
      .flex_none()
      .items_center()
      .rounded(6)
      .border_1()
      .border_color(tone ? t[tone] + "88" : t.border)
      .bg(t.background)
      .text_size(12.5)
      .text_color(t.foreground)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .tooltip(tip)
      .on_click((_e, cx) => onClick(cx))
      .child(div().max_w(260).truncate().font_medium().child(label))
      .when(Boolean(tag), (el) => el.child(this.chip(t, tag, tone ?? "dim")))
      .child(svg("mods/workspace-chrome/chevron-down.svg").size(11).text_color(t.dim));
  }

  chip(t, text, tone) {
    return div().flex_none().px(5).h(16).rounded(4).bg(t[tone] + "26").text_size(10).font_medium().text_color(t[tone]).flex().items_center().child(text);
  }

  tabButton(t, id, label, on, onClick, close = null) {
    return h_flex()
      .id(id)
      .h(24)
      .pl(10)
      .pr(close ? 6 : 10)
      .gap(6)
      .flex_none()
      .items_center()
      .rounded(6)
      .text_size(12)
      .bg(on ? t.selected : t.background)
      .text_color(on ? t.foreground : t.muted)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => onClick(cx))
      .child(div().max_w(320).truncate().child(label))
      .when(Boolean(close), (el) =>
        el.child(div().id(`${id}-x`).size(16).rounded(4).flex().items_center().justify_center().text_color(t.dim).cursor_pointer().hover((s) => s.bg(t.hover).text_color(t.foreground)).on_click((_e, cx) => { cx.stop_propagation(); close(cx); }).child(svg("mods/workspace-chrome/x.svg").size(11))));
  }

  header(t) {
    const ctx = this.contexts.find((c) => c.name === this.context);
    const prod = isProd(ctx);
    const v = this.view;
    const unhealthy = this.workloads.filter((w) => ["blocked", "working"].includes(health(w)[1])).length;
    const since = this.at ? `${age(new Date(this.at).toISOString())} ago` : "never";
    const status = this.error
      ? div().text_size(11.5).text_color(t.blocked).child(`kubectl: ${this.error}${authError(this.error) ? " · If a browser opened, finish the login there, then refresh (r)." : ""}`)
      : this.slow ? div().text_size(11.5).text_color(t.working).child("Waiting for kubectl… a browser login may have opened.")
      : null;
    const working = this.busy ? `${this.busy}…` : this.text?.busy ? `${this.text.kind} ${this.text.r.name}…` : this.log && !this.log.loaded && !this.log.error ? `logs of ${this.log.r.name}…` : this.loading && this.slow ? "waiting for kubectl…" : null;
    const summary = v.kind === "workloads" && this.workloads.length ? (unhealthy ? [`${unhealthy} not healthy`, t.working] : ["all healthy", t.dim])
      : v.kind === "pods" && !this.podsOf && this.loaded === this.want() ? (this.pods.length ? [`${this.pods.length} troubled`, t.working] : ["no troubled pods", t.dim])
      : v.kind === "resource" && this.loaded === this.want() ? [`${this.table.rows.length} ${v.res.name}`, t.dim]
      : null;
    return v_flex()
      .flex_none()
      .px(14)
      .pt(10)
      .pb(8)
      .gap(8)
      .border_b(1)
      .border_color(t.border)
      .child(
        h_flex()
          .gap(8)
          .items_center()
          .child(svg("icons/kubectl.svg").size(16).flex_none().text_color(t.accent))
          .child(this.dropButton(t, "kube-ctx", this.context ?? "context…", "Context (c, or :ctx <name>). Clusters from ~/.kube/config", (cx) => this.openPicker("context", cx), { tone: prod ? "blocked" : null, tag: prod ? "prod" : null }))
          .child(this.dropButton(t, "kube-ns", this.allNs ? "all namespaces" : this.namespace ?? "namespace…", "Namespace (n, or :ns <name>; 1–9 recent, 0 all)", (cx) => this.openPicker("namespace", cx)))
          .child(this.iconButton(t, "kube-refresh", "mods/kube/icons/refresh.svg", `Refreshed ${since}. Refresh now (r)${this.paused ? ". Auto-refresh is paused until then" : ""}`, (cx) => this.refresh(cx, true), { spin: this.loading }))
          .child(this.iconButton(t, "kube-use", "mods/workspace-chrome/terminal.svg", this.current === this.context ? `${this.context} is kubectl's current context` : `Make ${this.context} kubectl's current context, for your shells`, (cx) => this.makeCurrent(cx), { on: this.current === this.context }))
          .child(div().flex_1())
          .when(Boolean(working), (el) => el.child(h_flex().gap(6).items_center().px(8).h(22).rounded(6).bg(t.accent + "1f").child(svg("mods/workspace-chrome/spinner.svg").size(12).text_color(t.accent).spin(900)).child(div().text_size(11.5).text_color(t.accent).child(working))))
          .when(Boolean(summary) && !working, (el) => el.child(div().text_size(11.5).text_color(summary[1]).child(summary[0]))),
      )
      .when(Boolean(status), (el) => el.child(status))
      .child(
        h_flex()
          .gap(4)
          .items_center()
          .child(this.tabButton(t, "kube-tab-workloads", `Workloads${v.kind === "workloads" && this.workloads.length ? ` · ${this.workloads.length}` : ""}`, v.kind === "workloads", (cx) => this.setView({ kind: "workloads" }, cx)))
          .child(this.tabButton(t, "kube-tab-pods", `Problem pods${v.kind === "pods" && !this.podsOf ? ` · ${this.pods.length}` : ""}`, v.kind === "pods" && !this.podsOf, (cx) => this.setView({ kind: "pods" }, cx)))
          .when(Boolean(this.podsOf), (el) => el.child(this.tabButton(t, "kube-tab-of", `Pods of ${this.podsOf.name} · ${this.pods.length}`, true, () => {}, (cx) => this.setView({ kind: "pods" }, cx))))
          .when(v.kind === "resource", (el) => el.child(this.tabButton(t, "kube-tab-res", `:${v.res.name}${this.loaded === this.want() ? ` · ${this.table.rows.length}` : ""}`, true, () => {}, (cx) => this.setView({ kind: "workloads" }, cx))))
          .when(v.kind === "text" && Boolean(this.text), (el) => el.child(this.tabButton(t, "kube-tab-text", `${this.text.kind} ${this.text.r.name}`, true, () => {}, (cx) => this.goBack(cx))))
          .when(v.kind === "logs" && Boolean(this.log), (el) => el.child(this.tabButton(t, "kube-tab-logs", `logs ${this.log.r.name}${this.log.container ? ` · ${this.log.container}` : ""}`, true, () => {}, (cx) => this.goBack(cx))))
          .child(
            div()
              .id("kube-cmd")
              .h(24)
              .px(8)
              .flex()
              .items_center()
              .rounded(6)
              .text_size(12)
              .text_color(t.muted)
              .cursor_pointer()
              .hover((s) => s.bg(t.hover).text_color(t.foreground))
              .tooltip("Any resource, with autocomplete (:)")
              .on_click((_e, cx) => this.openPicker("command", cx))
              .child(":"),
          )
          .child(
            h_flex()
              .flex_1()
              .h(24)
              .ml(2)
              .px(8)
              .gap(6)
              .items_center()
              .rounded(6)
              .border_1()
              .border_color(this.typing ? t.accent : t.border)
              .bg(t.background)
              .child(svg("mods/workspace-chrome/search.svg").size(12).flex_none().text_color(t.dim))
              .child(Input.new(this.filter).flex_1().h_full().text_size(12).text_color(t.foreground)),
          )
          .child(
            div()
              .id("kube-all")
              .h(24)
              .px(8)
              .flex()
              .items_center()
              .rounded(6)
              .border_1()
              .border_color(this.allNs ? t.accent : t.border)
              .text_size(11.5)
              .text_color(this.allNs ? t.foreground : t.muted)
              .cursor_pointer()
              .hover((s) => s.bg(t.hover))
              .tooltip("All namespaces (0). For problem pods that's only the cluster's Pending, Failed and Unknown pods; not-ready pods show per namespace.")
              .on_click((_e, cx) => this.toggleAll(cx))
              .child("all namespaces"),
          ),
      );
  }

  columns(t, cols) {
    return h_flex()
      .flex_none()
      .h(22)
      .px(10)
      .gap(8)
      .items_center()
      .text_size(10.5)
      .text_color(t.dim)
      .whitespace_nowrap()
      .children(cols.map(([label, w]) => (w ? div().w(w).flex_none().truncate().child(label) : div().flex_1().min_w(0).truncate().child(label))));
  }

  dot(t, tone) {
    if (tone === "working") return svg("mods/workspace-chrome/spinner.svg").size(10).flex_none().text_color(t.working).spin(900);
    if (tone === "dim") return div().size(8).flex_none().rounded_full().border(1.5).border_color(t.dim);
    return div().size(8).flex_none().rounded_full().bg(t[tone]);
  }

  // A list row's frame: selection, hover, click selects, double-click opens.
  rowFrame(t, r, onClick = null) {
    const sel = r.key === this.selKey;
    return h_flex()
      .id(`row-${r.key}`)
      .h(ROW)
      .flex_none()
      .px(10)
      .gap(8)
      .items_center()
      .rounded(5)
      .text_size(12.5)
      .whitespace_nowrap()
      .bg(sel ? t.selected : t.background)
      .cursor_pointer()
      .hover((s) => s.bg(sel ? t.selected : t.hover))
      .on_click((e, cx) => {
        this.selKey = r.key;
        this.handle.focus();
        if (onClick) onClick(cx);
        else if (e.click_count === 2) this.enter(cx);
        cx.notify();
      });
  }

  workloadRow(t, r, now, showNs) {
    const w = r.w;
    const [word, tone] = health(w);
    const short = w.ready < w.desired && w.desired > 0;
    const h = w.hpa;
    const atMax = h && h.max != null && h.desired >= h.max;
    const hpaTip = h ? `HPA ${h.name}: ${h.min}–${h.max}, ${h.current} now, ${h.desired} wanted${h.conditions.filter((c) => c.status !== "True" || c.type === "ScalingLimited").map((c) => `\n${c.type}: ${c.reason}${c.message ? ` — ${c.message}` : ""}`).join("")}\nh edits it` : "No HPA";
    return this.rowFrame(t, r)
      .tooltip(`${w.kind} ${w.name}${w.message ? `\n${w.message}` : ""}\nEnter or double-click lists its pods`)
      .child(div().w(52).flex_none().text_size(10.5).text_color(t.dim).child(KIND[w.kind] ?? w.kind.toLowerCase()))
      .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(w.name))
      .when(showNs, (el) => el.child(div().w(120).flex_none().truncate().text_size(11.5).text_color(t.muted).child(w.ns)))
      .child(h_flex().w(104).flex_none().gap(5).items_center().child(this.dot(t, tone)).child(div().truncate().text_size(11.5).text_color(t[tone]).child(word)))
      .child(div().w(56).flex_none().text_color(short ? t.blocked : t.foreground).child(`${w.ready}/${w.desired}`))
      .child(div().w(56).flex_none().text_color(w.updated < w.desired ? t.working : t.dim).child(String(w.updated)))
      .child(div().w(56).flex_none().text_color(w.available < w.desired ? t.working : t.dim).child(String(w.available)))
      .child(div().id(`hpa-${w.key}`).w(170).flex_none().truncate().text_size(11.5).text_color(h ? (atMax ? t.blocked : t.muted) : t.dim).tooltip(hpaTip).child(h ? hpaLine(h) : "—"))
      .child(div().w(40).flex_none().text_size(11.5).text_color(t.dim).child(age(w.created, now)));
  }

  workloadsBody(t, rows) {
    const now = Date.now();
    const showNs = this.allNs;
    const list = rows.map((r) => this.workloadRow(t, r, now, showNs));
    return v_flex()
      .flex_1()
      .min_h(0)
      .child(this.columns(t, [["KIND", 52], ["NAME", 0], ...(showNs ? [["NAMESPACE", 120]] : []), ["STATUS", 104], ["READY", 56], ["UPDATED", 56], ["AVAIL", 56], ["HPA MIN–MAX · METRIC NOW/TARGET", 170], ["AGE", 40]]))
      .child(this.list(t, "kube-workloads", list, this.loading && !this.workloads.length ? "Loading…" : this.workloads.length ? "Nothing matches the filter." : this.error ? "" : `No deployments, rollouts or statefulsets in ${this.allNs ? "the cluster" : this.namespace}.`));
  }

  list(t, id, rows, empty) {
    return v_flex()
      .id(id)
      .flex_1()
      .min_h(0)
      .px(4)
      .pb(8)
      .overflow_y_scrollbar()
      .mode("always")
      .track_scroll(this.scroll)
      .on_mouse_down("left", () => this.handle.focus())
      .children(rows)
      .when(!rows.length, (el) => el.child(div().px(10).py(8).text_size(12).text_color(t.dim).child(empty)));
  }

  podRow(t, r, now, showNs) {
    const p = r.pod;
    const open = this.expanded.has(p.key);
    const row = this.rowFrame(t, r, (cx) => {
      open ? this.expanded.delete(p.key) : this.expanded.add(p.key);
      cx.notify();
    })
      .when(Boolean(p.detail) && !open, (el) => el.tooltip(p.detail))
      .child(svg(`mods/workspace-chrome/chevron-${open ? "down" : "right"}.svg`).size(10).flex_none().text_color(t.dim))
      .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(p.name))
      .when(showNs, (el) => el.child(div().w(120).flex_none().truncate().text_size(11.5).text_color(t.muted).child(p.ns)))
      .child(h_flex().w(150).flex_none().gap(5).items_center().child(this.dot(t, p.tone)).child(div().truncate().text_size(11.5).text_color(t[p.tone]).child(p.status)))
      .child(div().w(48).flex_none().text_color(p.ready < p.total ? t.working : t.foreground).child(`${p.ready}/${p.total}`))
      .child(div().w(56).flex_none().text_color(p.restarts ? t.working : t.dim).child(String(p.restarts)))
      .child(div().w(40).flex_none().text_size(11.5).text_color(t.dim).child(age(p.created, now)))
      .child(div().w(150).flex_none().truncate().text_size(11).text_color(t.dim).text_ellipsis_start().child(p.node ?? ""));
    if (!open) return row;
    return v_flex().flex_none().child(row).child(this.podDetail(t, r));
  }

  podDetail(t, r) {
    const p = r.pod;
    const line = (label, text, tone = "muted") => h_flex().gap(8).items_start().text_size(11.5).child(div().w(72).flex_none().text_color(t.dim).child(label)).child(div().flex_1().min_w(0).text_color(t[tone]).child(text));
    const button = (id, label, tip, onClick) =>
      div()
        .id(`${id}-${p.key}`)
        .h(22)
        .px(8)
        .flex()
        .items_center()
        .rounded(5)
        .border_1()
        .border_color(t.border)
        .text_size(11.5)
        .text_color(t.foreground)
        .cursor_pointer()
        .hover((s) => s.bg(t.hover))
        .tooltip(tip)
        .on_click((_e, cx) => { cx.stop_propagation(); this.selKey = r.key; onClick(cx); })
        .child(label);
    const container = (c, init) => {
      const st = c.state ?? {};
      const what = st.kind === "running" ? "running" : st.kind === "waiting" ? `waiting: ${st.reason ?? "?"}` : st.kind === "terminated" ? `terminated: ${st.reason ?? "?"}${st.exit != null ? ` (exit ${st.exit})` : ""}` : "no state";
      const last = c.last?.kind === "terminated" ? ` · last: ${c.last.reason ?? "?"}${c.last.exit != null ? ` (exit ${c.last.exit})` : ""}` : "";
      const tone = st.kind === "running" && (c.ready || init) ? "ansi2" : st.kind === "terminated" && st.reason === "Completed" ? "dim" : st.kind === "running" ? "working" : "blocked";
      return v_flex()
        .gap(2)
        .child(
          h_flex().gap(6).items_center().text_size(11.5)
            .child(this.dot(t, tone))
            .child(div().font_medium().text_color(t.foreground).child(`${init ? "init " : ""}${c.name}`))
            .child(div().text_color(t[tone]).child(what))
            .when(Boolean(c.restarts), (el) => el.child(div().text_color(t.working).child(`${c.restarts} restarts`)))
            .child(div().text_color(t.dim).child(last)),
        )
        .when(Boolean(st.message), (el) => el.child(div().pl(14).text_size(11).text_color(t.muted).child(st.message)));
    };
    return v_flex()
      .flex_none()
      .mx(10)
      .mb(6)
      .p(10)
      .gap(6)
      .rounded(6)
      .bg(t.raised)
      .child(
        h_flex()
          .gap(6)
          .items_center()
          .child(button("logs", "Logs", "kubectl logs -f --all-containers, in a new tab (l)", (cx) => this.logs(r, cx)))
          .child(button("describe", "Describe", "kubectl describe pod, in nvim (d)", (cx) => this.describe(r, cx)))
          .child(button("yaml", "YAML", "kubectl get -o yaml, in nvim (y)", (cx) => this.yaml(r, cx)))
          .child(button("shell", "Shell", "kubectl exec -it … -- sh, in a new tab (s)", (cx) => this.shellInto(r, cx)))
          .child(button("delete", "Delete", "kubectl delete pod, after asking (⌃d)", (cx) => this.remove(r, cx)))
          .child(div().flex_1())
          .child(div().text_size(11).text_color(t.dim).child(`${p.phase ?? "?"}${p.owner?.kind ? ` · ${p.owner.kind} ${p.owner.name}` : ""}`)),
      )
      .when(Boolean(p.detail), (el) => el.child(line("message", p.detail, "foreground")))
      .children(p.conditions.filter((c) => c.reason || c.message).map((c) => line(c.type, `${c.reason ?? ""}${c.message ? ` — ${c.message}` : ""}`)))
      .children(p.init.filter((c) => c.state?.kind !== "terminated" || c.state?.reason !== "Completed").map((c) => container(c, true)))
      .children(p.containers.map((c) => container(c, false)));
  }

  podsBody(t, rows) {
    const now = Date.now();
    const showNs = this.allNs && !this.podsOf;
    const list = rows.map((r) => this.podRow(t, r, now, showNs));
    const nothing = this.podsOf ? `No pods match ${this.podsOf.name}'s selector.` : this.allNs ? "No Pending, Failed or Unknown pods in the cluster." : `Every pod in ${this.namespace} is running and ready.`;
    return v_flex()
      .flex_1()
      .min_h(0)
      .child(this.columns(t, [["", 10], ["NAME", 0], ...(showNs ? [["NAMESPACE", 120]] : []), ["STATUS", 150], ["READY", 48], ["RESTARTS", 56], ["AGE", 40], ["NODE", 150]]))
      .child(this.list(t, "kube-pods", list, this.loading && !this.pods.length ? "Loading…" : this.pods.length ? "Nothing matches the filter." : this.error ? "" : this.loaded === this.want() ? nothing : ""));
  }

  // kubectl's own table for any resource: columns sized by their longest cell, NAME stretches.
  resourceBody(t, rows) {
    const cols = this.table.columns;
    const iName = cols.indexOf("NAME");
    const widths = cols.map((c, i) => {
      if (i === iName) return 0;
      const longest = Math.max(c.length, ...rows.map((r) => (r.cells[i] ?? "").length));
      return Math.max(56, Math.min(380, Math.round(longest * 6.6) + 14));
    });
    const list = rows.map((r) =>
      this.rowFrame(t, r).children(
        r.cells.map((cell, i) => {
          const w = widths[i];
          const long = w && cell.length * 6.6 + 14 > w;
          const color = i === iName ? t.foreground : /^(Running|Ready|Active|Bound|True|Healthy|Complete|Succeeded|Available)$/.test(cell) ? t.ansi2 : /Error|Failed|BackOff|False|Degraded|NotReady|Pending|Terminating|Unknown|Evicted/.test(cell) ? t.blocked : t.muted;
          const el = (w ? div().w(w).flex_none() : div().flex_1().min_w(160)).truncate().text_size(i === iName ? 12.5 : 11.5).text_color(color).child(cell);
          return long ? el.id(`cell-${r.key}-${i}`).tooltip(cell) : el;
        }),
      ),
    );
    const res = this.view.res;
    return v_flex()
      .flex_1()
      .min_h(0)
      .child(this.columns(t, cols.map((c, i) => [c, widths[i]])))
      .child(this.list(t, `kube-res-${res.full}`, list, this.loading && !this.table.rows.length ? "Loading…" : this.table.rows.length ? "Nothing matches the filter." : this.error ? "" : this.loaded === this.want() ? `No ${res.name} ${res.namespaced ? (this.allNs ? "in the cluster" : `in ${this.namespace}`) : "here"}.` : ""));
  }

  // describe or yaml as a read-only code view.
  textBody(t) {
    const x = this.text;
    if (!x) return div().flex_1();
    const note = (msg, color) => v_flex().flex_1().items_center().justify_center().child(div().text_size(12).text_color(color).child(msg));
    if (x.error) return note(`kubectl: ${x.error}`, t.blocked);
    if (!x.state) return note(`Reading ${x.kind} of ${x.r.name}…`, t.dim);
    return v_flex().flex_1().min_h(0).child(Editor.new(x.state).size_full());
  }

  // The log view: a toolbar (containers, follow, count) and a virtual list of lines.
  logsBody(t) {
    const l = this.log;
    if (!l) return div().flex_1();
    const q = this.filterText.trim().toLowerCase();
    const lines = q ? l.lines.filter((x) => x.text.toLowerCase().includes(q) || x.c.toLowerCase().includes(q)) : l.lines;
    const mono = settings().font_family ?? "JetBrains Mono";
    const chip = (id, label, on, onClick, tip) =>
      div().id(id).h(20).px(7).flex().items_center().rounded(5).border_1().border_color(on ? t.accent : t.border).text_size(11).text_color(on ? t.foreground : t.muted).cursor_pointer().hover((s) => s.bg(t.hover)).tooltip(tip).on_click((_e, cx) => { onClick(cx); cx.notify(); }).child(label);
    const pick = (name) => (cx) => { l.container = name; l.lines = []; l.since = null; l.loaded = false; this.loadLogs(cx, true); };
    const all = l.containers.length + l.init.length > 1;
    const toolbar = h_flex()
      .flex_none()
      .px(14)
      .h(30)
      .gap(6)
      .items_center()
      .border_b(1)
      .border_color(t.border)
      .when(all, (el) => el.child(chip("log-all", "all", l.container === null, pick(null), "Every container, each line prefixed (c cycles)")))
      .children(l.containers.map((c) => chip(`log-c-${c}`, c, l.container === c, pick(c), `Only ${c}`)))
      .children(l.init.map((c) => chip(`log-i-${c}`, `init ${c}`, l.container === c, pick(c), `Only the init container ${c}`)))
      .child(div().flex_1())
      .child(chip("log-ts", "time", l.timestamps, () => { l.timestamps = !l.timestamps; }, "Show timestamps (t)"))
      .child(chip("log-follow", l.follow ? "following" : "follow", l.follow, () => { l.follow = !l.follow; if (l.follow) this.logScroll.scroll_to_bottom(); }, "Keep the end in view as lines arrive (f)"))
      .child(div().text_size(11).text_color(t.dim).child(`${lines.length}${q ? ` of ${l.lines.length}` : ""} lines${l.busy ? " · reading…" : ""}`));
    const colors = { "": t.muted };
    const palette = [t.ansi4, t.ansi5, t.ansi6, t.ansi3, t.ansi2, t.ansi1];
    [...l.containers, ...l.init].forEach((c, i) => { colors[c] = palette[i % palette.length]; });
    const row = (x) => {
      const bad = /\b(error|fatal|panic|exception|traceback)\b/i.test(x.text);
      const warn = !bad && /\b(warn|warning)\b/i.test(x.text);
      return h_flex()
        .h(LOG_ROW)
        .items_center()
        .px(10)
        .gap(8)
        .whitespace_nowrap()
        .text_size(11.5)
        .font_family(mono)
        .when(l.timestamps, (el) => el.child(div().flex_none().text_color(t.dim).child(x.ts.replace(/\.\d+Z$/, "Z").replace("T", " "))))
        .when(!l.container && Boolean(x.c), (el) => el.child(div().flex_none().w(110).truncate().text_color(colors[x.c] ?? t.muted).child(x.c)))
        .child(div().flex_1().min_w(0).truncate().text_color(bad ? t.blocked : warn ? t.working : t.foreground).child(x.text));
    };
    const empty = l.error ? `kubectl: ${l.error}` : !l.loaded ? `Reading the last ${LOG_TAIL} lines…` : q ? "No line matches the filter." : "No log lines yet.";
    return v_flex()
      .flex_1()
      .min_h(0)
      .child(toolbar)
      .child(
        lines.length
          ? div().flex_1().min_h(0).relative()
              .child(v_virtual_list("kube-log", lines.length, LOG_ROW, (i) => `${i}:${lines[i].ts}`, (range) => lines.slice(range.start, range.end).map(row)).size_full().track_scroll(this.logScroll))
              .child(Scrollbar.vertical("kube-log").absolute().inset_0())
          : div().flex_1().px(14).py(10).text_size(12).text_color(l.error ? t.blocked : t.dim).child(empty),
      );
  }

  // The bottom line: where we are, and the keys that apply now (or the question being asked).
  footer(t, rows) {
    const r = this.selected(rows);
    const key = (cap, label) => h_flex().gap(4).items_center().flex_none()
      .child(div().px(4).h(16).rounded(3).bg(t.raised).text_size(10).text_color(t.muted).flex().items_center().child(cap))
      .child(div().text_size(11).text_color(t.dim).child(label));
    const v = this.view;
    const where = `${v.kind === "text" ? `${this.text?.kind} ${this.text?.r.name}` : v.kind === "logs" ? `logs ${this.log?.r.name}` : v.kind === "resource" ? `:${v.res.name}` : v.kind === "workloads" ? "workloads" : this.podsOf ? `pods of ${this.podsOf.name}` : "problem pods"} · ${this.context ?? "?"} / ${this.allNs ? "all" : this.namespace ?? "?"}`;
    let hints;
    if (v.kind === "text" && this.text) {
      const pod = this.text.r.res === "pods";
      hints = h_flex().gap(10).items_center().children([key("Esc", "back"), key("e", "edit"), key("r", "reload"), this.text.kind === "yaml" ? key("d", "describe") : key("y", "yaml"), ...(pod ? [key("l", "logs"), key("s", "shell")] : [])]);
    } else if (v.kind === "logs" && this.log) {
      const l = this.log;
      hints = h_flex().gap(10).items_center().children([key("Esc", "back"), key("f", l.follow ? "following" : "follow"), key("c", "container"), key("t", "time"), key("/", "filter"), key("g/G", "top/end"), key("C", "clear"), key("o", "terminal"), key("d", "describe"), key("s", "shell")]);
    } else if (this.confirm) {
      hints = h_flex().gap(10).items_center()
        .child(div().text_size(12).text_color(t[this.confirm.tone] ?? t.foreground).child(this.confirm.text))
        .child(key("y", "yes"))
        .child(key("n", "no"));
    } else if (this.busy) {
      hints = h_flex().gap(6).items_center().child(svg("mods/workspace-chrome/spinner.svg").size(11).text_color(t.working).spin(900)).child(div().text_size(11).text_color(t.dim).child(`${this.busy}…`));
    } else {
      const list = [key(":", "cmd"), key("c", "ctx"), key("n", "ns"), key("0-9", "ns"), key("/", "filter"), key("r", "refresh")];
      if (r) {
        list.push(key("↵", r.w ? "pods" : r.pod ? "details" : v.res?.name === "namespaces" ? "use" : "describe"));
        list.push(key("d", "describe"), key("y", "yaml"), key("e", "edit"));
        if (r.res === "pods") list.push(key("l", "logs"), key("s", "shell"));
        if (r.w?.hpa) list.push(key("h", "hpa"));
        if (r.w) list.push(key("R", "restart"));
        if (r.kind === "Rollout") list.push(key("P", "promote"), key("F", "full"), r.w?.abort ? key("U", "retry") : key("A", "abort"));
        list.push(key("⌃d", "delete"));
      } else list.push(key("j/k", "select"));
      if (v.kind === "pods" && !this.podsOf && this.pods.length) list.push(key("D", "delete all"));
      hints = h_flex().gap(10).items_center().children(list);
    }
    return h_flex()
      .flex_none()
      .h(26)
      .px(14)
      .gap(12)
      .items_center()
      .border_t(1)
      .border_color(t.border)
      .child(div().flex_none().max_w(420).truncate().text_size(11).text_color(t.dim).child(where))
      .child(div().flex_1())
      .child(hints);
  }

  pickerPanel(t) {
    const kind = this.picker;
    const items = this.pickItems();
    this.pickAt = Math.max(0, Math.min(this.pickAt, items.length - 1));
    const row = (it, i) => {
      const sel = i === this.pickAt;
      const c = it.ctx;
      return h_flex()
        .id(`pick-${it.id}`)
        .h(PICK_ROW)
        .flex_none()
        .px(10)
        .gap(8)
        .items_center()
        .rounded(6)
        .bg(sel ? t.selected : t.popover)
        .cursor_pointer()
        .hover((s) => s.bg(sel ? t.selected : t.hover))
        .on_click((_e, cx) => { this.pickAt = i; this.choose(cx); })
        .when(Boolean(it.digit), (el) => el.child(div().w(12).flex_none().text_size(11).text_color(t.accent).child(it.digit)))
        .child(div().flex_none().text_size(12.5).font_medium().text_color(t.foreground).child(it.label))
        .when(Boolean(c) && isProd(c), (el) => el.child(this.chip(t, "prod", "blocked")))
        .when(Boolean(c?.namespace), (el) => el.child(div().text_size(11).text_color(t.dim).child(c.namespace)))
        .when(Boolean(it.aliases?.length), (el) => el.child(div().flex_none().text_size(11).text_color(t.accent).child(it.aliases.join(" "))))
        .when(Boolean(it.hint), (el) => el.child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.dim).child(it.hint)))
        .when(Boolean(it.typed), (el) => el.child(div().text_size(11).text_color(t.dim).child("as typed")))
        .child(div().flex_1())
        .when(it.id === (kind === "context" ? this.context : kind === "namespace" ? this.namespace : null), (el) => el.child(div().text_size(11).text_color(t.dim).child("shown")))
        .when(kind === "context" && it.id === this.current, (el) => el.child(div().text_size(11).text_color(t.accent).child("kubectl current")));
    };
    const loading = (kind === "namespace" && !this.nsCache[this.context] && !this.nsError) || (kind === "command" && !this.resources[this.context] && !this.resError);
    const hint = kind === "context" ? "↑↓ move · Enter shows it here · the terminal button in the header makes it kubectl's current context"
      : kind === "namespace" ? "↑↓ move · Enter · 1–9 are the recent ones, 0 is all · a name not in the list can be typed"
      : "a resource by name, short name or kind (svc, cm, ro, dp…) · ctx <name> · ns <name> · wl, pp";
    return v_flex()
      .id("kube-picker")
      .absolute()
      .top(44)
      .left(36)
      .w(520)
      .p(8)
      .gap(6)
      .rounded(10)
      .border_1()
      .border_color(t.border)
      .bg(t.popover)
      .shadow_lg()
      .on_mouse_down_out((_e, cx) => this.closePicker(cx))
      .child(
        h_flex()
          .h(32)
          .flex_none()
          .px(8)
          .gap(6)
          .items_center()
          .rounded(7)
          .border_1()
          .border_color(t.accent)
          .bg(t.background)
          .child(kind === "command" ? div().text_size(13).text_color(t.accent).child(":") : svg("mods/workspace-chrome/search.svg").size(13).text_color(t.dim))
          .child(Input.new(this.pick).flex_1().h_full().text_size(12.5).text_color(t.foreground)),
      )
      .when(loading, (el) => el.child(h_flex().px(10).gap(6).items_center().text_size(12).text_color(t.dim).child(svg("mods/workspace-chrome/spinner.svg").size(12).spin(900)).child(kind === "command" ? `Reading ${this.context}'s api-resources…` : `Listing namespaces of ${this.context}…`)))
      .when(Boolean(this.nsError) && kind === "namespace", (el) => el.child(div().px(10).text_size(11.5).text_color(t.blocked).child(`${this.nsError}. Type a namespace and press Enter.`)))
      .when(Boolean(this.resError) && kind === "command", (el) => el.child(div().px(10).text_size(11.5).text_color(t.blocked).child(`api-resources: ${this.resError}`)))
      .when(!loading && !items.length, (el) => el.child(div().px(10).text_size(12).text_color(t.dim).child(kind === "context" ? "No context matches." : kind === "namespace" ? "Type a namespace." : "Nothing matches.")))
      .child(v_flex().id("kube-pick-list").h(Math.min(360, items.length * PICK_ROW)).min_h(0).overflow_y_scrollbar().mode("always").track_scroll(this.pickScroll).children(items.map(row)))
      .child(div().px(4).text_size(11).text_color(t.dim).child(hint));
  }

  render() {
    const t = theme();
    const rows = this.rows();
    const v = this.view;
    return v_flex()
      .id("kube-root")
      .track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .relative()
      .size_full()
      .min_h(0)
      .bg(t.background)
      .text_color(t.foreground)
      .text_size(13)
      .child(this.header(t))
      .child(v.kind === "workloads" ? this.workloadsBody(t, rows) : v.kind === "pods" ? this.podsBody(t, rows) : v.kind === "text" ? this.textBody(t) : v.kind === "logs" ? this.logsBody(t) : this.resourceBody(t, rows))
      .child(this.footer(t, rows))
      .when(Boolean(this.picker), (el) => el.child(this.pickerPanel(t)));
  }
}
