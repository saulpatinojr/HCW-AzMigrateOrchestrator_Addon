output "api_hostname" {
  value = "${var.api_subdomain}.${var.zone_name}"
}
output "tunnel_token" {
  value       = cloudflare_zero_trust_tunnel_cloudflared.lab.tunnel_token
  sensitive   = true
  description = "TUNNEL_TOKEN for the cloudflared container on the VPS"
}
output "turnstile_site_key" {
  value       = cloudflare_turnstile_widget.upload.id
  description = "Public site key for the Turnstile widget in the content site"
}
output "turnstile_secret" {
  value       = cloudflare_turnstile_widget.upload.secret
  sensitive   = true
  description = "TURNSTILE_SECRET for lab-api"
}
