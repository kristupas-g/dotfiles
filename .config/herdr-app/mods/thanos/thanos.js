// Thanos Query's HTTP API (the Prometheus API), through the app's `fetch`,
// which needs no proxy: the host is reachable once the VPN is on. Every call
// is a promise and nothing here blocks: the view runs them in parallel tasks
// and drops a reply whose panel has moved on. `fetch` itself gives up after
// about 30 s, which a heavy fleet-wide query can hit; the error says so.

import * as fs from "fs/promises";
import { home } from "herdr";

// The Thanos URL lives in data/thanos/config.json (not tracked: the repo is
// public); `loadConfig` reads it and makes a template when it's missing.
export let BASE = "";
const CONFIG = () => `${home()}/.config/herdr-app/data/thanos/config.json`;
const ALIASES = () => `${home()}/.config/herdr-app/data/thanos/aliases.json`;

/** Reads the URL from config.json; `error` says what to do when there is none. */
export async function loadConfig() {
  const file = CONFIG();
  try {
    const j = JSON.parse(await fs.readFile(file, "utf8"));
    const url = String(j.url ?? "").trim().replace(/\/+$/, "");
    if (!/^https?:\/\//.test(url)) throw new Error("no url");
    BASE = url;
    return { url, file, error: null };
  } catch {
    const missing = !(await fs.exists(file).catch(() => false));
    if (missing) {
      await fs.mkdir(file.slice(0, file.lastIndexOf("/")), { recursive: true }).catch(() => {});
      await fs.writeFile(file, JSON.stringify({ url: "https://thanos.example.com" }, null, 2) + "\n").catch(() => {});
    }
    return { url: "", file, error: `Set the Thanos URL as "url" in ${file.replace(home(), "~")}, then reopen the tab` };
  }
}
const EXAMPLE = () => `${home()}/.config/herdr-app/mods/thanos/aliases.example.json`;

export const RANGES = ["5m", "15m", "30m", "1h", "3h", "6h", "12h", "1d", "2d", "7d", "30d"];
const UNIT = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };

/** "1h" → 3600. Null when it isn't a duration. */
export function seconds(range) {
  const m = /^(\d+(?:\.\d+)?)\s*([smhdw])$/.exec(String(range).trim());
  return m ? Math.round(Number(m[1]) * UNIT[m[2]]) : null;
}

const STEPS = [15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400, 43200, 86400];

/** A duration as Grafana writes it: 5400 → "1h30m", 86400 → "1d". */
export function duration(sec) {
  const parts = [];
  for (const [u, n] of [["d", 86400], ["h", 3600], ["m", 60], ["s", 1]]) {
    if (sec >= n) { parts.push(`${Math.floor(sec / n)}${u}`); sec %= n; }
  }
  return parts.join("") || "0s";
}

// "now", "now-6h", "now-1d/d" (the rounding is ignored), epoch seconds or
// milliseconds, "2026-11-16 14:00[:00]" or ISO → seconds, or null.
function moment(v, now) {
  v = String(v).trim();
  if (v === "now") return now;
  let m = /^now-(\d+(?:\.\d+)?[smhdw])(?:\/[smhdwMy])?$/.exec(v);
  if (m) return now - seconds(m[1]);
  if (/^\d{13}$/.test(v)) return Math.floor(Number(v) / 1000);
  if (/^\d{10}$/.test(v)) return Number(v);
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(v);
  if (m) {
    const [, Y, M, D, h = "0", mi = "0", sec = "0", tz] = m;
    if (tz) return Math.floor(Date.parse(`${Y}-${M}-${D}T${h.padStart(2, "0")}:${mi}:${sec}${tz === "Z" ? "Z" : tz.includes(":") ? tz : `${tz.slice(0, 3)}:${tz.slice(3)}`}`) / 1000);
    return Math.floor(new Date(Number(Y), Number(M) - 1, Number(D), Number(h), Number(mi), Number(sec)).getTime() / 1000);
  }
  return null;
}

/**
 * What a typed or pasted range means:
 *   "6h", "now-6h", "from=now-6h&to=now"      → { kind: "relative", range: "6h" }
 *   "from=<ms>&to=<ms>", a Grafana URL with them, "2026-11-16 14:00 to 2026-11-16 15:30",
 *   a Thanos /graph URL (g0.range_input + g0.end_input) → { kind: "absolute", from, to } (seconds)
 * `label` is the human form; null when it isn't a range.
 */
export function parseRange(text, now = Math.floor(Date.now() / 1000)) {
  const t = String(text ?? "").trim();
  if (!t) return null;
  const done = (r) => {
    if (r.kind === "relative") return { ...r, label: `last ${r.range}` };
    if (!(r.to > r.from)) return null;
    return { ...r, label: `${stamp(r.from)} → ${stamp(r.to)} · ${duration(r.to - r.from)}` };
  };
  const q = (name) => { const m = new RegExp(`(?:^|[?&#\\s])${name}=([^&\\s]+)`).exec(t); return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null; };
  // Grafana: from/to as query parameters (a whole URL, or just the pair)
  const from = q("from"), to = q("to");
  if (from !== null && to !== null) {
    const rel = /^now-(\d+(?:\.\d+)?[smhdw])(?:\/[smhdwMy])?$/.exec(from);
    if (rel && to.startsWith("now") && !to.includes("-")) return done({ kind: "relative", range: rel[1] });
    const f = moment(from, now), e = moment(to, now);
    return f !== null && e !== null ? done({ kind: "absolute", from: f, to: e }) : null;
  }
  // Thanos: g0.range_input and g0.end_input
  const ri = q("g0\\.range_input"), ei = q("g0\\.end_input");
  if (ri && seconds(ri)) {
    const e = ei ? moment(ei, now) : now;
    return e !== null ? done({ kind: "absolute", from: e - seconds(ri), to: e }) : null;
  }
  if (seconds(t)) return done({ kind: "relative", range: t });
  const rel = /^now-(\d+(?:\.\d+)?[smhdw])$/.exec(t);
  if (rel) return done({ kind: "relative", range: rel[1] });
  // two moments: "A to B", "A, B", "A → B", "A .. B"
  const two = /^(.+?)\s*(?:\sto\s|,|→|->|\.\.|;)\s*(.+)$/.exec(t);
  if (two) {
    const f = moment(two[1], now), e = moment(two[2], now);
    if (f !== null && e !== null) return done({ kind: "absolute", from: f, to: e });
  }
  return null;
}

/** Grafana's query form of a range: `from=now-1h&to=now`, or epoch milliseconds. */
export function grafanaRange(span, range) {
  if (span) return `from=${span.from * 1000}&to=${span.to * 1000}`;
  return `from=now-${range}&to=now`;
}

/** A step that gives about `points` samples over `sec` seconds, on a round value. */
export function stepFor(sec, points = 300) {
  const want = sec / points;
  return STEPS.find((s) => s >= want) ?? STEPS[STEPS.length - 1];
}

function friendly(e, status) {
  const m = String(e?.message ?? e);
  if (/error sending request|dns|connect|timed out|timeout/i.test(m)) return "Thanos didn't answer (VPN off, or the query took longer than 30 s)";
  if (status === 401 || status === 403) return `Thanos refused the request (HTTP ${status})`;
  return m;
}

/** GET `${BASE}${path}?params`, the API's `data` on success, an Error with Thanos's message otherwise. */
export async function api(path, params = {}) {
  if (!BASE) throw new Error("No Thanos URL: see data/thanos/config.json");
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  let r;
  try {
    r = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`);
  } catch (e) {
    throw new Error(friendly(e));
  }
  let j;
  try {
    j = await r.json();
  } catch {
    throw new Error(friendly(null, r.status) + (r.ok ? ": not JSON" : ""));
  }
  if (j.status !== "success") throw new Error(j.error ? `${j.errorType ? `${j.errorType}: ` : ""}${j.error}` : `HTTP ${r.status}`);
  return j.data;
}

export const queryRange = (query, start, end, step) => api("/api/v1/query_range", { query, start, end, step });
export const queryInstant = (query, time) => api("/api/v1/query", { query, time });
const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/**
 * Metric names starting with `prefix`, filtered by Thanos: the whole list is
 * far over fetch's 8 MiB limit on a big fleet, a prefix comes back in well
 * under a second. `substring` asks for names containing it instead.
 */
export const metricNames = (prefix, substring = false) => api("/api/v1/label/__name__/values", { "match[]": `{__name__=~"${substring ? ".*" : ""}${reEscape(prefix)}.*"}` });
export const labelNames = (match) => api("/api/v1/labels", match ? { "match[]": match } : {});
export const labelValues = (name, match) => api(`/api/v1/label/${encodeURIComponent(name)}/values`, match ? { "match[]": match } : {});
/** `{ metric: [{type, help, unit}] }` for one metric. */
export const metadata = (metric) => api("/api/v1/metadata", { metric });

/** Prometheus's own series name: `metric{a="1", b="2"}`, `{}` for a bare value. */
export function seriesName(metric) {
  const name = metric.__name__ ?? "";
  const labels = Object.entries(metric).filter(([k]) => k !== "__name__").map(([k, v]) => `${k}="${v}"`).join(", ");
  return labels || !name ? `${name}{${labels}}` : name;
}

/** A matrix or vector result as `[{ name, metric, points: [[t, v]] }]`; points keep NaN out. */
export function series(data) {
  const list = data.resultType === "matrix" ? data.result.map((s) => ({ metric: s.metric, values: s.values }))
    : data.resultType === "vector" ? data.result.map((s) => ({ metric: s.metric, values: [s.value] }))
    : data.resultType === "scalar" ? [{ metric: {}, values: [data.result] }]
    : [];
  return list.map((s) => ({ name: seriesName(s.metric), metric: s.metric, points: s.values.map(([t, v]) => [Number(t), Number(v)]).filter((p) => Number.isFinite(p[1])) }));
}

/** Keep about `max` points of a series, evenly, for drawing. */
export function thin(points, max) {
  if (points.length <= max) return points;
  const k = Math.ceil(points.length / max);
  const out = [];
  for (let i = 0; i < points.length; i += k) out.push(points[i]);
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
  return out;
}

export function fmt(v) {
  if (!Number.isFinite(v)) return String(v);
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 1e12) return `${(v / 1e12).toPrecision(3)}T`;
  if (a >= 1e9) return `${(v / 1e9).toPrecision(3)}G`;
  if (a >= 1e6) return `${(v / 1e6).toPrecision(3)}M`;
  if (a >= 1e3) return `${(v / 1e3).toPrecision(3)}k`;
  if (a >= 100) return v.toFixed(0);
  if (a >= 1) return v.toPrecision(3);
  if (a >= 1e-3) return `${(v * 1e3).toPrecision(3)}m`;
  if (a >= 1e-6) return `${(v * 1e6).toPrecision(3)}µ`;
  return v.toExponential(2);
}

const two = (n) => String(n).padStart(2, "0");
/** "11:05", or "16 Nov 11:05" when `withDate`. */
export function clock(ts, withDate = false) {
  const d = new Date(ts * 1000);
  const hm = `${two(d.getHours())}:${two(d.getMinutes())}`;
  if (!withDate) return hm;
  return `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${hm}`;
}
/** Prometheus's `end_input` form, local time: "2026-11-16 11:05:00". */
export function stamp(ts) {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

/** The same in UTC: what Thanos's graph page reads `end_input` as. */
export function stampUTC(ts) {
  const d = new Date(ts * 1000);
  return `${d.getUTCFullYear()}-${two(d.getUTCMonth() + 1)}-${two(d.getUTCDate())} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())}`;
}

/**
 * Thanos's graph page with one `g<n>` per panel, the form its UI reads back.
 * A window that ends now carries no end time (the page uses now); a fixed one
 * carries it in UTC, which is how the page parses `end_input`.
 */
export function shareUrl(panels, range, end, step, fixed = false) {
  const parts = [];
  panels.forEach((p, i) => {
    const g = `g${i}`;
    parts.push([`${g}.expr`, p.expr], [`${g}.tab`, p.mode === "table" ? "1" : "0"], [`${g}.stacked`, "0"], [`${g}.show_exemplars`, "0"], [`${g}.range_input`, range]);
    if (fixed) parts.push([`${g}.end_input`, stampUTC(end)], [`${g}.moment_input`, stampUTC(end)]);
    parts.push([`${g}.step_input`, String(step)]);
  });
  return `${BASE}/graph?${parts.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")}`;
}

// ---- aliases: data/thanos/aliases.json, seeded from aliases.example.json ----

function normalise(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (k.startsWith("//")) continue;
    if (typeof v === "string") out[k] = { expand: v, hint: "" };
    else if (v && typeof v.expand === "string") out[k] = { expand: v.expand, hint: String(v.hint ?? "") };
  }
  return out;
}

/** The aliases, and where they came from; a missing file is made from the example. */
export async function loadAliases() {
  const file = ALIASES();
  try {
    return { aliases: normalise(JSON.parse(await fs.readFile(file, "utf8"))), file, error: null };
  } catch (e) {
    const missing = !(await fs.exists(file).catch(() => false));
    if (!missing) return { aliases: {}, file, error: `aliases.json: ${String(e?.message ?? e)}` };
  }
  try {
    const text = await fs.readFile(EXAMPLE(), "utf8");
    await fs.mkdir(file.slice(0, file.lastIndexOf("/")), { recursive: true });
    await fs.writeFile(file, text);
    return { aliases: normalise(JSON.parse(text)), file, error: null };
  } catch (e) {
    return { aliases: {}, file, error: `aliases: ${String(e?.message ?? e)}` };
  }
}

/** `expand` with $1… filled from `args`; `caret` is the first empty hole, else the end. */
export function expandAlias(def, args) {
  let caret = -1;
  const text = def.expand.replace(/\$(\d)/g, (_m, n, at) => {
    const v = args[Number(n) - 1];
    if (v !== undefined && v !== "") return v;
    if (caret < 0) caret = at;
    return "";
  });
  if (caret < 0) return { text, caret: text.length };
  // The holes before this one changed the length: find it again by replaying.
  let shift = 0;
  const re = /\$(\d)/g;
  let m;
  while ((m = re.exec(def.expand))) {
    if (m.index === caret) break;
    const v = args[Number(m[1]) - 1] ?? "";
    shift += v.length - m[0].length;
  }
  return { text, caret: caret + shift };
}

// ---- completion: what the caret is in ----

const WORD = /[A-Za-z0-9_:.]/;

/**
 * What to suggest at `caret` in `text`:
 *   { kind: "value", label, metric, word, from }  inside a selector, after `label=` and a quote
 *   { kind: "label", metric, word, from }          inside a selector, on a label name
 *   { kind: "metric", word, from, first }          on a word; `first` when it's the query's first word
 * `from` is where the word starts, for the replacement.
 */
export function context(text, caret) {
  const before = text.slice(0, caret);
  let from = caret;
  while (from > 0 && WORD.test(before[from - 1])) from--;
  const word = before.slice(from, caret);
  const open = before.lastIndexOf("{");
  const close = before.lastIndexOf("}");
  if (open > close) {
    const inner = before.slice(open + 1);
    let mStart = open;
    while (mStart > 0 && WORD.test(before[mStart - 1])) mStart--;
    const metric = before.slice(mStart, open);
    const seg = inner.slice(inner.lastIndexOf(",") + 1);
    const lv = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(=~|!~|!=|=)\s*"([^"]*)$/.exec(seg);
    if (lv) return { kind: "value", label: lv[1], op: lv[2], metric, word: lv[3], from: caret - lv[3].length };
    if (/^\s*[A-Za-z0-9_]*$/.test(seg)) return { kind: "label", metric, word: seg.trim(), from: caret - seg.trim().length };
    return null;
  }
  const first = before.trimStart().slice(0, from - (before.length - before.trimStart().length)).trim() === "";
  return { kind: "metric", word, from, first };
}
