// One pull request as a tab: its diff with review threads under the lines they
// sit on, the conversation (description, reviews, comments, threads), and
// Merge / Close buttons that ask once before acting. Opened by the sidebar list
// with props { view: { repo, number } }.

import { div, svg } from "gpui-kit";
import { v_flex, h_flex, ScrollHandle, Scrollbar, TextView, v_virtual_list } from "gpui-base";
import { exec, home, notify, props, run, setShared, settings, spaces, theme } from "herdr";
import { gh, ghJson, openUrl, duration, kind, check, buildUrl, firstLine, REFRESH } from "./gh.js";
import { parseDiff, threads, buildRows } from "./diff.js";

const MAX_DIFF = 2_000_000;
const REVIEW = { APPROVED: ["approved", "ansi2"], CHANGES_REQUESTED: ["changes requested", "blocked"], COMMENTED: ["commented", "dim"], DISMISSED: ["dismissed", "dim"], PENDING: ["pending review", "dim"] };
const MERGE_STATE = { CLEAN: ["ready to merge", "ansi2"], UNSTABLE: ["checks failing", "blocked"], BLOCKED: ["blocked", "blocked"], BEHIND: ["behind base", "working"], DIRTY: ["conflicts", "blocked"], DRAFT: ["draft", "dim"], HAS_HOOKS: ["ready", "ansi2"], UNKNOWN: ["checking…", "dim"] };

export class PullRequestView {
  init(_props, cx) {
    const v = props()?.view ?? {};
    this.repo = v.repo;
    this.number = v.number;
    this.pr = null;
    this.files = [];
    this.threads = [];
    this.rows = [];
    this.folded = new Set();
    this.tab = v.tab === "comments" ? "comments" : "diff";
    this.error = null;
    this.diffError = null;
    this.loading = false;
    this.busy = null;
    this.confirm = null;
    this.methods = null;
    this.highlight = null;
    this.scroll = ScrollHandle.new();
    cx.timer.every(120_000, (cx) => this.refresh(cx));
    this.refresh(cx);
  }

  refresh(cx) {
    if (this.loading || !this.repo) return;
    this.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      await this.load();
      this.loading = false;
      cx.notify();
    });
  }

  async load() {
    const n = String(this.number);
    const [pr, comments, diff, repo] = await Promise.allSettled([
      ghJson(["pr", "view", n, "--repo", this.repo, "--json", "title,body,url,state,isDraft,mergeable,mergeStateStatus,reviewDecision,headRefName,baseRefName,isCrossRepository,additions,deletions,changedFiles,author,comments,reviews,statusCheckRollup,createdAt"]),
      ghJson(["api", `repos/${this.repo}/pulls/${n}/comments`, "--paginate", "--slurp"]),
      gh(["pr", "diff", n, "--repo", this.repo], { timeout: 60000 }),
      this.methods ? Promise.resolve(this.methods) : ghJson(["api", `repos/${this.repo}`, "--jq", "{squash: .allow_squash_merge, merge: .allow_merge_commit, rebase: .allow_rebase_merge}"]),
    ]);
    if (pr.status === "rejected") {
      this.error = pr.reason?.message ?? String(pr.reason);
      return;
    }
    this.error = null;
    const p = pr.value;
    const checks = (p.statusCheckRollup ?? []).map(check);
    const states = checks.map((c) => kind(c.state));
    this.pr = {
      ...p,
      checks,
      ci: states.includes("failure") ? "failure" : states.includes("pending") ? "pending" : states.length ? "success" : "none",
    };
    this.threads = comments.status === "fulfilled" ? threads(comments.value.flat()) : [];
    if (diff.status === "fulfilled") {
      const text = diff.value.length > MAX_DIFF ? diff.value.slice(0, MAX_DIFF) : diff.value;
      this.files = parseDiff(text);
      this.diffError = diff.value.length > MAX_DIFF ? "Diff truncated: it is over 2 MB. Open it on GitHub for the rest." : null;
    } else {
      this.files = [];
      this.diffError = diff.reason?.message ?? String(diff.reason);
    }
    if (repo.status === "fulfilled") this.methods = repo.value;
    this.rows = buildRows(this.files, this.threads, this.folded);
  }

  mergeMethod() {
    const m = this.methods ?? { squash: true };
    return m.squash ? "squash" : m.merge ? "merge" : m.rebase ? "rebase" : "squash";
  }

  // Merge or close, after the confirm row said yes. The sidebar list re-reads
  // GitHub through the shared stamp.
  act(what, cx) {
    this.confirm = null;
    this.busy = what;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const n = String(this.number);
        if (what === "merge") await gh(["pr", "merge", n, "--repo", this.repo, `--${this.mergeMethod()}`], { timeout: 120000 });
        else await gh(["pr", "close", n, "--repo", this.repo]);
        notify({ title: `#${this.number} ${what === "merge" ? "merged" : "closed"}`, body: this.pr?.title ?? this.repo, level: "info" });
      } catch (e) {
        notify({ title: `Couldn't ${what} #${this.number}`, body: String(e?.message ?? e), level: "error" });
      }
      this.busy = null;
      setShared(REFRESH, Date.now());
      await this.load();
      cx.notify();
    });
  }

  // A space for this PR: the repo's clone in ~/vinted, on the PR's branch. When
  // the clone is on another branch, a git worktree of it at Herdr's place
  // (~/.herdr/worktrees/<repo>/<branch>) so the clone stays as it is. A space
  // already on that folder is shown instead of made again.
  openSpace(cx) {
    const pr = this.pr;
    if (!pr || this.busy) return;
    this.busy = "space";
    cx.notify();
    cx.spawn(async (cx) => {
      const repoName = this.repo.split("/").pop();
      const clone = `${home()}/vinted/${repoName}`;
      const branch = pr.headRefName;
      const git = async (args, cwd = clone) => {
        const r = await exec("git", args, { cwd, timeout: 120000 });
        if (r.code !== 0) throw new Error(firstLine(r.stderr) || `git ${args[0]} failed`);
        return r.stdout.trim();
      };
      try {
        if ((await exec("git", ["rev-parse", "--is-inside-work-tree"], { cwd: clone }).catch(() => ({ code: 1 }))).code !== 0) throw new Error(`No clone at ~/vinted/${repoName}`);
        // The branch, fetched: a fork's through the PR ref.
        if (pr.isCrossRepository) await git(["fetch", "origin", `+refs/pull/${this.number}/head:refs/heads/${branch}`]);
        else await git(["fetch", "origin", branch]);
        let folder = clone;
        if ((await git(["branch", "--show-current"])) !== branch) {
          const list = await git(["worktree", "list", "--porcelain"]);
          const at = list.split("\n\n").map((b) => b.split("\n")).find((b) => b.some((l) => l === `branch refs/heads/${branch}`));
          folder = at ? at[0].replace(/^worktree /, "") : `${home()}/.herdr/worktrees/${repoName}/${branch}`;
          if (!at) {
            const local = (await exec("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], { cwd: clone })).code === 0;
            await git(["worktree", "add", folder, ...(local ? [branch] : ["-b", branch, `origin/${branch}`])]);
          }
        }
        const open = spaces().find((s) => !s.machine && s.folder === folder);
        if (open) run("space.select", { id: open.id });
        else run("space.new", { name: `${repoName} #${this.number}`, folder });
      } catch (e) {
        notify({ title: `Couldn't make a space for #${this.number}`, body: String(e?.message ?? e), level: "error" });
      }
      this.busy = null;
      cx.notify();
    });
  }

  button(t, id, label, onClick, { tone = null, disabled = false } = {}) {
    const color = tone ? t[tone] : t.foreground;
    return h_flex()
      .id(id)
      .h(26)
      .px(10)
      .flex_none()
      .items_center()
      .rounded(6)
      .border_1()
      .border_color(tone ? color + "66" : t.border)
      .text_size(12)
      .text_color(disabled ? t.dim : color)
      .when(!disabled, (el) => el.cursor_pointer().hover((s) => s.bg(t.hover)).on_click((_e, cx) => onClick(cx)))
      .child(label);
  }

  chip(t, text, tone) {
    return div().flex_none().px(6).h(18).rounded(5).bg(t[tone] + "26").text_size(10.5).font_medium().text_color(t[tone]).flex().items_center().child(text);
  }

  header(t) {
    const pr = this.pr;
    const open = pr?.state === "OPEN";
    const ci = pr ? { success: ["CI passed", "ansi2"], failure: ["CI failed", "blocked"], pending: ["CI running", "working"], none: ["no CI", "dim"] }[pr.ci] : null;
    const review = pr && REVIEW[pr.reviewDecision];
    const merge = pr && open && (MERGE_STATE[pr.mergeStateStatus] ?? null);
    const actions = this.confirm
      ? h_flex()
          .gap(6)
          .items_center()
          .child(div().text_size(12).text_color(t.foreground).child(this.confirm === "merge" ? `Merge #${this.number} with ${this.mergeMethod()}?` : `Close #${this.number} without merging?`))
          .child(this.button(t, "pr-yes", "Yes", (cx) => this.act(this.confirm, cx), { tone: this.confirm === "merge" ? "ansi2" : "blocked" }))
          .child(this.button(t, "pr-no", "No", (cx) => { this.confirm = null; cx.notify(); }))
      : h_flex()
          .gap(6)
          .items_center()
          .child(
            div()
              .id("pr-refresh")
              .size(26)
              .flex()
              .items_center()
              .justify_center()
              .rounded(6)
              .text_color(t.dim)
              .cursor_pointer()
              .hover((s) => s.text_color(t.foreground).bg(t.hover))
              .tooltip("Refresh")
              .on_click((_e, cx) => this.refresh(cx))
              .child(this.loading ? svg("mods/workspace-chrome/spinner.svg").size(14).spin(900) : svg("mods/prs/refresh.svg").size(14)),
          )
          .child(this.button(t, "pr-github", "GitHub", () => openUrl(this.pr?.url ?? `https://github.com/${this.repo}/pull/${this.number}`)))
          .child(this.button(t, "pr-space", this.busy === "space" ? "Opening…" : "Space", (cx) => this.openSpace(cx), { disabled: !pr || Boolean(this.busy) }))
          .when(Boolean(pr), (el) => el.child(this.circleButton(t)))
          .child(this.button(t, "pr-close", this.busy === "close" ? "Closing…" : "Close", (cx) => { this.confirm = "close"; cx.notify(); }, { tone: "blocked", disabled: !open || Boolean(this.busy) }))
          .child(this.button(t, "pr-merge", this.busy === "merge" ? "Merging…" : "Merge", (cx) => { this.confirm = "merge"; cx.notify(); }, { tone: "ansi2", disabled: !open || Boolean(this.busy) }));

    return v_flex()
      .flex_none()
      .px(14)
      .pt(10)
      .pb(8)
      .gap(6)
      .border_b(1)
      .border_color(t.border)
      .child(
        h_flex()
          .gap(10)
          .items_center()
          .child(div().flex_1().min_w(0).truncate().text_size(14).font_semibold().text_color(t.foreground).child(pr?.title ?? `#${this.number}`))
          .child(actions),
      )
      .child(
        h_flex()
          .gap(8)
          .items_center()
          .text_size(11.5)
          .text_color(t.dim)
          .child(div().child(`${this.repo} #${this.number}`))
          .when(Boolean(pr), (el) =>
            el
              .child(div().truncate().child(`${pr.headRefName} → ${pr.baseRefName}`))
              .child(div().child(`${pr.changedFiles} files`))
              .child(div().text_color(t.ansi2).child(`+${pr.additions}`))
              .child(div().text_color(t.ansi1).child(`−${pr.deletions}`))
              .child(div().flex_1())
              .when(pr.state !== "OPEN", (el) => el.child(this.chip(t, pr.state.toLowerCase(), pr.state === "MERGED" ? "ansi5" : "dim")))
              .when(pr.isDraft, (el) => el.child(this.chip(t, "draft", "dim")))
              .child(this.chip(t, ci[0], ci[1]))
              .when(Boolean(review), (el) => el.child(this.chip(t, review[0], review[1])))
              .when(Boolean(merge), (el) => el.child(this.chip(t, merge[0], merge[1]))),
          ),
      )
      .when(Boolean(this.error), (el) => el.child(div().text_size(12).text_color(t.blocked).child(`GitHub: ${this.error}`)))
      .child(
        h_flex()
          .gap(4)
          .items_center()
          .child(this.tabButton(t, "diff", `Diff · ${this.files.length}`))
          .child(this.tabButton(t, "comments", `Comments · ${this.commentCount()}`)),
      );
  }

  // The same CI circle as the sidebar: a click opens the Jenkins build.
  circleButton(t) {
    const pr = this.pr;
    const dot =
      pr.ci === "pending" ? svg("mods/workspace-chrome/spinner.svg").size(12).text_color(t.working).spin(900)
      : pr.ci === "none" ? div().size(10).rounded_full().border(1.5).border_color(t.dim)
      : div().size(10).rounded_full().bg(pr.ci === "success" ? t.ansi2 : t.blocked);
    return div()
      .id("pr-ci")
      .size(26)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(6)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .tooltip(pr.checks.some((c) => /jenkins/i.test(c.url ?? "")) ? "Open in Jenkins" : "Open checks on GitHub")
      .on_click(() => openUrl(buildUrl(pr)))
      .child(dot);
  }

  tabButton(t, id, label) {
    const on = this.tab === id;
    return div()
      .id(`pr-tab-${id}`)
      .h(24)
      .px(10)
      .flex()
      .items_center()
      .rounded(6)
      .text_size(12)
      .bg(on ? t.selected : t.background)
      .text_color(on ? t.foreground : t.muted)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => { this.tab = id; cx.notify(); })
      .child(label);
  }

  commentCount() {
    const pr = this.pr;
    return (pr?.comments?.length ?? 0) + (pr?.reviews?.filter((r) => r.body?.trim()).length ?? 0) + this.threads.reduce((n, th) => n + 1 + th.replies.length, 0);
  }

  // One diff row, inside the virtual list: no handlers here (on_item_click on the list).
  row(t, r, mono, ui) {
    if (r.k === "file") {
      return h_flex().h(r.size).items_center().px(10).gap(8).bg(t.raised).font_family(ui).whitespace_nowrap()
        .child(svg(`mods/workspace-chrome/chevron-${r.open ? "down" : "right"}.svg`).size(11).flex_none().text_color(t.dim))
        .child(div().flex_1().min_w(0).truncate().text_size(12).font_medium().text_color(t.foreground).child(r.file.path))
        .child(div().text_size(11).text_color(t.ansi2).child(`+${r.file.add}`))
        .child(div().text_size(11).text_color(t.ansi1).child(`−${r.file.del}`));
    }
    if (r.k === "note") {
      const th = r.thread;
      const more = th.replies.length ? ` · ${th.replies.length} ${th.replies.length === 1 ? "reply" : "replies"}` : "";
      return h_flex().h(r.size).items_center().pl(104).pr(10).gap(6).bg(t.accent + "1a").font_family(ui).whitespace_nowrap()
        .child(div().size(6).flex_none().rounded_full().bg(t.accent))
        .child(div().text_size(11.5).font_medium().text_color(t.foreground).child(th.root.user?.login ?? "?"))
        .child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(t.muted).child(firstLine(th.root.body).replace(/^#+\s*/, "")))
        .child(div().text_size(11).text_color(t.dim).child(`${duration(Date.now() - th.at)}${more}`));
    }
    if (r.k === "hunk") {
      return h_flex().h(r.size).items_center().px(10).whitespace_nowrap().text_size(11).text_color(t.accent).child(div().truncate().child(r.text));
    }
    const bg = r.k === "add" ? t.ansi2 + "26" : r.k === "del" ? t.ansi1 + "26" : null;
    const sign = r.k === "add" ? "+" : r.k === "del" ? "−" : " ";
    return h_flex().h(r.size).items_center().whitespace_nowrap().text_size(12).when(Boolean(bg), (el) => el.bg(bg))
      .child(div().w(44).flex_none().pr(6).text_size(10.5).text_color(t.dim).child(r.old != null ? String(r.old) : ""))
      .child(div().w(44).flex_none().pr(6).text_size(10.5).text_color(t.dim).child(r.new != null ? String(r.new) : ""))
      .child(div().w(14).flex_none().text_color(r.k === "add" ? t.ansi2 : r.k === "del" ? t.ansi1 : t.dim).child(sign))
      .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(r.text));
  }

  diffBody(t) {
    const rows = this.rows;
    if (!rows.length) {
      return v_flex().flex_1().items_center().justify_center().gap(4).px(20).text_color(t.dim)
        .child(div().text_size(12).child(this.diffError ? `Couldn't load the diff: ${this.diffError}` : this.loading ? "Loading the diff…" : "No changes."));
    }
    const mono = settings().font_family ?? "JetBrains Mono";
    const ui = settings().ui_font ?? "Geist";
    return v_flex()
      .flex_1()
      .min_h(0)
      .relative()
      .font_family(mono)
      .when(Boolean(this.diffError), (el) => el.child(div().flex_none().px(14).py(4).text_size(11.5).text_color(t.working).font_family(ui).child(this.diffError)))
      .child(
        v_virtual_list("pr-diff", rows.length, rows.map((r) => r.size), (i) => rows[i].key, (range) => rows.slice(range.start, range.end).map((r) => this.row(t, r, mono, ui)))
          .size_full()
          .on_item_click((key, cx) => this.rowClick(key, cx)),
      )
      .child(Scrollbar.vertical("pr-diff").absolute().inset_0());
  }

  rowClick(key, cx) {
    if (key.startsWith("f:")) {
      const path = key.slice(2);
      this.folded.has(path) ? this.folded.delete(path) : this.folded.add(path);
      this.rows = buildRows(this.files, this.threads, this.folded);
      cx.notify();
    } else if (key.startsWith("n:")) {
      this.tab = "comments";
      this.highlight = Number(key.slice(2));
      const i = this.cards().findIndex((c) => c.id === this.highlight);
      if (i >= 0) this.scroll.scroll_to_item(i);
      cx.notify();
    }
  }

  // The conversation, oldest first: description, reviews with a body, comments, review threads.
  cards() {
    const pr = this.pr;
    if (!pr) return [];
    const out = [{ id: "body", at: Date.parse(pr.createdAt), who: pr.author?.login, what: "opened", body: pr.body || "_No description._" }];
    for (const r of pr.reviews ?? []) {
      if (!r.body?.trim() && r.state !== "APPROVED" && r.state !== "CHANGES_REQUESTED") continue;
      out.push({ id: r.id, at: Date.parse(r.submittedAt), who: r.author?.login, what: (REVIEW[r.state] ?? ["reviewed", "dim"])[0], tone: (REVIEW[r.state] ?? [null, "dim"])[1], body: r.body });
    }
    for (const c of pr.comments ?? []) out.push({ id: c.id, at: Date.parse(c.createdAt), who: c.author?.login, what: "commented", body: c.body });
    for (const th of this.threads) {
      out.push({
        id: th.root.id,
        at: th.at,
        who: th.root.user?.login,
        what: `on ${th.path}${th.line != null ? `:${th.line}` : ""}${th.outdated ? " (outdated)" : ""}`,
        body: th.root.body,
        replies: th.replies,
        thread: th,
      });
    }
    return out.sort((a, b) => a.at - b.at);
  }

  card(t, c, now) {
    const lit = this.highlight === c.id;
    const comment = (id, who, at, what, body, tone) =>
      v_flex().gap(4)
        .child(h_flex().gap(6).items_center().text_size(11.5)
          .child(div().font_medium().text_color(t.foreground).child(who ?? "?"))
          .child(div().text_color(tone ? t[tone] : t.dim).child(what))
          .child(div().flex_1())
          .child(div().text_color(t.dim).child(duration(now - at))))
        .when(Boolean(body?.trim()), (el) => el.child(TextView.markdown(`md-${id}`, body).selectable(true)));
    return v_flex()
      .id(`card-${c.id}`)
      .flex_none()
      .w_full()
      .rounded(8)
      .border_1()
      .border_color(lit ? t.accent : t.border)
      .bg(t.surface)
      .p(10)
      .gap(8)
      .text_size(12.5)
      .child(comment(c.id, c.who, c.at, c.what, c.body, c.tone))
      .when(Boolean(c.thread?.root?.diff_hunk), (el) =>
        el.child(div().px(8).py(4).rounded(6).bg(t.raised).text_size(11).font_family(settings().font_family ?? "JetBrains Mono").text_color(t.muted)
          .child(c.thread.root.diff_hunk.split("\n").slice(-4).join("\n"))))
      .children((c.replies ?? []).map((r) => div().pl(10).border_l(2).border_color(t.border).child(comment(r.id, r.user?.login, Date.parse(r.created_at), "replied", r.body))));
  }

  commentsBody(t) {
    const cards = this.cards();
    const now = Date.now();
    return v_flex()
      .id("pr-comments")
      .flex_1()
      .min_h(0)
      .px(14)
      .py(10)
      .gap(8)
      .overflow_y_scrollbar()
      .mode("always")
      .track_scroll(this.scroll)
      .children(cards.map((c) => this.card(t, c, now)))
      .when(!cards.length, (el) => el.child(div().text_size(12).text_color(t.dim).child(this.loading ? "Loading…" : "Nothing here yet.")));
  }

  render() {
    const t = theme();
    return v_flex()
      .id("pr-view")
      .size_full()
      .min_h(0)
      .bg(t.background)
      .text_color(t.foreground)
      .text_size(13)
      .child(this.header(t))
      .child(this.tab === "diff" ? this.diffBody(t) : this.commentsBody(t));
  }
}
