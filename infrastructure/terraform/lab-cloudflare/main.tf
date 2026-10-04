# Cloudflare edge for the lab: Tunnel, DNS, WAF, rate limiting, Turnstile. Zero inbound ports on the VPS (ADR-0019).
terraform {
  required_version = ">= 1.9.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.52"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# CLOUDFLARE_API_TOKEN from the environment, scoped to: Zone DNS edit, Zone WAF edit, Account Tunnel edit, Account Turnstile edit.
provider "cloudflare" {}

data "cloudflare_zone" "site" {
  name = var.zone_name
}

resource "random_bytes" "tunnel_secret" {
  length = 32
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "lab" {
  account_id = var.account_id
  name       = "amo-lab"
  secret     = random_bytes.tunnel_secret.base64
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "lab" {
  account_id = var.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.lab.id
  config {
    ingress_rule {
      hostname = "${var.api_subdomain}.${var.zone_name}"
      service  = "http://lab-api:8080" # service name inside docker-compose.lab.yml
    }
    ingress_rule {
      service = "http_status:404"
    }
  }
}

resource "cloudflare_record" "api" {
  zone_id = data.cloudflare_zone.site.id
  name    = var.api_subdomain
  type    = "CNAME"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.lab.id}.cfargotunnel.com"
  proxied = true
  comment = "Lab API via Cloudflare Tunnel (Terraform-managed)"
}

# Rate-limit assessment creation: the only expensive, user-triggered path.
resource "cloudflare_ruleset" "rate_limit" {
  zone_id = data.cloudflare_zone.site.id
  name    = "amo-lab-rate-limit"
  kind    = "zone"
  phase   = "http_ratelimit"
  rules {
    action      = "block"
    description = "Limit assessment creation per client IP"
    expression  = "(http.host eq \"${var.api_subdomain}.${var.zone_name}\" and http.request.uri.path eq \"/api/assessments\" and http.request.method eq \"POST\")"
    enabled     = true
    ratelimit {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 60
      requests_per_period = var.assessments_per_minute
      mitigation_timeout  = 600
    }
  }
}

# Cloudflare managed WAF on the API host.
resource "cloudflare_ruleset" "waf" {
  zone_id = data.cloudflare_zone.site.id
  name    = "amo-lab-waf"
  kind    = "zone"
  phase   = "http_request_firewall_managed"
  rules {
    action      = "execute"
    description = "Cloudflare Managed Ruleset on the lab API"
    expression  = "(http.host eq \"${var.api_subdomain}.${var.zone_name}\")"
    enabled     = true
    action_parameters {
      id = "efb7b8c949ac4650a09736fc376e9aee" # Cloudflare Managed Ruleset
    }
  }
}

# Turnstile widget rendered by the content site on the upload step; the secret is verified by lab-api.
resource "cloudflare_turnstile_widget" "upload" {
  account_id = var.account_id
  name       = "amo-lab-upload"
  domains    = concat([var.zone_name, "www.${var.zone_name}"], var.extra_turnstile_domains)
  mode       = "managed"
}
