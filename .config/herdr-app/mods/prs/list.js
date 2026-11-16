// The sidebar list: your open pull requests grouped by repo, then two foldable
// sections: "To review" (open, non-draft PRs of the last REVIEW_DAYS days that
// ask TEAM for a review, each with a quick Approve button) and "Merged" (your
// PRs merged into main or master in the last MERGED_DAYS days, whose circle is
// the merge commit's CI on that branch, to follow a release). The circle on a
// row is a commit's CI state and opens its Jenkins build; the row opens the
// PR as a tab (view.js). Reads GitHub once a minute, on the refresh button,
// and when another copy stamps shared "prs.refresh" (after a merge, close,
// approval or comment).

import { div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { exec, layout, notify, run, setShared, shared, spaces, theme } from "herdr";
import { gh, ghJson, openUrl, duration, kind, check, buildUrl, jenkins, openSpaceFor, REFRESH } from "./gh.js";

const EVERY = 60_000;
// The team whose review requests fill "To review".
const TEAM = "vinted/resilience";
const REVIEW_DAYS = 7;
// Authors whose PRs "To review" leaves out, as search qualifiers: renovate's
// dependency bumps (a GitHub App, hence `app/`).
const SKIP_AUTHORS = ["app/vinted-renovate"];
const MERGED_DAYS = 3;
const FIELDS = `number title url isDraft createdAt updatedAt mergedAt reviewDecision headRefName baseRefName isCrossRepository author { login } repository { nameWithOwner }
  latestReviews(first: 30) { nodes { author { login } state } }
  commits(last: 1) { nodes { commit { ...Rollup } } }
  mergeCommit { ...Rollup }`;
const FRAGMENT = `fragment Rollup on Commit { statusCheckRollup { state contexts(first: 50) { nodes {
  __typename ... on StatusContext { context state targetUrl } ... on CheckRun { name status conclusion detailsUrl } } } } }`;
const day = (ago) => new Date(Date.now() - ago * 86_400_000).toISOString().slice(0, 10);
const search = (name, q) => `${name}: search(query: "${q}", type: ISSUE, first: 100) { nodes { ... on PullRequest { ${FIELDS} } } }`;
const query = () => `query { viewer { login }
  ${search("mine", "is:pr is:open author:@me archived:false sort:updated-desc")}
  ${search("review", `is:pr is:open draft:false archived:false -author:@me ${SKIP_AUTHORS.map((a) => `-author:${a}`).join(" ")} team-review-requested:${TEAM} created:>=${day(REVIEW_DAYS)} sort:created-desc`)}
  ${search("merged", `is:pr is:merged author:@me archived:false merged:>=${day(MERGED_DAYS)} sort:updated-desc`)} }
${FRAGMENT}`;

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}
// The sidebar's rail goes by its width, as the shipped sidebar mods do.
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

// `rollup`: the head commit's checks, or the merge commit's for a merged PR.
function normalize(n, me, rollup) {
  const checks = (rollup?.contexts?.nodes ?? []).map(check);
  const mine = n.latestReviews?.nodes?.find((r) => r.author?.login === me);
  return {
    key: `${n.repository.nameWithOwner}-${n.number}`,
    repo: n.repository.nameWithOwner,
    number: n.number,
    title: n.title,
    url: n.url,
    draft: n.isDraft,
    review: n.reviewDecision,
    approved: n.reviewDecision === "APPROVED",
    approvedByMe: mine?.state === "APPROVED",
    author: n.author?.login ?? "?",
    headRefName: n.headRefName,
    baseRefName: n.baseRefName,
    isCrossRepository: n.isCrossRepository,
    created: Date.parse(n.createdAt),
    updated: Date.parse(n.updatedAt),
    merged: n.mergedAt ? Date.parse(n.mergedAt) : null,
    ci: kind(rollup?.state),
    checks,
    failing: checks.filter((c) => kind(c.state) === "failure").map((c) => c.name),
    running: checks.filter((c) => kind(c.state) === "pending").map((c) => c.name),
  };
}

// The PR as a tab in the shown space; an open one is selected instead.
function openView(pr) {
  const sp = spaces().find((s) => s.active);
  const name = `#${pr.number}`;
  const tab = sp?.tabs.find((t) => t.name === name);
  if (tab) return run("tab.select", { id: tab.id });
  run("tab.new", { name, ...(sp ? { space: sp.id } : {}), mod: "prs", props: { view: { repo: pr.repo, number: pr.number } } });
}

export class PullRequestList {
  init(_props, cx) {
    this.prs = [];
    this.review = [];
    this.merged = [];
    this.me = null;
    this.error = null;
    this.loading = false;
    this.at = 0;
    this.stamp = shared(REFRESH) ?? null;
    // Both sections start folded; their headers still carry the counts.
    this.folded = new Set(["review", "merged"]);
    this.opening = new Set();
    this.approving = new Set();
    cx.timer.every(EVERY, (cx) => this.refresh(cx));
    this.refresh(cx);
    cx.spawn(async (cx) => {
      for (;;) {
        await cx.sleep(1500);
        const s = shared(REFRESH) ?? null;
        if (s === this.stamp) continue;
        this.stamp = s;
        this.refresh(cx);
      }
    });
  }

  refresh(cx) {
    if (this.loading) return;
    this.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const data = await ghJson(["api", "graphql", "-f", `query=${query()}`]);
        if (data.errors?.length) throw new Error(data.errors[0].message);
        const d = data.data ?? {};
        this.me = d.viewer?.login ?? null;
        const head = (n) => n.commits?.nodes?.[0]?.commit?.statusCheckRollup;
        const nodes = (s) => (s?.nodes ?? []).filter((n) => n.number);
        this.prs = nodes(d.mine).map((n) => normalize(n, this.me, head(n)));
        this.review = nodes(d.review).map((n) => normalize(n, this.me, head(n)));
        this.merged = nodes(d.merged).filter((n) => ["main", "master"].includes(n.baseRefName)).map((n) => normalize(n, this.me, n.mergeCommit?.statusCheckRollup));
        this.error = null;
        this.at = Date.now();
      } catch (e) {
        this.error = String(e?.message ?? e);
      }
      this.loading = false;
      cx.notify();
    });
  }

  // Approves at once, no question asked; the list re-reads after.
  approve(pr, cx) {
    if (this.approving.has(pr.key)) return;
    this.approving.add(pr.key);
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        await gh(["pr", "review", String(pr.number), "--repo", pr.repo, "--approve"]);
        notify({ title: `Approved #${pr.number}`, body: pr.title, level: "info" });
        setShared(REFRESH, Date.now());
      } catch (e) {
        notify({ title: `Couldn't approve #${pr.number}`, body: String(e?.message ?? e), level: "error" });
      }
      this.approving.delete(pr.key);
      cx.notify();
    });
  }

  tip(pr) {
    const where = pr.checks.some(jenkins) ? "Open in Jenkins" : "Open checks on GitHub";
    const on = pr.merged ? ` on ${pr.baseRefName}` : "";
    if (pr.ci === "failure") return `CI failed${on}: ${pr.failing.join(", ") || "see Jenkins"}. ${where}`;
    if (pr.ci === "pending") return `CI running${on}: ${pr.running.join(", ") || "queued"}. ${where}`;
    if (pr.ci === "success") return `CI passed${on}. ${where}`;
    return `No CI status yet${on}. ${where}`;
  }

  // The CI circle: the state of the head commit (the merge commit for a merged
  // PR), a click opens its Jenkins build.
  circle(t, pr, size) {
    const dot = () => {
      if (pr.ci === "pending") return svg("mods/workspace-chrome/spinner.svg").size(size + 2).flex_none().text_color(t.working).spin(900);
      if (pr.ci === "none") return div().size(size).flex_none().rounded_full().border(1.5).border_color(t.dim);
      return div().size(size).flex_none().rounded_full().bg(pr.ci === "success" ? t.ansi2 : t.blocked);
    };
    return div()
      .id(`ci-${pr.key}`)
      .size(22)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(5)
      .cursor_pointer()
      .hover((s) => s.bg(t.raised))
      .tooltip(this.tip(pr))
      .on_click((_e, cx) => {
        cx.stop_propagation();
        openUrl(buildUrl(pr));
      })
      .child(dot());
  }

  // One PR. `section`: "mine" (under its repo header), "review" (the repo and
  // author on the second line, an Approve button) or "merged" (the repo and
  // base branch, merged ago).
  row(t, pr, now, section = "mine") {
    const review = pr.review === "APPROVED" ? { text: "approved", color: t.ansi2 } : pr.review === "CHANGES_REQUESTED" ? { text: "changes", color: t.blocked } : null;
    const name = pr.repo.split("/").pop();
    return h_flex()
      .id(`pr-${pr.key}`)
      .px(6)
      .py(4)
      .gap(6)
      .items_center()
      .rounded(6)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .tooltip(`${pr.title}\nOpen the diff and comments as a tab`)
      .on_click(() => openView(pr))
      .child(this.circle(t, pr, 10))
      .child(
        v_flex()
          .flex_1()
          .min_w(0)
          .child(
            h_flex()
              .gap(4)
              .items_center()
              .child(div().flex_1().min_w(0).truncate().text_size(12.5).text_color(pr.draft ? t.dim : t.foreground).child(pr.title))
              .when(section === "review", (el) => el.child(this.approveButton(t, pr)))
              .child(this.linkButton(t, pr))
              .child(this.spaceButton(t, pr)),
          )
          .child(
            h_flex()
              .gap(5)
              .text_size(11)
              .text_color(t.dim)
              .child(div().truncate().child(section === "mine" ? `#${pr.number}` : section === "merged" ? `${name}#${pr.number} → ${pr.baseRefName}` : `${name}#${pr.number} · ${pr.author}`))
              .when(pr.draft, (el) => el.child(div().child("draft")))
              .when(Boolean(review), (el) => el.child(div().text_color(review.color).child(review.text)))
              .when(section === "review" && pr.approvedByMe, (el) => el.child(div().text_color(t.ansi2).child("by you")))
              .child(div().flex_1())
              .child(div().child(section === "merged" ? `merged ${duration(now - pr.merged)}` : duration(now - (section === "review" ? pr.created : pr.updated)))),
          ),
      );
  }

  // Approves the PR at once (no question). A check: green once you have.
  approveButton(t, pr) {
    const busy = this.approving.has(pr.key);
    const done = pr.approvedByMe;
    return div()
      .id(`approve-${pr.key}`)
      .size(18)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(4)
      .text_color(done ? t.ansi2 : t.dim)
      .when(!done, (el) => el.cursor_pointer().hover((s) => s.text_color(t.ansi2).bg(t.raised)))
      .tooltip(done ? "You approved it" : busy ? "Approving…" : "Approve (no confirmation)")
      .on_click((_e, cx) => {
        cx.stop_propagation();
        if (!done) this.approve(pr, cx);
      })
      .child(busy ? svg("mods/workspace-chrome/spinner.svg").size(12).spin(900) : svg(`mods/workspace-chrome/${done ? "circle-check" : "check"}.svg`).size(12));
  }

  // Puts the PR's link on the clipboard.
  linkButton(t, pr) {
    return div()
      .id(`link-${pr.key}`)
      .size(18)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(4)
      .text_color(t.dim)
      .cursor_pointer()
      .hover((s) => s.text_color(t.foreground).bg(t.raised))
      .tooltip("Copy the PR's link")
      .on_click((_e, cx) => {
        cx.stop_propagation();
        exec("/bin/sh", ["-c", 'printf "%s" "$1" | pbcopy', "sh", pr.url])
          .then(() => notify({ title: "Link copied", body: pr.url, level: "info", timeout: 2500 }))
          .catch((e) => notify({ title: "Couldn't copy", body: String(e?.message ?? e), level: "error" }));
      })
      .child(svg("mods/prs/link.svg").size(12));
  }

  // Opens the PR's branch as a space (gh.js openSpaceFor), as the PR tab's Space button does.
  spaceButton(t, pr) {
    const busy = this.opening.has(pr.key);
    return div()
      .id(`space-${pr.key}`)
      .size(18)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(4)
      .text_color(t.dim)
      .cursor_pointer()
      .hover((s) => s.text_color(t.foreground).bg(t.raised))
      .tooltip(busy ? "Opening a space…" : `Open as a space (${pr.headRefName})`)
      .on_click((_e, cx) => {
        cx.stop_propagation();
        if (busy) return;
        this.opening.add(pr.key);
        cx.notify();
        cx.spawn(async (cx) => {
          await openSpaceFor(pr);
          this.opening.delete(pr.key);
          cx.notify();
        });
      })
      .child(busy ? svg("mods/workspace-chrome/spinner.svg").size(12).spin(900) : svg("mods/workspace-chrome/folder-plus.svg").size(12));
  }

  // A foldable header: a repo's (its rows under it), or a section's. `badges`
  // are [text, color] pairs shown folded or not; `failing` only when folded.
  header(t, id, label, count, { badges = [], failing = 0, top = false } = {}) {
    const open = !this.folded.has(id);
    return h_flex()
      .id(`head-${id}`)
      .px(8)
      .pt(top ? 12 : 8)
      .h(top ? 34 : 30)
      .flex_none()
      .gap(6)
      .items_center()
      .text_size(11)
      .font_medium()
      .cursor_pointer()
      .hover((s) => s.text_color(t.foreground))
      .on_click((_e, cx) => {
        open ? this.folded.add(id) : this.folded.delete(id);
        cx.notify();
      })
      .child(div().truncate().text_color(top ? t.muted : t.dim).child(label))
      .child(div().text_color(t.dim).child(String(count)))
      .children(badges.map(([text, color]) => div().text_color(color).child(text)))
      .child(div().flex_1())
      .when(!open && failing > 0, (el) => el.child(div().size(14).flex_none().rounded(4).bg(t.blocked + "26").text_size(10.5).font_bold().text_color(t.blocked).flex().items_center().justify_center().child(String(failing))))
      .when(!open, (el) => el.child(svg("mods/workspace-chrome/chevron-right.svg").size(11).flex_none().text_color(t.dim)));
  }

  render() {
    const t = theme();
    const collapsed = narrow();
    const now = Date.now();
    const failing = this.prs.filter((p) => p.ci === "failure").length;
    const repos = [];
    for (const pr of this.prs) {
      const g = repos.find((r) => r.repo === pr.repo) ?? repos[repos.push({ repo: pr.repo, prs: [] }) - 1];
      g.prs.push(pr);
    }
    const unapproved = this.review.filter((p) => !p.approved).length;
    const inCi = this.merged.filter((p) => p.ci === "pending").length;
    const brokeMain = this.merged.filter((p) => p.ci === "failure").length;
    const section = (id, label, prs, opts) => (prs.length ? [this.header(t, id, label, prs.length, { top: true, ...opts }), ...(this.folded.has(id) ? [] : prs.map((pr) => this.row(t, pr, now, id)))] : []);
    const rows = collapsed
      ? [...this.prs, ...this.review, ...this.merged].map((pr) => h_flex().h(26).items_center().justify_center().child(this.circle(t, pr, 10)))
      : [
          ...repos.flatMap((g) => [this.header(t, g.repo, g.repo.split("/").pop(), g.prs.length, { failing: g.prs.filter((p) => p.ci === "failure").length }), ...(this.folded.has(g.repo) ? [] : g.prs.map((pr) => this.row(t, pr, now)))]),
          ...section("review", "To review", this.review, { badges: unapproved ? [[`${unapproved} not approved`, t.working]] : [["all approved", t.ansi2]] }),
          ...section("merged", "Merged", this.merged, { badges: [...(inCi ? [[`${inCi} in CI`, t.working]] : []), ...(brokeMain ? [[`${brokeMain} failed`, t.blocked]] : [])] }),
        ];
    const empty = !this.loading && !this.error && this.prs.length === 0;

    return v_flex()
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .border_t(1)
      .border_color(t.border)
      .text_size(13)
      .when(!collapsed, (el) =>
        el.child(
          h_flex()
            .px(16)
            .h(41)
            .pt(14)
            .pb(5)
            .flex_none()
            .items_center()
            .gap(6)
            .child(div().text_size(11.5).font_medium().text_color(t.dim).child("Pull requests"))
            .when(failing > 0, (el) => el.child(div().text_size(11).text_color(t.blocked).child(`${failing} failing`)))
            .child(div().flex_1())
            .child(
              div()
                .id("prs-refresh")
                .size(22)
                .flex()
                .items_center()
                .justify_center()
                .rounded(5)
                .text_color(t.dim)
                .hover((s) => s.text_color(t.foreground).bg(t.hover))
                .cursor_pointer()
                .tooltip(this.at ? `Refreshed ${duration(now - this.at)} ago. Refresh now` : "Refresh")
                .on_click((_e, cx) => this.refresh(cx))
                .child(this.loading ? svg("mods/workspace-chrome/spinner.svg").size(13).spin(900) : svg("mods/prs/refresh.svg").size(13)),
            ),
        ),
      )
      .when(Boolean(this.error) && !collapsed, (el) => el.child(div().px(12).pb(6).text_size(11.5).text_color(t.blocked).child(`GitHub: ${this.error}`)))
      .when(empty && !collapsed, (el) => el.child(div().px(12).text_size(12).text_color(t.dim).child("No open pull requests of yours.")))
      .child(v_flex().id("prs-list").flex_1().min_h(0).px(collapsed ? 0 : 8).pb(8).overflow_y_scrollbar().mode("always").children(rows));
  }
}
