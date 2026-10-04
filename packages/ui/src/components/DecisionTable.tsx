import { useMemo, useState } from "react";
import type { ResourceDecisionRecord } from "@amo/domain";

export function ConfidencePill({ band, score }: { band: string; score: number }) {
  const cls = band === "high" ? "border-emerald-700 text-emerald-700" : band === "medium" ? "border-amber-600 text-amber-700" : "border-red-700 text-red-700";
  return <span className={`inline-block rounded-full border px-2 text-xs ${cls}`}>{band} {score}</span>;
}

export function DecisionTable({ decisions, onSelect }: { decisions: ResourceDecisionRecord[]; onSelect: (d: ResourceDecisionRecord) => void }) {
  const [q, setQ] = useState("");
  const [disp, setDisp] = useState("");
  const [conf, setConf] = useState("");
  const dispositions = useMemo(() => [...new Set(decisions.map((d) => d.disposition))].sort(), [decisions]);
  const rows = decisions.filter((d) => (!q || d.displayName.toLowerCase().includes(q.toLowerCase()) || d.resourceType.toLowerCase().includes(q.toLowerCase())) && (!disp || d.disposition === disp) && (!conf || d.confidence.band === conf));
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Resources</h2>
      <div className="flex flex-wrap gap-2">
        <input aria-label="Search" className="rounded-lg border px-2 py-1 text-sm" placeholder="Search name or type" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter by disposition" className="rounded-lg border px-2 py-1 text-sm" value={disp} onChange={(e) => setDisp(e.target.value)}><option value="">All dispositions</option>{dispositions.map((d) => <option key={d}>{d}</option>)}</select>
        <select aria-label="Filter by confidence" className="rounded-lg border px-2 py-1 text-sm" value={conf} onChange={(e) => setConf(e.target.value)}><option value="">All confidence</option><option>high</option><option>medium</option><option>low</option></select>
      </div>
      <div className="overflow-auto rounded-lg border max-h-[28rem]">
        <table className="w-full text-sm">
          <thead><tr>{["Resource", "Type", "Disposition", "Infra", "Data", "Tool", "Confidence"].map((h) => <th key={h} className="sticky top-0 bg-white dark:bg-slate-900 px-2 py-1 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.resourceKey} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => onSelect(d)} onKeyDown={(e) => e.key === "Enter" && onSelect(d)} tabIndex={0}>
                <td className="px-2 py-1 border-t whitespace-nowrap">{d.displayName}</td>
                <td className="px-2 py-1 border-t whitespace-nowrap text-slate-500">{d.resourceType}</td>
                <td className="px-2 py-1 border-t whitespace-nowrap">{d.disposition}</td>
                <td className="px-2 py-1 border-t whitespace-nowrap">{d.infrastructureDisposition}</td>
                <td className="px-2 py-1 border-t whitespace-nowrap">{d.dataDisposition}</td>
                <td className="px-2 py-1 border-t whitespace-nowrap">{d.recommendedTool}</td>
                <td className="px-2 py-1 border-t"><ConfidencePill band={d.confidence.band} score={d.confidence.score} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
