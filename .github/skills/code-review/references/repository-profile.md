# HybridCloudWorks repository profile

Use this profile only when the repository matches the HybridCloudWorks layout described below. Otherwise apply the generic GitHub review workflow and repository-local instructions instead.

## Component routing

| Touched path | Component | Read |
| --- | --- | --- |
| `frontend/**` | React/Vite public + admin frontend | `frontend.md` |
| `functions/**` | Azure Functions Node API/workers | `functions.md` |
| `infra/**` | Terraform live production estate | `infra.md` |
| `scripts/**`, `.github/workflows/**` | operational scripts and CI/CD | `scripts-workflows.md` |
| `vps-agent/**`, `edge/**` | VPS job executor and edge availability probe | `agents-edge.md` |

Exception: when frontend code adds or changes an API call, also read `functions.md` to verify the contract even if `functions/**` is untouched.

## Cross-cutting rules

- Never expose credentials, connection strings, tokens, Cosmos keys, or real tfvars values. Treat values in Git history as disclosed and subject to rotation.
- `VITE_*` values are public bundle inputs; only public identifiers/scopes/URLs belong there.
- Keep telemetry content-free: correlation identifiers rather than paths, query strings, route values, document IDs, or payloads.
- Review new GitHub Actions, dependencies, and base images for repository pinning policy.
- Respect repository documentation placement and allowlists; narrative docs belong in `docs/`, open work in `TODO.md`, and completed work in `CHANGELOG.md`. If a change completes tracked work, check that tracking moved accordingly.
- Owner-facing pasteable instructions follow the repository contract: PowerShell by default, bash called out explicitly, one-line commands when practical, no unresolved placeholders in pasteable commands, prefer control-plane Azure CLI operations, avoid bracketed `az --query` expressions in owner instructions, and use exact browser URLs when the repository contract requires them.
- Treat changed tests as evidence of intended behavior, not proof. A behavior change with unchanged sibling tests is a review signal, not an automatic finding.
- Review `.github/` when the PR changes it or when workflow/configuration behavior is necessary to evaluate the code. This GitHub-specific pack does not globally exclude `.github/`.

## Verification discipline

Run only the component commands documented in the matching reference when the environment supports them. Report checks that could not run and why. Never substitute a different check and imply equivalence.

## PR-body checks

For a pull request, verify that the PR body records the checks actually run and that infrastructure-specific sections are completed or removed appropriately when the repository template requires them.
