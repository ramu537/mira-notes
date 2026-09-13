import assert from "node:assert/strict";
import test from "node:test";
import { configureAccessTokenProvider } from "../src/api/client.js";

test("configureAccessTokenProvider accepts function or null", () => {
  assert.doesNotThrow(() => configureAccessTokenProvider(() => "mock-token"));
  assert.doesNotThrow(() => configureAccessTokenProvider(null));
  assert.throws(() => configureAccessTokenProvider("invalid"), TypeError);
});
