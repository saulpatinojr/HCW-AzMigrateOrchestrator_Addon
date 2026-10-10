import { test } from "node:test";
import assert from "node:assert/strict";
import { optionsFromEnv, positiveInt } from "./config.js";

test("env validation: the abuse bounds accept only positive integers; empty means the default", () => {
  const ok = optionsFromEnv({ AMO_RATE_LIMIT_POSTS: "5", AMO_RATE_LIMIT_WINDOW_MINUTES: "1", AMO_MAX_CONCURRENT: "1", AMO_ASSESSMENT_TTL_MINUTES: "30" }, "/repo");
  assert.deepEqual(ok.rateLimit, { postsPerWindow: 5, windowMs: 60000 });
  assert.equal(ok.maxConcurrent, 1);
  assert.equal(ok.ttlMinutes, 30);
  const defaults = optionsFromEnv({ AMO_RATE_LIMIT_POSTS: "", AMO_MAX_CONCURRENT: " " }, "/repo");
  assert.deepEqual(defaults.rateLimit, { postsPerWindow: 10, windowMs: 600000 });
  assert.equal(defaults.maxConcurrent, 2);
  assert.equal(defaults.ttlMinutes, 120);
  for (const [name, bad] of [["AMO_RATE_LIMIT_POSTS", "0"], ["AMO_RATE_LIMIT_WINDOW_MINUTES", "0"], ["AMO_MAX_CONCURRENT", "0"], ["AMO_MAX_CONCURRENT", "-1"], ["AMO_MAX_CONCURRENT", "1.5"], ["AMO_RATE_LIMIT_POSTS", "ten"], ["AMO_ASSESSMENT_TTL_MINUTES", "0"]]) {
    assert.throws(() => optionsFromEnv({ [name]: bad }, "/repo"), new RegExp(`${name} must be a positive integer`), `${name}=${bad}`);
  }
  assert.equal(positiveInt({ X: "7" }, "X", 1), 7);
});

test("env mapping: lists, flags and the static-dir default", () => {
  const o = optionsFromEnv({ AMO_FRAME_ANCESTORS: "'self'  https://hybridcloudworks.com", AMO_SITE_ORIGINS: "https://hybridcloudworks.com", AMO_ALLOWED_ORIGINS: "https://a.example, https://b.example", AMO_TRUST_PROXY: "1", TURNSTILE_SECRET: "", AMO_TURNSTILE_SITE_KEY: "1x00000000000000000000AA" }, "/repo");
  assert.deepEqual(o.frameAncestors, ["'self'", "https://hybridcloudworks.com"]);
  assert.deepEqual(o.siteOrigins, ["https://hybridcloudworks.com"]);
  assert.deepEqual(o.allowedOrigins, ["https://a.example", "https://b.example"]);
  assert.equal(o.trustProxy, true);
  assert.equal(o.turnstileSecret, undefined, "an empty secret is no secret");
  assert.equal(o.turnstileSiteKey, "1x00000000000000000000AA");
  assert.equal(o.allowNoTurnstile, false);
  assert.ok(o.staticDir?.endsWith("/apps/lab-web/dist"));
});
