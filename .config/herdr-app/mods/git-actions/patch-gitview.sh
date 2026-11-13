#!/bin/sh
# Patches herdr-gitview (untracked, reinstalled by its install.sh) so that `c`
# in its file list runs git-actions.commit and the commit box under the list
# is gone: keys bound in keys.json's mod:gitview section fire inside that box
# too, so typing a message there ran them. Run it after reinstalling the
# plugin; it does nothing when the patch is already there.
set -e
f="$(dirname "$0")/../gitview/modes.js"
[ -f "$f" ] || { echo "no $f"; exit 1; }
grep -q 'local patch' "$f" && { echo "already patched: $f"; exit 0; }
python3 -I - "$f" <<'PY'
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
