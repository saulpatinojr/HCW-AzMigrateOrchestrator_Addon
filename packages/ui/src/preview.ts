export interface CsvPreview {
  headers: string[];
  rows: string[][];
  rowCount: number;
  warnings: string[];
}

/** Lightweight client-side preview (first rows/columns) and column sanity warnings before upload. */
export function previewCsv(text: string, maxRows = 5, maxCols = 8): CsvPreview {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [], rowCount: 0, warnings: ["The file is empty."] };
  const delim = [",", ";", "\t"].sort((a, b) => lines[0].split(b).length - lines[0].split(a).length)[0];
  const cells = (l: string) => l.split(delim).slice(0, maxCols).map((c) => c.replace(/^"|"$/g, "").trim());
  const headers = cells(lines[0]);
  const low = headers.map((h) => h.toLowerCase());
  const warnings: string[] = [];
  if (!low.includes("name")) warnings.push("No NAME column found — the assessment will be rejected.");
  if (!low.some((h) => h === "type" || h === "resource type")) warnings.push("No TYPE column found — the assessment will be rejected.");
  if (!low.some((h) => h.includes("resource id") || h === "id")) warnings.push("No RESOURCE ID column: parent/child relationships cannot be discovered. Re-export with the Resource ID column for better results.");
  return { headers, rows: lines.slice(1, 1 + maxRows).map(cells), rowCount: lines.length - 1, warnings };
}
