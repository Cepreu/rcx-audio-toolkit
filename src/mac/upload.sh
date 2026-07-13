#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env if present
if [ -f "$SCRIPT_DIR/../../.env" ]; then
  source "$SCRIPT_DIR/../../.env"
fi

WORKING_DIRECTORY="$1"
CSV_FILE="$2"
ACCOUNT="$3"
USE_TOKEN_SCRIPT="$4"

if [ -z "$WORKING_DIRECTORY" ] || [ -z "$CSV_FILE" ] || [ -z "$ACCOUNT" ]; then
  echo "Usage: ./rcx-audio.sh upload <working_directory> <csv_file> <account> [--auto-token]"
  exit 1
fi

# Get token
if [ "$USE_TOKEN_SCRIPT" == "--auto-token" ]; then
  echo "🔑 Fetching token via get_token.sh..."
  TOKEN=$("$SCRIPT_DIR/get_token.sh")
  if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token, exiting"
    exit 1
  fi
else
  read -rsp "🔑 Enter Bearer token: " TOKEN
  echo
  if [ -z "$TOKEN" ]; then
    echo "❌ No token entered, exiting"
    exit 1
  fi
fi

BASE_URL="https://ringcx.ringcentral.com/cx/admin/v1/accounts/~/sub-accounts/$ACCOUNT/accountaudio"

# Skip header row with tail -n +2
tail -n +2 "$CSV_FILE" | tr -d '\r' | while IFS=, read -r file audio_name locale; do

  http_code=$(curl -s -o /tmp/resp.json -w "%{http_code}" \
    -X POST "$BASE_URL" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    -F "accountId=$ACCOUNT" \
    -F "audioName=$audio_name" \
    -F "locale=$locale" \
    -F "file=@$WORKING_DIRECTORY/$file;type=audio/wav")

  if [ "$http_code" == "201" ]; then
    echo "✅ $audio_name ($locale) — uploaded"
  else
    echo "❌ $audio_name ($locale) — failed ($http_code): $(cat /tmp/resp.json)"
  fi

done
