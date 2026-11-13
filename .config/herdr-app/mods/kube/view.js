// The Kubernetes tab: one context and one namespace at a time, picked from
// dropdowns at the top (type to filter), and two lists under them:
//   Workloads   the namespace's Deployments, Argo Rollouts and StatefulSets with
//               ready/up-to-date/available replicas, their HPA (min–max and the
//               metric now/target) and a health word. A row shows its pods.
//   Pods        the troubled pods of the namespace (not Running, Terminating,
//               or a container not ready), or every pod of the workload that
//               was clicked. A row opens its details and Logs/Describe/Shell,
//               which run kubectl in a new terminal tab.
// Keys while the tab has the keyboard: c context, n namespace, 1/2 the lists,
// / filter, r refresh, a all namespaces (pods), Esc back.

import { div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, ScrollHandle } from "gpui-base";
import { nextCommand, notify, props, run, setShared, shared, spaces, theme } from "herdr";
import { contexts, namespaces, workloads, pods, useContext, health, hpaLine, age, authError } from "./kubectl.js";

const EVERY = 30_000;
const LAST = "kube.last";
const KIND = { Deployment: "deploy", Rollout: "rollout", StatefulSet: "sts" };
const ROW = 28;
const PICK_ROW = 30;

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

export class KubeView {
  init(_p, cx) {
    const p = props() ?? {};
    const last = shared(LAST) ?? {};
    this.context = p.context ?? last.context ?? null;
    this.namespace = p.namespace ?? last.namespace ?? null;
    this.tab = p.tab === "pods" ? "pods" : "workloads";
    this.allNs = Boolean(p.allNs);
    this.podsOf = null;
    this.contexts = [];
    this.current = null;
    this.nsCache = {};
    this.nsError = null;
    this.workloads = [];
    this.pods = [];
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
    cx.timer.every(EVERY, (cx) => { if (!this.paused && !this.picker) this.refresh(cx); });
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
        this.persist();
      } catch (e) {
        this.error = `kubeconfig: ${String(e?.message ?? e)}`;
      }
      cx.notify();
      this.refresh(cx, true);
    });
  }

  persist() {
    setShared(LAST, { context: this.context, namespace: this.namespace });
  }

  // What the shown list needs, as one key; a load whose key is stale is thrown away.
  want() {
    return JSON.stringify([this.context, this.namespace, this.tab, this.allNs, this.podsOf?.key ?? null]);
  }

  refresh(cx, manual = false) {
    if (manual) this.paused = false;
    if (this.loading || !this.context || !this.namespace) return;
    this.loading = true;
    this.slow = false;
    cx.notify();
    cx.timer.after(4000, (cx) => { if (this.loading) { this.slow = true; cx.notify(); } });
    cx.spawn(async (cx) => {
      const key = this.want();
      const { context, namespace, tab, allNs, podsOf } = this;
      try {
        if (tab === "workloads") {
          const list = await workloads(context, namespace);
          if (key === this.want()) this.workloads = list;
        } else {
          const list = await pods(context, allNs && !podsOf ? null : namespace, { selector: podsOf?.selector });
          if (key === this.want()) this.pods = list;
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

  setContext(name, cx) {
    if (name === this.context) return;
    this.context = name;
    this.workloads = [];
    this.pods = [];
    this.podsOf = null;
    this.expanded.clear();
    this.persist();
    this.refresh(cx, true);
  }

  setNamespace(ns, cx) {
    if (ns === this.namespace) return;
    this.namespace = ns;
    this.workloads = [];
    this.pods = [];
    this.podsOf = null;
    this.expanded.clear();
    this.persist();
    this.refresh(cx, true);
  }

  setTab(tab, cx) {
    if (tab === "pods" && this.tab === "pods" && !this.podsOf) return;
    this.tab = tab;
    if (tab === "pods") this.podsOf = null;
    this.expanded.clear();
    cx.notify();
    if (this.loaded !== this.want()) this.refresh(cx, true);
  }

  showPodsOf(w, cx) {
    this.podsOf = { key: w.key, kind: w.kind, name: w.name, selector: w.selector };
    this.tab = "pods";
    this.pods = [];
    this.expanded.clear();
    cx.notify();
    this.refresh(cx, true);
  }

  toggleAll(cx) {
    this.allNs = !this.allNs;
    this.pods = [];
    this.expanded.clear();
    cx.notify();
    if (this.tab === "pods") this.refresh(cx, true);
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

  // A terminal tab in the shown space running kubectl on this pod.
  openTerminal(name, argv) {
    const sp = spaces().find((s) => s.active);
    run("tab.new", { name, ...(sp ? { space: sp.id } : {}), argv });
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
    const list = this.nsCache[this.context] ?? [];
    const rows = list
      .map((n) => ({ n, s: score(n.toLowerCase(), q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || a.n.localeCompare(b.n))
      .map((r) => ({ id: r.n, label: r.n }));
    // A namespace the list doesn't have (no permission to list them, say) can still be typed.
    if (q && !rows.some((r) => r.id === q)) rows.push({ id: q, label: q, typed: true });
    return rows;
  }

  choose(cx) {
    const item = this.pickItems()[this.pickAt];
    const kind = this.picker;
    this.closePicker(cx);
    if (!item) return;
    if (kind === "context") this.setContext(item.id, cx);
    else this.setNamespace(item.id, cx);
  }

  // ---- keys ----

  key(e, cx) {
    const k = e.key;
    const m = e.modifiers ?? {};
    if (m.platform || m.control || m.alt) return;
    if (this.picker) {
      const n = this.pickItems().length;
      if (k === "escape") this.closePicker(cx);
      else if (k === "down") this.pickAt = n ? (this.pickAt + 1) % n : 0;
      else if (k === "up") this.pickAt = n ? (this.pickAt + n - 1) % n : 0;
      else if (k === "enter") return this.choose(cx);
      else return;
      this.pickScroll.scroll_to_item(this.pickAt);
      cx.stop_propagation();
      return cx.notify();
    }
    if (this.typing) {
      if (k !== "escape") return;
      this.filter.set_value("");
      this.filterText = "";
      this.typing = false;
      this.handle.focus();
      cx.stop_propagation();
      return cx.notify();
    }
    if (k === "r") this.refresh(cx, true);
    else if (k === "1") this.setTab("workloads", cx);
    else if (k === "2") this.setTab("pods", cx);
    else if (k === "c") this.openPicker("context", cx);
    else if (k === "n") this.openPicker("namespace", cx);
    else if (k === "a") this.toggleAll(cx);
    else if (k === "/") this.filter.focus();
    else if (k === "escape") {
      if (this.podsOf) this.setTab("pods", cx);
      else if (this.filterText) { this.filter.set_value(""); this.filterText = ""; }
      else if (this.expanded.size) this.expanded.clear();
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

  tabButton(t, id, label, on, onClick) {
    return div()
      .id(id)
      .h(24)
      .px(10)
      .flex_none()
      .flex()
      .items_center()
      .rounded(6)
      .text_size(12)
      .bg(on ? t.selected : t.background)
      .text_color(on ? t.foreground : t.muted)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => onClick(cx))
      .child(label);
  }

  header(t) {
    const ctx = this.contexts.find((c) => c.name === this.context);
    const prod = isProd(ctx);
    const unhealthy = this.workloads.filter((w) => health(w)[1] === "blocked" || health(w)[1] === "working").length;
    const since = this.at ? `${age(new Date(this.at).toISOString())} ago` : "never";
    const status = this.error
      ? div().text_size(11.5).text_color(t.blocked).child(`kubectl: ${this.error}${authError(this.error) ? " · If a browser opened, finish the login there, then refresh (r)." : ""}`)
      : this.slow ? div().text_size(11.5).text_color(t.working).child("Waiting for kubectl… a browser login may have opened.")
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
          .child(this.dropButton(t, "kube-ctx", this.context ?? "context…", "Context (c). Clusters from ~/.kube/config", (cx) => this.openPicker("context", cx), { tone: prod ? "blocked" : null, tag: prod ? "prod" : null }))
          .child(this.dropButton(t, "kube-ns", this.allNs && this.tab === "pods" && !this.podsOf ? "all namespaces" : this.namespace ?? "namespace…", "Namespace (n)", (cx) => this.openPicker("namespace", cx)))
          .child(this.iconButton(t, "kube-refresh", "mods/prs/refresh.svg", `Refreshed ${since}. Refresh now (r)${this.paused ? ". Auto-refresh is paused until then" : ""}`, (cx) => this.refresh(cx, true), { spin: this.loading }))
          .child(this.iconButton(t, "kube-use", "mods/workspace-chrome/terminal.svg", this.current === this.context ? `${this.context} is kubectl's current context` : `Make ${this.context} kubectl's current context, for your shells`, (cx) => this.makeCurrent(cx), { on: this.current === this.context }))
          .child(div().flex_1())
          .when(this.tab === "workloads" && this.workloads.length > 0, (el) =>
            el.child(div().text_size(11.5).text_color(unhealthy ? t.working : t.dim).child(unhealthy ? `${unhealthy} not healthy` : "all healthy")))
          .when(this.tab === "pods" && !this.podsOf && this.loaded === this.want(), (el) =>
            el.child(div().text_size(11.5).text_color(this.pods.length ? t.working : t.dim).child(this.pods.length ? `${this.pods.length} troubled` : "no troubled pods"))),
      )
      .when(Boolean(status), (el) => el.child(status))
      .child(
        h_flex()
          .gap(4)
          .items_center()
          .child(this.tabButton(t, "kube-tab-workloads", `Workloads${this.workloads.length ? ` · ${this.workloads.length}` : ""}`, this.tab === "workloads", (cx) => this.setTab("workloads", cx)))
          .child(this.tabButton(t, "kube-tab-pods", this.podsOf ? "Problem pods" : `Problem pods${this.tab === "pods" ? ` · ${this.pods.length}` : ""}`, this.tab === "pods" && !this.podsOf, (cx) => this.setTab("pods", cx)))
          .when(Boolean(this.podsOf), (el) =>
            el.child(
              h_flex()
                .id("kube-tab-of")
                .h(24)
                .pl(10)
                .pr(6)
                .gap(6)
                .items_center()
                .rounded(6)
                .bg(t.selected)
                .text_size(12)
                .text_color(t.foreground)
                .child(div().max_w(320).truncate().child(`Pods of ${this.podsOf.name} · ${this.pods.length}`))
                .child(div().id("kube-of-x").size(16).rounded(4).flex().items_center().justify_center().text_color(t.dim).cursor_pointer().hover((s) => s.bg(t.hover).text_color(t.foreground)).tooltip("Back to the troubled pods (Esc)").on_click((_e, cx) => this.setTab("pods", cx)).child(svg("mods/workspace-chrome/x.svg").size(11))),
            ))
          .child(
            h_flex()
              .flex_1()
              .h(24)
              .ml(6)
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
          .when(this.tab === "pods" && !this.podsOf, (el) =>
            el.child(
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
                .tooltip("All namespaces (a): the cluster's Pending, Failed and Unknown pods. Not-ready pods only show per namespace.")
                .on_click((_e, cx) => this.toggleAll(cx))
                .child("all namespaces"),
            )),
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
      .children(cols.map(([label, w]) => (w ? div().w(w).flex_none().truncate().child(label) : div().flex_1().min_w(0).child(label))));
  }

  dot(t, tone) {
    if (tone === "working") return svg("mods/workspace-chrome/spinner.svg").size(10).flex_none().text_color(t.working).spin(900);
    if (tone === "dim") return div().size(8).flex_none().rounded_full().border(1.5).border_color(t.dim);
    return div().size(8).flex_none().rounded_full().bg(t[tone]);
  }

  matches(name) {
    const q = this.filterText.trim().toLowerCase();
    return !q || name.toLowerCase().includes(q);
  }

  workloadRow(t, w, now) {
    const [word, tone] = health(w);
    const short = w.ready < w.desired && w.desired > 0;
    const h = w.hpa;
    const atMax = h && h.max != null && h.desired >= h.max;
    const hpaTip = h ? `HPA ${h.name}: ${h.min}–${h.max}, ${h.current} now, ${h.desired} wanted${h.conditions.filter((c) => c.status !== "True" || c.type === "ScalingLimited").map((c) => `\n${c.type}: ${c.reason}${c.message ? ` — ${c.message}` : ""}`).join("")}` : "No HPA";
    return h_flex()
      .id(`w-${w.key}`)
      .h(ROW)
      .flex_none()
      .px(10)
      .gap(8)
      .items_center()
      .rounded(5)
      .text_size(12.5)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .tooltip(`${w.kind} ${w.name}${w.message ? `\n${w.message}` : ""}\nClick to list its pods`)
      .on_click((_e, cx) => this.showPodsOf(w, cx))
      .child(div().w(52).flex_none().text_size(10.5).text_color(t.dim).child(KIND[w.kind] ?? w.kind.toLowerCase()))
      .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(w.name))
      .child(h_flex().w(96).flex_none().gap(5).items_center().child(this.dot(t, tone)).child(div().truncate().text_size(11.5).text_color(t[tone]).child(word)))
      .child(div().w(56).flex_none().text_color(short ? t.blocked : t.foreground).child(`${w.ready}/${w.desired}`))
      .child(div().w(56).flex_none().text_color(w.updated < w.desired ? t.working : t.dim).child(String(w.updated)))
      .child(div().w(56).flex_none().text_color(w.available < w.desired ? t.working : t.dim).child(String(w.available)))
      .child(div().id(`hpa-${w.key}`).w(170).flex_none().truncate().text_size(11.5).text_color(h ? (atMax ? t.blocked : t.muted) : t.dim).tooltip(hpaTip).child(h ? hpaLine(h) : "—"))
      .child(div().w(40).flex_none().text_size(11.5).text_color(t.dim).child(age(w.created, now)));
  }

  workloadsBody(t) {
    const now = Date.now();
    const rows = this.workloads.filter((w) => this.matches(w.name)).map((w) => this.workloadRow(t, w, now));
    const empty = !rows.length;
    return v_flex()
      .flex_1()
      .min_h(0)
      .child(this.columns(t, [["KIND", 52], ["NAME", 0], ["STATUS", 96], ["READY", 56], ["UPDATED", 56], ["AVAIL", 56], ["HPA MIN–MAX · METRIC NOW/TARGET", 170], ["AGE", 40]]))
      .child(
        v_flex()
          .id("kube-workloads")
          .flex_1()
          .min_h(0)
          .px(4)
          .pb(8)
          .overflow_y_scrollbar()
          .mode("always")
          .track_scroll(this.scroll)
          .children(rows)
          .when(empty, (el) => el.child(div().px(10).py(8).text_size(12).text_color(t.dim).child(this.loading && !this.workloads.length ? "Loading…" : this.workloads.length ? "Nothing matches the filter." : this.error ? "" : `No deployments, rollouts or statefulsets in ${this.namespace}.`))),
      );
  }

  podRow(t, p, now, showNs) {
    const open = this.expanded.has(p.key);
    const row = h_flex()
      .id(`p-${p.key}`)
      .h(ROW)
      .flex_none()
      .px(10)
      .gap(8)
      .items_center()
      .rounded(5)
      .text_size(12.5)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .when(Boolean(p.detail) && !open, (el) => el.tooltip(p.detail))
      .on_click((_e, cx) => {
        open ? this.expanded.delete(p.key) : this.expanded.add(p.key);
        cx.notify();
      })
      .child(svg(`mods/workspace-chrome/chevron-${open ? "down" : "right"}.svg`).size(10).flex_none().text_color(t.dim))
      .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(p.name))
      .when(showNs, (el) => el.child(div().w(120).flex_none().truncate().text_size(11.5).text_color(t.muted).child(p.ns)))
      .child(h_flex().w(150).flex_none().gap(5).items_center().child(this.dot(t, p.tone)).child(div().truncate().text_size(11.5).text_color(t[p.tone]).child(p.status)))
      .child(div().w(48).flex_none().text_color(p.ready < p.total ? t.working : t.foreground).child(`${p.ready}/${p.total}`))
      .child(div().w(56).flex_none().text_color(p.restarts ? t.working : t.dim).child(String(p.restarts)))
      .child(div().w(40).flex_none().text_size(11.5).text_color(t.dim).child(age(p.created, now)))
      .child(div().w(150).flex_none().truncate().text_size(11).text_color(t.dim).text_ellipsis_start().child(p.node ?? ""));
    if (!open) return row;
    return v_flex().flex_none().child(row).child(this.podDetail(t, p));
  }

  podDetail(t, p) {
    const ctx = this.context;
    const base = ["kubectl", "--context", ctx, "-n", p.ns];
    const line = (label, text, tone = "muted") => h_flex().gap(8).items_start().text_size(11.5).child(div().w(72).flex_none().text_color(t.dim).child(label)).child(div().flex_1().min_w(0).text_color(t[tone]).child(text));
    const button = (id, label, tip, argv) =>
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
        .on_click((_e, cx) => { cx.stop_propagation(); this.openTerminal(`${label} ${p.name.slice(0, 24)}`, argv); })
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
          .child(button("logs", "Logs", "kubectl logs -f --all-containers, in a new tab", [...base, "logs", "-f", "--all-containers", "--tail=500", p.name]))
          .child(button("describe", "Describe", "kubectl describe pod, in a new tab", [...base, "describe", "pod", p.name]))
          .child(button("shell", "Shell", "kubectl exec -it … -- sh, in a new tab", [...base, "exec", "-it", p.name, "--", "sh", "-c", "command -v bash >/dev/null && exec bash || exec sh"]))
          .child(div().flex_1())
          .child(div().text_size(11).text_color(t.dim).child(`${p.phase ?? "?"}${p.owner?.kind ? ` · ${p.owner.kind} ${p.owner.name}` : ""}`)),
      )
      .when(Boolean(p.detail), (el) => el.child(line("message", p.detail, "foreground")))
      .children(p.conditions.filter((c) => c.reason || c.message).map((c) => line(c.type, `${c.reason ?? ""}${c.message ? ` — ${c.message}` : ""}`)))
      .children(p.init.filter((c) => c.state?.kind !== "terminated" || c.state?.reason !== "Completed").map((c) => container(c, true)))
      .children(p.containers.map((c) => container(c, false)));
  }

  podsBody(t) {
    const now = Date.now();
    const showNs = this.allNs && !this.podsOf;
    const rows = this.pods.filter((p) => this.matches(p.name)).map((p) => this.podRow(t, p, now, showNs));
    const empty = !rows.length;
    const nothing = this.podsOf ? `No pods match ${this.podsOf.name}'s selector.` : this.allNs ? "No Pending, Failed or Unknown pods in the cluster." : `Every pod in ${this.namespace} is running and ready.`;
    return v_flex()
      .flex_1()
      .min_h(0)
      .child(this.columns(t, [["", 10], ["NAME", 0], ...(showNs ? [["NAMESPACE", 120]] : []), ["STATUS", 150], ["READY", 48], ["RESTARTS", 56], ["AGE", 40], ["NODE", 150]]))
      .child(
        v_flex()
          .id("kube-pods")
          .flex_1()
          .min_h(0)
          .px(4)
          .pb(8)
          .overflow_y_scrollbar()
          .mode("always")
          .children(rows)
          .when(empty, (el) => el.child(div().px(10).py(8).text_size(12).text_color(this.loading || this.error ? t.dim : t.ansi2).child(this.loading && !this.pods.length ? "Loading…" : this.pods.length ? "Nothing matches the filter." : this.error ? "" : this.loaded === this.want() ? nothing : ""))),
      );
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
        .child(div().flex_none().text_size(12.5).font_medium().text_color(t.foreground).child(it.label))
        .when(Boolean(c) && isProd(c), (el) => el.child(this.chip(t, "prod", "blocked")))
        .when(Boolean(c?.namespace), (el) => el.child(div().text_size(11).text_color(t.dim).child(c.namespace)))
        .when(Boolean(it.typed), (el) => el.child(div().text_size(11).text_color(t.dim).child("as typed")))
        .child(div().flex_1())
        .when(it.id === (kind === "context" ? this.context : this.namespace), (el) => el.child(div().text_size(11).text_color(t.dim).child("shown")))
        .when(kind === "context" && it.id === this.current, (el) => el.child(div().text_size(11).text_color(t.accent).child("kubectl current")));
    };
    const loading = kind === "namespace" && !this.nsCache[this.context] && !this.nsError;
    return v_flex()
      .id("kube-picker")
      .absolute()
      .top(44)
      .left(kind === "context" ? 36 : 36)
      .w(460)
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
          .child(svg("mods/workspace-chrome/search.svg").size(13).text_color(t.dim))
          .child(Input.new(this.pick).flex_1().h_full().text_size(12.5).text_color(t.foreground)),
      )
      .when(loading, (el) => el.child(h_flex().px(10).gap(6).items_center().text_size(12).text_color(t.dim).child(svg("mods/workspace-chrome/spinner.svg").size(12).spin(900)).child(`Listing namespaces of ${this.context}…`)))
      .when(Boolean(this.nsError) && kind === "namespace", (el) => el.child(div().px(10).text_size(11.5).text_color(t.blocked).child(`${this.nsError}. Type a namespace and press Enter.`)))
      .when(!loading && !items.length, (el) => el.child(div().px(10).text_size(12).text_color(t.dim).child(kind === "context" ? "No context matches." : "Type a namespace.")))
      .child(v_flex().id("kube-pick-list").h(Math.min(360, items.length * PICK_ROW)).min_h(0).overflow_y_scrollbar().mode("always").track_scroll(this.pickScroll).children(items.map(row)))
      .child(div().px(4).text_size(11).text_color(t.dim).child(kind === "context" ? "↑↓ move · Enter shows it here · the terminal button in the header makes it kubectl's current context" : "↑↓ move · Enter · a name not in the list can be typed"));
  }

  render() {
    const t = theme();
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
      .child(this.tab === "workloads" ? this.workloadsBody(t) : this.podsBody(t))
      .when(Boolean(this.picker), (el) => el.child(this.pickerPanel(t)));
  }
}
