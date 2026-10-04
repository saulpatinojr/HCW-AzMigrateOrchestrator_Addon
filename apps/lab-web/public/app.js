/* Hybrid Cloud Works Migration Explorer — vanilla JS client. No frameworks, no storage, no analytics. */
(() => {
  const $ = (s) => document.querySelector(s);
  const state = { csv: null, fileName: null, assessment: null, files: [], id: null, token: null, expiresAt: null };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // --- upload ---
  const drop = $("#drop");
  const readFile = (f) => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) return alert("Please choose a .csv file.");
    if (f.size > 5 * 1024 * 1024) return alert("File exceeds the 5 MB demo limit.");
    const r = new FileReader();
    r.onload = () => { state.csv = r.result; state.fileName = f.name.replace(/[^\w .()-]/g, "_"); preview(); };
    r.readAsText(f);
  };
  $("#file").addEventListener("change", (e) => readFile(e.target.files[0]));
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => readFile(e.dataTransfer.files[0]));
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") $("#file").click(); });

  function preview() {
    const lines = state.csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
    const delim = [",", ";", "\t"].sort((a, b) => lines[0].split(b).length - lines[0].split(a).length)[0];
    const cells = (l) => l.split(delim).slice(0, 8);
    const header = cells(lines[0]);
    const rows = lines.slice(1, 6).map(cells);
    $("#preview-table").innerHTML = `<thead><tr>${header.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c.replace(/^"|"$/g, ""))}</td>`).join("")}</tr>`).join("")}</tbody>`;
    $("#preview-meta").textContent = `${state.fileName}: ${lines.length - 1} data rows, ${header.length} columns (showing up to 5 rows / 8 columns).`;
    const low = header.map((h) => h.toLowerCase().replace(/^"|"$/g, "").trim());
    const warn = [];
    if (!low.some((h) => h === "name")) warn.push("No NAME column found — the assessment will be rejected.");
    if (!low.some((h) => h === "type" || h === "resource type")) warn.push("No TYPE column found — the assessment will be rejected.");
    if (!low.some((h) => h.includes("resource id") || h === "id")) warn.push("No RESOURCE ID column: parent/child relationships cannot be discovered. Re-export with the Resource ID column for better results.");
    $("#preview-warnings").textContent = warn.join("\n");
    $("#preview").hidden = false;
    $("#step-questions").hidden = false;
    $("#step-questions").scrollIntoView({ behavior: "smooth" });
  }

  // --- questionnaire → intent ---
  function intent() {
    const fd = new FormData($("#questions"));
    const out = {};
    for (const [k, v] of fd.entries()) {
      if (v === "" || v === null) continue;
      if (/^(true|false)$/.test(v)) out[k] = v === "true";
      else if (k === "rtoHours" || k === "rpoMinutes") out[k] = Number(v);
      else out[k] = v;
    }
    out.includeDataMigrationExamples = fd.get("includeDataMigrationExamples") === "on";
    return out;
  }

  // --- run ---
  $("#run").addEventListener("click", async () => {
    if (!state.csv) return alert("Upload a CSV first.");
    $("#step-progress").hidden = false;
    const list = $("#progress");
    list.innerHTML = ["Normalizing resource inventory", "Matching resource types to migration rules", "Separating infrastructure and data paths", "Identifying missing information", "Preparing example Terraform", "Building validation guidance"].map((m) => `<li>${m}</li>`).join("");
    let i = 0;
    const tick = setInterval(() => { if (i < list.children.length) list.children[i++].classList.add("done"); }, 350);
    try {
      const res = await fetch("/api/assessments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ csv: state.csv, fileName: state.fileName, intent: intent() }) });
      const body = await res.json();
      clearInterval(tick);
      if (!res.ok) { [...list.children].forEach((li) => li.classList.add("fail")); return alert(`Assessment failed: ${body.error?.message ?? res.status}${body.error?.details?.warnings ? "\n" + body.error.details.warnings.join("\n") : ""}`); }
      [...list.children].forEach((li) => li.classList.add("done"));
      state.id = body.assessmentId; state.token = body.ownerToken; state.expiresAt = body.expiresAt;
      const full = await (await fetch(`/api/assessments/${state.id}`, { headers: { "x-owner-token": state.token } })).json();
      state.assessment = full.assessment; state.files = full.files;
      render();
    } catch (e) { clearInterval(tick); alert("Network error: " + e.message); }
  });

  // --- render ---
  function render() {
    const a = state.assessment, s = a.summary;
    $("#step-results").hidden = false;
    $("#summary").innerHTML = [["Resources", s.resourceCount], ["Need validation", s.unknownCount], ["Complexity", s.complexityBand], ["Confidence (high/med/low)", `${s.confidenceTotals.high}/${s.confidenceTotals.medium}/${s.confidenceTotals.low}`], ...Object.entries(s.dispositionTotals).filter(([, n]) => n).map(([k, n]) => [k, n])].map(([k, v]) => `<div class="kpi"><b>${esc(v)}</b>${esc(k)}</div>`).join("");
    $("#disclaimers").innerHTML = s.disclaimers.map((d) => `<p>${esc(d)}</p>`).join("") + (s.keyBlockers.length ? `<p><strong>Key blockers:</strong> ${s.keyBlockers.map(esc).join(" · ")}</p>` : "");
    $("#expires").textContent = `Data expires ${new Date(state.expiresAt).toLocaleString()}.`;
    const dl = $("#dl-zip");
    dl.onclick = async (e) => {
      e.preventDefault();
      const r = await fetch(`/api/assessments/${state.id}/bundle.zip`, { headers: { "x-owner-token": state.token } });
      const blob = await r.blob(); const u = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: u, download: `assessment-${state.id.slice(0, 8)}.zip` }).click(); URL.revokeObjectURL(u);
    };
    const fd = $("#f-disposition"); fd.innerHTML = '<option value="">All dispositions</option>' + Object.keys(s.dispositionTotals).filter((k) => s.dispositionTotals[k]).map((k) => `<option>${k}</option>`).join("");
    ["#search", "#f-disposition", "#f-confidence"].forEach((sel) => $(sel).addEventListener("input", table));
    table();
    $("#waves").innerHTML = a.wavePlan.waves.map((w) => `<details><summary><strong>Wave ${w.number}: ${esc(w.name)}</strong> — ${w.resourceKeys.length} resources</summary><p class="muted small">${esc(w.rationale)}</p><p><strong>Entry:</strong> ${w.entryCriteria.map(esc).join("; ")}<br><strong>Exit:</strong> ${w.exitCriteria.map(esc).join("; ")}</p><ul>${w.resourceKeys.map((k) => `<li>${esc(a.decisions.find((d) => d.resourceKey === k)?.displayName ?? k)}</li>`).join("")}</ul></details>`).join("") + `<p class="muted small">${a.wavePlan.notes.map(esc).join(" ")}</p>`;
    const freq = {}; a.decisions.forEach((d) => d.missingInformation.forEach((m) => (freq[m] = (freq[m] || 0) + 1)));
    $("#missing").innerHTML = `<ul>${Object.entries(freq).sort((x, y) => y[1] - x[1]).map(([m, n]) => `<li>${esc(m)} <span class="pill">${n}</span></li>`).join("")}</ul>`;
    const tabs = $("#file-tabs");
    const show = ["terraform/main.tf", "scripts/powershell/Invoke-ArmMove.ps1", "scripts/azure-cli/migrate.sh", "terraform/state-impact/README.md", "runbooks/migration.md", "validation/checklist.md", "reports/executive-summary.md", "DEMO-NOT-FOR-PRODUCTION.md"].filter((f) => state.files.includes(f));
    tabs.innerHTML = show.map((f) => `<button data-f="${esc(f)}">${esc(f)}</button>`).join("");
    tabs.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => openFile(b.dataset.f)));
    if (show[0]) openFile(show[0]);
    $("#delete").onclick = async () => {
      if (!confirm("Delete this assessment and its data now?")) return;
      await fetch(`/api/assessments/${state.id}`, { method: "DELETE", headers: { "x-owner-token": state.token } });
      state.assessment = null; $("#step-results").hidden = true; $("#step-progress").hidden = true; alert("Deleted.");
    };
    $("#step-results").scrollIntoView({ behavior: "smooth" });
  }
  async function openFile(f) {
    document.querySelectorAll("#file-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.f === f));
    const r = await fetch(`/api/assessments/${state.id}/files/${encodeURIComponent(f)}`, { headers: { "x-owner-token": state.token } });
    $("#file-view").textContent = await r.text();
  }
  function table() {
    const q = $("#search").value.toLowerCase(), fdv = $("#f-disposition").value, fc = $("#f-confidence").value;
    const rows = state.assessment.decisions.filter((d) => (!q || d.displayName.toLowerCase().includes(q) || d.resourceType.toLowerCase().includes(q)) && (!fdv || d.disposition === fdv) && (!fc || d.confidence.band === fc));
    $("#decisions tbody").innerHTML = rows.map((d) => `<tr data-k="${esc(d.resourceKey)}"><td>${esc(d.displayName)}</td><td class="muted">${esc(d.resourceType)}</td><td>${esc(d.disposition)}</td><td>${esc(d.infrastructureDisposition)}</td><td>${esc(d.dataDisposition)}</td><td>${esc(d.recommendedTool)}</td><td><span class="pill ${d.confidence.band}">${d.confidence.band} ${d.confidence.score}</span></td></tr>`).join("");
    $("#decisions tbody").querySelectorAll("tr").forEach((tr) => tr.addEventListener("click", () => detail(tr.dataset.k)));
  }
  function detail(k) {
    const d = state.assessment.decisions.find((x) => x.resourceKey === k);
    const list = (t, items) => (items && items.length ? `<dt>${t}</dt><dd><ul>${items.map((i) => `<li>${esc(typeof i === "string" ? i : `[${i.state}] ${i.statement}${i.source ? ` (${i.source})` : ""}`)}</li>`).join("")}</ul></dd>` : "");
    $("#detail").hidden = false;
    $("#detail").innerHTML = `<h2>${esc(d.displayName)} <span class="pill ${d.confidence.band}">${d.confidence.band} ${d.confidence.score}</span></h2><div class="detail"><dl>
      <dt>Type</dt><dd>${esc(d.resourceType)} · ${esc(d.region ?? "unknown region")} · ${esc(d.resourceGroup ?? "")}</dd>
      <dt>Disposition</dt><dd><strong>${esc(d.disposition)}</strong> via <strong>${esc(d.recommendedTool)}</strong>${d.alternativeMethods.length ? ` (alternatives: ${d.alternativeMethods.map(esc).join(", ")})` : ""}</dd>
      <dt>Paths</dt><dd>infrastructure: ${esc(d.infrastructureDisposition)} · configuration: ${esc(d.configurationDisposition)} · identity: ${esc(d.identityDisposition)} · data: ${esc(d.dataDisposition)}</dd>
      <dt>Support</dt><dd>RG move ${esc(d.nativeMoveSupport)} · subscription move ${esc(d.crossSubscriptionSupport)} · region ${esc(d.regionalRelocationSupport)} · target region/SKU availability ${esc(d.targetRegionAvailability)}/${esc(d.targetSkuAvailability)}</dd>
      <dt>Downtime / RTO / RPO</dt><dd>${esc(d.expectedDowntime)} · ${esc(d.rtoCompatibility)} · ${esc(d.rpoCompatibility)}</dd>
      <dt>Why</dt><dd>${esc(d.reasonCodes.join(", "))} — ${esc(d.confidence.rationale.join("; "))}</dd>
      <dt>Rule</dt><dd>${esc(d.ruleId ?? "none")} v${esc(d.ruleVersion ?? "—")} · human approval ${d.humanApprovalRequired ? "required" : "not required"}</dd>
      ${list("Dependencies", d.dependencies.map((x) => `${x.relationship} → ${x.targetKey.split("/").pop()} [${x.origin}]`))}
      ${list("Prerequisites", d.prerequisites)}${list("Blockers", d.blockers)}${list("Risks", d.risks)}${list("Validation", d.validationMethod)}${list("Rollback", d.rollbackMethod)}
      ${list("Secondary actions", d.secondaryActions)}${list("Evidence", d.evidence)}${list("Assumptions", d.assumptions)}${list("Missing information", d.missingInformation)}
      ${d.tenantContext === "cross-tenant" ? list("Cross-tenant implications", d.crossTenantImplications) : ""}
    </dl></div>`;
    $("#detail").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
})();
