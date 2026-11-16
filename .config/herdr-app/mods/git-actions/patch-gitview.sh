#!/bin/sh
# Patches herdr-gitview (untracked, reinstalled by its install.sh). Run it
# after reinstalling the plugin; each patch does nothing when it's already
# there. The tracked copy under mods/gitview has them all.
#
# modes.js: `c` in its file list runs git-actions.commit and the commit box
#   under the list is gone: keys bound in keys.json's mod:gitview section
#   fire inside that box too, so typing a message there ran them.
# modkit.js: a watch batch of files git ignores by themselves (not under an
#   ignored folder, which the status names) is no change: `git check-ignore`
#   drops them. In a repo holding ~/.config, the app's shared.json (written
#   on every setShared, by any mod) re-ran the status in every list, which
#   wrote shared state again: a loop that kept the app busy.
# main.js: cmd-g's list takes the keyboard whenever its tab comes on screen,
#   so j/k, s and c act on the files at once; and again during its first 3 s
#   whenever it isn't focused (the pane the app knows lags behind init's one
#   try, and a chat with a working agent takes the focus back).
# listview.js: a state icon before each file and section title under Changes:
#   a green circled check for staged, a dim hollow circle for unstaged (the
#   two SVGs are written into icons/ when missing).
# chrome.js + main.js: the list's header shows how the branch stands against
#   its upstream ("↑N unpushed" in the accent, "↓N behind", "no upstream"),
#   read with git beside each status.
# modes.js: `P` (push), `o` (pull request) and space (commit all & push) are
#   the list's own keys, so the footer and the `?` card show them.
# gitview-diff/main.js: the same four keys in the diff pane (space was a page
#   down there; pagedown still is), so they work and show whichever pane has
#   the keyboard.
# gitview-tab/main.js: cmd-g selects the tab it just made before focusing the
#   list: a chat with a working agent took the focus back, and the new tab
#   never showed.
set -e
d="$(dirname "$0")/../gitview"
mods="$(dirname "$0")/.."

# wants <file> <marker> [dir]: true when the file is there and not patched yet.
wants() {
  f="${3:-$d}/$1"
  [ -f "$f" ] || { echo "no $f"; exit 1; }
  if grep -q "$2" "$f"; then echo "already patched: $f"; return 1; fi
  return 0
}

if wants modes.js 'local patch'; then python3 -I - "$f" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
old_under = s[s.index("    under: (v, t) => (v.scope === \"worktree\" && v.work\n"):]
old_under = old_under[:old_under.index(": null),") + len(": null),")]
for old, new in [
    ('import { div } from "gpui-kit";',
     '// local patch (mods/git-actions/patch-gitview.sh, re-run after reinstalling\n'
     '// herdr-gitview): `c` opens the git-actions commit popup and the commit box\n'
     '// under the file list is gone (keys.json\'s mod:gitview keys fire inside it,\n'
     '// so typing a message there ran them).\n'
     'import { div } from "gpui-kit";\nimport { run } from "herdr";'),
    (old_under, '    under: () => null, // local patch: was commitBox(...)'),
    ('on: { c: (v) => worktree(v) && v.commitInput.focus() } },',
     'on: { c: (v) => worktree(v) && run("git-actions.commit") } }, // local patch: was v.commitInput.focus()'),
]:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
p.write_text(s)
print("patched", p)
PY
fi

if wants modkit.js 'local patch: ignored files'; then python3 -I - "$f" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
for old, new in [
    ('import { closeOverlay, focused, nextCommand, notify, panes, props, watchFolder } from "herdr";',
     'import { closeOverlay, exec, focused, nextCommand, notify, panes, props, watchFolder } from "herdr";'),
    ('// Calls `changed(cx, paths)` whenever something that matters under `root`\n',
     '// local patch: ignored files (mods/git-actions/patch-gitview.sh, re-run\n'
     '// after reinstalling herdr-gitview): a batch\'s paths that git ignores by\n'
     '// themselves, outside the ignored folders the status named (this app\'s\n'
     '// shared.json, written on every setShared, in a repo that holds ~/.config),\n'
     '// aren\'t a change either: `git check-ignore` drops them (a tracked file is\n'
     '// never reported). Without this, every mod\'s shared write re-ran the\n'
     '// status in every list, which wrote shared state again: a loop that kept\n'
     '// the app busy. Git\'s own files stay. When git can\'t be asked, the batch\n'
     '// counts as a change.\n'
     'async function unignored(root, paths) {\n'
     '  const files = paths.filter((p) => !p.startsWith(".git/"));\n'
     '  if (!files.length) return paths;\n'
     '  try {\n'
     '    // (NUL-separated, so no quoting of odd paths; -z needs --stdin.)\n'
     '    const r = await exec("/bin/sh", ["-c", \'printf "%s\\\\0" "$@" | git check-ignore -z --stdin\', "sh", ...files], { cwd: root, timeout: 10000 });\n'
     '    if (r.code !== 0 && r.code !== 1) return paths; // 1: none ignored\n'
     '    const ignored = new Set(r.stdout.split("\\0").filter(Boolean));\n'
     '    return paths.filter((p) => !ignored.has(p));\n'
     '  } catch {\n'
     '    return paths;\n'
     '  }\n'
     '}\n'
     '\n'
     '// Calls `changed(cx, paths)` whenever something that matters under `root`\n'),
    ('        const paths = batchPaths(root, await watchFolder(root));\n'
     '        if (paths !== "all" && !paths.length) continue; // nothing that matters\n',
     '        let paths = batchPaths(root, await watchFolder(root));\n'
     '        if (paths !== "all" && !paths.length) continue; // nothing that matters\n'
     '        if (paths !== "all") paths = await unignored(root, paths); // local patch: ignored files\n'
     '        if (paths !== "all" && !paths.length) continue;\n'),
]:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
p.write_text(s)
print("patched", p)
PY
fi

if wants main.js 'local patch: the keyboard'; then python3 -I - "$f" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
old = '    cx.timer.every(300, (cx) => {\n      const r = this.reviveAt;\n'
new = ('    this.born = Date.now(); // local patch: the keyboard\n'
       '    cx.timer.every(300, (cx) => {\n'
       '      // local patch: the keyboard (mods/git-actions/patch-gitview.sh, re-run\n'
       '      // after reinstalling herdr-gitview): cmd-g\'s list takes the keys\n'
       '      // whenever its tab comes on screen (a tab or space switch), so j/k, s\n'
       '      // and c act on the files at once; the app put them back where they\n'
       '      // were in that tab (the diff pane, say). Not on the first look: init\n'
       '      // took them already.\n'
       '      if (this.place.takesKeyboard) {\n'
       '        const shown = this.place.shown();\n'
       '        // Just made (cmd-g): the pane the app knows can lag behind init\'s\n'
       '        // one try, and a chat with a working agent may take the focus\n'
       '        // back, so for 3 s the list asks again whenever it isn\'t focused.\n'
       '        const young = Date.now() - this.born < 3000;\n'
       '        if (shown && (this.wasShown === false || (young && !this.handle.is_focused()))) this.focusList(cx);\n'
       '        this.wasShown = shown;\n'
       '      }\n'
       '      const r = this.reviveAt;\n')
assert s.count(old) == 1
p.write_text(s.replace(old, new))
print("patched", p)
PY
fi

if wants listview.js 'local patch: state icons'; then python3 -I - "$f" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
for old, new in [
    ('import { icon, iconButton, letter, lineCounts, pathLabel } from "./chrome.js";\n',
     'import { icon, iconButton, letter, lineCounts, pathLabel } from "./chrome.js";\n'
     '\n'
     '// local patch: state icons (mods/git-actions/patch-gitview.sh, re-run after\n'
     '// reinstalling herdr-gitview): a green circled check before a staged file\n'
     '// and its section\'s title, a dim hollow circle before an unstaged one, so\n'
     '// what a commit takes is seen at a glance. The working tree\'s two sections\n'
     '// only: a commit\'s files and "vs base" get none.\n'
     'const stateIcon = (t, section) => (section.id === "staged" ? icon("staged", 13, t.ansi2) : section.id === "changes" ? icon("unstaged", 13, t.dim) : null);\n'),
    ('      .child(div().flex_1().min_w(0).truncate().text_size(11).font_semibold().text_color(t.muted).child(row.section.title.toUpperCase()))\n',
     '      .children([stateIcon(t, row.section)].filter(Boolean)) // local patch: state icons\n'
     '      .child(div().flex_1().min_w(0).truncate().text_size(11).font_semibold().text_color(t.muted).child(row.section.title.toUpperCase()))\n'),
    ('    .child(letter(t, f.letter))\n',
     '    .children([stateIcon(t, row.section)].filter(Boolean)) // local patch: state icons\n'
     '    .child(letter(t, f.letter))\n'),
]:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
p.write_text(s)
print("patched", p)
PY
fi
# The two icons (lucide's circle-check and circle), kept with the plugin's.
[ -f "$d/icons/staged.svg" ] || printf '%s\n' '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>' > "$d/icons/staged.svg"
[ -f "$d/icons/unstaged.svg" ] || printf '%s\n' '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>' > "$d/icons/unstaged.svg"

if wants chrome.js 'local patch: unpushed'; then python3 -I - "$f" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
for old, new in [
    ('// The changed files: {status, files, notes, loading, wide, tree, onNotes, onTree, onLog}.\n',
     '// local patch: unpushed (mods/git-actions/patch-gitview.sh, re-run after\n'
     '// reinstalling herdr-gitview): how the branch stands against its upstream\n'
     '// (main.js reads it beside each status), after its name: "↑N unpushed" in\n'
     '// the accent while commits wait to be pushed, "↓N behind", "no upstream"\n'
     '// for a branch never pushed; the arrows and counts alone in a narrow\n'
     '// panel. Nothing while it isn\'t known.\n'
     'function syncPills(t, sync, wide) {\n'
     '  if (!sync) return [];\n'
     '  const out = [];\n'
     '  if (!sync.upstream) out.push(pill(t, wide ? "no upstream" : "↑ none", { accent: true }));\n'
     '  if (sync.ahead > 0) out.push(pill(t, `↑${sync.ahead}${wide ? " unpushed" : ""}`, { accent: true }));\n'
     '  if (sync.behind > 0) out.push(pill(t, `↓${sync.behind}${wide ? " behind" : ""}`));\n'
     '  return out;\n'
     '}\n'
     '\n'
     '// The changed files: {status, files, notes, loading, wide, tree, onNotes, onTree, onLog, sync}.\n'),
    ('        .when(Boolean(s?.branch), (e) => e.child(icon("branch", 12, t.dim)).child(div().min_w(0).truncate().text_size(12).text_color(t.muted).child(s.branch))),\n',
     '        .when(Boolean(s?.branch), (e) => e.child(icon("branch", 12, t.dim)).child(div().min_w(0).truncate().text_size(12).text_color(t.muted).child(s.branch)))\n'
     '        .children(syncPills(t, s?.scope === "worktree" ? h.sync : null, h.wide)), // local patch: unpushed\n'),
    ('        .min_w(0)\n        .gap(4)\n        .items_center()\n        .when(Boolean(s?.branch)',
     '        .min_w(0)\n        .overflow_hidden() // local patch: unpushed (the pills stay inside)\n        .gap(4)\n        .items_center()\n        .when(Boolean(s?.branch)'),
]:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
p.write_text(s)
print("patched", p)
PY
fi

if wants main.js 'local patch: unpushed'; then python3 -I - "$f" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
for old, new in [
    ('import { focused, notify, panes, props, shared, theme } from "herdr";\n',
     'import { exec, focused, notify, panes, props, shared, theme } from "herdr";\n'),
    ('export default class GitList extends View {\n',
     '// local patch: unpushed (mods/git-actions/patch-gitview.sh, re-run after\n'
     '// reinstalling herdr-gitview): how HEAD stands against its upstream, for\n'
     '// the header\'s marker (chrome.js syncPills): {upstream, ahead, behind},\n'
     '// upstream null for a branch never pushed; null for a repo with no remote,\n'
     '// or when git can\'t be asked. Local repos only.\n'
     'async function syncState(root) {\n'
     '  try {\n'
     '    const remotes = await exec("git", ["remote"], { cwd: root, timeout: 10000 });\n'
     '    if (remotes.code !== 0 || !remotes.stdout.trim()) return null;\n'
     '    const up = await exec("git", ["rev-parse", "--abbrev-ref", "@{u}"], { cwd: root, timeout: 10000 });\n'
     '    if (up.code !== 0) return { upstream: null, ahead: 0, behind: 0 };\n'
     '    const r = await exec("git", ["rev-list", "--left-right", "--count", "@{u}...HEAD"], { cwd: root, timeout: 10000 });\n'
     '    if (r.code !== 0) return null;\n'
     '    const [behind, ahead] = r.stdout.trim().split(/\\s+/).map(Number);\n'
     '    return { upstream: up.stdout.trim(), ahead: ahead || 0, behind: behind || 0 };\n'
     '  } catch {\n'
     '    return null;\n'
     '  }\n'
     '}\n'
     '\n'
     'export default class GitList extends View {\n'),
    ('      this.loadedKey = ctx.key;\n',
     '      this.loadedKey = ctx.key;\n'
     '      // local patch: unpushed: the header\'s marker, read beside the status.\n'
     '      if (!same || ctx.on) this.sync = null;\n'
     '      if (!ctx.on) syncState(status.root).then((sync) => { if (this.loadedKey === ctx.key) { this.sync = sync; cx.notify(); } });\n'),
]:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
p.write_text(s)
print("patched", p)
PY
fi

if wants modes.js 'local patch: push keys'; then python3 -I - "$f" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
for old, new in [
    ('      status: v.work?.status,\n',
     '      status: v.work?.status,\n'
     '      sync: v.sync, // local patch: unpushed\n'),
    ('on: { c: (v) => worktree(v) && run("git-actions.commit") } }, // local patch: was v.commitInput.focus()\n',
     'on: { c: (v) => worktree(v) && run("git-actions.commit") } }, // local patch: was v.commitInput.focus()\n'
     '      // local patch: push keys: the list\'s own, so the footer and the `?` card show them (keys.json binds them for the diff pane).\n'
     '      { caps: ["P"], label: "push", rank: 5.5, when: worktree, on: { P: (v) => worktree(v) && run("git-actions.push") } },\n'
     '      { caps: ["o"], label: "pull request", rank: 5.7, when: worktree, on: { o: (v) => worktree(v) && run("git-actions.pr") } },\n'
     '      { caps: ["space"], label: "commit & push", rank: 0.5, when: worktree, on: { space: (v) => worktree(v) && run("git-actions.ship") } },\n'),
]:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
p.write_text(s)
print("patched", p)
PY
fi

if wants main.js 'local patch: git-actions keys' "$mods/gitview-diff"; then python3 -I - "$f" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
for old, new in [
    ('on: { pagedown: inDiff((v) => v.line(v.page())), space: inDiff((v) => v.line(v.page())), pageup: inDiff((v) => v.line(-v.page())) } },\n',
     'on: { pagedown: inDiff((v) => v.line(v.page())), pageup: inDiff((v) => v.line(-v.page())) } }, // local patch: git-actions keys: space is commit & push now\n'),
    ('  { caps: ["u"], label: "unstage", rank: 2, on: { u: (v, cx) => v.act("unstage", cx) } },\n',
     '  { caps: ["u"], label: "unstage", rank: 2, on: { u: (v, cx) => v.act("unstage", cx) } },\n'
     '  // local patch: git-actions keys (mods/git-actions/patch-gitview.sh, re-run after reinstalling herdr-gitview): the same keys as the file list, so they work and show from this pane too.\n'
     '  { caps: ["space"], label: "commit all & push", rank: 2.5, on: { space: () => run("git-actions.ship") } },\n'
     '  { caps: ["c"], label: "commit", rank: 3.5, on: { c: () => run("git-actions.commit") } },\n'
     '  { caps: ["P"], label: "push", rank: 3.7, on: { P: () => run("git-actions.push") } },\n'
     '  { caps: ["o"], label: "pull request", rank: 8.5, on: { o: () => run("git-actions.pr") } },\n'),
]:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
p.write_text(s)
print("patched", p)
PY
fi

if wants main.js 'local patch: show the tab' "$mods/gitview-tab"; then python3 -I - "$f" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
old = '      run("pane.focus", { pane });\n    }, "gitview-tab");\n'
new = ('      // local patch: show the tab (mods/git-actions/patch-gitview.sh, re-run\n'
       '      // after reinstalling herdr-gitview): the focus alone didn\'t bring the\n'
       '      // new tab up when a chat with a working agent took it back.\n'
       '      run("tab.select", { id: tab });\n'
       '      run("pane.focus", { pane });\n    }, "gitview-tab");\n')
assert s.count(old) == 1
p.write_text(s.replace(old, new))
print("patched", p)
PY
fi
