#!/usr/bin/env node

/**
 * Knowledge Base Ingestion Script
 *
 * Reads .md files from knowledge-base/, splits into semantic chunks,
 * embeds with OpenAI text-embedding-3-small, and inserts into Supabase knowledge_chunks.
 *
 * Usage: node scripts/ingest_knowledge_base.js [--file <filename.md>]
 *   --file: Optional. Ingest only a specific file instead of all .md files.
 *
 * Credentials come from .env in the project root.
 */

import { readFileSync, readdirSync } from "fs";
import { join, basename, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

// Load .env from project root
config({ path: join(PROJECT_ROOT, ".env") });

// --- Configuration ---
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const KNOWLEDGE_BASE_DIR = join(PROJECT_ROOT, "knowledge-base");
const SKIP_FILES = ["chunking-guide.md", "README.md"]; // Don't ingest non-content files

// --- Validate environment ---
function validateEnv() {
  const required = [
    "OPENAI_API_KEY",
    "SUPABASE_MARIBEL_URL",
    "SUPABASE_MARIBEL_SERVICE_KEY",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    console.error("Make sure your .env file is configured in the project root.");
    process.exit(1);
  }
}

// --- Initialize clients ---
function initClients() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const supabase = createClient(
    process.env.SUPABASE_MARIBEL_URL,
    process.env.SUPABASE_MARIBEL_SERVICE_KEY
  );
  return { openai, supabase };
}

// --- Semantic chunking ---

/**
 * Parse a markdown file into semantic chunks based on heading structure.
 * Each H2 or H3 section becomes a chunk. Very long sections are split
 * at H4 boundaries or paragraph breaks.
 */
function chunkMarkdownFile(content, sourceFile) {
  const lines = content.split("\n");
  const chunks = [];
  let currentH2 = "";
  let currentH3 = "";
  let currentContent = [];
  let currentTitle = "";

  function flushChunk() {
    const text = currentContent.join("\n").trim();
    if (text.length > 0 && currentTitle) {
      chunks.push({
        source_file: sourceFile,
        section_title: currentTitle,
        content: text,
        metadata: extractMetadata(text, currentTitle, sourceFile),
      });
    }
    currentContent = [];
  }

  for (const line of lines) {
    // Top-level H1 — file title, skip as chunk content but use for context
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      continue;
    }

    // H2 — major section boundary
    if (line.startsWith("## ")) {
      flushChunk();
      currentH2 = line.replace(/^## /, "").trim();
      currentH3 = "";
      currentTitle = `${sourceFile.replace(".md", "")} - ${currentH2}`;
      continue;
    }

    // H3 — sub-section boundary (new chunk)
    if (line.startsWith("### ")) {
      flushChunk();
      currentH3 = line.replace(/^### /, "").trim();
      currentTitle = currentH2
        ? `${sourceFile.replace(".md", "")} - ${currentH2} - ${currentH3}`
        : `${sourceFile.replace(".md", "")} - ${currentH3}`;
      continue;
    }

    // H4 — check if current chunk is getting large; if so, split here
    if (line.startsWith("#### ")) {
      const currentText = currentContent.join("\n").trim();
      // Split at H4 if chunk is already substantial (>300 words)
      if (currentText.split(/\s+/).length > 300) {
        flushChunk();
        const h4Title = line.replace(/^#### /, "").trim();
        currentTitle = currentH2
          ? `${sourceFile.replace(".md", "")} - ${currentH2} - ${h4Title}`
          : `${sourceFile.replace(".md", "")} - ${h4Title}`;
        continue;
      }
    }

    currentContent.push(line);
  }

  // Flush last chunk
  flushChunk();

  return chunks;
}

/**
 * Extract metadata tags from chunk content and title.
 */
function extractMetadata(content, title, sourceFile) {
  const meta = {};
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  // Program detection
  const programs = {
    pods: ["pod", "learning pod"],
    online: ["eaton online", "online class", "virtual class", "zoom"],
    microschool: ["microschool"],
    hub: ["eaton hub", "drop-in"],
    coaching: ["coaching", "one-on-one", "tutoring"],
    consulting: ["consulting", "homeschool setup"],
  };

  for (const [slug, keywords] of Object.entries(programs)) {
    if (keywords.some((k) => titleLower.includes(k) || contentLower.includes(k))) {
      meta.program = slug;
      break;
    }
  }

  // Topic detection
  const topics = {
    pricing: ["price", "pricing", "cost", "tuition", "fee", "$", "discount"],
    schedule: ["schedule", "time", "day", "hour", "am", "pm", "monday", "tuesday", "wednesday", "thursday", "friday"],
    curriculum: ["curriculum", "subject", "math", "science", "language arts", "social studies"],
    enrollment: ["enroll", "registration", "register", "sign up", "apply"],
    requirements: ["requirement", "age", "grade", "need", "document", "technology"],
    faq: ["?"],
    events: ["event", "open house", "showcase", "camp", "info session"],
  };

  for (const [topic, keywords] of Object.entries(topics)) {
    if (keywords.some((k) => titleLower.includes(k) || contentLower.includes(k))) {
      meta.topic = topic;
      break;
    }
  }

  // Location detection
  const locations = {
    doral: ["doral"],
    kendall: ["kendall"],
    weston: ["weston"],
    online: ["online", "virtual", "nationwide", "zoom"],
  };

  for (const [loc, keywords] of Object.entries(locations)) {
    if (keywords.some((k) => titleLower.includes(k) || contentLower.includes(k))) {
      meta.location = loc;
      break;
    }
  }

  // Seasonal detection
  if (
    contentLower.includes("[template]") ||
    contentLower.includes("update") ||
    contentLower.includes("season") ||
    sourceFile === "events.md"
  ) {
    meta.seasonal = "true";
  }

  // Source type
  if (sourceFile === "faq.md") meta.topic = "faq";

  return meta;
}

// --- Embedding ---

/**
 * Embed a batch of texts using OpenAI text-embedding-3-small.
 * Processes in batches of 20 to stay within rate limits.
 */
async function embedTexts(openai, texts) {
  const BATCH_SIZE = 20;
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    for (const item of response.data) {
      allEmbeddings.push(item.embedding);
    }

    if (i + BATCH_SIZE < texts.length) {
      // Small delay between batches to respect rate limits
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return allEmbeddings;
}

// --- Database operations ---

/**
 * Deactivate all existing chunks for a given source file.
 */
async function deactivateExistingChunks(supabase, sourceFile) {
  const { error } = await supabase
    .from("knowledge_chunks")
    .update({ is_active: false })
    .eq("source_file", sourceFile)
    .eq("is_active", true);

  if (error) {
    console.error(`  Error deactivating old chunks for ${sourceFile}:`, error.message);
    throw error;
  }
}

/**
 * Insert chunks with embeddings into knowledge_chunks table.
 */
async function insertChunks(supabase, chunks, embeddings) {
  const rows = chunks.map((chunk, i) => ({
    source_file: chunk.source_file,
    section_title: chunk.section_title,
    content: chunk.content,
    embedding: JSON.stringify(embeddings[i]),
    metadata: chunk.metadata,
    is_active: true,
    version: 1,
  }));

  const { data, error } = await supabase
    .from("knowledge_chunks")
    .insert(rows)
    .select("id, section_title");

  if (error) {
    console.error("  Error inserting chunks:", error.message);
    throw error;
  }

  return data;
}

/**
 * Record version entries for ingested chunks.
 * knowledge_versions tracks per-chunk changes: chunk_id, action, changed_by.
 */
async function recordVersions(supabase, insertedChunks) {
  const rows = insertedChunks.map((chunk) => ({
    chunk_id: chunk.id,
    action: "created",
    new_content: chunk.section_title,
    changed_by: "ingest_knowledge_base.js",
  }));

  const { error } = await supabase.from("knowledge_versions").insert(rows);

  if (error) {
    console.warn(`  Warning: Could not record versions:`, error.message);
  }
}

// --- Main ---

async function main() {
  console.log("=== Maribel Knowledge Base Ingestion ===\n");

  validateEnv();
  const { openai, supabase } = initClients();

  // Parse CLI args
  const fileArg = process.argv.indexOf("--file");
  let filesToIngest;

  if (fileArg !== -1 && process.argv[fileArg + 1]) {
    const specificFile = process.argv[fileArg + 1];
    filesToIngest = [specificFile];
    console.log(`Ingesting single file: ${specificFile}\n`);
  } else {
    filesToIngest = readdirSync(KNOWLEDGE_BASE_DIR)
      .filter((f) => f.endsWith(".md") && !SKIP_FILES.includes(f));
    console.log(`Found ${filesToIngest.length} knowledge base files to ingest.\n`);
  }

  let totalChunks = 0;

  for (const file of filesToIngest) {
    console.log(`--- Processing: ${file} ---`);

    // Read file
    const filePath = join(KNOWLEDGE_BASE_DIR, file);
    const content = readFileSync(filePath, "utf-8");
    console.log(`  Read ${content.length} characters`);

    // Chunk semantically
    const chunks = chunkMarkdownFile(content, file);
    console.log(`  Split into ${chunks.length} semantic chunks`);

    if (chunks.length === 0) {
      console.log("  No chunks produced, skipping.\n");
      continue;
    }

    // Log chunk titles
    for (const chunk of chunks) {
      const wordCount = chunk.content.split(/\s+/).length;
      console.log(`    - "${chunk.section_title}" (${wordCount} words)`);
    }

    // Deactivate old chunks for this file
    console.log(`  Deactivating old chunks for ${file}...`);
    await deactivateExistingChunks(supabase, file);

    // Embed all chunks
    console.log(`  Embedding ${chunks.length} chunks with ${EMBEDDING_MODEL}...`);
    const texts = chunks.map((c) => `${c.section_title}\n\n${c.content}`);
    const embeddings = await embedTexts(openai, texts);
    console.log(`  Got ${embeddings.length} embeddings (${EMBEDDING_DIMENSIONS} dimensions each)`);

    // Insert into database
    console.log("  Inserting into knowledge_chunks...");
    const inserted = await insertChunks(supabase, chunks, embeddings);
    console.log(`  Inserted ${inserted.length} chunks (IDs: ${inserted.map((r) => r.id).join(", ")})`);

    // Record version entries
    await recordVersions(supabase, inserted);

    totalChunks += chunks.length;
    console.log();
  }

  console.log(`=== Done! Ingested ${totalChunks} total chunks across ${filesToIngest.length} files. ===`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
