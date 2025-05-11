# Account 2 Terraform Configuration

provider "aws" {
  region = var.aws_region
}

# Variables for Account 2
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
}

variable "account_id" {
  description = "AWS Account ID"
  type        = string
}

variable "lab_user_name" {
  description = "Username for lab user"
  type        = string
  default     = "LabUser2"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "lab_user_password" {
  description = "Password for lab user"
  type        = string
  default     = "Lab@User456"
}

# Create IAM user for lab access
resource "aws_iam_user" "lab_user" {
  name = var.lab_user_name
  path = "/lab-users/"
  
  tags = {
    Environment = var.environment
    Purpose     = "Lab Access"
    ManagedBy   = "Terraform"
  }
}

# Create access key for programmatic access
resource "aws_iam_access_key" "lab_user_key" {
  user = aws_iam_user.lab_user.name
}

# Create basic lab policy for permissions
resource "aws_iam_policy" "lab_policy" {
  name        = "${var.lab_user_name}Policy"
  description = "Policy for lab user ${var.lab_user_name}"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:ListAllMyBuckets",
          "ec2:DescribeInstances",
          "ec2:DescribeImages",
          "ec2:DescribeTags",
          "ec2:DescribeSnapshots"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# Attach policy to lab user
resource "aws_iam_user_policy_attachment" "lab_user_policy_attachment" {
  user       = aws_iam_user.lab_user.name
  policy_arn = aws_iam_policy.lab_policy.arn
}

# Store lab user login profile (password) for console access
resource "aws_iam_user_login_profile" "lab_user_login" {
  user                    = aws_iam_user.lab_user.name
  password_reset_required = false
  pgp_key                 = null
  
  # Set fixed password directly
  password                = var.lab_user_password

  lifecycle {
    ignore_changes = [password_length, pgp_key]
  }
}

# Outputs for the module
output "account_details" {
  description = "Account configuration details"
  value = {
    account_id       = var.account_id
    region           = var.aws_region
    username         = aws_iam_user.lab_user.name
    access_key       = aws_iam_access_key.lab_user_key.id
    secret_key       = aws_iam_access_key.lab_user_key.secret
    console_password = aws_iam_user_login_profile.lab_user_login.password
  }
  sensitive = true
} 