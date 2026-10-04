import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCreateAssessmentRequest } from "./index.js";

test("rejects credential-shaped questionnaire fields", () => {
  const r = parseCreateAssessmentRequest({ csv: "a,b", intent: { clientSecret: "x" } });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.error.code, "prohibited_field");
});
test("rejects key-shaped questionnaire fields", () => {
  for (const k of ["apiKey", "accountKey", "accessKey", "key"]) {
    const r = parseCreateAssessmentRequest({ csv: "a,b", intent: { [k]: "x" } });
    assert.equal(r.ok, false, k);
    if (!r.ok) assert.equal(r.error.error.code, "prohibited_field");
  }
});
test("accepts the tag-key selector applicationGroupTagKey", () => {
  const r = parseCreateAssessmentRequest({ csv: "a,b", intent: { applicationGroupTagKey: "application" } });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.intent?.applicationGroupTagKey, "application");
});
test("rejects path-like file names", () => {
  const r = parseCreateAssessmentRequest({ csv: "a,b", fileName: "../../etc/passwd.csv" });
  assert.equal(r.ok, false);
});
test("accepts a minimal valid request", () => {
  const r = parseCreateAssessmentRequest({ csv: "NAME,TYPE\nx,y", fileName: "resources.csv" });
  assert.equal(r.ok, true);
});
