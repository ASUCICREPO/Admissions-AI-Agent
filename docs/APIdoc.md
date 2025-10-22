# API Documentation

This guide summarizes the two APIs exposed by the AI-Powered University Admissions Platform and shows how to invoke, monitor, and troubleshoot them.

---

## Overview

| API                                         | Purpose                                                 | Where URL Comes From                                      |
| ------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| **Form Submission** (API Gateway)           | Accepts inquiry form data and creates Salesforce leads  | `FormSubmissionApiUrl` CDK output (Step 5 of deployment)  |
| **Agent Interaction** (Lambda Function URL) | Streams chat responses from the Bedrock AgentCore agent | `AgentProxyFunctionUrl` CDK output (Step 5 of deployment) |

Both APIs are public by default. Add authentication or origin restrictions before going live.

---

## Base URLs

```text
Form Submission:   https://[API-GATEWAY-ID].execute-api.[REGION].amazonaws.com/prod/
Agent Interaction:  https://[LAMBDA-FN-ID].lambda-url.[REGION].on.aws/
```

To confirm each value, redeploy CDK in Step 5 and copy the printed outputs.

---

## Endpoint Summary

| API               | Method & Path       | Description                                                 | Required Headers                 | Key Environment Variables                              |
| ----------------- | ------------------- | ----------------------------------------------------------- | -------------------------------- | ------------------------------------------------------ |
| Form Submission   | `POST /prod/submit` | Creates a Salesforce lead from form data                    | `Content-Type: application/json` | `SF_USERNAME`, `SF_PASSWORD`, `SF_TOKEN`               |
| Agent Interaction | `POST /`            | Sends a message to the agent and receives a streaming reply | `Content-Type: application/json` | `AGENT_RUNTIME_ARN`, `AWS_REGION`, `MAX_HISTORY_TURNS` |

Environment templates live at `Backend/admissions-ai-agent/env.example` and `Backend/admissions-ai-agent/AgentCore/env.example`.

---

## Form Submission API

### Request

```bash
POST https://YOUR-API-GATEWAY-URL/prod/createFormLead
Content-Type: application/json
```

```json
{
  "firstName": "Maria",
  "lastName": "Garcia",
  "email": "maria.garcia@email.com",
  "cellPhone": "+1-555-987-6543",
  "headquarters": "Manila",
  "programType": "Undergraduate",
  "homePhone": "",
  "dataAuthorization": true
}
```

Required fields: `firstName`, `lastName`, `email`, `cellPhone`, `headquarters`, `programType`, `dataAuthorization`.

### Response

```json
{
  "statusCode": 200,
  "message": "Lead created successfully",
  "data": {
    "leadId": "00Q5f000001AbcdEAC"
  }
}
```

Common errors:

- `400` – Missing or invalid fields
- `401` – Salesforce credentials invalid or expired
- `500/503` – Salesforce or Lambda runtime error

### Flow

1. API Gateway validates the request and invokes `form_submit_salesforce` Lambda.
2. Lambda authenticates with Salesforce using stored credentials.
3. Lead is created with status “New” and source “Website - Inquiry Form”.
4. Lambda returns status information and any Salesforce identifiers.

---

## Agent Interaction API

### Request

```bash
POST https://YOUR-LAMBDA-FUNCTION-URL.lambda-url.us-east-1.on.aws/
Content-Type: application/json
Accept: text/event-stream
```

```json
{
  "runtimeSessionId": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "prompt": "Tell me about your computer science program",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "phone_number": "+1-555-987-6543"
  }
}
```

Use a UUID for `runtimeSessionId`/`session_id` and the caller’s phone number if available (optional for web-only chat).

### Streaming Response

Each SSE `data:` line contains JSON emitted by the proxy Lambda. The frontend normalizes the following shapes:

```text
data: {"response": "Mapua University offers ..."}
data: {"tool_status": {"icon": "🔍", "message": "Searching"}}
data: {"tool_result": "Found program overview."}
data: {"final_result": "Let me know if you would like to speak with an advisor."}
data: {"error": "Agent invocation failed"}
```

Normalize these events with the helpers in `mapua-new-frontend/lib/agent-events.ts`. Treat any payload containing an `error` field as a failure.

### Flow

1. Lambda receives the runtime session ID and payload from the frontend.
2. DynamoDB conversation history is retrieved using `session_id`.
3. Bedrock AgentCore processes the prompt (using knowledge base and tools).
4. Streaming responses are forwarded to the client and appended to DynamoDB.

---

## Environment Variables

| Component              | Location                                     | Key Variables                                                                                                           |
| ---------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Form Submission Lambda | `Backend/admissions-ai-agent/.env`           | `SF_USERNAME`, `SF_PASSWORD`, `SF_TOKEN`, `AWS_REGION`                                                                  |
| Agent Proxy Lambda     | `Backend/admissions-ai-agent/.env`           | `AGENT_RUNTIME_ARN`, `AWS_REGION`, `TWILIO_WHATSAPP_QUEUE_URL` (if using WhatsApp handoff)                              |
| AgentCore CLI          | `Backend/admissions-ai-agent/AgentCore/.env` | `AGENTCORE_RUNTIME_ARN`, `AGENTCORE_MEMORY_ID`, `ENGLISH_KNOWLEDGE_BASE_ID`, `SESSIONS_TABLE_NAME`, `MAX_HISTORY_TURNS` |

Populate these values immediately after Steps 4 and 5 in the deployment guide.

---

## Testing Quick Reference

```bash
# Form submission smoke test
curl -X POST https://YOUR-API-GATEWAY-URL/prod/submit \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","phone":"+1-555-000-0000"}'

# Agent interaction test (streaming output)
curl -X POST https://YOUR-LAMBDA-FUNCTION-URL.lambda-url.us-east-1.on.aws/ \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-session-001","message":"Hello","conversationHistory":[]}'
```

Postman tips:

- Use `application/json` body.
- For streaming, enable “Follow original HTTP redirect” and view the response as text.

---

## Monitoring & Troubleshooting

| Symptom                            | Quick Checks                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| 401 from Form Submission           | Verify Salesforce credentials in Lambda environment variables; reset security token.     |
| Form submission timeout            | Increase Lambda timeout (default 30s) and confirm Salesforce availability.               |
| Agent stream returns `type: error` | Confirm `AGENT_RUNTIME_ARN` value, Bedrock agent status, and CloudWatch logs.            |
| Slow agent responses               | Reduce conversation history size, review knowledge base latency, increase Lambda memory. |

Useful commands:

```bash
aws logs tail /aws/lambda/form_submit_salesforce --follow
aws logs tail /aws/lambda/agentProxyLambda --follow
aws logs tail /aws/lambda/sendTwilioWhatsappLambda --follow
```

Monitor CloudWatch metrics for **Invocations**, **Errors**, **Duration**, and API Gateway **4XX/5XX** counts.

---

## Related Documentation

- [Deployment Guide](./deploymentGuide.md) — Complete setup of infrastructure, AgentCore, and frontend.
- [Architecture Deep Dive](./architectureDeepDive.md) — Component and data flow diagrams.
- [User Guide](./userGuide.md) — Frontend experience and chatbot behavior.
