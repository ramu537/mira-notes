import assert from "node:assert/strict";
import test from "node:test";
import { checkboxStats, filterNotes, libraryInsights, noteLinks, notePayload, noteSummary, sanitizeTags, toggleCheckboxLine, wordCount } from "../src/lib/notes.js";

const now = new Date("2026-09-13T12:00:00Z").getTime();
const notes = [
  { id: 1, title: "Project map", content: "# Plan\n- [ ] Draft brief\nSee [[Research]]", notebook: "Work", tags: ["planning"], status: "ACTIVE", pinned: true, starred: false, createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-12T10:00:00Z" },
  { id: 2, title: "Research", content: "Useful sources and [[Project map]]", notebook: "Reading", tags: ["planning", "sources"], status: "ACTIVE", pinned: false, starred: true, createdAt: "2026-09-02T10:00:00Z", updatedAt: "2026-09-11T10:00:00Z" },
  { id: 3, title: "Old idea", content: "One archived thought", notebook: "Ideas", tags: [], status: "ARCHIVED", pinned: false, starred: false, createdAt: "2026-08-01T10:00:00Z", updatedAt: "2026-08-02T10:00:00Z" },
  { id: 4, title: "Discarded", content: "Not counted", notebook: "Personal", tags: [], status: "TRASHED", pinned: false, starred: false, createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-12T10:00:00Z" },
];

test("sanitizeTags enforces the backend format and uniqueness", () => {
  assert.deepEqual(sanitizeTags([" Work ", "work", "good-tag", "not valid!", "_bad"]), ["work", "good-tag"]);
});

test("notePayload keeps only backend fields", () => {
  assert.deepEqual(notePayload({ ...notes[0], ignored: true }), {
    title: "Project map",
    content: notes[0].content,
    notebook: "Work",
    tags: ["planning"],
    status: "ACTIVE",
    pinned: true,
    starred: false,
  });
});

test("filterNotes excludes non-active notes and keeps pins first", () => {
  assert.deepEqual(filterNotes(notes, { filter: "ALL" }).map((note) => note.id), [1, 2]);
  assert.deepEqual(filterNotes(notes, { search: "sources", filter: "STARRED" }).map((note) => note.id), [2]);
  assert.deepEqual(filterNotes(notes, { filter: "TAG:planning", sort: "A_Z" }).map((note) => note.id), [1, 2]);
});

test("markdown helpers count and toggle checkboxes without changing other lines", () => {
  assert.deepEqual(checkboxStats("- [ ] One\n- [x] Two\nText"), { open: 1, completed: 1, total: 2 });
  assert.equal(toggleCheckboxLine("- [ ] One\nText", 0), "- [x] One\nText");
  assert.equal(wordCount("  one  two\nthree "), 3);
});

test("noteLinks extracts connected-note titles", () => {
  assert.deepEqual(noteLinks("See [[Research]] and [[ Project map ]]"), ["Research", "Project map"]);
});

test("summary and library insights exclude trash appropriately", () => {
  assert.deepEqual(noteSummary(notes, now), {
    active: 2,
    archived: 1,
    trashed: 1,
    words: 17,
    openCheckboxes: 1,
    editedThisWeek: 2,
  });
  const insights = libraryInsights(notes);
  assert.deepEqual(insights.notebooks.map(({ name, count }) => ({ name, count })), [{ name: "Work", count: 1 }, { name: "Reading", count: 1 }]);
  assert.deepEqual(insights.tags, [{ tag: "planning", count: 2 }, { tag: "sources", count: 1 }]);
  assert.deepEqual(insights.connected.map(({ note, incoming, outgoing }) => ({ id: note.id, incoming, outgoing })), [
    { id: 1, incoming: 1, outgoing: 1 },
    { id: 2, incoming: 1, outgoing: 1 },
  ]);
});

