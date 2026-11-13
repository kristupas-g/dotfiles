// git-actions: push and pull requests for the shown space's repo, driven from
// the keyboard inside gitview, lazygit-style. It draws nothing of its own: a
// root floating block in the layout that only takes commands (keys.json binds
// them in the `mod:gitview` and `mod:gitview-diff` sections; they also work
// from `herdr-app do`):
//   git-actions.push  (P in gitview)  `git push`, `-u origin <branch>` the first
//                                       time; progress and the result as toasts.
//   git-actions.pr    (o in gitview)  a popup for the pull request's title and
//                                       description; ⌘↩ creates it (pushing first
//                                       when needed), ⌘D marks it a draft, Esc
//                                       cancels. The branch's open PR, if any, is
//                                       opened as a tab of the prs mod instead.
//   git-actions.ignore  (i in gitview)  adds the selected file to the repo's
//                                       .gitignore (a tracked file is taken out
//                                       of the index first, as lazygit does).
//   git-actions.exclude (I in gitview)  the same, into .git/info/exclude.
//   git-actions.commit  (c in gitview)  a popup for the commit message: ↩ commits
//                                       the staged changes, or everything when
//                                       nothing is staged (as gitview's own box
//                                       did), ⇧↩ a new line, Esc cancels.
// Space in the file list stages the Changes section: that's gitview's own
// `gitview.button:stage:section:changes`, bound in keys.json, not this mod.
// The popups are this same mod opened with props { dialog: true | "commit", ... }.
// gitview's modes.js is patched so its `c` runs git-actions.commit and its
// own commit box is gone (see AGENTS.md).

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, TextareaState, Textarea } from "gpui-base";
import { closeOverlay, exec, focused, nextCommand, notify, openOverlay, props, run, setShared, shared, spaces, theme } from "herdr";

const REFRESH = "prs.refresh";

const firstLine = (s) => (s ?? "").split("\n").find((l) => l.trim()) ?? "";

async function git(args, cwd, timeout = 60000) {
  const r = await exec("git", args, { cwd, timeout });
  if (r.code !== 0) throw new Error(firstLine(r.stderr) || `git ${args[0]} failed`);
  return r.stdout.trim();
}
async function gh(args, cwd, timeout = 60000) {
  const r = await exec("/bin/sh", ["-c", 'PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH" exec gh "$@"', "sh", ...args], { cwd, timeout });
  if (r.code !== 0) throw new Error(firstLine(r.stderr) || `gh ${args[0]} failed`);
  return r.stdout.trim();
}

// The shown space's repo, when it's on this computer.
function where() {
  const space = spaces().find((s) => s.active);
  if (!space || space.machine || !space.folder) throw new Error("No local repo in this space");
  return { cwd: space.folder, space: space.id };
}

// The branch and how it stands against its upstream.
async function branchInfo(cwd) {
  const [branch, upstream] = await Promise.all([
    git(["rev-parse", "--abbrev-ref", "HEAD"], cwd),
    git(["rev-parse", "--abbrev-ref", "@{u}"], cwd).catch(() => null),
  ]);
  if (branch === "HEAD") throw new Error("Detached HEAD: check out a branch first");
  let ahead = 0, behind = 0;
  if (upstream) [behind, ahead] = (await git(["rev-list", "--left-right", "--count", "@{u}...HEAD"], cwd)).split(/\s+/).map(Number);
  return { cwd, branch, upstream, ahead, behind };
}

// `git push`, with -u the first time. Returns what was pushed, for the toast.
async function push(info) {
  if (info.behind) throw new Error(`${info.branch} is ${info.behind} behind ${info.upstream}: pull first`);
  if (info.upstream) await git(["push"], info.cwd, 180000);
  else await git(["push", "-u", "origin", info.branch], info.cwd, 180000);
  return info.upstream ? `${info.ahead} commit${info.ahead === 1 ? "" : "s"} to ${info.upstream}` : `${info.branch} → origin, upstream set`;
}

// The file gitview shows in the focused tab (shared "gitview.views"), with
// its repo's root, when the repo is on this computer.
function selectedFile() {
  const view = (shared("gitview.views") ?? {})[focused()?.tab];
  if (!view || view.empty || !view.path) throw new Error("Select a file in gitview first");
  if (view.on) throw new Error("The repo is on another machine");
  if (view.commit) throw new Error(`${view.path} is a commit's file: pick one under Changes`);
  return { cwd: view.root, path: view.path };
}

// Appends `line` to `file` (made if needed, ending in a newline first).
// Returns false when the line is already there.
async function appendLine(file, line, cwd) {
  const r = await exec("/bin/sh", ["-c", 'f="$1"; l="$2"; [ -f "$f" ] && grep -qxF -- "$l" "$f" && exit 3; mkdir -p "$(dirname "$f")"; [ -s "$f" ] && [ "$(tail -c1 "$f" | od -An -c | tr -d " ")" != "\\n" ] && printf "\n" >> "$f"; printf "%s\n" "$l" >> "$f"', "sh", file, line], { cwd, timeout: 10000 });
  if (r.code === 3) return false;
  if (r.code !== 0) throw new Error(firstLine(r.stderr) || `couldn't write ${file}`);
  return true;
}

// Adds the selected file to an ignore file (`.gitignore`, or git's
// info/exclude), taking a tracked one out of the index first so the rule
// takes effect. Gitview's folder watch sees the edit and re-reads.
async function ignoreSelected(which) {
  const { cwd, path } = selectedFile();
  const file = which === "exclude" ? await git(["rev-parse", "--path-format=absolute", "--git-path", "info/exclude"], cwd) : `${cwd}/.gitignore`;
  const name = which === "exclude" ? ".git/info/exclude" : ".gitignore";
  const tracked = (await exec("git", ["ls-files", "--error-unmatch", "--", path], { cwd, timeout: 10000 })).code === 0;
  if (tracked) await git(["rm", "-r", "--cached", "--quiet", "--", path], cwd);
  const added = await appendLine(file, path, cwd);
  if (!added && !tracked) return notify({ title: `Already in ${name}`, body: path, level: "info", timeout: 3000 });
  notify({ title: `${added ? "Added to" : "Already in"} ${name}${tracked ? ", removed from the index" : ""}`, body: path, level: "info", timeout: 4000 });
}

// What a commit now would take, as gitview's box decided: the staged
// changes, or everything when nothing is staged; never with conflicts.
async function commitInfo(cwd) {
  const conflicts = await git(["diff", "--name-only", "--diff-filter=U"], cwd);
  if (conflicts) throw new Error(`Resolve the conflicts first (${firstLine(conflicts)})`);
  const staged = (await exec("git", ["diff", "--cached", "--quiet"], { cwd, timeout: 10000 })).code !== 0;
  if (!staged && !(await git(["status", "--porcelain"], cwd))) throw new Error("Nothing to commit");
  return staged;
}
async function commit(cwd, staged, message) {
  if (!staged) await git(["add", "-A"], cwd);
  return firstLine(await git(["commit", "-m", message], cwd, 120000));
}

// The PR as a tab of the prs mod, in this space.
function openPr(space, repo, number) {
  const sp = spaces().find((s) => s.id === space);
  const name = `#${number}`;
  const tab = sp?.tabs.find((t) => t.name === name);
  if (tab) return run("tab.select", { id: tab.id });
  run("tab.new", { name, ...(sp ? { space } : {}), mod: "prs", props: { view: { repo, number } } });
}

// The popups' field and keycap styles.
const field = (t, el) => el.px(10).rounded(8).border_1().border_color(t.input).bg(t.background).text_size(12.8).text_color(t.foreground);
const keycap = (t, cap, label) => h_flex().gap(5).items_center()
  .child(div().px(5).h(18).rounded(4).bg(t.raised).text_size(10.5).text_color(t.muted).flex().items_center().child(cap))
  .child(div().text_color(t.dim).child(label));

export default class GitActions extends View {
  init(_props, cx) {
    this.busy = null;
    if (props()?.dialog) return this.initDialog(cx);
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "push") this.doPush(cx);
        else if (c === "pr") this.openDialog(cx);
        else if (c === "commit") this.openCommit(cx);
        else if (c === "ignore" || c === "exclude") this.act(c === "ignore" ? "add to .gitignore" : "add to .git/info/exclude", () => ignoreSelected(c), cx);
      }
    });
  }

  // Runs one action at a time; errors become toasts.
  act(what, fn, cx) {
    if (this.busy) return notify({ title: "git", body: `Still busy: ${this.busy}`, level: "warning", timeout: 2500 });
    this.busy = what;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        await fn();
      } catch (e) {
        notify({ title: `Couldn't ${what}`, body: String(e?.message ?? e), level: "error", timeout: 8000 });
      }
      this.busy = null;
      cx.notify();
    });
  }

  doPush(cx) {
    this.act("push", async () => {
      const info = await branchInfo(where().cwd);
      if (info.upstream && !info.ahead) return notify({ title: "Nothing to push", body: `${info.branch} is up to date with ${info.upstream}`, level: "info", timeout: 3000 });
      notify({ title: `Pushing ${info.branch}…`, body: info.upstream ? `${info.ahead} commit${info.ahead === 1 ? "" : "s"}` : "setting the upstream", level: "info", timeout: 4000 });
      notify({ title: "Pushed", body: await push(info), level: "info" });
    }, cx);
  }

  // The PR popup, unless the branch already has an open PR: then its tab.
  openDialog(cx) {
    this.act("open the pull request popup", async () => {
      const w = where();
      const info = await branchInfo(w.cwd);
      const [repo, base] = (await gh(["repo", "view", "--json", "nameWithOwner,defaultBranchRef", "--jq", "[.nameWithOwner, .defaultBranchRef.name] | join(\" \")"], w.cwd)).split(" ");
      if (info.branch === base) throw new Error(`You're on ${base}: check out a branch first`);
      const open = JSON.parse(await gh(["pr", "list", "--head", info.branch, "--state", "open", "--json", "number,url", "--limit", "1"], w.cwd))[0];
      if (open) {
        notify({ title: `#${open.number} is open for ${info.branch}`, body: open.url, level: "info", timeout: 4000 });
        return openPr(w.space, repo, open.number);
      }
      const [title, body] = await Promise.all([git(["log", "-1", "--format=%s"], w.cwd).catch(() => ""), git(["log", "-1", "--format=%b"], w.cwd).catch(() => "")]);
      openOverlay({ mod: "git-actions", kind: "dialog", width: 620, props: { dialog: true, ...info, space: w.space, repo, base, title, body } });
    }, cx);
  }

  // The commit popup, with what it will commit decided now (the header says).
  openCommit(cx) {
    this.act("open the commit popup", async () => {
      const w = where();
      const staged = await commitInfo(w.cwd);
      const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"], w.cwd).catch(() => "");
      openOverlay({ mod: "git-actions", kind: "dialog", width: 560, props: { dialog: "commit", cwd: w.cwd, branch, staged } });
    }, cx);
  }

  render() {
    const d = props()?.dialog;
    return d === "commit" ? this.renderCommit() : d ? this.renderDialog() : div();
  }

  // ---- The popup ----

  initDialog(cx) {
    const p = props();
    this.error = null;
    this.handle = cx.focus_handle();
    if (p.dialog === "commit") {
      // Enter commits, Shift-Enter starts a new line (as gitview's box did).
      this.message = TextareaState.new({ placeholder: "Commit message", rows: 3 });
      this.message.set_auto_grow(3, 10);
      this.message.on("submit", (_e, cx) => this.doCommit(cx));
      this.message.focus();
      cx.timer.after(600, () => this.message.focus());
      return;
    }
    this.title = InputState.new({ value: p.title ?? "", placeholder: "Pull request title" });
    this.body = TextareaState.new({ value: p.body ?? "", placeholder: "Description (optional)", rows: 8 });
    this.draft = false;
    this.title.on("submit", (_e, cx) => this.create(cx));
    this.title.focus();
    cx.timer.after(600, () => this.title.focus());
  }

  key(e, cx) {
    const p = props();
    const commit = p.dialog === "commit";
    if (e.key === "escape") closeOverlay(p.overlay);
    else if (e.key === "enter" && e.modifiers?.platform) commit ? this.doCommit(cx) : this.create(cx);
    else if (!commit && e.key === "d" && e.modifiers?.platform) {
      this.draft = !this.draft;
      cx.notify();
    } else if (!commit && e.key === "tab") (e.modifiers?.shift ? this.title : this.body).focus();
    else return;
    cx.stop_propagation();
  }

  doCommit(cx) {
    const p = props();
    const message = this.message.value().trim();
    if (!message) {
      this.error = "A message is needed";
      return cx.notify();
    }
    this.error = null;
    this.act("commit", async () => {
      try {
        const out = await commit(p.cwd, p.staged, message);
        notify({ title: "Committed", body: out || firstLine(message), level: "success" });
        closeOverlay(p.overlay);
      } catch (e) {
        this.error = String(e?.message ?? e); // the message stays in the box
      }
    }, cx);
  }

  create(cx) {
    const p = props();
    const title = this.title.value().trim();
    if (!title) {
      this.error = "A title is needed";
      return cx.notify();
    }
    this.act("create the pull request", async () => {
      if (!p.upstream || p.ahead > 0) await push({ cwd: p.cwd, branch: p.branch, upstream: p.upstream, ahead: p.ahead, behind: p.behind });
      const out = await gh(["pr", "create", "--head", p.branch, "--base", p.base, "--title", title, "--body", this.body.value(), ...(this.draft ? ["--draft"] : [])], p.cwd, 120000);
      const url = out.split("\n").find((l) => /\/pull\/\d+/.test(l)) ?? "";
      const number = Number(/\/pull\/(\d+)/.exec(url)?.[1]);
      notify({ title: `PR #${number || "?"} opened`, body: title, level: "info" });
      setShared(REFRESH, Date.now());
      closeOverlay(p.overlay);
      if (number && p.repo) openPr(p.space, p.repo, number);
    }, cx);
  }

  renderCommit() {
    const t = theme();
    const p = props() ?? {};
    const busy = Boolean(this.busy);
    return v_flex()
      .id("ga-commit")
      .track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .w_full()
      .min_h(0)
      .p(18)
      .gap(8)
      .bg(t.popover)
      .text_color(t.foreground)
      .child(
        h_flex()
          .items_center()
          .gap(8)
          .child(div().flex_1().text_size(15).font_semibold().child(p.staged ? "Commit staged changes" : "Commit all changes"))
          .child(div().text_size(11.5).text_color(t.dim).child(p.branch ?? "")),
      )
      .child(field(t, Textarea.new(this.message).w_full().py(6)))
      .when(Boolean(this.error), (el) => el.child(div().text_size(12).text_color(t.blocked).child(this.error)))
      .child(
        h_flex()
          .pt(4)
          .gap(14)
          .items_center()
          .text_size(11)
          .child(keycap(t, "↩", "commit"))
          .child(keycap(t, "⇧↩", "new line"))
          .child(keycap(t, "esc", "cancel"))
          .child(div().flex_1())
          .when(busy, (el) => el.child(h_flex().items_center().gap(6).text_color(t.dim).child(svg("mods/workspace-chrome/spinner.svg").size(13).spin(900)).child("Committing…"))),
      );
  }

  renderDialog() {
    const t = theme();
    const p = props() ?? {};
    const busy = Boolean(this.busy);
    const field_ = (el) => field(t, el);
    const key = (cap, label) => keycap(t, cap, label);
    return v_flex()
      .id("ga-dialog")
      .track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .w_full()
      .min_h(0)
      .p(18)
      .gap(8)
      .bg(t.popover)
      .text_color(t.foreground)
      .child(
        h_flex()
          .items_center()
          .gap(8)
          .child(div().flex_1().text_size(15).font_semibold().child(this.draft ? "New draft pull request" : "New pull request"))
          .child(div().text_size(11.5).text_color(t.dim).child(`${p.repo ?? ""} · ${p.branch} → ${p.base}${!p.upstream || p.ahead > 0 ? " · pushes first" : ""}`)),
      )
      .child(field_(Input.new(this.title).h(34)))
      .child(field_(Textarea.new(this.body).w_full().py(6)))
      .when(Boolean(this.error), (el) => el.child(div().text_size(12).text_color(t.blocked).child(this.error)))
      .child(
        h_flex()
          .pt(4)
          .gap(14)
          .items_center()
          .text_size(11)
          .child(key("⌘↩", "create"))
          .child(key("⌘D", this.draft ? "not a draft" : "draft"))
          .child(key("⇥", "description"))
          .child(key("esc", "cancel"))
          .child(div().flex_1())
          .when(busy, (el) => el.child(h_flex().items_center().gap(6).text_color(t.dim).child(svg("mods/workspace-chrome/spinner.svg").size(13).spin(900)).child("Creating…"))),
      );
  }
}
