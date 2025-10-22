#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR%/scripts}"
ENV_FILE="${PROJECT_ROOT}/.env"

if ! command -v agentcore >/dev/null 2>&1; then
  echo "Error: agentcore CLI not found in PATH." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Error: Environment file not found at ${ENV_FILE}" >&2
  exit 1
fi

declare -a env_flags=()

while IFS= read -r line || [[ -n "$line" ]]; do
  # Trim leading/trailing whitespace
  line="$(printf '%s' "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

  [[ -z "$line" ]] && continue
  [[ "$line" == \#* ]] && continue

  # Allow optional "export " prefix
  if [[ "$line" == export\ * ]]; then
    line="${line#export }"
  fi

  if [[ "$line" != *"="* ]]; then
    echo "Warning: skipping malformed line: $line" >&2
    continue
  fi

  key="${line%%=*}"
  value="${line#*=}"

  # Trim whitespace around key/value
  key="$(printf '%s' "$key" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  value="$(printf '%s' "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

  # Strip surrounding quotes if present
  case "$value" in
    \"*\")
      if (( ${#value} > 1 )); then
        value="${value:1:-1}"
      fi
      ;;
    "'*")
      if (( ${#value} > 1 )); then
        value="${value:1:-1}"
      fi
      ;;
  esac

  env_flags+=("--env" "${key}=${value}")
done < "${ENV_FILE}"

echo "Launching agent with environment variables from ${ENV_FILE}" >&2

(cd "${PROJECT_ROOT}" && agentcore launch "${env_flags[@]}" "$@")

