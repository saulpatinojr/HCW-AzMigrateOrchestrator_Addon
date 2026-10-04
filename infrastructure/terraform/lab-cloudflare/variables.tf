variable "account_id" {
  type = string
}
variable "zone_name" {
  type    = string
  default = "hybridcloudworks.com"
}
variable "api_subdomain" {
  type    = string
  default = "labs-api"
}
variable "assessments_per_minute" {
  type    = number
  default = 10
}
variable "extra_turnstile_domains" {
  type    = list(string)
  default = ["localhost"]
}
