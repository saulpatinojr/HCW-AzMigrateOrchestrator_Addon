/** RFC 4180-style CSV parser with delimiter sniffing, BOM handling and quoted fields (§16). */
export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: string;
  hadBom: boolean;
  warnings: string[];
}

export function sniffDelimiter(firstLine: string): string {
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = -1;
  for (const c of candidates) {
    const count = firstLine.split(c).length - 1;
    if (count > bestCount) {
      best = c;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(text: string, opts: { maxRows?: number } = {}): ParsedCsv {
  const warnings: string[] = [];
  let hadBom = false;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
    hadBom = true;
  }
  if (text.trim().length === 0) return { headers: [], rows: [], delimiter: ",", hadBom, warnings: ["empty file"] };
  const firstNewline = text.indexOf("\n");
  const delimiter = sniffDelimiter(firstNewline === -1 ? text : text.slice(0, firstNewline));

  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      field = "";
      records.push(record);
      record = [];
      if (opts.maxRows && records.length > opts.maxRows) {
        warnings.push(`row limit ${opts.maxRows} exceeded; remaining rows ignored`);
        break;
      }
    } else field += ch;
  }
  if (inQuotes) warnings.push("unterminated quoted field at end of file");
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  const nonEmpty = records.filter((r) => r.some((c) => c.trim().length > 0));
  if (nonEmpty.length === 0) return { headers: [], rows: [], delimiter, hadBom, warnings: ["no data rows"] };
  const headers = nonEmpty[0].map((h) => h.trim());
  const rows = nonEmpty.slice(1).map((r, idx) => {
    if (r.length !== headers.length) {
      warnings.push(`row ${idx + 2}: expected ${headers.length} columns, got ${r.length}`);
      const fixed = r.slice(0, headers.length);
      while (fixed.length < headers.length) fixed.push("");
      return fixed;
    }
    return r;
  });
  return { headers, rows, delimiter, hadBom, warnings };
}

/** CSV formula injection: values beginning with = + - @ or tab/CR after optional quotes/whitespace. */
export function looksLikeFormula(value: string): boolean {
  return /^[\s'"]*[=+\-@\t\r]/.test(value) && !/^[\s'"]*-\d/.test(value);
}

/** Make a value safe to write back into a CSV cell for downstream spreadsheet users. */
export function csvSafe(value: string): string {
  const v = looksLikeFormula(value) ? "'" + value : value;
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
