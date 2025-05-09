# terraform/account1/backend.tf

terraform {
  backend "s3" {
    bucket         = "data-vidya-terraform-bucket"
    key            = "account1/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "Data-vidya-lock-table"
    encrypt        = true
  }
}