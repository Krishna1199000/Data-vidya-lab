terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region     = var.region
  access_key = var.access_key
  secret_key = var.secret_key
}

# Generate a random password that meets AWS IAM requirements
resource "random_password" "user_password" {
  length           = 12
  special          = true
  override_special = "!@#$%^&*()_-+=<>?"
  min_upper        = 1
  min_lower        = 1
  min_numeric      = 1
  min_special      = 1
}

# Create IAM user for lab session
resource "aws_iam_user" "lab_user" {
  name = "lab-user-${var.user_id}"
  tags = {
    lab_id     = var.lab_id
    session_id = var.session_id
    created_at = timestamp()
  }
}

# Create login profile for console access
resource "aws_iam_user_login_profile" "lab_user_login" {
  user                    = aws_iam_user.lab_user.name
  password_reset_required = false
  password_length         = 16
}

# Create access keys for programmatic access
resource "aws_iam_access_key" "lab_user_keys" {
  user = aws_iam_user.lab_user.name
}

# Create a policy with required permissions
resource "aws_iam_policy" "lab_policy" {
  name        = "lab-policy-${var.user_id}"
  description = "Policy for lab user ${var.user_id}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:*",
          "ec2:*",
          "rds:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach policy to the user
resource "aws_iam_user_policy_attachment" "lab_policy_attachment" {
  user       = aws_iam_user.lab_user.name
  policy_arn = aws_iam_policy.lab_policy.arn
}

# Create S3 bucket for lab user
resource "aws_s3_bucket" "lab_bucket" {
  bucket = "lab-bucket-${var.account_id}-${var.user_id}"
  tags = {
    Name       = "Lab Bucket for ${var.user_id}"
    lab_id     = var.lab_id
    session_id = var.session_id
  }
}

# Block public access to the bucket
resource "aws_s3_bucket_public_access_block" "lab_bucket_public_access" {
  bucket = aws_s3_bucket.lab_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}