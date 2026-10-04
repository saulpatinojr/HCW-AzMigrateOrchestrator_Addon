import type { ResourceDecisionRecord, WavePlan } from "@amo/domain";

export function WavePlanView({ plan, decisions }: { plan: WavePlan; decisions: ResourceDecisionRecord[] }) {
  const name = (k: string) => decisions.find((d) => d.resourceKey === k)?.displayName ?? k;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Waves (preliminary)</h2>
      {plan.waves.map((w) => (
        <details key={w.number} className="rounded-lg border p-3">
          <summary className="cursor-pointer"><strong>Wave {w.number}: {w.name}</strong> — {w.resourceKeys.length} resources</summary>
          <p className="mt-1 text-sm text-slate-500">{w.rationale}</p>
          <p className="text-sm"><strong>Entry:</strong> {w.entryCriteria.join("; ")}<br /><strong>Exit:</strong> {w.exitCriteria.join("; ")}</p>
          <ul className="ml-4 list-disc text-sm">{w.resourceKeys.map((k) => <li key={k}>{name(k)}</li>)}</ul>
        </details>
      ))}
      <p className="text-xs text-slate-500">{plan.notes.join(" ")}</p>
    </section>
  );
}
