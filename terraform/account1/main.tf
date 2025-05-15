terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  profile = "labuser1"
  region  = "ap-south-1"
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "random_password" "user_password" {
  length           = 16
  special          = true
  override_special = "!@#$%^&*"
  min_special      = 2
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
}

resource "aws_iam_user" "lab_user" {
  name = "student1-${random_string.suffix.result}"
  path = "/lab-users/"
  force_destroy = true
}

resource "aws_iam_user_login_profile" "lab_user_login" {
  user                    = aws_iam_user.lab_user.name
  password_reset_required = false
  password_length        = 20
}

resource "aws_iam_access_key" "lab_user_key" {
  user = aws_iam_user.lab_user.name
}

resource "aws_iam_user_policy" "lab_user_policy" {
  name = "lab_access"
  user = aws_iam_user.lab_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:",
          "iam:GetAccountPasswordPolicy",
          "iam:ChangePassword",
          "iam:GetUser"
        ]
        Resource = [
          aws_s3_bucket.lab_bucket.arn,
          "${aws_s3_bucket.lab_bucket.arn}/",
          "arn:aws:iam::*:user/$${aws:username}"
        ]
      }
    ]
  })
}

resource "aws_s3_bucket" "lab_bucket" {
  bucket = "lab1-${random_string.suffix.result}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "lab_bucket" {
  bucket = aws_s3_bucket.lab_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

output "user_name" {
  value = aws_iam_user.lab_user.name
}

output "access_key_id" {
  value = aws_iam_access_key.lab_user_key.id
}

output "secret_access_key" {
  value     = aws_iam_access_key.lab_user_key.secret
  sensitive = true
}

output "password" {
  value     = aws_iam_user_login_profile.lab_user_login.password
  sensitive = true
}

output "bucket_name" {
  value = aws_s3_bucket.lab_bucket.id
}