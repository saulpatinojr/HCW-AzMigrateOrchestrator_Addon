/**
 * Argument validation of generated Terraform against a provider schema (ADR-0020).
 * Sources: (a) a `terraform providers schema -json` file, (b) the Terraform MCP server's `get_provider_details`
 * (adapter interface only — the lab has no network). The generator emits an argument manifest; `checkArguments`
 * compares it with whichever schema source is available.
 */
export interface ArgumentManifest {
  provider: string;
  providerVersionConstraint: string;
  resources: Record<string, string[]>; // terraform resource type → arguments used (top-level + nested block names)
}

export interface ProviderSchemaSource {
  readonly name: string;
  /** Returns the set of valid top-level attributes/blocks for a resource type, or null if the type is unknown. */
  argumentsFor(resourceType: string): Promise<Set<string> | null>;
}

export interface ArgumentIssue {
  resourceType: string;
  argument: string;
  problem: "unknown-resource-type" | "unknown-argument";
}

/** Parse `terraform providers schema -json` output for one provider. */
export class FileSchemaSource implements ProviderSchemaSource {
  readonly name = "terraform-providers-schema-json";
  private readonly schemas: Record<string, { block: { attributes?: Record<string, unknown>; block_types?: Record<string, unknown> } }>;
  constructor(schemaJson: unknown, providerAddress = "registry.terraform.io/hashicorp/azurerm") {
    const root = schemaJson as { provider_schemas?: Record<string, { resource_schemas?: Record<string, never> }> };
    this.schemas = (root.provider_schemas?.[providerAddress]?.resource_schemas ?? {}) as typeof this.schemas;
  }
  async argumentsFor(resourceType: string): Promise<Set<string> | null> {
    const s = this.schemas[resourceType];
    if (!s) return null;
    return new Set([...Object.keys(s.block.attributes ?? {}), ...Object.keys(s.block.block_types ?? {})]);
  }
}

/** Terraform MCP adapter: the caller supplies a function that invokes `get_provider_details` and returns the markdown/JSON doc. */
export class McpSchemaSource implements ProviderSchemaSource {
  readonly name = "terraform-mcp-server";
  constructor(private readonly getDoc: (resourceType: string) => Promise<string | null>) {}
  async argumentsFor(resourceType: string): Promise<Set<string> | null> {
    const doc = await this.getDoc(resourceType);
    if (!doc) return null;
    // Provider docs list arguments as "* `name` -" or "- `name` -"; blocks are documented the same way.
    const args = new Set<string>();
    for (const m of doc.matchAll(/^[*-]\s+`([a-z0-9_]+)`\s+[-–—(]/gm)) args.add(m[1]);
    return args.size ? args : null;
  }
}

export function buildArgumentManifest(files: Record<string, string>): ArgumentManifest {
  const resources: Record<string, Set<string>> = {};
  for (const [path, content] of Object.entries(files)) {
    if (!path.endsWith(".tf") || path.includes("hcp/") || path.includes("state-impact/")) continue;
    for (const block of content.matchAll(/resource\s+"([a-z0-9_]+)"\s+"[^"]+"\s*\{([\s\S]*?)\n\}/g)) {
      const type = block[1];
      resources[type] ??= new Set();
      for (const arg of block[2].matchAll(/^\s{2}([a-z0-9_]+)\s*(=|\{)/gm)) resources[type].add(arg[1]);
    }
  }
  return { provider: "hashicorp/azurerm", providerVersionConstraint: "~> 4.0", resources: Object.fromEntries(Object.entries(resources).map(([k, v]) => [k, [...v].sort()])) };
}

export async function checkArguments(manifest: ArgumentManifest, source: ProviderSchemaSource): Promise<ArgumentIssue[]> {
  const issues: ArgumentIssue[] = [];
  for (const [type, args] of Object.entries(manifest.resources)) {
    const valid = await source.argumentsFor(type);
    if (!valid) { issues.push({ resourceType: type, argument: "*", problem: "unknown-resource-type" }); continue; }
    for (const a of args) if (!valid.has(a)) issues.push({ resourceType: type, argument: a, problem: "unknown-argument" });
  }
  return issues;
}
