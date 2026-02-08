#!/bin/bash
# =============================================================================
# Manual Meta Page Access Token Refresh
# =============================================================================
# Exchanges the current long-lived Page Access Token for a new one.
# Use this when the automatic refresh (Workflow 3) fails or you need
# to manually refresh outside the normal cycle.
#
# Usage: ./scripts/refresh_meta_token.sh
#
# Prerequisites:
#   - META_APP_ID, META_APP_SECRET, and META_PAGE_ACCESS_TOKEN in .env
#
# After running:
#   - Copy the new token and update it in n8n credentials
#   - Update .env with the new token
# =============================================================================

set -euo pipefail

# Load .env if present
if [ -f "$(dirname "$0")/../.env" ]; then
  set -a
  source "$(dirname "$0")/../.env"
  set +a
fi

if [ -z "${META_APP_ID:-}" ] || [ -z "${META_APP_SECRET:-}" ] || [ -z "${META_PAGE_ACCESS_TOKEN:-}" ]; then
  echo "ERROR: Required environment variables not set."
  echo "Ensure META_APP_ID, META_APP_SECRET, and META_PAGE_ACCESS_TOKEN are in .env"
  exit 1
fi

GRAPH_API_VERSION="${GRAPH_API_VERSION:-v21.0}"

echo "=== Step 1: Check current token validity ==="
echo ""

DEBUG_RESPONSE=$(curl -s \
  "https://graph.facebook.com/debug_token?input_token=${META_PAGE_ACCESS_TOKEN}&access_token=${META_APP_ID}|${META_APP_SECRET}")

echo "Token debug info:"
echo "$DEBUG_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DEBUG_RESPONSE"
echo ""

# Check if token is valid
if echo "$DEBUG_RESPONSE" | grep -q '"is_valid":true'; then
  EXPIRES=$(echo "$DEBUG_RESPONSE" | grep -o '"expires_at":[0-9]*' | cut -d: -f2)
  if [ -n "$EXPIRES" ] && [ "$EXPIRES" != "0" ]; then
    EXPIRES_DATE=$(date -d "@${EXPIRES}" 2>/dev/null || date -r "${EXPIRES}" 2>/dev/null || echo "unknown")
    echo "Current token is VALID. Expires: ${EXPIRES_DATE}"
  else
    echo "Current token is VALID (never expires)."
  fi
else
  echo "WARNING: Current token appears INVALID or expired."
  echo "You may need to generate a new token from the Meta Developer Dashboard."
  echo ""
  echo "Steps to generate a new token:"
  echo "  1. Go to developers.facebook.com -> Your App -> Messenger -> Instagram Settings"
  echo "  2. Click 'Generate Token' for your page"
  echo "  3. Copy the short-lived token"
  echo "  4. Run this script again with the new token in META_PAGE_ACCESS_TOKEN"
  exit 1
fi

echo ""
echo "=== Step 2: Exchange for new long-lived token ==="
echo ""

REFRESH_RESPONSE=$(curl -s \
  "https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${META_PAGE_ACCESS_TOKEN}")

echo "Refresh response:"
echo "$REFRESH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REFRESH_RESPONSE"
echo ""

if echo "$REFRESH_RESPONSE" | grep -q '"access_token"'; then
  NEW_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  echo "SUCCESS: New long-lived token obtained."
  echo ""
  echo "============================================"
  echo "NEW TOKEN (copy this):"
  echo "============================================"
  echo "$NEW_TOKEN"
  echo "============================================"
  echo ""
  echo "Next steps:"
  echo "  1. Update META_PAGE_ACCESS_TOKEN in .env"
  echo "  2. Update the token in n8n Cloud credentials"
  echo "  3. The new token is valid for ~60 days"
else
  echo "FAIL: Could not obtain new token."
  echo "The token may be too expired to refresh."
  echo ""
  echo "You'll need to generate a new token from the Meta Developer Dashboard:"
  echo "  1. Go to developers.facebook.com -> Your App -> Messenger -> Instagram Settings"
  echo "  2. Click 'Generate Token'"
  echo "  3. Exchange it using this script"
fi
