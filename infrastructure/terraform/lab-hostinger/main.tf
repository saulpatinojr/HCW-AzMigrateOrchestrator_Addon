# Retired 2026-10-10: superseded by the website repository's `addons` Ansible role; not applied to the existing host. Kept only until the follow-up pull request deletes this directory.
# Lab VPS on Hostinger, provisioned with the Hostinger Terraform provider and configured with cloud-init.
# [VERIFY] Provider source/version and resource schema against https://registry.terraform.io/providers/hostinger/hostinger
# before first apply; `iac-validate.yml` runs `terraform init -backend=false`, which fails loudly if either is wrong.
terraform {
  required_version = ">= 1.9.0"
  required_providers {
    hostinger = {
      source  = "hostinger/hostinger"
      version = "~> 0.1"
    }
  }
}

# HOSTINGER_API_TOKEN from the environment (hPanel → API). Never in tfvars.
provider "hostinger" {}

locals {
  cloud_init = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    image_ref     = var.image_ref
    repo_url      = var.repo_url
    operator_cidr = var.operator_cidr
  })
}

resource "hostinger_vps_ssh_key" "ops" {
  name = "amo-lab-ops"
  key  = var.ssh_public_key
}

# Inbound: SSH only, from the operator CIDR. HTTP/HTTPS are NOT opened — Cloudflare Tunnel is outbound-only.
resource "hostinger_vps_firewall" "lab" {
  name = "amo-lab-firewall"
  rule {
    protocol  = "TCP"
    port      = "22"
    source    = "custom"
    source_ip = var.operator_cidr
    action    = "accept"
  }
}

resource "hostinger_vps_virtual_machine" "lab" {
  plan           = var.plan
  data_center_id = var.data_center_id
  template_id    = var.template_id
  hostname       = var.hostname
  ssh_key_ids    = [hostinger_vps_ssh_key.ops.id]
  user_data      = local.cloud_init
}

resource "hostinger_vps_firewall_activation" "lab" {
  firewall_id        = hostinger_vps_firewall.lab.id
  virtual_machine_id = hostinger_vps_virtual_machine.lab.id
}
