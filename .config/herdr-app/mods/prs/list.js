// The sidebar list: your open pull requests grouped by repo. The circle on a
// row is the head commit's CI state and opens its Jenkins build; the row opens
// the PR as a tab (view.js). Reads GitHub once a minute, on the refresh button,
// and when another copy stamps shared "prs.refresh" (after a merge or close).

import { div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { exec, layout, notify, run, shared, spaces, theme } from "herdr";
import { ghJson, openUrl, duration, kind, check, buildUrl, jenkins, openSpaceFor, REFRESH } from "./gh.js";

const EVERY = 60_000;
const QUERY = `query { search(query: "is:pr is:open author:@me archived:false sort:updated-desc", type: ISSUE, first: 100) { nodes { ... on PullRequest {
  number title url isDraft updatedAt reviewDecision headRefName isCrossRepository repository { nameWithOwner }
  commits(last: 1) { nodes { commit { statusCheckRollup { state contexts(first: 50) { nodes {
    __typename ... on StatusContext { context state targetUrl } ... on CheckRun { name status conclusion detailsUrl } } } } } } } } } } }`;

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

function normalize(n) {
  const rollup = n.commits?.nodes?.[0]?.commit?.statusCheckRollup;
  const checks = (rollup?.contexts?.nodes ?? []).map(check);
  return {
    key: `${n.repository.nameWithOwner}-${n.number}`,
    repo: n.repository.nameWithOwner,
    number: n.number,
    title: n.title,
    url: n.url,
    draft: n.isDraft,
    review: n.reviewDecision,
    headRefName: n.headRefName,
    isCrossRepository: n.isCrossRepository,
    updated: Date.parse(n.updatedAt),
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
    this.error = null;
    this.loading = false;
    this.at = 0;
    this.stamp = shared(REFRESH) ?? null;
    this.folded = new Set();
    this.opening = new Set();
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
        const data = await ghJson(["api", "graphql", "-f", `query=${QUERY}`]);
        if (data.errors?.length) throw new Error(data.errors[0].message);
        this.prs = (data.data?.search?.nodes ?? []).filter((n) => n.number).map(normalize);
        this.error = null;
        this.at = Date.now();
      } catch (e) {
        this.error = String(e?.message ?? e);
      }
      this.loading = false;
      cx.notify();
    });
  }

  tip(pr) {
    const where = pr.checks.some(jenkins) ? "Open in Jenkins" : "Open checks on GitHub";
    if (pr.ci === "failure") return `CI failed: ${pr.failing.join(", ") || "see Jenkins"}. ${where}`;
    if (pr.ci === "pending") return `CI running: ${pr.running.join(", ") || "queued"}. ${where}`;
    if (pr.ci === "success") return `CI passed. ${where}`;
    return `No CI status yet. ${where}`;
  }

  // The CI circle: the state of the head commit, a click opens its Jenkins build.
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

  row(t, pr, now) {
    const review = pr.review === "APPROVED" ? { text: "approved", color: t.ansi2 } : pr.review === "CHANGES_REQUESTED" ? { text: "changes", color: t.blocked } : null;
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
              .child(this.linkButton(t, pr))
              .child(this.spaceButton(t, pr)),
          )
          .child(
            h_flex()
              .gap(5)
              .text_size(11)
              .text_color(t.dim)
              .child(div().child(`#${pr.number}`))
              .when(pr.draft, (el) => el.child(div().child("draft")))
              .when(Boolean(review), (el) => el.child(div().text_color(review.color).child(review.text)))
              .child(div().flex_1())
              .child(div().child(duration(now - pr.updated))),
          ),
      );
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

  // A repo's header; it folds the repo's rows.
  header(t, repo, prs) {
    const open = !this.folded.has(repo);
    const failing = prs.filter((p) => p.ci === "failure").length;
    return h_flex()
      .id(`repo-${repo}`)
      .px(8)
      .pt(8)
      .h(30)
      .flex_none()
      .gap(6)
      .items_center()
      .text_size(11)
      .font_medium()
      .cursor_pointer()
      .hover((s) => s.text_color(t.foreground))
      .on_click((_e, cx) => {
        open ? this.folded.add(repo) : this.folded.delete(repo);
        cx.notify();
      })
      .child(div().truncate().text_color(t.dim).child(repo.split("/").pop()))
      .child(div().text_color(t.dim).child(String(prs.length)))
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
    const rows = collapsed
      ? this.prs.map((pr) => h_flex().h(26).items_center().justify_center().child(this.circle(t, pr, 10)))
      : repos.flatMap((g) => [this.header(t, g.repo, g.prs), ...(this.folded.has(g.repo) ? [] : g.prs.map((pr) => this.row(t, pr, now)))]);
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
