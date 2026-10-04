import { useState } from "react";
import type { MigrationIntent } from "@amo/domain";

export interface QuestionnaireFormProps {
  onSubmit: (intent: Partial<MigrationIntent>) => void;
  busy?: boolean;
}

const OPS: Array<[MigrationIntent["desiredOperation"], string]> = [
  ["region-relocation", "Move to another region"],
  ["resource-group-move", "Move to another resource group"],
  ["subscription-move", "Move to another subscription (same tenant)"],
  ["cross-tenant-migration", "Migrate to another Microsoft Entra tenant"],
];
const tri = (v: string): boolean | null => (v === "" ? null : v === "true");

/** Only questions that change the analysis; skipped answers become labelled assumptions server-side. */
export function QuestionnaireForm({ onSubmit, busy }: QuestionnaireFormProps) {
  const [f, setF] = useState<Record<string, string>>({ desiredOperation: "region-relocation", applicationGroupTagKey: "application", includeDataMigrationExamples: "true" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.type === "checkbox" ? String((e.target as HTMLInputElement).checked) : e.target.value });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const intent: Partial<MigrationIntent> = {
      desiredOperation: f.desiredOperation as MigrationIntent["desiredOperation"],
      destinationRegion: f.destinationRegion || null,
      destinationSubscriptionId: f.destinationSubscriptionId || null,
      destinationResourceGroup: f.destinationResourceGroup || null,
      sameSubscription: tri(f.sameSubscription ?? ""),
      sameTenant: tri(f.sameTenant ?? ""),
      existingLandingZone: tri(f.existingLandingZone ?? ""),
      environmentType: (f.environmentType as MigrationIntent["environmentType"]) || null,
      downtimeTolerance: (f.downtimeTolerance as MigrationIntent["downtimeTolerance"]) || null,
      rtoHours: f.rtoHours ? Number(f.rtoHours) : null,
      rpoMinutes: f.rpoMinutes ? Number(f.rpoMinutes) : null,
      migrationMode: (f.migrationMode as MigrationIntent["migrationMode"]) || null,
      dataResidency: f.dataResidency || null,
      publicAccessPolicy: (f.publicAccessPolicy as MigrationIntent["publicAccessPolicy"]) || null,
      privateEndpointsRequired: tri(f.privateEndpointsRequired ?? ""),
      applicationGroupTagKey: f.applicationGroupTagKey || null,
      includeDataMigrationExamples: f.includeDataMigrationExamples === "true",
    };
    onSubmit(intent);
  };
  const Sel = ({ k, label, children }: { k: string; label: string; children: React.ReactNode }) => (
    <label className="flex flex-col gap-1 text-sm">{label}<select className="rounded-lg border px-2 py-1" value={f[k] ?? ""} onChange={set(k)}>{children}</select></label>
  );
  const Txt = ({ k, label, type = "text", placeholder }: { k: string; label: string; type?: string; placeholder?: string }) => (
    <label className="flex flex-col gap-1 text-sm">{label}<input className="rounded-lg border px-2 py-1" type={type} value={f[k] ?? ""} placeholder={placeholder} onChange={set(k)} /></label>
  );
  const NotSure = () => <option value="">Not sure</option>;
  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Migration questionnaire">
      <h2 className="text-lg font-semibold">2. A few questions</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">Only answers that change the analysis. Anything you skip is recorded as an assumption in the report.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Txt k="destinationRegion" label="Destination region" placeholder="e.g. westus3" />
        <Txt k="destinationSubscriptionId" label="Destination subscription ID (optional, for Terraform state impact)" placeholder="00000000-…" />
        <Txt k="destinationResourceGroup" label="Destination resource group (optional)" placeholder="rg-app-prod-wus3-01" />
        <Sel k="desiredOperation" label="Operation">{OPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Sel>
        <Sel k="sameSubscription" label="Same subscription?"><NotSure /><option value="true">Yes</option><option value="false">No</option></Sel>
        <Sel k="sameTenant" label="Same tenant?"><NotSure /><option value="true">Yes</option><option value="false">No</option></Sel>
        <Sel k="existingLandingZone" label="Existing landing zone?"><NotSure /><option value="true">Yes</option><option value="false">No, greenfield</option></Sel>
        <Sel k="environmentType" label="Environment"><NotSure /><option>production</option><option>non-production</option><option>mixed</option></Sel>
        <Sel k="downtimeTolerance" label="Downtime tolerance"><NotSure /><option>none</option><option>minutes</option><option>hours</option><option>days</option></Sel>
        <Txt k="rtoHours" label="RTO (hours)" type="number" />
        <Txt k="rpoMinutes" label="RPO (minutes)" type="number" />
        <Sel k="migrationMode" label="Migration mode"><option value="">Either</option><option>online</option><option>offline</option></Sel>
        <Txt k="dataResidency" label="Data residency constraint" placeholder="e.g. EU only" />
        <Sel k="publicAccessPolicy" label="Public access policy"><option value="">Unknown</option><option>allow</option><option>deny</option></Sel>
        <Sel k="privateEndpointsRequired" label="Private endpoints required?"><NotSure /><option value="true">Yes</option><option value="false">No</option></Sel>
        <Txt k="applicationGroupTagKey" label="Tag that groups applications" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.includeDataMigrationExamples === "true"} onChange={set("includeDataMigrationExamples")} /> Include data-migration examples</label>
      </div>
      <p className="text-xs text-slate-500">We never ask for passwords, client secrets, tokens, storage keys, connection strings or certificates.</p>
      <button type="submit" disabled={busy} className="rounded-lg bg-sky-700 px-4 py-2 text-white disabled:opacity-50">{busy ? "Running…" : "Run assessment"}</button>
    </form>
  );
}
