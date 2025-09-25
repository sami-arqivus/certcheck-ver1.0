#!/usr/bin/env bash
set -euo pipefail

# Fetch secrets from AWS Secrets Manager and render per-service .env files
# Expected secret names (default):
#   certcheck/aws
#   certcheck/backend
#   certcheck/login_register
#   certcheck/nginx
#   certcheck/tasks_scheduling
#   certcheck/vision_models
# Each secret value can be either:
#   - JSON object of key/value pairs: {"KEY":"VALUE", ...}
#   - Plaintext lines in KEY=VALUE format
#
# Usage:
#   AWS_REGION=us-east-1 ./scripts/fetch_secrets_to_env.sh
# Optional overrides:
#   SECRETS_PREFIX=certcheck SERVICES="aws backend ..." ./scripts/fetch_secrets_to_env.sh

APP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_PREFIX="${SECRETS_PREFIX:-certcheck}"
AWS_REGION_ENV="${AWS_REGION:-}"

if ! command -v aws >/dev/null 2>&1; then
  echo "Error: aws CLI not found. Install AWS CLI first." >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq not found. Install jq first." >&2
  exit 1
fi

# Allow override of services via environment variable
read -r -a SERVICES <<< "${SERVICES:-aws backend login_register nginx tasks_scheduling vision_models}"

json_to_env() {
  # Converts a JSON string of key/values into KEY=VALUE lines
  jq -r 'to_entries | .[] | "\(.key)=\(.value)"'
}

write_env_file() {
  local service="$1"
  local content="$2"
  local target="$APP_ROOT/$service/.env"
  mkdir -p "$(dirname "$target")"
  printf "%s\n" "$content" > "$target"
  chmod 600 "$target" || true
  echo "Wrote $target"
}

fetch_secret() {
  local name="$1"
  # Prefer SecretString; binary not supported here
  aws secretsmanager get-secret-value \
    ${AWS_REGION_ENV:+--region "$AWS_REGION_ENV"} \
    --secret-id "$name" \
    --query 'SecretString' \
    --output text
}

for service in "${SERVICES[@]}"; do
  secret_name="$SECRETS_PREFIX/$service"
  echo "Fetching: $secret_name"
  raw="$(fetch_secret "$secret_name" || true)"
  if [ -z "$raw" ] || [ "$raw" = "None" ]; then
    echo "Warning: No SecretString for $secret_name; skipping" >&2
    continue
  fi
  # Try JSON first
  if echo "$raw" | jq -e . >/dev/null 2>&1; then
    env_content="$(echo "$raw" | json_to_env)"
  else
    # Assume plaintext KEY=VALUE lines
    env_content="$raw"
  fi
  write_env_file "$service" "$env_content"
done

echo "Done. You can now run: docker compose up -d"
