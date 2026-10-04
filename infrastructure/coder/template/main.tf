# Coder template: per-user, time-limited Docker workspace preloaded with one assessment bundle.
# Security: no privileged mode, no Docker socket in the workspace, no enterprise network, no production credentials.
terraform {
  required_providers {
    coder  = { source = "coder/coder", version = "~> 2.4" }
    docker = { source = "kreuzwerker/docker", version = "~> 3.0" }
  }
}

variable "workspace_image" {
  type        = string
  description = "Lab workspace image (code-server, terraform, pwsh, az cli; no credentials)"
  default     = "ghcr.io/saulpatinojr/azure-migration-orchestrator-lab-workspace:latest"
}

data "coder_workspace" "me" {}
data "coder_workspace_owner" "me" {}

data "coder_parameter" "assessment_id" {
  name         = "assessment_id"
  display_name = "Assessment ID"
  type         = "string"
  mutable      = false
  validation {
    regex = "^[0-9a-f-]{36}$"
    error = "must be an assessment UUID"
  }
}

data "coder_parameter" "bundle_token" {
  name         = "bundle_token"
  display_name = "One-time bundle token"
  type         = "string"
  mutable      = false
  ephemeral    = true
}

data "coder_parameter" "api_base_url" {
  name         = "api_base_url"
  display_name = "Lab API base URL"
  type         = "string"
  mutable      = false
  default      = "https://labs-api.hybridcloudworks.com"
}

resource "coder_agent" "main" {
  arch           = "amd64"
  os             = "linux"
  startup_script = <<-EOT
    set -eu
    mkdir -p ~/assessment && cd ~/assessment
    curl -fsSL -H "x-bundle-token: ${data.coder_parameter.bundle_token.value}" \
      "${data.coder_parameter.api_base_url.value}/api/assessments/${data.coder_parameter.assessment_id.value}/bundle.zip" -o bundle.zip
    unzip -o bundle.zip && rm bundle.zip
    cat > ~/assessment/START-HERE.md <<'MD'
    # Guided inspection lab
    1. Read DEMO-NOT-FOR-PRODUCTION.md.
    2. reports/executive-summary.md → engineering-assessment.md.
    3. terraform/: run `terraform init -backend=false && terraform validate` (no cloud access here).
    4. scripts/: read the dry-run scaffolding; nothing here can reach Azure (no credentials in this workspace).
    5. terraform/state-impact/: see how an ARM move would affect Terraform state.
    5. runbooks/ and validation/: adapt to your own environment.
    MD
    code-server --auth none --port 13337 ~/assessment >/tmp/code-server.log 2>&1 &
  EOT
  metadata {
    display_name = "CPU"
    key          = "cpu"
    script       = "coder stat cpu"
    interval     = 10
    timeout      = 1
  }
}

resource "coder_app" "code" {
  agent_id     = coder_agent.main.id
  slug         = "code"
  display_name = "VS Code"
  url          = "http://localhost:13337/?folder=/home/coder/assessment"
  icon         = "/icon/code.svg"
  subdomain    = false
  share        = "owner"
}

resource "docker_image" "workspace" {
  name = var.workspace_image
}

resource "docker_container" "workspace" {
  count        = data.coder_workspace.me.start_count
  image        = docker_image.workspace.image_id
  name         = "coder-${data.coder_workspace_owner.me.name}-${lower(data.coder_workspace.me.name)}"
  hostname     = data.coder_workspace.me.name
  command      = ["sh", "-c", coder_agent.main.init_script]
  env          = ["CODER_AGENT_TOKEN=${coder_agent.main.token}"]
  privileged   = false
  memory       = 2048
  cpu_shares   = 512
  network_mode = "bridge"
  host {
    host = "host.docker.internal"
    ip   = "host-gateway"
  }
  # No volumes: the workspace is disposable; artifacts are re-downloadable while the assessment lives.
}
