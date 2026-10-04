import type { AssessmentSummary } from "@amo/domain";

export interface SummaryPanelProps {
  summary: AssessmentSummary;
  expiresAt: string | null;
  onDownload: () => void;
  onDelete: () => void;
  /** Shown only when the lab API reports a configured workspace provider (Coder). */
  onOpenWorkspace?: () => void;
  workspaceBusy?: boolean;
}

export function SummaryPanel({ summary: s, expiresAt, onDownload, onDelete, onOpenWorkspace, workspaceBusy }: SummaryPanelProps) {
  const kpis: Array<[string, string | number]> = [["Resources", s.resourceCount], ["Need validation", s.unknownCount], ["Complexity", s.complexityBand], ["Confidence high/med/low", `${s.confidenceTotals.high}/${s.confidenceTotals.medium}/${s.confidenceTotals.low}`], ...Object.entries(s.dispositionTotals).filter(([, n]) => n > 0)];
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">4. Summary</h2>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {kpis.map(([k, v]) => <div key={k} className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3"><b className="block text-2xl">{v}</b><span className="text-sm">{k}</span></div>)}
      </div>
      <div className="rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-900 dark:text-amber-100">
        {s.disclaimers.map((d) => <p key={d}>{d}</p>)}
        {s.keyBlockers.length > 0 && <p><strong>Key blockers:</strong> {s.keyBlockers.join(" · ")}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-lg bg-sky-700 px-4 py-2 text-white" onClick={onDownload}>Download output bundle (.zip)</button>
        {onOpenWorkspace && <button className="rounded-lg border border-sky-700 px-4 py-2 text-sky-700 disabled:opacity-50" disabled={workspaceBusy} onClick={onOpenWorkspace}>{workspaceBusy ? "Starting workspace…" : "Open in Coder (guided lab)"}</button>}
        <button className="rounded-lg border border-red-700 px-4 py-2 text-red-700" onClick={onDelete}>Delete my data now</button>
        {expiresAt && <span className="text-xs text-slate-500">Data expires {new Date(expiresAt).toLocaleString()}.</span>}
      </div>
    </section>
  );
}
