# User Lab Platform

An interactive platform for creating, managing, and participating in hands-on lab experiences for technical training.

## Overview

This platform provides a comprehensive solution for technical training through interactive labs. Users can browse available labs, start lab sessions with provisioned AWS environments, and complete step-by-step tutorials. Administrators can create and manage labs, including rich content with images and structured learning materials.

## Architecture

The application is built with:

- **Frontend**: Next.js, React 19, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL
- **Cloud Infrastructure**: AWS (managed via Terraform)
- **Storage**: AWS S3 for storing lab assets

## Key Components

### User Flows

1. **Authentication**: Users can sign up, sign in, and manage their profiles
2. **Lab Discovery**: Browse available labs with filtering and search capabilities
3. **Lab Participation**: Start lab sessions that provision AWS resources for hands-on learning
4. **Lab Completion**: Step through lab instructions with progress tracking

### Admin Flows

1. **Lab Creation**: Create new labs with comprehensive content
2. **Lab Management**: Edit, publish, and monitor existing labs
3. **User Management**: Manage user accounts and permissions

## Data Models

### Core Entities

- **User**: Application users with authentication and profile information
- **Lab**: Educational content with structured steps, difficulty levels, and related metadata
- **LabSession**: Active instances of labs for users, including provisioned AWS resources

## Infrastructure

The platform uses Terraform to manage AWS infrastructure:

- **Multi-account strategy**: Uses two AWS accounts for lab environments
- **IAM Management**: Creates and manages IAM users for lab sessions
- **Security**: Implements least privilege access controls for lab environments

## Directory Structure

- `/app`: Next.js application code
  - `/api`: Backend API routes
    - `/labs`: Lab management endpoints
  - `/User`: User-facing pages
    - `/dashboard`: User dashboard interface
    - `/dashboard/labs`: Lab browser and individual lab interfaces
- `/prisma`: Database schema and migrations
- `/terraform`: Infrastructure as code for AWS resource provisioning
  - `/account1` & `/account2`: Configuration for multiple AWS accounts
- `/components`: Reusable UI components
- `/lib`: Shared utilities and helpers

## Workflows

### Lab Creation Process

1. Admin creates lab with title, description, objectives, and other metadata
2. Lab content is structured into steps with instructions
3. Supporting assets (images, etc.) are uploaded to S3
4. Lab is published and becomes available to users

### Lab Session Workflow

1. User browses and selects a lab from the catalog
2. Upon starting a lab, the system:
   - Provisions AWS resources via Terraform
   - Creates temporary IAM credentials
   - Establishes a session with expiration time
3. User completes lab steps in the provisioned environment
4. Upon completion or timeout, resources are cleaned up

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- AWS account with appropriate permissions
- Terraform 1.2.0+

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Initialize database
npx prisma migrate dev

# Run development server
npm run dev
```

### Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Terraform Setup

```bash
cd terraform
terraform init
terraform apply
```

## Environment Variables

The application requires several environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `AWS_REGION`: Target AWS region
- `AWS_ACCESS_KEY_ID`: AWS credentials for S3 and service operations
- `AWS_SECRET_ACCESS_KEY`: AWS credentials secret
- `AWS_S3_BUCKET_NAME`: S3 bucket for storing lab assets
- `NEXTAUTH_SECRET`: Secret for NextAuth.js
- `NEXTAUTH_URL`: URL for NextAuth.js callbacks

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
