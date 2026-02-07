#!/usr/bin/env bash
# Ingest all knowledge base .md files into Supabase knowledge_chunks.
# Usage: ./scripts/ingest_knowledge_base.sh [--file <filename.md>]

set -euo pipefail
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run ingestion
node ingest_knowledge_base.js "$@"
