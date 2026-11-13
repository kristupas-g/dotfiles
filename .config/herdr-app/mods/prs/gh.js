// Shared helpers: running `gh`, opening URLs, small formatting.

import { exec, window } from "herdr";

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
