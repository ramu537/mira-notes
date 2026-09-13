export const defaultNotebooks = ["Personal", "Work", "Ideas", "Reading"];

const notebookTokens = ["var(--notebook-blue)", "var(--notebook-teal)", "var(--notebook-amber)", "var(--notebook-violet)", "var(--notebook-pink)"];

export function notebookToken(name) {
  const value = String(name || "Notes");
  const hash = Array.from(value).reduce((total, character) => total + character.codePointAt(0), 0);
  return notebookTokens[hash % notebookTokens.length];
}

export function notePayload(note) {
  return {
    title: String(note.title || "").slice(0, 140),
    content: String(note.content || "").slice(0, 100_000),
    notebook: String(note.notebook || "Personal").trim().slice(0, 40),
    tags: sanitizeTags(note.tags),
    status: note.status || "ACTIVE",
    pinned: Boolean(note.pinned),
    starred: Boolean(note.starred),
  };
}

export function sanitizeTags(tags) {
  return Array.from(new Set((tags || [])
    .map((tag) => String(tag).trim().toLocaleLowerCase())
    .filter((tag) => /^[a-z0-9][a-z0-9_-]{0,29}$/i.test(tag))))
    .slice(0, 10);
}

export function displayTitle(note) {
  return note.title.trim() || "Untitled note";
}

export function wordCount(content = "") {
  return content.trim().match(/\S+/g)?.length || 0;
}

export function checkboxStats(content = "") {
  const open = (content.match(/^\s*-\s*\[\s\]/gm) || []).length;
  const completed = (content.match(/^\s*-\s*\[[xX]\]/gm) || []).length;
  return { open, completed, total: open + completed };
}

export function noteLinks(content = "") {
  return Array.from(content.matchAll(/\[\[([^\]\n]{1,140})\]\]/g), (match) => match[1].trim()).filter(Boolean);
}

export function noteExcerpt(note, limit = 120) {
  const plain = note.content
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^\s*-\s*\[[xX ]\]\s*/gm, "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .trim();
  return plain ? `${plain.slice(0, limit)}${plain.length > limit ? "…" : ""}` : "Empty note";
}

export function filterNotes(notes, { search = "", filter = "ALL", sort = "EDITED" } = {}) {
  const term = search.trim().toLocaleLowerCase();
  return notes.filter((note) => {
    if (note.status !== "ACTIVE") return false;
    const haystack = `${note.title} ${note.content} ${note.notebook} ${(note.tags || []).join(" ")}`.toLocaleLowerCase();
    const matchesSearch = !term || haystack.includes(term);
    const matchesFilter = filter === "ALL"
      || (filter === "STARRED" && note.starred)
      || (filter.startsWith("BOOK:") && note.notebook === filter.slice(5))
      || (filter.startsWith("TAG:") && (note.tags || []).includes(filter.slice(4)));
    return matchesSearch && matchesFilter;
  }).sort((left, right) => {
    if (left.pinned !== right.pinned) return Number(right.pinned) - Number(left.pinned);
    if (sort === "A_Z") return displayTitle(left).localeCompare(displayTitle(right));
    const key = sort === "CREATED" ? "createdAt" : "updatedAt";
    return timestamp(right[key]) - timestamp(left[key]);
  });
}

export function relativeTime(value, now = Date.now()) {
  const time = timestamp(value);
  if (!time) return "just now";
  const days = Math.max(0, Math.floor((now - time) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 35) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function uniqueNotebooks(notes) {
  return Array.from(new Set([...defaultNotebooks, ...notes.map((note) => note.notebook).filter(Boolean)]));
}

export function noteSummary(notes, now = Date.now()) {
  const active = notes.filter((note) => note.status === "ACTIVE");
  const available = notes.filter((note) => note.status !== "TRASHED");
  const weekAgo = now - 7 * 86_400_000;
  return {
    active: active.length,
    archived: notes.filter((note) => note.status === "ARCHIVED").length,
    trashed: notes.filter((note) => note.status === "TRASHED").length,
    words: available.reduce((total, note) => total + wordCount(note.content), 0),
    openCheckboxes: available.reduce((total, note) => total + checkboxStats(note.content).open, 0),
    editedThisWeek: available.filter((note) => timestamp(note.updatedAt) >= weekAgo).length,
  };
}

export function libraryInsights(notes) {
  const active = notes.filter((note) => note.status === "ACTIVE");
  const notebooks = uniqueNotebooks(active).map((name) => {
    const items = active.filter((note) => note.notebook === name);
    return {
      name,
      count: items.length,
      words: items.reduce((total, note) => total + wordCount(note.content), 0),
      latest: [...items].sort((left, right) => timestamp(right.updatedAt) - timestamp(left.updatedAt))[0]?.updatedAt,
    };
  }).filter((item) => item.count);

  const tagCounts = new Map();
  active.forEach((note) => (note.tags || []).forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)));
  const tags = Array.from(tagCounts, ([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));

  const connected = active.map((note) => {
    const title = displayTitle(note).toLocaleLowerCase();
    const outgoing = noteLinks(note.content).length;
    const incoming = active.reduce((total, candidate) => total + noteLinks(candidate.content)
      .filter((link) => link.toLocaleLowerCase() === title).length, 0);
    return { note, outgoing, incoming };
  }).filter((item) => item.outgoing || item.incoming)
    .sort((left, right) => (right.incoming + right.outgoing) - (left.incoming + left.outgoing));

  return { notebooks, tags, connected };
}

export function toggleCheckboxLine(content, lineIndex) {
  return content.split("\n").map((line, index) => {
    if (index !== lineIndex) return line;
    if (/^\s*-\s*\[\s\]/.test(line)) return line.replace("[ ]", "[x]");
    if (/^\s*-\s*\[[xX]\]/.test(line)) return line.replace(/\[[xX]\]/, "[ ]");
    return line;
  }).join("\n");
}

function timestamp(value) {
  return value ? new Date(value).getTime() : 0;
}

