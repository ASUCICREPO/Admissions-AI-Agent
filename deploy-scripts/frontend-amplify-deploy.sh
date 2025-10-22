#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
FRONTEND_DIR="$REPO_ROOT/Frontend"
if [ ! -d "$FRONTEND_DIR" ]; then
  FRONTEND_DIR="$REPO_ROOT/mapua-new-frontend"
fi
ZIP_PATH="$FRONTEND_DIR/frontend-build.zip"
OUTPUT_DIR="$FRONTEND_DIR/out"

echo "🚀 Amplify Frontend Deployment"
echo "================================"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Required command '$1' is not installed or not in PATH"
    exit 1
  fi
}

for cmd in aws node npm jq curl zip; do
  require_command "$cmd"
done

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "❌ Frontend directory not found at $REPO_ROOT/Frontend or $REPO_ROOT/mapua-new-frontend"
  exit 1
fi

prompt_if_empty() {
  local var_name="$1"
  local prompt_message="$2"
  local default_value="${3-}"
  local current_value="${!var_name-}"

  if [ -n "$current_value" ]; then
    eval "$var_name=\"$current_value\""
    return
  fi

  while true; do
    if [ -n "$default_value" ]; then
      read -r -p "$prompt_message [$default_value]: " input
      input=${input:-$default_value}
    else
      read -r -p "$prompt_message: " input
    fi

    if [ -n "$input" ]; then
      eval "$var_name=\"$input\""
      break
    fi
  done
}

prompt_if_empty AMPLIFY_APP_ID "Enter Amplify App ID"
prompt_if_empty AMPLIFY_BRANCH "Enter Amplify branch name" "main"
prompt_if_empty NEXT_PUBLIC_FORM_SUBMISSION_API "Enter NEXT_PUBLIC_FORM_SUBMISSION_API"
prompt_if_empty NEXT_PUBLIC_AGENT_PROXY_URL "Enter NEXT_PUBLIC_AGENT_PROXY_URL"

export NEXT_PUBLIC_FORM_SUBMISSION_API NEXT_PUBLIC_AGENT_PROXY_URL

echo "📋 Configuration"
echo "  Amplify App ID: $AMPLIFY_APP_ID"
echo "  Amplify Branch: $AMPLIFY_BRANCH"
echo "  Form API: $NEXT_PUBLIC_FORM_SUBMISSION_API"
echo "  Agent Proxy: $NEXT_PUBLIC_AGENT_PROXY_URL"
echo

cleanup() {
  rm -f "$ZIP_PATH"
}

trap cleanup EXIT

echo "🧹 Cleaning previous artifacts"
rm -f "$ZIP_PATH"
rm -rf "$OUTPUT_DIR"

echo "📦 Installing frontend dependencies"
cd "$FRONTEND_DIR"
npm install

echo "🏗️ Building Next.js app"
npm run build

if [ ! -d "$OUTPUT_DIR" ] || [ ! -f "$OUTPUT_DIR/index.html" ]; then
  echo "❌ Build did not produce a static export. Expected index.html in $OUTPUT_DIR"
  exit 1
fi

echo "🗜️ Creating deployment archive"
cd "$OUTPUT_DIR"
zip -r "$ZIP_PATH" . >/dev/null

if [ ! -f "$ZIP_PATH" ]; then
  echo "❌ Failed to create deployment zip"
  exit 1
fi

echo "🚀 Creating Amplify deployment"
DEPLOYMENT_RESULT=$(aws amplify create-deployment \
  --app-id "$AMPLIFY_APP_ID" \
  --branch-name "$AMPLIFY_BRANCH" \
  --output json)

ZIP_UPLOAD_URL=$(echo "$DEPLOYMENT_RESULT" | jq -r '.zipUploadUrl')
JOB_ID=$(echo "$DEPLOYMENT_RESULT" | jq -r '.jobId')

if [ -z "$ZIP_UPLOAD_URL" ] || [ "$ZIP_UPLOAD_URL" = "null" ]; then
  echo "❌ Failed to retrieve upload URL from Amplify"
  exit 1
fi

echo "📤 Uploading build artifact"
curl -T "$ZIP_PATH" "$ZIP_UPLOAD_URL" >/dev/null

echo "🚀 Starting Amplify deployment (${JOB_ID})"
aws amplify start-deployment \
  --app-id "$AMPLIFY_APP_ID" \
  --branch-name "$AMPLIFY_BRANCH" \
  --job-id "$JOB_ID" >/dev/null

echo "⏳ Monitoring deployment"
while true; do
  STATUS=$(aws amplify get-job \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name "$AMPLIFY_BRANCH" \
    --job-id "$JOB_ID" \
    --query 'job.summary.status' \
    --output text)

  case "$STATUS" in
    SUCCEED)
      echo "✅ Deployment succeeded"
      break
      ;;
    FAILED)
      echo "❌ Deployment failed"
      exit 1
      ;;
    CANCELLED)
      echo "⚠️ Deployment was cancelled"
      exit 1
      ;;
    *)
      echo "  Status: $STATUS"
      sleep 15
      ;;
  esac
done

echo
echo "🎉 Frontend deployment complete!"


