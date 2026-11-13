// space-tabs: every space gets the same tabs, in this order: a Claude Code chat
// (herdr-chat), nvim with a shell under it, and gitview's diff view. Herdr's
// own first tab of a new space is closed when it's just a shell; tabs an existing
// space already has stay, after these. Each step runs once per space (ids
// kept in shared "space-tabs.seeded" and "space-tabs.nvim-shell-2"), so a tab or
// pane closed later stays closed. Runs as an empty floating block in the layout;
// draws nothing. Spaces on other machines are skipped.
//
// Tabs open in their final order, so nothing is moved afterwards, and the
// starter shell goes as soon as the first tab is there. gitview-tab builds its
// file list in the background and then focuses it, which shows its tab: the
// claude tab is selected once that has happened, not before.

import { View, div } from "gpui-kit";
import { exec, focused, machines, notify, panes, run, setShared, shared, spaces } from "herdr";
import { randomBytes } from "crypto";

const SEEDED = "space-tabs.seeded";
const NVIM_SHELL = "space-tabs.nvim-shell-2";
// The shell's share of the nvim tab's height.
const SHELL_WEIGHT = 0.25;
// How often new spaces are looked for.
const POLL = 200;

// name: the tab's name, how an existing one is recognised.
const TABS = [
  { name: "claude", open: (s) => run("tab.new", { name: "claude", space: s.id, mod: "chat", props: { chat: `c-${randomBytes(4).toString("hex")}`, provider: "claude", ...(s.folder ? { cwd: s.folder } : {}) } }) },
  { name: "nvim", open: (s) => run("tab.new", { name: "nvim", space: s.id, ...(s.folder ? { folder: s.folder } : {}), argv: ["nvim", "."] }) },
  { name: "gitview", open: openGitview },
];

const space = (id) => spaces().find((s) => s.id === id);
const tabNamed = (id, name) => space(id)?.tabs.find((t) => t.name === name) ?? null;

async function until(cx, test, ms = 10000) {
  for (let waited = 0; waited < ms; waited += 50) {
    const v = test();
    if (v) return v;
    await cx.sleep(50);
  }
  return null;
}

// gitview-tab opens its tab for the shown space, so show it first. The tab
// appears at once; its file list, and the focus that shows the tab, come
// later (settle waits for those).
async function openGitview(s, cx) {
  run("space.select", { id: s.id });
  await until(cx, () => spaces().find((x) => x.active)?.id === s.id, 3000);
  run("mod.open", { name: "gitview-tab" });
}

// herdr-core's API (`hc connect`, one JSON-RPC request per run).
async function core(method, params) {
  const req = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  const r = await exec("/bin/sh", ["-c", 'printf "%s\\n" "$1" | PATH="$HOME/.local/bin:$PATH" hc connect', "sh", req]);
  const reply = JSON.parse(r.stdout.split("\n")[0] || "{}");
  if (reply.error) throw new Error(`${method}: ${reply.error.message ?? JSON.stringify(reply.error)}`);
  return reply.result;
}

// pane.split has no size: the weights live in the core's herdr-app document.
// Only once the app has written the split there as a two-pane column (a write
// from before that would undo it), and read back, since a later app write can win.
async function sizeSplit(tabId, paneId, weight, cx) {
  const parentOf = (n) => (n?.children?.some((c) => c.id === paneId) ? n : n?.children?.map(parentOf).find(Boolean));
  const column = async () => {
    const { value, version } = await core("doc.get", { name: "herdr-app" });
    const parent = parentOf(value.spaces.flatMap((s) => s.tabs).find((t) => t.id === tabId)?.root);
    return parent?.type === "column" && parent.children.length === 2 ? { value, version, parent } : null;
  };
  const sized = (p) => Math.abs((p.children.find((c) => c.id !== paneId)?.size?.weight ?? 0) - weight) < 0.01;
  for (let attempt = 0; attempt < 20; attempt++) {
    const got = await column();
    if (got && sized(got.parent)) return;
    if (got) {
      for (const c of got.parent.children) c.size = { weight: c.id === paneId ? 1 - weight : weight };
      await core("doc.set", { name: "herdr-app", value: got.value, version: got.version }).catch(() => {});
    }
    await cx.sleep(500);
  }
  notify({ title: "space-tabs", body: "Couldn't size the shell under nvim", level: "warning" });
}

async function nvimShell(id, cx) {
  const tab = tabNamed(id, "nvim");
  if (!tab || tab.panes !== 1) return;
  const nvim = panes().find((p) => p.tab === tab.id);
  if (!nvim) return;
  const shown = space(id)?.tabs.find((t) => t.active)?.id;
  run("pane.split", { direction: "down", pane: nvim.pane });
  if (!(await until(cx, () => tabNamed(id, "nvim")?.panes === 2, 5000))) return;
  run("pane.focus", { pane: nvim.pane });
  if (shown && shown !== tab.id) run("tab.select", { id: shown });
  await sizeSplit(tab.id, nvim.pane, SHELL_WEIGHT, cx);
}

// Herdr's starter tab of a new space, when it's still just an idle shell.
function closeStarter(id) {
  const inStarter = panes().filter((p) => p.tab === id);
  if (inStarter.length === 1 && inStarter[0].program?.shell && !inStarter[0].status) run("tab.close", { id, confirmed: true });
}

// gitview-tab ends by focusing its file list, which shows its tab: wait for
// that, then show the first tab, once.
async function settle(id, cx) {
  const gv = tabNamed(id, "gitview");
  if (gv) {
    const a = await until(cx, () => tabNamed(id, "gitview")?.panes >= 2, 15000);
    const b = await until(cx, () => focused()?.tab === gv.id, 2000);
  }
  // gitview keeps focusing its panes for a moment after that: hold the first
  // tab until it has stayed shown for a second.
  for (let held = 0, i = 0; held < 1000 && i < 60; i++) {
    const first = tabNamed(id, TABS[0].name);
    if (!first) return;
    if (first.active) held += 100;
    else {
      held = 0;
      run("tab.select", { id: first.id });
    }
    await cx.sleep(100);
  }
}

async function seed(id, cx) {
  if (TABS.every((t) => tabNamed(id, t.name))) return;
  // A new space comes with a shell tab of Herdr's: it goes once ours are there.
  const tabs = space(id)?.tabs ?? [];
  const starter = tabs.length === 1 && !TABS.some((t) => t.name === tabs[0].name) ? tabs[0].id : null;
  for (const t of TABS) {
    if (!space(id)) return;
    if (tabNamed(id, t.name)) continue;
    await t.open(space(id), cx);
    if (!(await until(cx, () => tabNamed(id, t.name)))) notify({ title: "space-tabs", body: `${t.name} didn't open in ${space(id)?.name ?? id}`, level: "warning" });
    if (starter && t === TABS[0]) closeStarter(starter);
  }
  // Opened in order, so this only moves when a space already had tabs of its own.
  const ahead = () => (starter && space(id)?.tabs.some((t) => t.id === starter) ? 1 : 0);
  for (const [i, t] of TABS.entries()) {
    const tab = tabNamed(id, t.name);
    if (!tab || tab.index === i + 1 + ahead()) continue;
    run("tab.move", { id: tab.id, index: i + 1 + ahead() });
    await until(cx, () => tabNamed(id, t.name)?.index === i + 1 + ahead(), 2000);
  }
  await settle(id, cx);
}

// Runs step once for each local space not yet in shared[key].
async function once(key, step, cx) {
  const done = new Set(shared(key) ?? []);
  const todo = spaces().filter((s) => !s.machine && !done.has(s.id));
  for (const s of todo) {
    done.add(s.id);
    setShared(key, [...done].filter((id) => space(id)));
    try {
      await step(s.id, cx);
    } catch (e) {
      notify({ title: "space-tabs", body: String(e?.message ?? e), level: "error" });
    }
  }
  return todo.map((s) => s.id);
}

export default class SpaceTabs extends View {
  init(_props, cx) {
    cx.spawn(async (cx) => {
      for (;;) {
        await cx.sleep(POLL);
        if (machines().find((m) => m.name === null)?.layout !== "ready") continue;
        const shown = spaces().find((s) => s.active)?.id;
        const seeded = await once(SEEDED, seed, cx);
        const shelled = await once(NVIM_SHELL, nvimShell, cx);
        // Setting up spaces that already existed shouldn't leave you somewhere else.
        // A space seeded just now is new and stays shown: it may not have been
        // marked active yet when this iteration started.
        const now = spaces().find((s) => s.active)?.id;
        const fresh = seeded.includes(shown) || seeded.includes(now);
        if ((seeded.length || shelled.length) && !fresh && shown && space(shown) && shown !== now) run("space.select", { id: shown });
      }
    });
  }

  render() {
    return div();
  }
}
