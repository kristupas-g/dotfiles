// A small PromQL lexer for colouring the query box: tokens with a kind, the
// whole text covered (whitespace and unknown characters included), so spans
// laid side by side reproduce the string exactly.

const KEYWORDS = new Set(["by", "without", "on", "ignoring", "group_left", "group_right", "offset", "bool", "and", "or", "unless", "at"]);
const AGGREGATORS = new Set(["sum", "avg", "min", "max", "count", "count_values", "stddev", "stdvar", "topk", "bottomk", "quantile", "group", "limitk", "limit_ratio"]);
const RE = /("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`[^`]*`?)|(\d+(?:\.\d+)?(?:ms|s|m|h|d|w|y)(?:\d+(?:\.\d+)?(?:ms|s|m|h|d|w|y))*)|(0x[0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+|[+-]?Inf\b|NaN\b)|([A-Za-z_:][A-Za-z0-9_:]*)|(=~|!~|!=|==|>=|<=|[=<>+\-*\/%^@])|([{}()\[\],])|(\s+)|(.)/g;

/** `[{ text, kind }]`, kinds: string number duration keyword aggregator function label metric operator punctuation space other. */
export function tokens(text) {
  const out = [];
  let depth = 0;
  let m;
  RE.lastIndex = 0;
  while ((m = RE.exec(text))) {
    const [t, str, dur, num, ident, op, punct, space] = m;
    let kind;
    if (str !== undefined) kind = "string";
    else if (dur !== undefined) kind = "duration";
    else if (num !== undefined) kind = "number";
    else if (ident !== undefined) {
      const rest = text.slice(m.index + t.length);
      if (depth > 0 && /^\s*(=~|!~|!=|=)/.test(rest)) kind = "label";
      else if (KEYWORDS.has(ident)) kind = "keyword";
      else if (AGGREGATORS.has(ident) && /^\s*(\(|by\b|without\b)/.test(rest)) kind = "aggregator";
      else if (/^\s*\(/.test(rest)) kind = "function";
      else kind = "metric";
    } else if (op !== undefined) kind = "operator";
    else if (punct !== undefined) {
      kind = "punctuation";
      if (t === "{") depth++;
      else if (t === "}") depth = Math.max(0, depth - 1);
    } else if (space !== undefined) kind = "space";
    else kind = "other";
    out.push({ text: t, kind });
  }
  return out;
}

const CLAUSE = new Set(["by", "without", "on", "ignoring", "group_left", "group_right"]);
const OPEN = new Set(["(", "[", "{"]);
const CLOSE = new Set([")", "]", "}"]);

/**
 * One line, spaced as Prometheus's pretty-printer spaces it: `sum by (job) (rate(x{a="1", b="2"}[5m])) / 2`.
 * Only whitespace moves; strings and everything else stay as typed.
 */
export function format(text) {
  const list = tokens(text).filter((k) => k.kind !== "space");
  let out = "";
  let prev = null;
  let braces = 0, brackets = 0;
  const parens = [];
  let unary = false;
  for (const cur of list) {
    let sep = " ";
    const p = prev;
    const pt = p?.text, ct = cur.text;
    if (!p) sep = "";
    else if (brackets > 0 || ct === "]") sep = "";
    else if (ct === "," || ct === ")" || ct === "}" || ct === "[" || ct === "{") sep = "";
    else if (OPEN.has(pt)) sep = "";
    else if (unary) sep = "";
    else if (braces > 0 && (cur.kind === "operator" || p.kind === "operator")) sep = "";
    else if (ct === "(") sep = p.kind === "function" || p.kind === "aggregator" ? "" : " ";
    else sep = " ";
    if (cur.kind === "operator" && ct === "-" && (!p || p.kind === "operator" || OPEN.has(pt) || pt === "," || p.kind === "keyword")) unary = true;
    else unary = false;
    if (ct === "{") braces++;
    else if (ct === "}") braces = Math.max(0, braces - 1);
    else if (ct === "[") brackets++;
    else if (ct === "]") brackets = Math.max(0, brackets - 1);
    else if (ct === "(") parens.push(p && p.kind === "keyword" && CLAUSE.has(pt) ? "clause" : "group");
    else if (ct === ")") parens.pop();
    out += sep + ct;
    prev = cur;
  }
  return out;
}
