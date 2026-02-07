#!/usr/bin/env node

/**
 * Re-embed All Active Chunks
 *
 * Fetches all active chunks from knowledge_chunks, re-generates embeddings
 * using OpenAI text-embedding-3-small, and updates the rows in place.
 *
 * Usage: node scripts/reembed_all_chunks.js
 *
 * Use this when:
 * - Switching embedding models (update EMBEDDING_MODEL below)
 * - Embeddings seem corrupted or degraded
 * - OpenAI updates the embedding model
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

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 20;

function validateEnv() {
  const required = [
    "OPENAI_API_KEY",
    "SUPABASE_MARIBEL_URL",
    "SUPABASE_MARIBEL_SERVICE_KEY",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

async function main() {
  console.log("=== Re-embedding All Active Chunks ===\n");

  validateEnv();

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const supabase = createClient(
    process.env.SUPABASE_MARIBEL_URL,
    process.env.SUPABASE_MARIBEL_SERVICE_KEY
  );

  // Fetch all active chunks
  console.log("Fetching all active chunks...");
  const { data: chunks, error } = await supabase
    .from("knowledge_chunks")
    .select("id, source_file, section_title, content")
    .eq("is_active", true)
    .order("id");

  if (error) {
    console.error("Error fetching chunks:", error.message);
    process.exit(1);
  }

  console.log(`Found ${chunks.length} active chunks to re-embed.\n`);

  if (chunks.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Process in batches
  let updated = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

    console.log(`Batch ${batchNum}/${totalBatches}: embedding ${batch.length} chunks...`);

    // Generate embeddings
    const texts = batch.map((c) => `${c.section_title}\n\n${c.content}`);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    // Update each chunk with new embedding
    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const embedding = response.data[j].embedding;

      const { error: updateError } = await supabase
        .from("knowledge_chunks")
        .update({ embedding: JSON.stringify(embedding) })
        .eq("id", chunk.id);

      if (updateError) {
        console.error(`  Error updating chunk ${chunk.id}: ${updateError.message}`);
      } else {
        updated++;
        console.log(`  Updated chunk ${chunk.id}: "${chunk.section_title}"`);
      }
    }

    // Rate limit delay between batches
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\n=== Done! Re-embedded ${updated}/${chunks.length} chunks. ===`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
