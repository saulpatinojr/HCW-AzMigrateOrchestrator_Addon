# Migration Explorer — user guide

1. Export **All resources → Export to CSV** from the Azure portal (include the Resource ID column for best results), or download the sample.
2. Drop the file. You see a preview and warnings about missing columns.
3. Answer only the questions that matter to you; skipped ones become labelled assumptions.
4. Run. Progress shows what the engine is doing (no hidden reasoning).
5. Read the summary and disclaimers, filter the table, click a row for the full decision record (evidence, confidence
   rationale, missing information, cross-tenant implications).
6. Download the bundle (`assessment-<id>.zip`) or delete your data immediately. Data expires automatically after 2 hours.

What the demo cannot tell you: anything that depends on configuration not in the export — SKU details, network topology,
private endpoints, encryption, identities, RBAC, data size, backup state. Those appear under *Missing information* and
*requires authenticated validation*, which is what the enterprise edition is for.
