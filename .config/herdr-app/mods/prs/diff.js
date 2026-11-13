// A unified diff as files of rows, and the flat row list the diff view draws:
// file headers, hunk headers, lines, and a note row under each line that has
// a review thread on it.

export const SIZE = { file: 30, hunk: 22, line: 20, note: 24 };

// `gh pr diff` text -> [{ path, add, del, rows: [{ k: "hunk" | "add" | "del" | "ctx", old?, new?, text }] }]
export function parseDiff(text) {
  const files = [];
  let file = null;
  let oldN = 0;
  let newN = 0;
  for (const raw of text.split("\n")) {
    if (raw.startsWith("diff --git ")) {
      // "diff --git a/x b/y": the new path, after " b/".
      const at = raw.lastIndexOf(" b/");
      file = { path: at > 0 ? raw.slice(at + 3) : raw.slice(11), add: 0, del: 0, rows: [] };
      files.push(file);
      continue;
    }
    if (!file) continue;
    if (raw.startsWith("+++ ") || raw.startsWith("--- ") || raw.startsWith("index ") || raw.startsWith("new file") || raw.startsWith("deleted file") || raw.startsWith("similarity") || raw.startsWith("rename ") || raw.startsWith("old mode") || raw.startsWith("new mode")) {
      if (raw.startsWith("+++ b/")) file.path = raw.slice(6);
      continue;
    }
    if (raw.startsWith("Binary files")) {
      file.rows.push({ k: "hunk", text: "Binary file" });
      continue;
    }
    if (raw.startsWith("@@")) {
      const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
      oldN = Number(m?.[1] ?? 1);
      newN = Number(m?.[2] ?? 1);
      file.rows.push({ k: "hunk", text: raw });
      continue;
    }
    if (raw.startsWith("+")) {
      file.rows.push({ k: "add", new: newN++, text: raw.slice(1) });
      file.add++;
    } else if (raw.startsWith("-")) {
      file.rows.push({ k: "del", old: oldN++, text: raw.slice(1) });
      file.del++;
    } else if (raw.startsWith("\\")) {
      file.rows.push({ k: "ctx", text: raw });
    } else if (raw !== "") {
      file.rows.push({ k: "ctx", old: oldN++, new: newN++, text: raw.slice(1) });
    }
  }
  return files;
}

// Review comments (REST shape) as threads: a root and its replies, anchored at
// path + side + line while the line still exists; `outdated` otherwise.
export function threads(comments) {
  const byId = new Map(comments.map((c) => [c.id, { root: c, replies: [] }]));
  const out = [];
  for (const c of comments) {
    const parent = c.in_reply_to_id && byId.get(c.in_reply_to_id);
    if (parent) parent.replies.push(c);
    else out.push(byId.get(c.id));
  }
  for (const th of out) {
    th.path = th.root.path;
    th.line = th.root.line ?? null;
    th.side = th.root.side ?? "RIGHT";
    th.outdated = th.line == null;
    th.at = Date.parse(th.root.created_at);
  }
  return out.sort((a, b) => a.at - b.at);
}

// The rows the virtual list draws, with a key and a height each.
export function buildRows(files, allThreads, folded) {
  const rows = [];
  const anchored = new Map();
  for (const th of allThreads) {
    if (th.outdated) continue;
    const key = `${th.path}:${th.side}:${th.line}`;
    (anchored.get(key) ?? anchored.set(key, []).get(key)).push(th);
  }
  files.forEach((f, fi) => {
    rows.push({ k: "file", key: `f:${f.path}`, size: SIZE.file, file: f, open: !folded.has(f.path) });
    if (folded.has(f.path)) return;
    f.rows.forEach((r, ri) => {
      rows.push({ ...r, key: `l:${fi}:${ri}`, size: r.k === "hunk" ? SIZE.hunk : SIZE.line });
      const here = [
        ...(r.new != null ? anchored.get(`${f.path}:RIGHT:${r.new}`) ?? [] : []),
        ...(r.old != null && r.k === "del" ? anchored.get(`${f.path}:LEFT:${r.old}`) ?? [] : []),
      ];
      for (const th of here) rows.push({ k: "note", key: `n:${th.root.id}`, size: SIZE.note, thread: th });
    });
  });
  return rows;
}
