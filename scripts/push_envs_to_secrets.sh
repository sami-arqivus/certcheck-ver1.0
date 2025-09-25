#!/usr/bin/env bash
set -euo pipefail

# Push local .env files to AWS Secrets Manager
# One secret per service under prefix (default: certcheck/<service>)
# Usage:
#   AWS_REGION=us-east-1 ./scripts/push_envs_to_secrets.sh
# Optional overrides:
#   SECRETS_PREFIX=certcheck SERVICES="aws backend ..." FORMAT=json|plaintext ./scripts/push_envs_to_secrets.sh

APP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_PREFIX="${SECRETS_PREFIX:-certcheck}"
FORMAT="${FORMAT:-json}"   # json (default) or plaintext
AWS_REGION_ENV="${AWS_REGION:-}"

if ! command -v aws >/dev/null 2>&1; then
  echo "Error: aws CLI not found. Install AWS CLI first." >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq not found. Install jq first." >&2
  exit 1
fi

read -r -a SERVICES <<< "${SERVICES:-aws backend login_register nginx tasks_scheduling vision_models}"

# Convert KEY=VALUE file to JSON
env_to_json() {
  awk -F'=' 'NF && $1 !~ /^\s*#/ {key=$1; sub(/^\s+|\s+$/,"",key); $1=""; val=substr($0,2); gsub(/^\s+|\s+$/, "", val); gsub(/\r$/, "", val); printf "%s\t%s\n", key, val}' "$1" |
  jq -Rs 'split("\n") | map(select(length>0)) | map(split("\t")) | map({(.[0]): (.[1])}) | add'
}

upsert_secret() {
  local name="$1"
  local payload="$2"
  local is_json="$3"

  if aws secretsmanager describe-secret ${AWS_REGION_ENV:+--region "$AWS_REGION_ENV"} --secret-id "$name" >/dev/null 2>&1; then
    if [ "$is_json" = "true" ]; then
      aws secretsmanager put-secret-value ${AWS_REGION_ENV:+--region "$AWS_REGION_ENV"} --secret-id "$name" --secret-string "$payload" >/dev/null
    else
      aws secretsmanager put-secret-value ${AWS_REGION_ENV:+--region "$AWS_REGION_ENV"} --secret-id "$name" --secret-string "$payload" >/dev/null
    fi
    echo "Updated secret: $name"
  else
    if [ "$is_json" = "true" ]; then
      aws secretsmanager create-secret ${AWS_REGION_ENV:+--region "$AWS_REGION_ENV"} --name "$name" --secret-string "$payload" >/dev/null
    else
      aws secretsmanager create-secret ${AWS_REGION_ENV:+--region "$AWS_REGION_ENV"} --name "$name" --secret-string "$payload" >/dev/null
    fi
    echo "Created secret: $name"
  fi
}

for service in "${SERVICES[@]}"; do
  env_path="$APP_ROOT/$service/.env"
  if [ ! -f "$env_path" ]; then
    echo "Skipping $service: $env_path not found"
    continue
  fi
  name="$SECRETS_PREFIX/$service"
  if [ "$FORMAT" = "json" ]; then
    json_payload="$(env_to_json "$env_path")"
    upsert_secret "$name" "$json_payload" true
  else
    plaintext_payload="$(cat "$env_path")"
    upsert_secret "$name" "$plaintext_payload" false
  fi

done

echo "Done pushing secrets."
