// git-actions: push and pull requests for the shown space's repo, as a bar
// floating over the window while the gitview tab is shown (nothing is drawn
// elsewhere). It shows the branch and how it stands against its upstream
// (not pushed, ↑ahead, ↓behind, up to date, uncommitted changes), a Push
// button, and either "Create PR" (a dialog: title, body, base, draft; pushes
// first when needed, then `gh pr create`, then opens the PR as a tab of the
// prs mod) or "PR #n" when the branch already has one. Polls git every few
// seconds while shown; spaces on other machines are skipped.
//
// The dialog is this same mod opened with props { dialog: true, ... }.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, TextareaState, Textarea } from "gpui-base";
import { closeOverlay, exec, notify, openOverlay, props, run, setShared, spaces, theme } from "herdr";

const SHOW_ON = ["gitview"];
const POLL = 5000;
const PR_POLL = 30000;
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

// The shown space's repo, when it's on this computer and the gitview tab shows.
function where() {
  const space = spaces().find((s) => s.active);
  if (!space || space.machine || !space.folder) return null;
  const tab = space.tabs.find((t) => t.active);
  return tab && SHOW_ON.includes(tab.name) ? { cwd: space.folder, space: space.id } : null;
}

// `git push`, with -u the first time. Returns what it did.
async function push(info) {
  if (info.upstream) await git(["push"], info.cwd, 180000);
  else await git(["push", "-u", "origin", info.branch], info.cwd, 180000);
}

// The PR as a tab of the prs mod, in this space.
function openPr(space, repo, number) {
  const sp = spaces().find((s) => s.id === space);
  const name = `#${number}`;
  const tab = sp?.tabs.find((t) => t.name === name);
  if (tab) return run("tab.select", { id: tab.id });
  run("tab.new", { name, ...(sp ? { space } : {}), mod: "prs", props: { view: { repo, number } } });
}

export default class GitActions extends View {
  init(_props, cx) {
    this.info = null;
    this.busy = null;
    this.at = 0;
    this.prAt = 0;
    if (props()?.dialog) return this.initDialog(cx);
    cx.spawn(async (cx) => {
      for (;;) {
        await cx.sleep(1000);
        const w = where();
        if (!w) continue;
        if (this.loading) continue;
        if (w.cwd === this.info?.cwd && Date.now() - this.at < POLL) continue;
        await this.refresh(w, cx);
      }
    });
  }

  async refresh(w, cx) {
    this.loading = true;
    const same = w.cwd === this.info?.cwd;
    try {
      const [branch, upstream, dirty] = await Promise.all([
        git(["rev-parse", "--abbrev-ref", "HEAD"], w.cwd),
        git(["rev-parse", "--abbrev-ref", "@{u}"], w.cwd).catch(() => null),
        git(["status", "--porcelain"], w.cwd).then((s) => s.split("\n").filter(Boolean).length),
      ]);
      let ahead = 0, behind = 0;
      if (upstream) [behind, ahead] = (await git(["rev-list", "--left-right", "--count", "@{u}...HEAD"], w.cwd)).split(/\s+/).map(Number);
      const info = { ...(same ? this.info : {}), cwd: w.cwd, space: w.space, branch, upstream, ahead, behind, dirty, error: null };
      // Repo facts, once per repo; the PR, every PR_POLL or when the branch changed.
      if (!same || !info.repo) {
        info.repo = await gh(["repo", "view", "--json", "nameWithOwner,defaultBranchRef", "--jq", "[.nameWithOwner, .defaultBranchRef.name] | join(\" \")"], w.cwd).then((s) => s.split(" ")).catch(() => null);
        this.prAt = 0;
      }
      if (!same || info.prBranch !== branch || Date.now() - this.prAt > PR_POLL) {
        info.pr = branch === "HEAD" ? null : JSON.parse(await gh(["pr", "list", "--head", branch, "--state", "open", "--json", "number,url,title", "--limit", "1"], w.cwd).catch(() => "[]"))[0] ?? null;
        info.prBranch = branch;
        this.prAt = Date.now();
      }
      this.info = info;
    } catch (e) {
      this.info = { cwd: w.cwd, space: w.space, error: String(e?.message ?? e) };
    }
    this.at = Date.now();
    this.loading = false;
    cx.notify();
  }

  act(what, fn, cx) {
    if (this.busy) return;
    this.busy = what;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        await fn();
      } catch (e) {
        notify({ title: `Couldn't ${what}`, body: String(e?.message ?? e), level: "error" });
      }
      this.busy = null;
      this.at = 0;
      this.prAt = 0;
      cx.notify();
    });
  }

  doPush(cx) {
    const info = this.info;
    this.act("push", async () => {
      await push(info);
      notify({ title: "Pushed", body: `${info.branch} → origin`, level: "info" });
    }, cx);
  }

  openDialog(cx) {
    const info = this.info;
    this.act("open the PR dialog", async () => {
      const subject = await git(["log", "-1", "--format=%s"], info.cwd).catch(() => "");
      const body = await git(["log", "-1", "--format=%b"], info.cwd).catch(() => "");
      openOverlay({
        mod: "git-actions", kind: "dialog", width: 600,
        props: { dialog: true, cwd: info.cwd, space: info.space, branch: info.branch, upstream: info.upstream, ahead: info.ahead, base: info.repo?.[1] ?? "main", repo: info.repo?.[0] ?? null, title: subject, body },
      });
    }, cx);
  }

  button(t, id, label, onClick, { primary = false, disabled = false, tip = null } = {}) {
    return h_flex()
      .id(id)
      .h(24)
      .px(10)
      .flex_none()
      .items_center()
      .rounded(6)
      .border_1()
      .border_color(primary ? t.solid : t.border)
      .bg(primary ? t.solid : t.raised)
      .text_size(12)
      .text_color(disabled ? t.dim : primary ? t.solid_foreground : t.foreground)
      .when(disabled, (el) => el.opacity(0.6))
      .when(Boolean(tip), (el) => el.tooltip(tip))
      .when(!disabled, (el) => el.cursor_pointer().hover((s) => s.opacity(0.85)).on_click((_e, cx) => onClick(cx)))
      .child(label);
  }

  render() {
    if (props()?.dialog) return this.renderDialog();
    const t = theme();
    const w = where();
    const info = this.info;
    if (!w || !info || info.cwd !== w.cwd) return div();
    if (info.error) return h_flex().h(30).px(12).items_center().text_size(12).text_color(t.dim).child(`git: ${info.error}`);
    const base = info.repo?.[1];
    const detached = info.branch === "HEAD";
    const state = !info.upstream ? ["not pushed", t.working] : info.ahead && info.behind ? [`↑${info.ahead} ↓${info.behind}`, t.working] : info.ahead ? [`↑${info.ahead} to push`, t.working] : info.behind ? [`↓${info.behind} behind`, t.dim] : ["up to date", t.dim];
    const canPush = !detached && (!info.upstream || info.ahead > 0) && !info.behind;
    const busy = Boolean(this.busy);
    return h_flex()
      .h(32)
      .px(12)
      .gap(10)
      .items_center()
      .text_size(12)
      .text_color(t.foreground)
      .child(h_flex().gap(6).items_center().child(svg("mods/workspace-chrome/branch.svg").size(13).text_color(t.dim)).child(div().font_medium().child(info.branch)))
      .child(div().text_color(state[1]).child(state[0]))
      .when(info.dirty > 0, (el) => el.child(div().text_color(t.dim).child(`${info.dirty} uncommitted`)))
      .when(busy, (el) => el.child(svg("mods/workspace-chrome/spinner.svg").size(13).text_color(t.working).spin(900)))
      .child(div().w(4))
      .child(this.button(t, "ga-push", this.busy === "push" ? "Pushing…" : "Push", (cx) => this.doPush(cx), { disabled: busy || !canPush, tip: info.behind ? "Pull first: the branch is behind its upstream" : info.upstream ? "git push" : `git push -u origin ${info.branch}` }))
      .child(
        info.pr
          ? this.button(t, "ga-pr", `PR #${info.pr.number}`, () => openPr(info.space, info.repo?.[0], info.pr.number), { tip: info.pr.title })
          : this.button(t, "ga-pr", "Create PR", (cx) => this.openDialog(cx), { primary: true, disabled: busy || detached || info.branch === base, tip: info.branch === base ? `You're on ${base}` : `Open a pull request for ${info.branch}` }),
      );
  }

  // ---- The dialog ----

  initDialog(cx) {
    const p = props();
    this.title = InputState.new({ value: p.title ?? "", placeholder: "Title" });
    this.body = TextareaState.new({ value: p.body ?? "", placeholder: "Description (optional)", rows: 7 });
    this.base = InputState.new({ value: p.base ?? "main", placeholder: "Base branch" });
    this.draft = false;
    this.error = null;
    this.title.on("submit", (_e, cx) => this.create(cx));
    this.base.on("submit", (_e, cx) => this.create(cx));
    this.title.focus();
    cx.timer.after(600, () => this.title.focus());
    this.handle = cx.focus_handle();
  }

  create(cx) {
    const p = props();
    const title = this.title.value().trim();
    if (!title) {
      this.error = "A title is needed";
      return cx.notify();
    }
    this.act("create the PR", async () => {
      const info = { cwd: p.cwd, branch: p.branch, upstream: p.upstream };
      if (!p.upstream || p.ahead > 0) await push(info);
      const out = await gh(["pr", "create", "--head", p.branch, "--base", this.base.value().trim() || p.base, "--title", title, "--body", this.body.value(), ...(this.draft ? ["--draft"] : [])], p.cwd, 120000);
      const url = out.split("\n").find((l) => /\/pull\/\d+/.test(l)) ?? "";
      const number = Number(/\/pull\/(\d+)/.exec(url)?.[1]);
      notify({ title: `PR #${number || "?"} opened`, body: title, level: "info" });
      setShared(REFRESH, Date.now());
      closeOverlay(p.overlay);
      if (number && p.repo) openPr(p.space, p.repo, number);
    }, cx);
  }

  renderDialog() {
    const t = theme();
    const p = props() ?? {};
    const label = (text) => div().pt(12).pb(6).text_size(11.5).text_color(t.dim).child(text);
    const field = (el) => el.px(10).rounded(8).border_1().border_color(t.input).bg(t.background).text_size(12.8).text_color(t.foreground);
    const busy = Boolean(this.busy);
    const button = (id, text, primary, action, disabled = false) => h_flex().id(id).h(32).px(14).items_center().rounded(8)
      .border_1().border_color(primary ? t.solid : t.input).bg(primary ? t.solid : t.raised)
      .text_color(primary ? t.solid_foreground : t.foreground).text_size(12.5).font_medium()
      .when(disabled, (el) => el.opacity(0.6))
      .when(!disabled, (el) => el.cursor_pointer().hover((s) => s.opacity(0.88)).on_click((_e, cx) => action(cx)))
      .child(text);
    return v_flex()
      .id("ga-dialog")
      .track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === "escape") {
          closeOverlay(p.overlay);
          cx.stop_propagation();
        }
      })
      .w_full()
      .min_h(0)
      .p(18)
      .bg(t.popover)
      .text_color(t.foreground)
      .child(
        h_flex()
          .items_center()
          .child(div().flex_1().text_size(15).font_semibold().child("New pull request"))
          .child(div().text_size(11).text_color(t.dim).child("Esc")),
      )
      .child(div().pt(4).text_size(11.5).text_color(t.dim).child(`${p.repo ?? ""} · ${p.branch} → ${this.base.value() || p.base}${!p.upstream || p.ahead > 0 ? " · pushes first" : ""}`))
      .child(label("Title"))
      .child(field(Input.new(this.title).h(34)))
      .child(label("Description"))
      .child(field(Textarea.new(this.body).w_full().py(6)))
      .child(
        h_flex().gap(16).items_end()
          .child(v_flex().flex_1().child(label("Base")).child(field(Input.new(this.base).h(34))))
          .child(
            h_flex().id("ga-draft").h(34).px(10).gap(8).items_center().rounded(8).border_1().border_color(this.draft ? t.accent : t.input).cursor_pointer()
              .hover((s) => s.bg(t.hover))
              .on_click((_e, cx) => { this.draft = !this.draft; cx.notify(); })
              .child(div().size(12).rounded(3).border_1().border_color(this.draft ? t.accent : t.dim).when(this.draft, (el) => el.bg(t.accent)))
              .child(div().text_size(12.5).child("Draft")),
          ),
      )
      .when(Boolean(this.error), (el) => el.child(div().pt(8).text_size(12).text_color(t.blocked).child(this.error)))
      .child(
        h_flex().pt(20).gap(8).justify_end()
          .when(busy, (el) => el.child(h_flex().items_center().gap(6).text_size(12).text_color(t.dim).child(svg("mods/workspace-chrome/spinner.svg").size(13).spin(900)).child("Creating…")))
          .child(button("ga-cancel", "Cancel", false, () => closeOverlay(p.overlay)))
          .child(button("ga-create", this.draft ? "Create draft PR" : "Create PR", true, (cx) => this.create(cx), busy)),
      );
  }
}
