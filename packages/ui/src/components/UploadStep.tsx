import { useCallback, useId, useState, type DragEvent, type ChangeEvent } from "react";
import { previewCsv, type CsvPreview } from "../preview.js";

export interface UploadStepProps {
  sampleUrl: string;
  maxBytes?: number;
  onFile: (csv: string, fileName: string) => void;
  /** Optional Turnstile slot rendered by the host site (keeps the widget script out of this package). */
  turnstile?: React.ReactNode;
}

export function UploadStep({ sampleUrl, maxBytes = 5 * 1024 * 1024, onFile, turnstile }: UploadStepProps) {
  const [preview, setPreview] = useState<(CsvPreview & { fileName: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const inputId = useId();

  const read = useCallback((f: File | undefined) => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) return setError("Please choose a .csv file.");
    if (f.size > maxBytes) return setError(`File exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`);
    setError(null);
    const r = new FileReader();
    r.onload = () => {
      const text = String(r.result);
      const name = f.name.replace(/[^\w .()-]/g, "_");
      setPreview({ ...previewCsv(text), fileName: name });
      onFile(text, name);
    };
    r.readAsText(f);
  }, [maxBytes, onFile]);

  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); read(e.dataTransfer.files[0]); };
  const onChange = (e: ChangeEvent<HTMLInputElement>) => read(e.target.files?.[0]);

  return (
    <section aria-labelledby={`${inputId}-h`} className="space-y-4">
      <h2 id={`${inputId}-h`} className="text-lg font-semibold">1. Upload an inventory</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">Azure portal → <em>All resources</em> → <em>Export to CSV</em>, or <a className="underline" href={sampleUrl} download>download a synthetic sample</a>.</p>
      <div
        role="button" tabIndex={0}
        aria-label="Drop a CSV file here or press Enter to choose a file"
        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer ${over ? "bg-slate-50 dark:bg-slate-800" : ""}`}
        onDragEnter={(e) => { e.preventDefault(); setOver(true); }} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") document.getElementById(inputId)?.click(); }}
      >
        Drop <code>resources.csv</code> here, or <label htmlFor={inputId} className="underline cursor-pointer">choose a file</label>.
        <input id={inputId} type="file" accept=".csv,text/csv" className="sr-only" onChange={onChange} />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {preview && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-300">{preview.fileName}: {preview.rowCount} data rows, {preview.headers.length}+ columns (showing up to 5 rows / 8 columns).</p>
          <div className="overflow-auto rounded-lg border max-h-72">
            <table className="w-full text-sm">
              <thead><tr>{preview.headers.map((h) => <th key={h} className="sticky top-0 bg-white dark:bg-slate-900 px-2 py-1 text-left">{h}</th>)}</tr></thead>
              <tbody>{preview.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-2 py-1 whitespace-nowrap border-t">{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
          {preview.warnings.length > 0 && <ul className="text-sm text-amber-700">{preview.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
        </div>
      )}
      {turnstile}
    </section>
  );
}
