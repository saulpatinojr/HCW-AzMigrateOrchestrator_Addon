/** Partner showcase. Keep this list honest: every entry names what the provider actually does in the lab. */
export const PARTNERS = [
  { name: "Microsoft Azure", role: "Decision rules derive from Microsoft Learn move-support and relocation guidance; the appliance edition targets Azure.", url: "https://learn.microsoft.com/azure/azure-resource-manager/management/move-support-resources" },
  { name: "Hostinger", role: "Hosts the lab API on a KVM VPS provisioned with Terraform and run with Docker.", url: "https://www.hostinger.com/vps-hosting" },
  { name: "Cloudflare", role: "Tunnel, WAF, rate limiting and Turnstile protect the lab; no inbound ports on the VPS.", url: "https://www.cloudflare.com/" },
  { name: "HashiCorp Terraform", role: "Generated Terraform scaffolding and the lab's own infrastructure as code; HCP Terraform-ready output.", url: "https://developer.hashicorp.com/terraform" },
  { name: "GitHub", role: "Copilot code review, Actions CI, signed container images with provenance.", url: "https://github.com/" },
  { name: "Coder", role: "Browser workspaces for the guided inspection lab.", url: "https://coder.com/" },
  { name: "Docker", role: "Read-only, non-root, capability-less containers for the lab and the appliance.", url: "https://www.docker.com/" },
] as const;

export function PoweredBy({ compact = false }: { compact?: boolean }) {
  return (
    <aside aria-label="Powered by" className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-sm">
      <p className="mb-2 font-medium">Powered by</p>
      <ul className={compact ? "flex flex-wrap gap-x-4 gap-y-1" : "grid gap-2 sm:grid-cols-2"}>
        {PARTNERS.map((p) => (
          <li key={p.name}>
            <a className="font-medium underline-offset-2 hover:underline" href={p.url} rel="noopener noreferrer" target="_blank">{p.name}</a>
            {!compact && <span className="block text-slate-600 dark:text-slate-300">{p.role}</span>}
          </li>
        ))}
      </ul>
    </aside>
  );
}
