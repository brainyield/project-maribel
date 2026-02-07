#!/usr/bin/env node

/**
 * Test RAG query — embeds a question and calls match_knowledge_chunks RPC.
 * Usage: node scripts/test_rag_query.js "How much do Tuesday pods cost?"
 */

import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

config({ path: join(PROJECT_ROOT, ".env") });

const question = process.argv[2] || "How much do Tuesday pods cost?";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_MARIBEL_URL,
  process.env.SUPABASE_MARIBEL_SERVICE_KEY
);

console.log(`Query: "${question}"\n`);

// Embed the question
const embResponse = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: question,
  dimensions: 1536,
});

const queryEmbedding = embResponse.data[0].embedding;

// Call match_knowledge_chunks RPC
const { data, error } = await supabase.rpc("match_knowledge_chunks", {
  query_embedding: JSON.stringify(queryEmbedding),
  match_threshold: 0.3,
  match_count: 5,
});

if (error) {
  console.error("RPC error:", error.message);
  process.exit(1);
}

console.log(`Found ${data.length} matching chunks:\n`);

for (const chunk of data) {
  console.log(`--- [${chunk.similarity.toFixed(4)}] ${chunk.section_title} ---`);
  console.log(`    Source: ${chunk.source_file}`);
  console.log(`    Metadata: ${JSON.stringify(chunk.metadata)}`);
  console.log(`    Content: ${chunk.content.substring(0, 200)}...`);
  console.log();
}
