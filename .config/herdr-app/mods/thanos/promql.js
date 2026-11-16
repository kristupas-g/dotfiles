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
