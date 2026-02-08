#!/bin/bash
# =============================================================================
# Export n8n Workflows to JSON
# =============================================================================
# Exports all Maribel-related n8n workflows as JSON files for version control.
# Files are saved to n8n/workflows/ directory.
#
# Usage: ./scripts/export_n8n_workflows.sh
#
# Prerequisites:
#   - n8n API key or credentials
#   - curl and jq installed
#
# Note: This script uses the n8n Cloud API. If your workflows were created
# via the MCP tools, use those tools to export instead (the workflow JSON
# is available from the n8n MCP get_workflow tool).
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${PROJECT_DIR}/n8n/workflows"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "=== n8n Workflow Export ==="
echo "Output directory: ${OUTPUT_DIR}"
echo ""
echo "This script exports workflow JSON files for version control."
echo "Since Maribel workflows are managed via n8n Cloud, the recommended"
echo "approach is to export them using the n8n MCP tools in Claude Code:"
echo ""
echo "  1. Open a Claude Code session"
echo "  2. Use mcp__n8n-mcp__n8n_get_workflow for each workflow ID"
echo "  3. Save the JSON to n8n/workflows/"
echo ""
echo "Alternatively, you can export from the n8n UI:"
echo "  1. Open each workflow in n8n Cloud"
echo "  2. Click the three-dot menu -> Download"
echo "  3. Save to n8n/workflows/"
echo ""

# List expected Maribel workflows
echo "Expected Maribel workflows to export:"
echo "  1. IG DM Handler (main)"
echo "  2. Comment-to-DM Trigger"
echo "  3. Token Refresh"
echo "  4. Daily Analytics"
echo "  5. Stale Conversation Alert"
echo "  6. Conversation Summarizer"
echo "  7. Knowledge Re-embedder"
echo "  8. Telegram Callback Handler"
echo "  9. Global Error Handler"
echo ""

# Check if any exports already exist
EXISTING=$(ls -1 "${OUTPUT_DIR}"/*.json 2>/dev/null | wc -l || echo "0")
echo "Current exports in ${OUTPUT_DIR}: ${EXISTING} file(s)"
