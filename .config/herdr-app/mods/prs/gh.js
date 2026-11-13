// Shared helpers: running `gh`, opening URLs, small formatting.

import { exec, home, notify, run, spaces, window } from "herdr";

export const firstLine = (s) => (s ?? "").split("\n").find((l) => l.trim()) ?? "";

// Runs gh with the user's environment. Finder launches may lack Homebrew on
// PATH; gh lives there on this Mac. Rejects with gh's first error line.
export async function gh(args, { timeout = 30000 } = {}) {
  const r = await exec("/bin/sh", ["-c", 'PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH" exec gh "$@"', "sh", ...args], { timeout });
  if (r.code !== 0) throw new Error(firstLine(r.stderr) || `gh exited with ${r.code}`);
  return r.stdout;
}

export const ghJson = async (args, opts) => JSON.parse(await gh(args, opts));

export function openUrl(url) {
  const opener = window()?.platform === "macos" ? "open" : window()?.platform === "windows" ? "start" : "xdg-open";
  exec(opener, [url]).catch(() => {});
}

export function duration(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

// The GitHub notion of a check's outcome, as one of four words.
export function kind(state) {
  if (!state) return "none";
  if (["SUCCESS", "NEUTRAL", "SKIPPED"].includes(state)) return "success";
  if (["PENDING", "EXPECTED", "QUEUED", "IN_PROGRESS"].includes(state)) return "pending";
  return "failure";
}

// GitHub's status contexts and check runs, as one shape.
export function check(c) {
  if (c.__typename === "StatusContext") return { name: c.context, state: c.state, url: c.targetUrl };
  return { name: c.name, state: c.status === "COMPLETED" ? c.conclusion : "PENDING", url: c.detailsUrl };
}

export const jenkins = (c) => /jenkins/i.test(c.url ?? "");

// Where a CI circle goes: the failing Jenkins build, else the running one, else
// the PR's merge build, else any Jenkins link, else the PR's checks page.
export function buildUrl(pr) {
  const pick =
    pr.checks.find((c) => kind(c.state) === "failure" && jenkins(c)) ??
    pr.checks.find((c) => kind(c.state) === "pending" && jenkins(c)) ??
    pr.checks.find((c) => c.name === "continuous-integration/jenkins/pr-merge") ??
    pr.checks.find(jenkins);
  return pick?.url ?? `${pr.url}/checks`;
}

// Every mod copy re-reads the list when this changes (a merge, a close).
export const REFRESH = "prs.refresh";

// A space for a PR: the repo's clone in ~/vinted, on the PR's branch. When the
// clone is on another branch, a git worktree of it at Herdr's place
// (~/.herdr/worktrees/<repo>/<branch>), so the clone stays as it is. A space
// already open for the PR (its name, or on its folder) is shown instead,
// before any git work. Errors become toasts.
// pr: { repo, number, headRefName, isCrossRepository }.
export async function openSpaceFor(pr) {
  const repoName = pr.repo.split("/").pop();
  const clone = `${home()}/vinted/${repoName}`;
  const branch = pr.headRefName;
  const name = `${repoName} #${pr.number}`;
  // The space already open for this PR: by name, or on its folder (a space's
  // folder is where its terminals are, so anywhere under it counts).
  const existing = (folder) => spaces().find((s) => !s.machine && (s.name === name || (folder && (s.folder === folder || s.folder?.startsWith(`${folder}/`)))));
  const already = existing(null);
  if (already) return run("space.select", { id: already.id });
  const git = async (args, cwd = clone) => {
    const r = await exec("git", args, { cwd, timeout: 120000 });
    if (r.code !== 0) throw new Error(firstLine(r.stderr) || `git ${args[0]} failed`);
    return r.stdout.trim();
  };
  try {
    if (!branch) throw new Error("The PR's branch isn't known yet");
    if ((await exec("git", ["rev-parse", "--is-inside-work-tree"], { cwd: clone }).catch(() => ({ code: 1 }))).code !== 0) throw new Error(`No clone at ~/vinted/${repoName}`);
    // The branch, fetched: a fork's through the PR ref.
    if (pr.isCrossRepository) await git(["fetch", "origin", `+refs/pull/${pr.number}/head:refs/heads/${branch}`]);
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
    const open = existing(folder);
    if (open) run("space.select", { id: open.id });
    else run("space.new", { name, folder });
  } catch (e) {
    notify({ title: `Couldn't make a space for #${pr.number}`, body: String(e?.message ?? e), level: "error" });
  }
}
