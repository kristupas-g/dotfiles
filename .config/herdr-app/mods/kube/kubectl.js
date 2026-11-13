// Reading clusters through `kubectl`. Every call names its context (`--context`),
// so the mod never depends on, or changes, kubectl's current context. The JSON
// is slimmed by `jq` inside the shell before it crosses into the mod, so a big
// namespace stays well under exec's 8 MiB.
//
// Auth is kubelogin (`kubectl oidc-login`, the exec plugin in ~/.kube/config):
// a valid token in ~/.kube/cache/oidc-login is used silently, a stale one is
// refreshed, and only when that fails does kubelogin open the browser. That's
// why the exec timeout is long: the call waits while the person logs in.

import { exec } from "herdr";

const PATH = 'PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"';
const API_TIMEOUT = "--request-timeout=25s";

export const firstLine = (s) => (s ?? "").split("\n").find((l) => l.trim()) ?? "";

// kubectl's stderr without the noise kubelogin and the client add around the message.
function clean(stderr) {
  const lines = (stderr ?? "")
    .split("\n")
    .map((l) => l.replace(/^[A-Z]\d{4} \d\d:\d\d:\d\d\.\d+\s+\d+\s+\S+\]\s*/, "").trim())
    .filter((l) => l && !/^Open http/.test(l));
  const err = lines.find((l) => /^error[: ]/i.test(l)) ?? lines[0] ?? "";
  return err.replace(/^error:\s*/i, "");
}

export const authError = (msg) => /oidc|login|authenticat|unauthorized|token|forbidden|credential/i.test(msg ?? "");

// Runs kubectl, optionally piping its JSON through a jq filter. Resolves with
// the parsed JSON (or the raw stdout without a filter). Rejects with the
// cleaned error. `tolerate` is a regexp of stderr lines that don't make the
// call a failure when stdout still parses (a missing CRD in a multi-kind get).
export async function kubectl(context, args, { jq = null, timeout = 150000, tolerate = null, parse = Boolean(jq) } = {}) {
  const ctx = context ? ["--context", context] : [];
  const r = jq
    ? await exec("/bin/sh", ["-c", `${PATH}; set -o pipefail; f="$1"; shift; kubectl "$@" | jq -c "$f"`, "sh", jq, ...ctx, ...args], { timeout })
    : await exec("/bin/sh", ["-c", `${PATH}; exec kubectl "$@"`, "sh", ...ctx, ...args], { timeout });
  if (r.code !== 0) {
    const tolerable = tolerate && (r.stderr ?? "").split("\n").filter((l) => l.trim()).every((l) => tolerate.test(l));
    if (!tolerable || !r.stdout.trim()) throw new Error(clean(r.stderr) || `kubectl exited with ${r.code}`);
  }
  if (!parse) return r.stdout;
  try {
    return JSON.parse(r.stdout);
  } catch {
    throw new Error("kubectl gave no JSON" + (r.stderr?.trim() ? `: ${clean(r.stderr)}` : ""));
  }
}

// The kubeconfig's contexts: [{ name, cluster, user, namespace }] and the current one.
export async function contexts() {
  const out = await kubectl(null, ["config", "view", "-o", "json"], {
    jq: '{current: ."current-context", contexts: [.contexts[]? | {name, cluster: .context.cluster, user: .context.user, namespace: .context.namespace}]}',
    timeout: 15000,
  });
  return { current: out.current ?? null, contexts: (out.contexts ?? []).sort((a, b) => a.name.localeCompare(b.name)) };
}

export const useContext = (name) => kubectl(null, ["config", "use-context", name], { timeout: 15000, parse: false });

export const namespaces = (context) => kubectl(context, ["get", "namespaces", API_TIMEOUT, "-o", "json"], { jq: "[.items[].metadata.name] | sort" });

// Deployments, Argo Rollouts and StatefulSets of a namespace, each with its
// HPA when one targets it. One `get` for all four kinds; a cluster without the
// Rollout CRD is retried without it and remembered.
const WORKLOAD_JQ = `[.items[] |
  if .kind == "HorizontalPodAutoscaler" then
    {kind, name: .metadata.name, target: {kind: .spec.scaleTargetRef.kind, name: .spec.scaleTargetRef.name},
     min: (.spec.minReplicas // 1), max: .spec.maxReplicas, current: (.status.currentReplicas // 0), desired: (.status.desiredReplicas // 0),
     metrics: [.spec.metrics[]? | {type,
       name: (.resource.name // .containerResource.name // .pods.metric.name // .external.metric.name // .object.metric.name),
       container: .containerResource.container,
       util: (.resource.target.averageUtilization // .containerResource.target.averageUtilization),
       value: (.resource.target.averageValue // .containerResource.target.averageValue // .pods.target.averageValue // .external.target.value // .external.target.averageValue // .object.target.value // .object.target.averageValue)}],
     now: [.status.currentMetrics[]? | {type,
       util: (.resource.current.averageUtilization // .containerResource.current.averageUtilization),
       value: (.resource.current.averageValue // .containerResource.current.averageValue // .pods.current.averageValue // .external.current.value // .external.current.averageValue // .object.current.value // .object.current.averageValue)}],
     conditions: [.status.conditions[]? | {type, status, reason, message}]}
  else
    {kind, name: .metadata.name, created: .metadata.creationTimestamp,
     desired: (.spec.replicas // 1), paused: (.spec.paused // false),
     replicas: (.status.replicas // 0), ready: (.status.readyReplicas // 0), available: (.status.availableReplicas // 0), updated: (.status.updatedReplicas // 0),
     phase: .status.phase, message: .status.message, abort: (.status.abort // false),
     step: .status.currentStepIndex, steps: ((.spec.strategy.canary.steps // []) | length),
     strategy: (if .spec.strategy.canary then "canary" elif .spec.strategy.blueGreen then "blueGreen" else (.spec.strategy.type // .spec.updateStrategy.type) end),
     selector: (.spec.selector.matchLabels // {}),
     generation: .metadata.generation, observed: .status.observedGeneration,
     conditions: [.status.conditions[]? | {type, status, reason, message}]}
  end]`;

const noRollouts = new Set();
const NO_ROLLOUTS = /resource type "rollouts"|rollouts\.argoproj\.io|No resources found/;

export async function workloads(context, namespace) {
  const kinds = noRollouts.has(context) ? "deployments,statefulsets,horizontalpodautoscalers" : "deployments,statefulsets,rollouts.argoproj.io,horizontalpodautoscalers";
  let items;
  try {
    items = await kubectl(context, ["get", kinds, "-n", namespace, API_TIMEOUT, "-o", "json"], { jq: WORKLOAD_JQ, tolerate: NO_ROLLOUTS });
  } catch (e) {
    if (noRollouts.has(context) || !/rollouts/.test(e.message)) throw e;
    noRollouts.add(context);
    return workloads(context, namespace);
  }
  const hpas = new Map(items.filter((i) => i.kind === "HorizontalPodAutoscaler").map((h) => [`${h.target.kind}/${h.target.name}`, h]));
  return items
    .filter((i) => i.kind !== "HorizontalPodAutoscaler")
    .map((w) => ({ ...w, hpa: hpas.get(`${w.kind}/${w.name}`) ?? null, key: `${w.kind}/${w.name}` }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Pods, slimmed to what the list shows. `namespace` null means every namespace.
// `selector` (a workload's matchLabels) lists that workload's pods; otherwise
// only the troubled ones: not Running, Terminating, or Running with a
// container that isn't ready. In a namespace that's a client-side filter of the
// namespace's pods (CrashLoopBackOff pods are "Running" to the API); across the
// whole cluster only the API's own phase filter is used (Pending, Failed,
// Unknown), so the list stays small and cheap.
const POD_JQ = (problemsOnly) => `[.items[] |
  {name: .metadata.name, ns: .metadata.namespace, phase: .status.phase, reason: .status.reason, message: .status.message,
   deleting: (.metadata.deletionTimestamp != null), owner: ((.metadata.ownerReferences // [])[0] | {kind, name}),
   node: .spec.nodeName, created: .metadata.creationTimestamp, started: .status.startTime,
   conditions: [.status.conditions[]? | select(.status != "True") | {type, reason, message}],
   containers: [(.status.containerStatuses // [])[] | {name, ready, restarts: .restartCount,
     state: ((.state // {}) | to_entries[0] | {kind: .key, reason: .value.reason, message: .value.message, exit: .value.exitCode}),
     last: ((.lastState // {}) | to_entries[0] | {kind: .key, reason: .value.reason, exit: .value.exitCode, at: .value.finishedAt})}],
   init: [(.status.initContainerStatuses // [])[] | {name, ready, restarts: .restartCount,
     state: ((.state // {}) | to_entries[0] | {kind: .key, reason: .value.reason, message: .value.message, exit: .value.exitCode})}],
   total: ((.spec.containers // []) | length)}
  ${problemsOnly ? '| select(.phase != "Running" or .deleting or any(.containers[]; .ready | not))' : ""}]`;

export async function pods(context, namespace, { selector = null } = {}) {
  const where = namespace ? ["-n", namespace] : ["--all-namespaces"];
  const args = ["get", "pods", ...where, API_TIMEOUT, "-o", "json"];
  if (selector) {
    const labels = Object.entries(selector).map(([k, v]) => `${k}=${v}`).join(",");
    if (labels) args.push("-l", labels);
  } else if (!namespace) args.push("--field-selector=status.phase!=Running,status.phase!=Succeeded");
  else args.push("--field-selector=status.phase!=Succeeded");
  const list = await kubectl(context, args, { jq: POD_JQ(!selector) });
  return list.map(describe).sort((a, b) => a.ns.localeCompare(b.ns) || a.name.localeCompare(b.name));
}

const SETUP = new Set(["ContainerCreating", "PodInitializing"]);

// kubectl's STATUS word for a pod, and whether it's a problem.
function describe(p) {
  const waiting = p.containers.map((c) => c.state).filter((s) => s?.kind === "waiting" && s.reason);
  const terminated = p.containers.map((c) => c.state).filter((s) => s?.kind === "terminated" && s.reason && s.reason !== "Completed");
  const initWaiting = p.init.map((c) => c.state).find((s) => s?.kind === "waiting" && s.reason && !SETUP.has(s.reason));
  const initRunning = p.init.find((c) => c.state?.kind === "running");
  const ready = p.containers.filter((c) => c.ready).length;
  const restarts = p.containers.reduce((n, c) => n + (c.restarts ?? 0), 0);
  let status;
  let tone;
  if (p.deleting) [status, tone] = ["Terminating", "dim"];
  else if (p.reason) [status, tone] = [p.reason, "blocked"];
  else if (initWaiting) [status, tone] = [`Init:${initWaiting.reason}`, "blocked"];
  else if (initRunning) [status, tone] = [`Init:${p.init.filter((c) => c.state?.kind === "terminated").length}/${p.init.length}`, "working"];
  else if (waiting.find((s) => !SETUP.has(s.reason))) [status, tone] = [waiting.find((s) => !SETUP.has(s.reason)).reason, "blocked"];
  else if (terminated.length) [status, tone] = [terminated[0].reason, "blocked"];
  else if (waiting.length) [status, tone] = [waiting[0].reason, "working"];
  else if (p.phase === "Running" && ready < p.total) [status, tone] = ["NotReady", "working"];
  else if (p.phase === "Running") [status, tone] = ["Running", "ansi2"];
  else if (p.phase === "Succeeded") [status, tone] = ["Completed", "dim"];
  else if (p.phase === "Pending") [status, tone] = ["Pending", "working"];
  else [status, tone] = [p.phase ?? "Unknown", "blocked"];
  const detail = p.message
    ?? p.conditions.find((c) => c.message)?.message
    ?? [...p.init, ...p.containers].map((c) => c.state?.message).find(Boolean)
    ?? "";
  return { ...p, key: `${p.ns}/${p.name}`, status, tone, ready, restarts, detail: firstLine(detail) };
}

// The state of a workload, as one word and a tone: ok, rolling, degraded, paused, zero.
export function health(w) {
  if (w.kind === "Rollout") {
    const phase = w.phase ?? "";
    if (w.abort) return ["aborted", "blocked"];
    if (phase === "Degraded") return ["degraded", "blocked"];
    if (phase === "Paused") return ["paused", "working"];
    if (phase === "Progressing") return [w.steps ? `step ${(w.step ?? 0)}/${w.steps}` : "progressing", "working"];
    if (w.desired === 0) return ["scaled to 0", "dim"];
    if (phase === "Healthy") return ["healthy", "ansi2"];
    return [phase.toLowerCase() || "unknown", "dim"];
  }
  if (w.desired === 0) return ["scaled to 0", "dim"];
  if (w.paused) return ["paused", "working"];
  const failed = w.conditions.find((c) => c.type === "Progressing" && c.status === "False") ?? w.conditions.find((c) => c.type === "ReplicaFailure" && c.status === "True");
  if (failed) return [failed.reason === "ProgressDeadlineExceeded" ? "stuck" : "failing", "blocked"];
  if (w.ready === w.desired && w.updated === w.desired && w.replicas === w.desired) return ["healthy", "ansi2"];
  if (w.conditions.find((c) => c.type === "Available" && c.status === "False")) return ["unavailable", "blocked"];
  return [w.updated < w.desired ? "rolling" : "not ready", "working"];
}

// An HPA as one short line: "4–30 · cpu 8%/80%".
export function hpaLine(h) {
  if (!h) return "";
  const parts = h.metrics.map((m, i) => {
    const now = h.now[i] ?? {};
    const name = m.name ?? m.container ?? m.type.toLowerCase();
    if (m.util != null) return `${name} ${now.util != null ? `${now.util}%` : "?"}/${m.util}%`;
    if (m.value != null) return `${name} ${now.value ?? "?"}/${m.value}`;
    return name;
  });
  return `${h.min}–${h.max}${parts.length ? ` · ${parts.join(", ")}` : ""}`;
}

export function age(iso, now = Date.now()) {
  if (!iso) return "";
  const s = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
