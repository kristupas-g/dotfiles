// space-tabs: every space gets the same tabs, in this order: a Claude Code chat
// (herdr-chat), nvim, gitview's diff view and lazygit. Tabs the space already has
// stay, after these. Each space is set up once (ids kept in shared
// "space-tabs.seeded"), so a tab closed later stays closed. Runs as an empty
// floating block in the layout; draws nothing. Spaces on other machines are skipped.

import { View, div } from "gpui-kit";
import { machines, notify, run, setShared, shared, spaces } from "herdr";
import { randomBytes } from "crypto";

const SEEDED = "space-tabs.seeded";

// name: the tab's name, how an existing one is recognised.
const TABS = [
  { name: "claude", open: (s) => run("tab.new", { name: "claude", space: s.id, mod: "chat", props: { chat: `c-${randomBytes(4).toString("hex")}`, provider: "claude", ...(s.folder ? { cwd: s.folder } : {}) } }) },
  { name: "nvim", open: (s) => run("tab.new", { name: "nvim", space: s.id, ...(s.folder ? { folder: s.folder } : {}), argv: ["nvim"] }) },
  { name: "gitview", open: openGitview },
  { name: "lazygit", open: (s) => run("tab.new", { name: "lazygit", space: s.id, ...(s.folder ? { folder: s.folder } : {}), argv: ["lazygit", "status"] }) },
];

const space = (id) => spaces().find((s) => s.id === id);
const tabNamed = (id, name) => space(id)?.tabs.find((t) => t.name === name) ?? null;

async function until(cx, test, ms = 10000) {
  for (let waited = 0; waited < ms; waited += 100) {
    const v = test();
    if (v) return v;
    await cx.sleep(100);
  }
  return null;
}

// gitview-tab opens its tab for the shown space, so show it first.
async function openGitview(s, cx) {
  run("space.select", { id: s.id });
  await until(cx, () => spaces().find((x) => x.active)?.id === s.id, 3000);
  run("mod.open", { name: "gitview-tab" });
}

async function seed(id, cx) {
  if (TABS.every((t) => tabNamed(id, t.name))) return;
  // gitview builds its tab in the background and shows it when done: open it last.
  for (const t of [...TABS].sort((a, b) => (a.open === openGitview) - (b.open === openGitview))) {
    if (!space(id)) return;
    if (tabNamed(id, t.name)) continue;
    await t.open(space(id), cx);
    if (!(await until(cx, () => tabNamed(id, t.name)))) notify({ title: "space-tabs", body: `${t.name} didn't open in ${space(id)?.name ?? id}`, level: "warning" });
  }
  await cx.sleep(1500);
  // spaces() catches up a moment after each move: wait for it before the next.
  for (const [i, t] of TABS.entries()) {
    const tab = tabNamed(id, t.name);
    if (!tab || tab.index === i + 1) continue;
    run("tab.move", { id: tab.id, index: i + 1 });
    await until(cx, () => tabNamed(id, t.name)?.index === i + 1, 2000);
  }
  const first = tabNamed(id, TABS[0].name);
  if (first) run("tab.select", { id: first.id });
}

export default class SpaceTabs extends View {
  init(_props, cx) {
    cx.spawn(async (cx) => {
      for (;;) {
        await cx.sleep(1000);
        if (machines().find((m) => m.name === null)?.layout !== "ready") continue;
        const seeded = new Set(shared(SEEDED) ?? []);
        const todo = spaces().filter((s) => !s.machine && !seeded.has(s.id));
        if (!todo.length) continue;
        const shown = spaces().find((s) => s.active)?.id;
        for (const s of todo) {
          seeded.add(s.id);
          setShared(SEEDED, [...seeded].filter((id) => space(id)));
          try {
            await seed(s.id, cx);
          } catch (e) {
            notify({ title: "space-tabs", body: String(e?.message ?? e), level: "error" });
          }
        }
        // Setting up spaces that already existed shouldn't leave you somewhere else.
        if (todo.length > 1 || todo[0].id !== shown) if (shown && space(shown)) run("space.select", { id: shown });
      }
    });
  }

  render() {
    return div();
  }
}
