import type { ProgressEvent } from "@amo/domain";

export function ProgressList({ events, pending }: { events: ProgressEvent[]; pending?: boolean }) {
  const steps = ["Normalizing resource inventory", "Matching resource types to migration rules", "Separating infrastructure and data paths", "Identifying missing information", "Preparing example Terraform", "Building validation guidance"];
  const done = events.filter((e) => e.status === "completed").map((e) => e.message);
  return (
    <section aria-live="polite" className="space-y-2">
      <h2 className="text-lg font-semibold">3. Analysing</h2>
      <ol className="space-y-1 text-sm">
        {(events.length ? events : steps.map((m) => ({ message: m, status: pending ? "started" : "completed", agent: "", at: "" }) as ProgressEvent)).map((e, i) => (
          <li key={i} className={e.status === "failed" ? "text-red-700" : e.status === "completed" ? "text-emerald-700" : "text-slate-500"}>
            {e.status === "completed" ? "✓" : e.status === "failed" ? "✗" : "…"} {e.message}{e.agent ? <span className="text-slate-400"> · {e.agent}</span> : null}
          </li>
        ))}
      </ol>
      {done.length === 0 && pending ? <p className="text-xs text-slate-500">Progress messages describe what the engine does — never hidden reasoning.</p> : null}
    </section>
  );
}
