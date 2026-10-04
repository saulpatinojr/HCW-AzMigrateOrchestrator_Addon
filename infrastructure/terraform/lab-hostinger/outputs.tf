output "public_ipv4" {
  value = hostinger_vps_virtual_machine.lab.ipv4_address
}
output "next_step" {
  value = "On the VPS, write TUNNEL_TOKEN and TURNSTILE_SECRET (from lab-cloudflare outputs) to /opt/amo/repo/.env, then: docker compose -f docker-compose.lab.yml up -d"
}
