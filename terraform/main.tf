# Main Terraform configuration file for lab user management

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.2.0"
}

# Variables for configuration
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "account1_id" {
  description = "AWS Account 1 ID"
  type        = string
  default     = "124744987862"
}

variable "account2_id" {
  description = "AWS Account 2 ID"
  type        = string
  default     = "104023954744"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# Modules for each account
module "account1" {
  source = "./account1"
  
  aws_region     = var.aws_region
  account_id     = var.account1_id
  lab_user_name  = "LabUser1"
  environment    = var.environment
}

module "account2" {
  source = "./account2"
  
  aws_region     = var.aws_region
  account_id     = var.account2_id
  lab_user_name  = "LabUser2"
  environment    = var.environment
}

# Output the account configurations for reference
output "account1_details" {
  value = {
    account_id = module.account1.account_details.account_id
    username = module.account1.account_details.username
  }
}

output "account2_details" {
  value = {
    account_id = module.account2.account_details.account_id
    username = module.account2.account_details.username
  }
}

# Sensitive outputs
output "account1_credentials" {
  value = {
    username = module.account1.account_details.username
    password = module.account1.account_details.console_password
    account_id = module.account1.account_details.account_id
  }
  sensitive = true
}

output "account2_credentials" {
  value = {
    username = module.account2.account_details.username
    password = module.account2.account_details.console_password
    account_id = module.account2.account_details.account_id
  }
  sensitive = true
} 