import * as Dialog from "@radix-ui/react-dialog";
import type { ResourceDecisionRecord } from "@amo/domain";
import { ConfidencePill } from "./DecisionTable.js";

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (<><dt className="text-slate-500">{title}</dt><dd><ul className="ml-4 list-disc">{items.map((i) => <li key={i}>{i}</li>)}</ul></dd></>);
}

/** Full decision record (§9) in a dialog. */
export function DecisionDetail({ decision: d, onClose }: { decision: ResourceDecisionRecord | null; onClose: () => void }) {
  return (
    <Dialog.Root open={!!d} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-x-4 top-8 bottom-8 mx-auto max-w-3xl overflow-auto rounded-xl bg-white dark:bg-slate-900 p-6 text-sm shadow-xl">
          {d && (
            <>
              <Dialog.Title className="text-lg font-semibold">{d.displayName} <ConfidencePill band={d.confidence.band} score={d.confidence.score} /></Dialog.Title>
              <Dialog.Description className="text-slate-500">{d.resourceType} · {d.region ?? "unknown region"} · {d.resourceGroup ?? ""}</Dialog.Description>
              <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
                <dt className="text-slate-500">Disposition</dt><dd><strong>{d.disposition}</strong> via <strong>{d.recommendedTool}</strong>{d.alternativeMethods.length ? ` (alternatives: ${d.alternativeMethods.join(", ")})` : ""}</dd>
                <dt className="text-slate-500">Paths</dt><dd>infrastructure: {d.infrastructureDisposition} · configuration: {d.configurationDisposition} · identity: {d.identityDisposition} · data: {d.dataDisposition}</dd>
                <dt className="text-slate-500">Support</dt><dd>RG move {d.nativeMoveSupport} · subscription move {d.crossSubscriptionSupport} · region {d.regionalRelocationSupport} · target region/SKU availability {d.targetRegionAvailability}/{d.targetSkuAvailability}</dd>
                <dt className="text-slate-500">Confidence by operation</dt><dd>{Object.entries(d.confidenceByOperation ?? {}).map(([op, c]) => `${op}: ${c.band} (${c.score})`).join(" · ")}</dd>
                <dt className="text-slate-500">Downtime / RTO / RPO</dt><dd>{d.expectedDowntime} · {d.rtoCompatibility} · {d.rpoCompatibility}</dd>
                <dt className="text-slate-500">Why</dt><dd>{d.reasonCodes.join(", ")} — {d.confidence.rationale.join("; ")}</dd>
                <dt className="text-slate-500">Rule</dt><dd>{d.ruleId ?? "none"} v{d.ruleVersion ?? "—"} · human approval {d.humanApprovalRequired ? "required" : "not required"}</dd>
                <List title="Dependencies" items={d.dependencies.map((x) => `${x.relationship} → ${x.targetKey.split("/").pop()} [${x.origin}]`)} />
                <List title="Prerequisites" items={d.prerequisites} />
                <List title="Blockers" items={d.blockers} />
                <List title="Risks" items={d.risks} />
                <List title="Validation" items={d.validationMethod} />
                <List title="Rollback" items={d.rollbackMethod} />
                <List title="Secondary actions" items={d.secondaryActions} />
                <List title="Evidence" items={d.evidence.map((e) => `[${e.state}] ${e.statement}${e.source ? ` (${e.source})` : ""}`)} />
                <List title="Assumptions" items={d.assumptions} />
                <List title="Missing information" items={d.missingInformation} />
                {d.tenantContext === "cross-tenant" && <List title="Cross-tenant implications" items={d.crossTenantImplications} />}
              </dl>
              <Dialog.Close className="mt-4 rounded-lg border px-3 py-1">Close</Dialog.Close>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
