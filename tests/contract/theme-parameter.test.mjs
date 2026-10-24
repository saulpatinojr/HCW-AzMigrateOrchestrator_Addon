import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

/**
 * The site frames the pane as `<origin>/?theme=dark|light` (integration standard, section 8). The pane must honour exactly
 * those two values and ignore everything else, set it before the stylesheet can paint, and carry matching token blocks.
 */
const script = readFileSync("apps/lab-web/public/theme-init.js", "utf8");

function run(search) {
  const attrs = {};
  const sandbox = { window: { location: { search } }, URLSearchParams, document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } } };
  vm.runInNewContext(script, sandbox);
  return attrs;
}

test("theme-init.js accepts only dark and light", () => {
  assert.deepEqual(run("?theme=dark"), { "data-theme": "dark" });
  assert.deepEqual(run("?theme=light"), { "data-theme": "light" });
  assert.deepEqual(run("?a=1&theme=dark"), { "data-theme": "dark" });
  for (const search of ["", "?", "?theme=", "?theme=DARK", "?theme=blue", "?theme=dark%20", "?other=dark"]) {
    assert.deepEqual(run(search), {}, search);
  }
});

test("index.html loads theme-init.js as a classic script in <head>, before the page's module script", () => {
  const html = readFileSync("apps/lab-web/index.html", "utf8");
  const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
  assert.match(head, /<script src="\/theme-init\.js"><\/script>/, "classic script in head");
  assert.doesNotMatch(head, /type="module"/);
  assert.ok(html.indexOf("/theme-init.js") < html.indexOf("/src/main.tsx"));
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
  assert.deepEqual(tokens(light), tokens(base), "forced light repeats the base values");
});
