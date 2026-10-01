import assert from "node:assert/strict";
import test from "node:test";
import { intelligenceCopy, normalizeEvidence } from "../src/lib/intelligence.js";

test("normalizes evidence without exposing a required schema", () => {
  assert.deepEqual(normalizeEvidence({ open_checkboxes: 3 })[0], { key: "open_checkboxes", label: "open checkboxes", value: 3 });
});

test("uses calculated guidance when no model interpretation exists", () => {
  assert.equal(intelligenceCopy({ guidance: "Review three unfinished checklists" }), "Review three unfinished checklists");
});
