/**
 * Theme from the frame address (HCW AddOn Integration Standard, section 8): the site loads the pane as `<origin>/?theme=dark`
 * or `?theme=light`, read from its own theme when the page first renders. Any other value, or none, leaves the pane on the
 * visitor's device setting (`prefers-color-scheme`), exactly as before. The site never updates it after load.
 */
export type PaneTheme = "dark" | "light";

/** The theme named by a query string such as `?theme=dark`, or null when it names none. */
export function themeFromSearch(search: string): PaneTheme | null {
  const value = new URLSearchParams(search).get("theme");
  return value === "dark" || value === "light" ? value : null;
}

/** Marks the document with the requested theme (`data-theme`), which styles.css reads; does nothing for no theme. */
export function applyThemeParam(search: string, root: { dataset: Record<string, string | undefined> }): PaneTheme | null {
  const theme = themeFromSearch(search);
  if (theme) root.dataset.theme = theme;
  return theme;
}
