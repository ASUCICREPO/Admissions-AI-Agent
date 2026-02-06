# Modification Guide

This guide provides detailed instructions for developers who want to customize, extend, or modify the AI-Admissions Agent.

---

## Table of Contents

- [Modification Guide](#modification-guide)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Development Environment Setup](#development-environment-setup)
    - [Prerequisites](#prerequisites)
    - [Local Development Workflow](#local-development-workflow)
    - [Update Frontend](#update-frontend)
  - [Extending Agent Capabilities](#extending-agent-capabilities)
    - [Add a New Custom Tool](#add-a-new-custom-tool)
  - [Change Conversation Flow](#change-conversation-flow)
  - [Changing WhatsApp Provider](#changing-whatsapp-provider)
    - [Switch from Twilio to AWS End User Messaging](#switch-from-twilio-to-aws-end-user-messaging)
  - [Conclusion](#conclusion)

---

## Introduction

The platform is designed to be highly customizable and extensible. This guide assumes you have:

- Completed the [Deployment Guide](./deploymentGuide.md) and have a working deployment
- Familiarity with TypeScript, Python, React, and AWS services
- Understanding of the [Architecture](./architectureDeepDive.md)

Before making modifications:
1. Create a backup or work in a development/staging environment
2. Test changes locally when possible
3. Use version control (Git) to track changes
4. Document your modifications

---

## Development Environment Setup

### Prerequisites

Install development tools:

```bash
# Node.js and npm (for frontend and CDK)
# Already installed if you deployed

# Python virtual environment (for agent development)
cd Backend/cintana-admissions-agent/AgentCore
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Install Bedrock AgentCore CLI for local testing
pip install bedrock-agentcore
```

### Local Development Workflow

**Frontend Development:**

```bash
cd mapua-new-frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Access at http://localhost:3000
```

**Backend Development:**

```bash
cd Backend/cintana-admissions-agent

# Install dependencies
npm install

# Watch mode (auto-compile TypeScript)
npm run watch

# In another terminal, test CDK changes
npx cdk diff
```

**Agent Development:**

```bash
cd Backend/cintana-admissions-agent/AgentCore

# Activate virtual environment
source venv/bin/activate

# Test agent locally (requires .env configuration)
python nemo_agent.py

```

---

### Update Frontend 

**Logo and Images:**

1. Replace logo files in `mapua-new-frontend/public/`:
   ```
   public/
   ├── logo.png         # Main logo
   ├── logo-dark.png    # Dark mode logo
   ├── favicon.ico      # Browser favicon
   └── og-image.png     # Social media preview image
   ```

2. Update image references in components:
   ```typescript
   // components/header.tsx or equivalent
   <Image src="/logo.png" alt="University Logo" width={200} height={60} />
   ```

**Color Scheme:**

Edit `mapua-new-frontend/tailwind.config.ts` and change the colors to match your university.


- The frontend is designed to be highly customizable and extensible. We are using Next.js with Shadcn UI for the components and Tailwind CSS for the styling. You can easily change the project with access to the code and the components as per your needs.

---

## Extending Agent Capabilities

We are using AWS Strands framework for the agent core. For more information, please refer to the [AWS Strands ](https://strandsagents.com/latest/).

### Add a New Custom Tool

Custom tools allow the agent to perform specific actions like querying databases, calling APIs, or triggering workflows.
The agent core is designed to be highly extensible and customizable. You can easily add new tools to the agent core by adding a new tool to the `tools` directory and adding the tool to the `nemo_agent.py` file.

### Translation Tool Example

The `translate_text` tool demonstrates how to integrate AWS services into agent tools:

**Location:** `Backend/admissions-ai-agent/AgentCore/tools/translate_tool.py`

**Key Features:**
- Uses AWS Translate for 70+ language support
- Auto-detects source language when not specified
- Handles bidirectional translation (user input to English, response back to user's language)

**Usage in System Prompt:**
The agent automatically detects non-English input and:
1. Translates user input to English for processing
2. Processes the query using knowledge base and conversation logic
3. Translates the response back to the user's original language


## Change Conversation Flow
You can also easily change the behavior of the agent by changing the system prompt in the `nemo_agent.py` file. The system prompt is the instructions that the agent will follow to conduct the conversation. You can also change the conversation flow by changing the conversation flow in the `nemo_agent.py` file.


---

## Changing WhatsApp Provider

### Switch from Twilio to AWS End User Messaging
The current WhatsApp Provider is Twilio. You can easily change the WhatsApp Provider to AWS End User Messaging by changing the code in the `send_whatsapp_twilio.py` file. You will need to set up the AWS End User Messaging and change the code to use the AWS End User Messaging API that can be used to send WhatsApp messages to the students with your registered Meta Business Account.

for more information, please refer to the [AWS End User Messaging Documentation](https://docs.aws.amazon.com/social-messaging/latest/userguide/whatsapp-send-message.html).

## Conclusion

This guide has covered the most common modifications and extensions for the AI-Admissions Agent. By following these patterns and best practices, you can customize the agent to meet your specific needs.

For additional help:
- Review [Architecture Deep Dive](./architectureDeepDive.md) for technical details
- Consult [Deployment Guide](./deploymentGuide.md) for infrastructure setup
- See [API Documentation](./APIdoc.md) for API reference


