import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyThemeParam, themeFromSearch } from "../../apps/lab-web/src/theme.ts";

/**
 * The site frames the pane as `<origin>/?theme=dark|light` (integration standard, section 8). The pane must honour exactly
 * those two values, ignore everything else, and carry matching token blocks in styles.css.
 */
test("themeFromSearch accepts only dark and light", () => {
  assert.equal(themeFromSearch("?theme=dark"), "dark");
  assert.equal(themeFromSearch("?theme=light"), "light");
  assert.equal(themeFromSearch("?a=1&theme=dark"), "dark");
  for (const search of ["", "?", "?theme=", "?theme=DARK", "?theme=blue", "?theme=dark%20", "?other=dark"]) {
    assert.equal(themeFromSearch(search), null, search);
  }
});

test("applyThemeParam sets data-theme for a valid value and leaves the document alone otherwise", () => {
  const dark = { dataset: {} };
  assert.equal(applyThemeParam("?theme=dark", dark), "dark");
  assert.equal(dark.dataset.theme, "dark");

  const none = { dataset: {} };
  assert.equal(applyThemeParam("?theme=nope", none), null);
  assert.equal("theme" in none.dataset, false);
});

test("styles.css carries a token block for each theme and the dark values match the media query", () => {
  const css = readFileSync("apps/lab-web/src/styles.css", "utf8");
  const tokens = (block) => [...block.matchAll(/(--[a-z-]+):\s*([^;]+);/g)].map((m) => `${m[1]}:${m[2].trim()}`).filter((t) => !t.startsWith("--font") && !t.startsWith("--accent")).sort();

  const media = css.match(/@media \(prefers-color-scheme: dark\) \{\s*:root \{([^}]*)\}/)?.[1];
  const dark = css.match(/:root\[data-theme="dark"\] \{([^}]*)\}/)?.[1];
  const light = css.match(/:root\[data-theme="light"\] \{([^}]*)\}/)?.[1];
  const base = css.match(/^:root \{([^}]*)\}/m)?.[1];
  assert.ok(media && dark && light && base, "all four token blocks exist");

  assert.deepEqual(tokens(dark), tokens(media), "forced dark repeats the device-dark values");
  assert.deepEqual(tokens(light), tokens(base).filter((t) => !t.startsWith("--color-scheme")), "forced light repeats the base values");
});
