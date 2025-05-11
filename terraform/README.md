# Lab User Provisioning with Terraform

This directory contains Terraform configurations for provisioning and managing temporary lab users across multiple AWS accounts.

## Overview

The infrastructure is organized to manage users across two AWS accounts:

- **Account 1**: First lab environment (ID: 124744987862)
- **Account 2**: Second lab environment (ID: 104023954744)

When a user initiates a lab session:
1. If no active sessions exist, the user is assigned to Account 1
2. If Account 1 is in use but Account 2 is available, the user is assigned to Account 2
3. If both accounts are in use, the user receives a "please wait, server is busy" message

## Directory Structure

```
terraform/
├── account1/         # IAM user configuration for AWS Account 1
├── account2/         # IAM user configuration for AWS Account 2
├── main.tf           # Main configuration file
├── variables.tf      # Variable definitions
├── outputs.tf        # Output definitions
└── README.md         # Documentation
```

## What This Terraform Creates

This Terraform configuration focuses on creating and managing:

1. IAM users with console access (LabUser1 and LabUser2)
2. Temporary passwords for these users
3. Basic IAM policies with minimal permissions
4. Outputs for username, account ID, and generated passwords

## Prerequisites

- Terraform (v1.2.0 or newer)
- AWS CLI configured with appropriate credentials
- Access to target AWS accounts

## Usage

1. Initialize Terraform:
   ```
   terraform init
   ```

2. Plan the changes:
   ```
   terraform plan
   ```

3. Apply the changes:
   ```
   terraform apply
   ```

4. To get the credentials:
   ```
   terraform output -json account1_credentials
   terraform output -json account2_credentials
   ```

5. To destroy the infrastructure:
   ```
   terraform destroy
   ```

## Notes

- The temporary credentials allow for AWS console login
- Passwords are auto-generated with AWS-compliant complexity
- The credentials will be passed to the application to assign to users based on availability
- No additional AWS resources (S3, EC2, VPC) are provisioned 