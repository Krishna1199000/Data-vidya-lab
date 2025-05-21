terraform {
  backend "s3" {
    bucket         = "data-vidya-terraform-bucket"
    key            = "account2/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "terraform-state-locks"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  profile = "labuser2"
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
  name = "student2-${random_string.suffix.result}"
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

locals {
  # Define what permissions should be granted for each service
  service_permissions = {
    "S3" = [
      {
        Effect   = "Allow"
        Action   = ["s3:*"]
        Resource = ["*"]
      }
    ],
    "EC2" = [
      {
        Effect   = "Allow"
        Action   = ["ec2:*"]
        Resource = ["*"]
      }
    ],
    "Lambda" = [
      {
        Effect   = "Allow"
        Action   = ["lambda:*"]
        Resource = ["*"]
      }
    ],
    "RDS" = [
      {
        Effect   = "Allow"
        Action   = ["rds:*"]
        Resource = ["*"]
      }
    ],
    "DynamoDB" = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:*"]
        Resource = ["*"]
      }
    ],
    "SQS" = [
      {
        Effect   = "Allow"
        Action   = ["sqs:*"]
        Resource = ["*"]
      }
    ],
    "SNS" = [
      {
        Effect   = "Allow"
        Action   = ["sns:*"]
        Resource = ["*"]
      }
    ],
    "CloudWatch" = [
      {
        Effect   = "Allow"
        Action   = ["cloudwatch:*", "logs:*", "events:*"]
        Resource = ["*"]
      }
    ],
    "IAM" = [
      {
        Effect   = "Allow"
        Action   = ["iam:*"]
        Resource = ["*"]
      }
    ],
    "VPC" = [
      {
        Effect   = "Allow"
        Action   = ["ec2:*Vpc*", "ec2:*Subnet*", "ec2:*Gateway*", "ec2:*Route*", "ec2:*SecurityGroup*", "ec2:*NetworkAcl*", "ec2:*Address*"]
        Resource = ["*"]
      }
    ],
    "ECS" = [
      {
        Effect   = "Allow"
        Action   = ["ecs:*"]
        Resource = ["*"]
      }
    ],
    "EKS" = [
      {
        Effect   = "Allow"
        Action   = ["eks:*"]
        Resource = ["*"]
      }
    ],
    "CloudFormation" = [
      {
        Effect   = "Allow"
        Action   = ["cloudformation:*"]
        Resource = ["*"]
      }
    ],
    "Route 53" = [
      {
        Effect   = "Allow"
        Action   = ["route53:*"]
        Resource = ["*"]
      }
    ],
    "Elastic Beanstalk" = [
      {
        Effect   = "Allow"
        Action   = ["elasticbeanstalk:*"]
        Resource = ["*"]
      }
    ],
    "API Gateway" = [
      {
        Effect   = "Allow"
        Action   = ["apigateway:*"]
        Resource = ["*"]
      }
    ],
    "CloudFront" = [
      {
        Effect   = "Allow"
        Action   = ["cloudfront:*"]
        Resource = ["*"]
      }
    ],
    "Kinesis" = [
      {
        Effect   = "Allow"
        Action   = ["kinesis:*"]
        Resource = ["*"]
      }
    ],
    "Redshift" = [
      {
        Effect   = "Allow"
        Action   = ["redshift:*"]
        Resource = ["*"]
      }
    ],
    "ElastiCache" = [
      {
        Effect   = "Allow"
        Action   = ["elasticache:*"]
        Resource = ["*"]
      }
    ],
    "Athena" = [
      {
        Effect   = "Allow"
        Action   = ["athena:*"]
        Resource = ["*"]
      }
    ],
    "Glue" = [
      {
        Effect   = "Allow"
        Action   = ["glue:*"]
        Resource = ["*"]
      }
    ],
    "Step Functions" = [
      {
        Effect   = "Allow"
        Action   = ["states:*"]
        Resource = ["*"]
      }
    ],
    "Secrets Manager" = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:*"]
        Resource = ["*"]
      }
    ],
    "Certificate Manager" = [
      {
        Effect   = "Allow"
        Action   = ["acm:*"]
        Resource = ["*"]
      }
    ],
    "WAF" = [
      {
        Effect   = "Allow"
        Action   = ["waf:*", "wafv2:*"]
        Resource = ["*"]
      }
    ],
    "AppSync" = [
      {
        Effect   = "Allow"
        Action   = ["appsync:*"]
        Resource = ["*"]
      }
    ],
    "Cognito" = [
      {
        Effect   = "Allow"
        Action   = ["cognito-idp:*", "cognito-identity:*", "cognito-sync:*"]
        Resource = ["*"]
      }
    ],
    "SageMaker" = [
      {
        Effect   = "Allow"
        Action   = ["sagemaker:*"]
        Resource = ["*"]
      }
    ],
    "Elastic Transcoder" = [
      {
        Effect   = "Allow"
        Action   = ["elastictranscoder:*"]
        Resource = ["*"]
      }
    ],
    "Direct Connect" = [
      {
        Effect   = "Allow"
        Action   = ["directconnect:*"]
        Resource = ["*"]
      }
    ],
    "Inspector" = [
      {
        Effect   = "Allow"
        Action   = ["inspector:*", "inspector2:*"]
        Resource = ["*"]
      }
    ]
  }

  # Base statements that are always included
  base_statements = [
    {
      Effect = "Allow"
      Action = [
        "iam:GetAccountPasswordPolicy",
        "iam:GetUser",
        "iam:ChangePassword",
        "sts:GetCallerIdentity"
      ]
      Resource = [
        "arn:aws:iam::*:user/$${aws:username}"
      ]
    },
    {
      Effect = "Allow"
      Action = [
        "cloudshell:*",
        "support:*"
      ]
      Resource = ["*"]
    }
  ]

  # Generate service statements based on the services list
  service_statements = flatten([
    for service in var.services_list : lookup(local.service_permissions, service, [])
  ])

  # Combine base statements with service-specific statements
  policy_statements = concat(local.base_statements, local.service_statements)
}

resource "aws_iam_user_policy" "lab_user_policy" {
  name = "lab_access"
  user = aws_iam_user.lab_user.name

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = local.policy_statements
  })
}

variable "services_list" {
  type    = list(string)
  default = ["S3"]
  description = "List of AWS services to grant access to"
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