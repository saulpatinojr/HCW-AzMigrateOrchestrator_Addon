import { useCallback, useEffect, useMemo, useState } from "react";
import type { Assessment, MigrationIntent, ProgressEvent, ResourceDecisionRecord } from "@amo/domain";
import { LabApiClient, LabApiError } from "../client.js";
import { UploadStep } from "./UploadStep.js";
import { QuestionnaireForm } from "./QuestionnaireForm.js";
import { ProgressList } from "./ProgressList.js";
import { SummaryPanel } from "./SummaryPanel.js";
import { DecisionTable } from "./DecisionTable.js";
import { DecisionDetail } from "./DecisionDetail.js";
import { WavePlanView } from "./WavePlanView.js";
import { GeneratedFiles } from "./GeneratedFiles.js";
import { PoweredBy } from "./PoweredBy.js";

export interface MigrationExplorerProps {
  /** e.g. https://labs-api.hybridcloudworks.com — the lab API, never the appliance. */
  apiBaseUrl: string;
  /** Rendered inside the upload step; the host site owns the Turnstile script and passes the token via getTurnstileToken. */
  turnstile?: React.ReactNode;
  getTurnstileToken?: () => string | undefined;
  /** Where the enterprise CTA points. */
  contactUrl?: string;
  fetchImpl?: typeof fetch;
}

type Stage = "upload" | "questions" | "running" | "results";

/**
 * Client-only island: no window access or fetch at module evaluation, so it is safe inside the site's prerender.
 * Mount it lazily (React.lazy) from the route component.
 */
export function MigrationExplorer({ apiBaseUrl, turnstile, getTurnstileToken, contactUrl = "https://hybridcloudworks.com/contact", fetchImpl }: MigrationExplorerProps) {
  const client = useMemo(() => new LabApiClient({ baseUrl: apiBaseUrl, fetchImpl }), [apiBaseUrl, fetchImpl]);
  const [stage, setStage] = useState<Stage>("upload");
  const [csv, setCsv] = useState<{ text: string; name: string } | null>(null);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<ResourceDecisionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workspaceAvailable, setWorkspaceAvailable] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    client.health().then((h) => { if (!cancelled) setWorkspaceAvailable(!!h.workspace && h.workspace !== "disabled"); }).catch(() => {});
    return () => { cancelled = true; };
  }, [client]);
  const openWorkspace = async () => {
    setWorkspaceBusy(true);
    try {
      const ws = await client.openWorkspace();
      if (ws.launchUrl) window.open(ws.launchUrl, "_blank", "noopener");
    } catch (e) { setError((e as Error).message); } finally { setWorkspaceBusy(false); }
  };

  const onFile = useCallback((text: string, name: string) => { setCsv({ text, name }); setStage("questions"); }, []);

  const run = async (intent: Partial<MigrationIntent>) => {
    if (!csv) return;
    setError(null);
    setStage("running");
    setEvents([]);
    try {
      const created = await client.create({ csv: csv.text, fileName: csv.name, intent }, getTurnstileToken?.());
      setEvents(created.progress);
      setExpiresAt(created.expiresAt);
      const full = await client.get();
      setAssessment(full.assessment as Assessment);
      setFiles(full.files);
      setStage("results");
    } catch (e) {
      const msg = e instanceof LabApiError ? `${e.message}${e.body?.error.details ? ` — ${JSON.stringify(e.body.error.details)}` : ""}` : (e as Error).message;
      setError(msg);
      setStage("questions");
    }
  };

  const download = async () => {
    const blob = await client.bundle();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-${client.id?.slice(0, 8)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const remove = async () => {
    if (!confirm("Delete this assessment and its data now?")) return;
    await client.delete();
    setAssessment(null);
    setFiles([]);
    setStage("upload");
    setCsv(null);
  };

  return (
    <div className="space-y-8" data-component="migration-explorer">
      <div className="rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950 p-4 text-sm text-amber-900 dark:text-amber-100">
        <strong>What this lab is — and is not.</strong> It analyses an exported inventory only. It never connects to an Azure tenant, never asks for credentials, and cannot execute migration actions. Results are rule-based illustrations labelled with their evidence state and confidence; they are not an authoritative Azure assessment. Uploads are processed in memory and expire automatically.
      </div>
      <UploadStep sampleUrl={`${apiBaseUrl}/api/sample.csv`} onFile={onFile} turnstile={turnstile} />
      {stage !== "upload" && <QuestionnaireForm onSubmit={run} busy={stage === "running"} />}
      {error && <p role="alert" className="rounded-lg border border-red-700 p-3 text-sm text-red-700">Assessment failed: {error}</p>}
      {(stage === "running" || stage === "results") && <ProgressList events={events} pending={stage === "running"} />}
      {stage === "results" && assessment && (
        <>
          <SummaryPanel summary={assessment.summary} expiresAt={expiresAt} onDownload={download} onDelete={remove} onOpenWorkspace={workspaceAvailable ? openWorkspace : undefined} workspaceBusy={workspaceBusy} />
          <DecisionTable decisions={assessment.decisions} onSelect={setSelected} />
          <DecisionDetail decision={selected} onClose={() => setSelected(null)} />
          <WavePlanView plan={assessment.wavePlan} decisions={assessment.decisions} />
          <GeneratedFiles files={files} load={(p) => client.file(p)} />
          <section className="rounded-xl border p-6 text-center">
            <h2 className="text-lg font-semibold">Need an assessment you can act on?</h2>
            <p className="text-sm">The <strong>Azure Migration Orchestrator</strong> appliance connects read-only to your tenant with Microsoft Entra ID, validates every rule against live configuration, and carries each resource through approval-gated migration waves.</p>
            <a className="mt-3 inline-block rounded-lg bg-sky-700 px-4 py-2 text-white" href={contactUrl}>Talk to Hybrid Cloud Works</a>
          </section>
        </>
      )}
      <PoweredBy compact={stage !== "results"} />
    </div>
  );
}
