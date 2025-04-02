variable "region" {
  description = "The AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "access_key" {
  description = "AWS access key for account 1"
  type        = string
  sensitive   = true
}

variable "secret_key" {
  description = "AWS secret key for account 1"
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "AWS account ID"
  type        = string
  default     = "124744987862"
}

variable "user_id" {
  description = "Unique identifier for the user (used in resource naming)"
  type        = string
}

variable "lab_id" {
  description = "ID of the lab"
  type        = string
}

variable "session_id" {
  description = "Unique session identifier"
  type        = string
}