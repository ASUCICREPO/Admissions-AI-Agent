# Deployment Guide

This guide provides step-by-step instructions for deploying the AI-Powered University Admissions Platform. The deployment process consists of **6 sequential steps** that must be completed in order.

---

## Table of Contents

- [Deployment Guide](#deployment-guide)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Requirements](#requirements)
    - [AWS Requirements](#aws-requirements)
    - [Software Requirements](#software-requirements)
    - [External Service Credentials](#external-service-credentials)
  - [Pre-Deployment](#pre-deployment)
    - [1. AWS Account Setup](#1-aws-account-setup)
      - [Enable Bedrock Access](#enable-bedrock-access)
    - [2. Salesforce Configuration](#2-salesforce-configuration)
      - [Create API User (Recommended)](#create-api-user-recommended)
      - [Get Security Token](#get-security-token)
    - [3. Twilio WhatsApp Setup](#3-twilio-whatsapp-setup)
      - [Create Twilio Account](#create-twilio-account)
      - [Enable WhatsApp Sandbox (for testing)](#enable-whatsapp-sandbox-for-testing)
      - [Get API Credentials](#get-api-credentials)
      - [For Production](#for-production)
    - [4. Knowledge Base Preparation](#4-knowledge-base-preparation)
      - [Create Knowledge Base](#create-knowledge-base)
      - [Gather University Documents](#gather-university-documents)
  - [Deployment](#deployment)
    - [Step 1 – Deploy the CDK baseline](#step-1--deploy-the-cdk-baseline)
    - [Step 2 – Create the Bedrock knowledge base](#step-2--create-the-bedrock-knowledge-base)
    - [Step 3 – Configure AgentCore locally](#step-3--configure-agentcore-locally)
    - [Step 4 – Launch AgentCore and capture runtime values](#step-4--launch-agentcore-and-capture-runtime-values)
    - [Step 5 – Redeploy CDK with runtime wiring](#step-5--redeploy-cdk-with-runtime-wiring)
    - [Step 6 – Deploy the Amplify frontend](#step-6--deploy-the-amplify-frontend)

---

## Overview

The deployment workflow follows this sequence:

```
Step 1: CDK Baseline Deployment
    ↓
Step 2: Bedrock Knowledge Base
    ↓
Step 3: AgentCore Configuration
    ↓
Step 4: AgentCore Launch
    ↓
Step 5: CDK Redeploy with Agent Wiring
    ↓
Step 6: Amplify Frontend Deployment
```

---

## Requirements

Before you begin deployment, ensure you have the following:

### AWS Requirements

- **AWS Account** with administrative access
- **AWS Bedrock Access** enabled in your region (us-east-1 recommended)
  - Request access at: https://console.aws.amazon.com/bedrock
  - Enable model access for: `global.anthropic.claude-sonnet-4-5-20250929-v1:0`
- **AWS CLI** installed and configured
  - Configure: `aws configure` with your credentials

### Software Requirements

- **AWS CDK CLI**
  - Install: `npm install -g aws-cdk`
  - Verify: `cdk --version`
- **Bedrock AgentCore CLI**
  - Install: `pip install bedrock-agentcore`
  - Install: `pip install strands-agents`

### External Service Credentials

- **Salesforce Account** with API access
  - Username
  - Password
  - Security Token (Settings → Reset My Security Token)
- **Twilio Account** with WhatsApp enabled
  - Account SID
  - Auth Token
  - WhatsApp-enabled phone number
  - Sign up: https://www.twilio.com/try-twilio

---

## Pre-Deployment

Complete these setup tasks before beginning the deployment phases.

### 1. AWS Account Setup

#### Enable Bedrock Access

1. Navigate to AWS Bedrock Console: https://console.aws.amazon.com/bedrock
2. Select your region (us-east-1 recommended)
3. Go to "Model access" in left sidebar
4. Click "Manage model access"
5. Enable access for:
   - **Anthropic Claude Sonnet 4.5** (`global.anthropic.claude-sonnet-4-5-20250929-v1:0`)
   - **Titan Embeddings G1 - Text** (for knowledge base)
6. Wait for access approval (usually instant)

---

### 2. Salesforce Configuration

#### Create API User (Recommended)

1. Log in to Salesforce
2. Navigate to **Setup** → **Users** → **New User**
3. Create dedicated API user with:
   - Profile: "System Administrator" or custom profile with API access
   - API Enabled: Checked
4. Note the **username** and **password**

#### Get Security Token

1. Log in as the API user
2. Go to **Settings** → **Reset My Security Token**
3. Check email for security token
4. **Important**: Save this token - you'll need it when you redeploy CDK in Step 5.

---

### 3. Twilio WhatsApp Setup

#### Create Twilio Account

1. Sign up at https://www.twilio.com/try-twilio
2. Verify your email and phone

#### Enable WhatsApp Sandbox (for testing)

1. In Twilio Console, navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow instructions to join sandbox:
   - Send WhatsApp message to Twilio number
   - Text: "join [your-sandbox-code]"
3. Note the sandbox phone number (e.g., `+14155238886`)

NOTE: You will need to join the sandbox to send WhatsApp messages to your own phone number and there is a 24 hour window to send the messages to the number if the user has not initiated the conversation with the agent. When setting up in production you will need to follow the steps to either use Twilio WhatsApp Business API, AWS End User Messaging, or your own WhatsApp Business account.

#### Get API Credentials

1. Go to **Account** → **API keys & tokens**
2. Note your:
   - **Account SID** (starts with "AC...")
   - **Auth Token** (click "View" to reveal)

**Important**: Save these credentials securely - you'll need them when you redeploy CDK in Step 5.

#### For Production

- Apply for Twilio WhatsApp Business API: https://www.twilio.com/whatsapp/request-access
- Get approved WhatsApp Business number
- Update CDK stack with production phone number
- We are already tracking user message sent and received in the DynamoDB table `WhatsappSessions` so you can use that to track the messages sent and received by the user to work with the 24 hour window.

---

### 4. Knowledge Base Preparation

We are using AWS Bedrock Knowledge Base to store the knowledge base content. For more information, please refer to the [AWS Bedrock Knowledge Base Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html).

#### Create Knowledge Base

For the Knowledge Base we are using S3 Vector Store to store the knowledge base content. For this we will need to create a S3 bucket and we will be creating that via cdk first deployment. so after you have deployed cdk 1st time you will need to create the knowledge base vai console and add that to env vars while redeploying cdk.

1. Navigate to AWS Bedrock Console: https://console.aws.amazon.com/bedrock
2. Select your region (us-east-1 recommended)
3. Go to "Knowledge bases" in left sidebar
4. Click "Create knowledge base"
5. Enter knowledge base name
6. Click "Create knowledge base"
7. Select option of S3 Vector Store for the knowledge base type.
8. Select the S3 bucket that was created in deployment

**Important**: Save the knowledge base ID - you'll need it in re-deployment of the CDK stack.

#### Gather University Documents

Collect PDFs, DOCX, or TXT files containing:

- Program descriptions
- Admission requirements
- Tuition and fees
- Campus information
- Student services
- FAQ content

**Note**: You'll upload these files to the S3 bucket created during Step 1.

---

## Deployment

Follow this streamlined flow. Before you begin each area, copy the corresponding `env.example` file so your environment variables stay in sync.

### Step 1 – Deploy the CDK baseline

1. `cd Backend/admissions-ai-agent`
2. Copy the backend template: `cp env.example .env`, then fill in AWS, Salesforce, and Twilio settings. Leave `AGENT_RUNTIME_ARN` and `ENGLISH_DOCS_KNOWLEDGE_BASE_ID` blank for now.
3. Build and deploy:
   ```bash
   npm install
   npm run build
   cdk synth
   cdk deploy --all
   ```
   Approve the deployment when prompted.
4. Save every output value that CDK prints (queue URLs, API URL, function URL, ECR repository URI, AgentCore execution role ARN, sessions table name, and the admissions S3 bucket names). These are reused later.

### Step 2 – Create the Bedrock knowledge base

1. In the AWS Bedrock console, create a knowledge base using the **S3 vector store** option and point it at the admissions bucket the CDK stack created.
2. Record the knowledge base ID.
3. Upload your English (and optional Spanish) documents into that bucket—the folders under `knowledge-base-content` show the expected layout.

### Step 3 – Configure AgentCore locally

1. `cd Backend/admissions-ai-agent/AgentCore`
2. Copy the AgentCore template: `cp env.example .env`, then fill in:
   - `AWS_REGION`
   - `ENGLISH_KNOWLEDGE_BASE_ID`, `SESSIONS_TABLE_NAME`, `TWILIO_WHATSAPP_QUEUE_URL`
   - Salesforce credentials and university branding
     Use the outputs you captured in Steps 1 and 2.
3. Run `agentcore configure --entrypoint nemo_agent.py --name nemo_agent` and provide the saved `AgentCoreRoleArn` and `ECRRepositoryUri` when prompted. Accept the defaults for requirements file, IAM auth, header allow list, and short-term memory unless you need a custom setup.
4. Confirm that `.bedrock_agentcore.yaml`, `Dockerfile`, and `.dockerignore` were generated.

### Step 4 – Launch AgentCore and capture runtime values

1. Now you can run the agentcore launch script to launch the agentcore runtime with the `.env` variables file. `./scripts/launch_agent.sh` 

NOTE: you will need to read the agentcore memory id from the `.bedrock_agentcore.yaml` file and add it to the `.env` file.

Alternatively, you can also run the agentcore launch command from the same directory with adding env vars as well 

```bash
agentcore launch --entrypoint nemo_agent.py --name nemo_agent
--env AWS_REGION=us-east-1
--env ENGLISH_KNOWLEDGE_BASE_ID=your-knowledge-base-id
....and so on as present in the .env file.
```

### Step 5 – Redeploy CDK with runtime wiring

1. Update `Backend/admissions-ai-agent/.env`:
   - `ENGLISH_DOCS_KNOWLEDGE_BASE_ID` ← knowledge base ID from Step 2
   - `AGENT_RUNTIME_ARN` ← Agent ARN from Step 4
   - Verify other fields (Twilio, Salesforce, region) are correct
2. Rebuild and redeploy:
   ```bash
   cd Backend/admissions-ai-agent
   cdk synth
   cdk deploy --all
   ```
3. Keep the refreshed outputs, especially `AgentProxyFunctionUrl` and `FormSubmissionApiUrl`, for the frontend configuration.

### Step 6 – Deploy the Amplify frontend

1. Return to the repository root: `cd /Users/loveneetsingh/Downloads/ASU-AI-CIC-Cintana-admissions`
2. Run `./deploy-scripts/frontend-amplify-deploy.sh`
3. Provide the scripted prompts:
   - Amplify App ID and branch (from Amplify console)
   - `NEXT_PUBLIC_FORM_SUBMISSION_API` ← Form Submission API URL from Step 5
   - `NEXT_PUBLIC_AGENT_PROXY_URL` ← Lambda function URL from Step 5
4. The script installs dependencies, builds the Next.js app, uploads to Amplify, and monitors the deployment. Save the final URL it prints—you’ll use it during Post-Deployment Verification.

---

**Deployment Complete!** Your AI-Powered University Admissions Platform is now live.

For usage instructions, see the [User Guide](./userGuide.md).

For customization, see the [Modification Guide](./modificationGuide.md).
