import type { Assessment, ResourceDecisionRecord } from "@amo/domain";

const DATA_DIMS = new Set(["replicate", "backup-restore", "export-import", "sync-and-cutover"]);
const shell = (s: string): string => s.replace(/[^A-Za-z0-9._-]/g, "");

/** Runbooks (§22) and script scaffolding (§12.10). Scripts are dry-run by default and never carry secrets. */
export function generateRunbooks(a: Assessment): Record<string, string> {
  const head = (title: string) => `# ${title}\n\n${a.edition === "demo" ? "> DEMO — NOT FOR PRODUCTION. Placeholder scopes; execution disabled by default.\n\n" : ""}| Field | Value |\n|---|---|\n| Purpose | ${title} for ${a.intent.desiredOperation}${a.intent.destinationRegion ? ` to ${a.intent.destinationRegion}` : ""} |\n| Scope | ${a.decisions.length} resources, assessment ${a.id} |\n| Roles | Migration lead (approver), platform engineer (executor), data owner (reconciliation sign-off), security (identity/RBAC review) |\n| Evidence to retain | Command output, plan files, reconciliation results, approval records |\n\n`;
  const decisions = a.decisions.filter((d) => d.disposition !== "retain" && d.disposition !== "retire");
  const pre = head("Pre-migration runbook") + `## Preconditions\n\n- Destination landing zone scope approved; subscription/resource groups exist.\n- Authentication context validated (\`az account show\`) against the **destination** subscription.\n- Required RBAC confirmed: read-only on source; contributor scoped to destination resource groups only.\n- Backup/ASR protection noted for every protected item (must be stopped before ARM moves).\n\n## Entry criteria\n\n- Assessment reviewed; every blocker has an owner.\n- Change window approved; DNS TTLs lowered for public endpoints.\n\n## Steps\n\n${decisions.map((d, i) => `${i + 1}. **${d.displayName}** (${d.resourceType}) — ${d.disposition}. Prerequisites: ${d.prerequisites.slice(0, 3).join("; ") || "none recorded"}.`).join("\n")}\n\n## Decision points\n\n- If any \`unknown-requires-validation\` item remains unresolved: STOP until authenticated inspection completes.\n\n## Exit criteria\n\n- Baseline captured (inventory, RBAC, effective network, app health).\n`;
  const mig = head("Migration runbook") + `## Steps by wave\n\n${a.wavePlan.waves.map((w) => `### Wave ${w.number}: ${w.name}\n\n- Entry: ${w.entryCriteria.join("; ")}\n${w.resourceKeys.map((k) => a.decisions.find((d) => d.resourceKey === k)).filter(Boolean).map((d) => `- [ ] ${d!.displayName}: ${stepFor(d!)}`).join("\n")}\n- Exit: ${w.exitCriteria.join("; ")}\n`).join("\n")}\n## Escalation\n\n- Any failed validation → stop the wave, do not proceed to cutover; invoke rollback.md for completed steps if required.\n`;
  const cut = head("Cutover runbook") + `## Entry criteria\n\n- All waves except the cutover wave complete; final data sync windows agreed.\n\n## Steps\n\n1. Announce freeze; stop writers to data-bearing sources.\n2. Final sync for each data path:\n${a.decisions.filter((d) => DATA_DIMS.has(d.dataDisposition)).map((d) => `   - ${d.displayName}: ${d.dataDisposition} via ${d.recommendedTool}; reconcile per validation/reconciliation-plan.md`).join("\n") || "   - none"}\n3. Switch connection strings / Key Vault references / DNS to destination.\n4. Smoke tests (validation/test-plan.md).\n5. Hypercare monitoring window begins.\n\n## Decision point\n\n- Reconciliation tolerance exceeded or smoke tests fail → execute rollback.md immediately.\n\n## Exit criteria\n\n- Business sign-off; source marked read-only (not deleted).\n`;
  const val = head("Validation runbook") + `See validation/checklist.md, validation/reconciliation-plan.md and validation/test-plan.md. Record evidence for every item; a checklist without evidence is not complete.\n\n## Human approval gates\n\n${a.decisions.filter((d) => d.humanApprovalRequired).map((d) => `- [ ] ${d.displayName}: approval recorded before execution`).join("\n") || "- none"}\n`;
  const roll = head("Rollback runbook") + `## Principle\n\nThe source remains authoritative until cutover sign-off. Rollback = revert DNS/connection strings and resume writes on the source.\n\n## Per-resource rollback\n\n${decisions.map((d) => `- **${d.displayName}**: ${d.rollbackMethod.join("; ") || "source retained; re-point consumers to source"}`).join("\n")}\n\n## Decommissioning\n\nSource deletion is a separate, approved, irreversible change scheduled only after the retention period. **Never part of cutover.**\n`;
  return { "pre-migration.md": pre, "migration.md": mig, "cutover.md": cut, "validation.md": val, "rollback.md": roll };
}

function stepFor(d: ResourceDecisionRecord): string {
  switch (d.recommendedTool) {
    case "arm-move": return "validate move (POST validateMoveResources) then move to destination resource group/subscription";
    case "azure-resource-mover": return "add to Resource Mover move collection → prepare → initiate move → commit after validation";
    case "azcopy": return "create destination account (terraform) → azcopy sync passes → freeze → final sync → reconcile";
    case "azure-storage-mover": return "define Storage Mover project/job → initial copy → incremental → cutover";
    case "geo-replication": case "failover-group": return "create geo-secondary / failover group → wait for seeding → planned failover at cutover";
    case "export-and-import": return "export (BACPAC/snapshot/records) → import into destination → verify counts";
    case "backup-and-restore": return "backup source → restore to destination → verify inventory";
    case "native-database-replication": return "create cross-region replica → monitor lag → promote at cutover";
    case "container-image-copy": return "create registry → az acr import per repository/tag → verify manifest digests";
    case "service-specific-migration": return "follow service-native relocation (e.g. Cosmos DB add region → change write region → remove source)";
    case "application-deployment": case "slot-deployment": return "create app/plan → deploy from pipeline → bind domains/certs → swap";
    case "terraform-redeploy": return "terraform plan/apply the generated module → reconstruct configuration → rebind identities";
    case "manual-reconstruction": return "reconstruct manually per rule notes; record evidence";
    default: return "requires validation before scheduling";
  }
}

export function generateScripts(a: Assessment): Record<string, string> {
  const stamp = `# Generated ${a.createdAt} by Azure Migration Orchestrator ${a.applicationVersion}${a.edition === "demo" ? " — DEMO, NOT FOR PRODUCTION" : ""}. Rules ${a.rulesVersion}.`;
  const moves = a.decisions.filter((d) => d.recommendedTool === "arm-move" && d.resourceId);
  const ps = `${stamp}
<#
.SYNOPSIS
  Validate and (optionally) perform ARM resource moves for this assessment.
.DESCRIPTION
  Dry-run by default: runs Invoke-AzResourceAction validateMoveResources only.
  Pass -Execute to perform Move-AzResource. Requires an authenticated Az session (Connect-AzAccount).
  No credentials are embedded. Destructive/irreversible operations require explicit approval (§12.19).
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory)] [string] $DestinationResourceGroupId,
  [switch] $Execute
)
$ErrorActionPreference = 'Stop'
$correlation = [guid]::NewGuid().ToString()
function Write-Log { param($Level, $Message) Write-Output (@{ ts = (Get-Date).ToString('o'); level = $Level; correlation = $correlation; message = $Message } | ConvertTo-Json -Compress) }
$ctx = Get-AzContext
if (-not $ctx) { Write-Log 'error' 'No Azure context. Run Connect-AzAccount.'; exit 2 }
Write-Log 'info' "Context: subscription $($ctx.Subscription.Id)"
if ($DestinationResourceGroupId -notmatch '^/subscriptions/[0-9a-f-]{36}/resourceGroups/[^/]+$') { Write-Log 'error' 'DestinationResourceGroupId must be a resource group ID'; exit 2 }
$resourceIds = @(
${moves.map((d) => `  '${d.resourceId}'  # ${d.displayName} (${d.resourceType})`).join("\n") || "  # no ARM-move candidates in this assessment"}
)
if ($resourceIds.Count -eq 0) { Write-Log 'info' 'Nothing to move.'; exit 0 }
$sourceRg = ($resourceIds[0] -split '/providers/')[0]
Write-Log 'info' "Validating move of $($resourceIds.Count) resources from $sourceRg"
$body = @{ resources = $resourceIds; targetResourceGroup = $DestinationResourceGroupId }
try {
  Invoke-AzResourceAction -ResourceId $sourceRg -Action 'validateMoveResources' -Parameters $body -Force -ApiVersion '2021-04-01' | Out-Null
  Write-Log 'info' 'validateMoveResources accepted'
} catch { Write-Log 'error' "validateMoveResources failed: $($_.Exception.Message)"; exit 1 }
if (-not $Execute) { Write-Log 'info' 'Dry run complete. Re-run with -Execute after approval.'; exit 0 }
if ($PSCmdlet.ShouldProcess($DestinationResourceGroupId, 'Move-AzResource')) {
  Move-AzResource -DestinationResourceGroupName ($DestinationResourceGroupId -split '/')[-1] -ResourceId $resourceIds -Force
  Write-Log 'info' 'Move completed; run validation runbook'
}
`;
  const cli = `#!/usr/bin/env bash
${stamp}
# Dry-run by default. Set EXECUTE=1 to perform actions. Requires 'az login'. No secrets embedded.
set -euo pipefail
CORRELATION="$(uuidgen 2>/dev/null || date +%s)"
log() { printf '{"ts":"%s","level":"%s","correlation":"%s","message":"%s"}\\n' "$(date -u +%FT%TZ)" "$1" "$CORRELATION" "$2"; }
az account show >/dev/null 2>&1 || { log error "not logged in: run az login"; exit 2; }
DEST_RG="\${DEST_RG:?set DEST_RG to the destination resource group name}"
LOCATION="${a.intent.destinationRegion ?? "${LOCATION:?set LOCATION}"}"
EXECUTE="\${EXECUTE:-0}"
run() { if [ "$EXECUTE" = "1" ]; then "$@"; else log info "DRY-RUN: $*"; fi; }

log info "ensure destination resource group"
run az group create --name "$DEST_RG" --location "$LOCATION" --output none
${a.decisions.filter((d) => d.recommendedTool === "container-image-copy").map((d) => `
log info "import images for ${shell(d.displayName)} (list repositories first: az acr repository list --name ${shell(d.displayName)})"
# for repo in $(az acr repository list --name ${shell(d.displayName)} -o tsv); do run az acr import --name "<destination-registry>" --source "${shell(d.displayName)}.azurecr.io/$repo" --image "$repo"; done`).join("")}
${a.decisions.filter((d) => d.recommendedTool === "azcopy").map((d) => `
log info "storage data copy for ${shell(d.displayName)} — use AzCopy with Entra auth (azcopy login), never account keys in scripts"
# run azcopy sync "https://${shell(d.displayName).toLowerCase()}.blob.core.windows.net/" "https://<destination-account>.blob.core.windows.net/" --recursive`).join("")}
${a.decisions.filter((d) => d.recommendedTool === "service-specific-migration" && /documentdb/i.test(d.resourceType)).map((d) => `
log info "Cosmos DB region change for ${shell(d.displayName)}"
# run az cosmosdb update --name ${shell(d.displayName)} --resource-group "<source-rg>" --locations regionName="$LOCATION" failoverPriority=0 isZoneRedundant=false`).join("")}
log info "done (EXECUTE=$EXECUTE)"
`;
  return { "powershell/Invoke-ArmMove.ps1": ps, "azure-cli/migrate.sh": cli, "README.md": `# Scripts\n\nAll scripts are dry-run by default, parameterized, log structured JSON with a correlation ID, return non-zero on failed validation, and contain no credentials. Destructive operations require explicit approval.${a.edition === "demo" ? "\n\n**DEMO — NOT FOR PRODUCTION.**" : ""}\n` };
}
