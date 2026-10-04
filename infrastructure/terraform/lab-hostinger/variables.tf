variable "hostname" {
  type    = string
  default = "amo-lab-01"
}
variable "plan" {
  type        = string
  description = "Hostinger VPS plan identifier. Sized for Coder from day one (KVM 4) per owner decision."
  default     = "hostingercom-vps-kvm4-usd-1m"
}
variable "data_center_id" {
  type        = number
  description = "Hostinger data-center ID (GET /api/vps/v1/data-centers)."
}
variable "template_id" {
  type        = number
  description = "OS template ID for Ubuntu 24.04 + Docker (GET /api/vps/v1/templates)."
}
variable "ssh_public_key" {
  type        = string
  description = "Public key only; private keys never enter Terraform."
}
variable "operator_cidr" {
  type        = string
  description = "CIDR allowed to SSH. Nothing else is reachable inbound."
}
variable "image_ref" {
  type    = string
  default = "ghcr.io/saulpatinojr/azure-migration-orchestrator-lab:latest"
}
variable "repo_url" {
  type    = string
  default = "https://github.com/saulpatinojr/HCW-AzMigrateOrchestrator_Addon"
}
