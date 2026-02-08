#!/bin/bash
# =============================================================================
# Test Webhook Verification Handshake
# =============================================================================
# Tests that the n8n webhook endpoint correctly responds to Meta's
# GET verification challenge. This is the first thing Meta checks
# when you register a webhook URL.
#
# Usage: ./scripts/test_webhook_verification.sh
#
# Prerequisites:
#   - Workflow 1 (IG DM Handler) must be active in n8n
#   - META_VERIFY_TOKEN must match what's configured in the workflow
# =============================================================================

set -euo pipefail

# Configuration — update these if your setup differs
N8N_WEBHOOK_URL="https://eatonacademic.app.n8n.cloud/webhook/ig-dm"
VERIFY_TOKEN="${META_VERIFY_TOKEN:-eaton_maribel_verify_2026}"
CHALLENGE="TESTCHALLENGE123"

echo "Testing webhook verification handshake..."
echo "  URL: ${N8N_WEBHOOK_URL}"
echo "  Verify Token: ${VERIFY_TOKEN}"
echo "  Challenge: ${CHALLENGE}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${N8N_WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=${CHALLENGE}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

echo "HTTP Status: ${HTTP_CODE}"
echo "Response Body: ${BODY}"
echo ""

if [ "$HTTP_CODE" = "200" ] && [ "$BODY" = "$CHALLENGE" ]; then
  echo "PASS: Webhook verification is working correctly."
  echo "  The endpoint returned the challenge token as expected."
else
  echo "FAIL: Webhook verification failed."
  if [ "$HTTP_CODE" != "200" ]; then
    echo "  Expected HTTP 200, got ${HTTP_CODE}"
  fi
  if [ "$BODY" != "$CHALLENGE" ]; then
    echo "  Expected body '${CHALLENGE}', got '${BODY}'"
  fi
  echo ""
  echo "Troubleshooting:"
  echo "  1. Is Workflow 1 active in n8n?"
  echo "  2. Does the verify token match? Check .env and workflow config."
  echo "  3. Is the webhook URL correct?"
  exit 1
fi
