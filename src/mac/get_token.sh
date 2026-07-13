#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env if present
if [ -f "$SCRIPT_DIR/../../.env" ]; then
  source "$SCRIPT_DIR/../../.env"
fi

if [ -z "$RINGCENTRAL_CLIENT_ID" ] || [ -z "$RINGCENTRAL_CLIENT_SECRET" ] || [ -z "$RINGCENTRAL_JWT" ]; then
  echo "❌ Missing required environment variables:" >&2
  echo "   RINGCENTRAL_CLIENT_ID, RINGCENTRAL_CLIENT_SECRET, RINGCENTRAL_JWT" >&2
  exit 1
fi

# Step 1: RingCentral platform token
BASIC_AUTH=$(echo -n "$RINGCENTRAL_CLIENT_ID:$RINGCENTRAL_CLIENT_SECRET" | base64)

RC_RESPONSE=$(curl -s -X POST "https://platform.ringcentral.com/restapi/oauth/token" \
  -H "Authorization: Basic $BASIC_AUTH" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=$RINGCENTRAL_JWT")

RC_TOKEN=$(echo "$RC_RESPONSE" | grep -o '"access_token" *: *"[^"]*"' | sed 's/"access_token" *: *"\([^"]*\)"/\1/')

if [ -z "$RC_TOKEN" ]; then
  echo "❌ Failed to get RingCentral token" >&2
  echo "Response: $RC_RESPONSE" >&2
  exit 1
fi
echo "✅ RingCentral token received" >&2

# Step 2: RingCX token exchange
RCX_RESPONSE=$(curl -s -X POST "https://engage.ringcentral.com/api/auth/login/rc/accesstoken" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -d "rcTokenType=Bearer&rcAccessToken=$RC_TOKEN")

RCX_TOKEN=$(echo "$RCX_RESPONSE" | grep -o '"accessToken" *: *"[^"]*"' | sed 's/"accessToken" *: *"\([^"]*\)"/\1/')

if [ -z "$RCX_TOKEN" ]; then
  echo "❌ Failed to get RingCX token" >&2
  echo "Response: $RCX_RESPONSE" >&2
  exit 1
fi
echo "✅ RingCX token received" >&2

echo "$RCX_TOKEN"
