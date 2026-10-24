/*
 * Theme from the frame address (HCW AddOn Integration Standard, section 8): the site loads the pane as `<origin>/?theme=dark`
 * or `?theme=light`, read once from its own theme when the page first renders and never updated afterwards. Any other value,
 * or none, leaves the pane on the visitor's device setting (`prefers-color-scheme`), exactly as before.
 *
 * This is a classic script in <head>, ahead of the stylesheet, so `data-theme` is on the document before the first paint
 * (a module script runs after parsing and the page could paint the device theme first). It is a file, not an inline script,
 * because the pane's Content-Security-Policy is `script-src 'self'`. styles.css reads `data-theme`.
 */
(function () {
  var value = new URLSearchParams(window.location.search).get("theme");
  if (value === "dark" || value === "light") document.documentElement.setAttribute("data-theme", value);
})();
