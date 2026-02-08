#!/bin/bash
# =============================================================================
# Test Send DM via Instagram Graph API
# =============================================================================
# Sends a test DM to a specified Instagram user via the Graph API.
# Use this to verify your Page Access Token and Send API are working.
#
# Usage:
#   ./scripts/test_send_dm.sh <recipient_ig_sender_id> [message]
#
# Prerequisites:
#   - META_PAGE_ACCESS_TOKEN set in environment (or .env file)
#   - The recipient must be a test user who has messaged the page first
#     (required by Meta's 24-hour messaging window)
# =============================================================================

set -euo pipefail

# Load .env if present
if [ -f "$(dirname "$0")/../.env" ]; then
  set -a
  source "$(dirname "$0")/../.env"
  set +a
fi

GRAPH_API_VERSION="${GRAPH_API_VERSION:-v21.0}"
RECIPIENT_ID="${1:-}"
MESSAGE="${2:-Hello! This is a test message from the Maribel DM agent.}"

if [ -z "$RECIPIENT_ID" ]; then
  echo "Usage: $0 <recipient_ig_sender_id> [message]"
  echo ""
  echo "Example:"
  echo "  $0 12345678901234567 'Testing the send API'"
  echo ""
  echo "The recipient must be a test user who has already DM'd the page."
  exit 1
fi

if [ -z "${META_PAGE_ACCESS_TOKEN:-}" ]; then
  echo "ERROR: META_PAGE_ACCESS_TOKEN is not set."
  echo "Set it in your .env file or export it in your shell."
  exit 1
fi

echo "Sending test DM..."
echo "  Graph API: ${GRAPH_API_VERSION}"
echo "  Recipient: ${RECIPIENT_ID}"
echo "  Message: ${MESSAGE}"
echo ""

RESPONSE=$(curl -s -X POST \
  "https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${META_PAGE_ACCESS_TOKEN}" \
  -d "{
    \"recipient\": {\"id\": \"${RECIPIENT_ID}\"},
    \"message\": {\"text\": \"${MESSAGE}\"},
    \"messaging_type\": \"RESPONSE\"
  }")

echo "Response: ${RESPONSE}"
echo ""

if echo "$RESPONSE" | grep -q '"recipient_id"'; then
  echo "PASS: Message sent successfully."
elif echo "$RESPONSE" | grep -q '"error"'; then
  ERROR_MSG=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | head -1)
  echo "FAIL: Send API returned an error."
  echo "  ${ERROR_MSG}"
  echo ""
  echo "Common issues:"
  echo "  - 'Invalid OAuth access token': Token expired, run refresh script"
  echo "  - 'Message failed to send': 24hr window expired for this recipient"
  echo "  - '(#100) No matching user found': Invalid recipient ID"
else
  echo "UNKNOWN: Unexpected response format. Check the raw response above."
fi
