import { useEffect, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";

export const SHOWCASE_FILES = ["terraform/main.tf", "terraform/state-impact/README.md", "terraform/hcp/workspace.tf", "scripts/powershell/Invoke-ArmMove.ps1", "scripts/azure-cli/migrate.sh", "runbooks/migration.md", "validation/checklist.md", "reports/executive-summary.md", "DEMO-NOT-FOR-PRODUCTION.md"];

export function GeneratedFiles({ files, load }: { files: string[]; load: (path: string) => Promise<string> }) {
  const show = SHOWCASE_FILES.filter((f) => files.includes(f));
  const [active, setActive] = useState(show[0] ?? "");
  const [content, setContent] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!active || content[active]) return;
    let cancelled = false;
    load(active).then((c) => { if (!cancelled) setContent((prev) => ({ ...prev, [active]: c })); }).catch((e: Error) => { if (!cancelled) setContent((prev) => ({ ...prev, [active]: `Could not load: ${e.message}` })); });
    return () => { cancelled = true; };
  }, [active, load, content]);
  if (!show.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Generated examples</h2>
      <p className="text-xs text-slate-500">Illustrative only — <strong>not for production</strong>. Every file is also in the bundle.</p>
      <Tabs.Root value={active} onValueChange={setActive}>
        <Tabs.List className="flex flex-wrap gap-1" aria-label="Generated files">
          {show.map((f) => <Tabs.Trigger key={f} value={f} className="rounded border px-2 py-1 text-xs data-[state=active]:bg-sky-700 data-[state=active]:text-white">{f}</Tabs.Trigger>)}
        </Tabs.List>
        {show.map((f) => <Tabs.Content key={f} value={f}><pre className="mt-2 max-h-[30rem] overflow-auto rounded-lg border bg-slate-50 dark:bg-slate-800 p-3 text-xs">{content[f] ?? "Loading…"}</pre></Tabs.Content>)}
      </Tabs.Root>
    </section>
  );
}
