#!/usr/bin/env bash
# Re-embed all active chunks in knowledge_chunks with fresh embeddings.
# Usage: ./scripts/reembed_all_chunks.sh

set -euo pipefail
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run re-embed
node reembed_all_chunks.js "$@"
