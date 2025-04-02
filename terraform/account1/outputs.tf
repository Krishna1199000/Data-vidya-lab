output "username" {
  description = "The IAM username created for the lab"
  value       = aws_iam_user.lab_user.name
}

output "password" {
  description = "The password for the IAM user"
  value       = aws_iam_user_login_profile.lab_user_login.password
  sensitive   = true
}

output "account_id" {
  description = "The AWS account ID"
  value       = var.account_id
}

output "access_key_id" {
  description = "Access key ID for the IAM user"
  value       = aws_iam_access_key.lab_user_keys.id
}

output "secret_access_key" {
  description = "Secret access key for the IAM user"
  value       = aws_iam_access_key.lab_user_keys.secret
  sensitive   = true
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket created for the lab"
  value       = aws_s3_bucket.lab_bucket.bucket
}

output "region" {
  description = "AWS region where resources were deployed"
  value       = var.region
}