# Knowledge Base Chunking Guide

> Guidelines for splitting knowledge base files into semantic chunks for RAG (Retrieval-Augmented Generation) embedding and retrieval.

## Core Principle

Knowledge base files should be chunked **semantically**, not by arbitrary character count. Each chunk should represent a self-contained piece of information that can answer a specific question or cover a specific topic.

## Good Chunking (by topic/section)

- "Learning Pods - Overview and Philosophy" (one chunk)
- "Learning Pods - Tuesday Schedule and Pricing" (one chunk)
- "Learning Pods - Age Groups and Grade Levels" (one chunk)
- "FAQ - Refund Policy" (one chunk)
- "FAQ - What curriculum do you use?" (one chunk)

## Bad Chunking (arbitrary splits)

- First 500 characters of programs.md (cuts mid-sentence)
- Characters 501-1000 of programs.md (no semantic boundary)

## Guidelines

1. **Self-contained**: Each chunk should make sense on its own without needing context from other chunks. Include enough context that a reader (or an AI) can understand the chunk independently.

2. **Topic-focused**: One chunk = one topic. Don't mix pricing with schedule with philosophy in a single chunk.

3. **Target size**: 200-800 tokens per chunk (roughly 150-600 words). Smaller is better for precision; larger is better for context. Aim for the middle ground.

4. **Section titles**: Use the `section_title` field descriptively — it's included in RAG results and helps the AI understand what the chunk is about. Examples:
   - "Learning Pods - Tuesday Pod Schedule and Pricing (Doral)"
   - "FAQ - Refund Policy and Cancellation Terms"
   - "Enrollment Process - Step 2: Free Consultation Call"

5. **Metadata tags**: Use the `metadata` JSONB field for structured tags that enable filtering:
   ```json
   { "program": "pods", "topic": "pricing", "location": "doral" }
   ```
   Common tag keys:
   - `program`: "pods", "online", "microschool", "hub", "coaching", "consulting"
   - `topic`: "pricing", "schedule", "curriculum", "enrollment", "requirements", "faq"
   - `location`: "doral", "kendall", "weston", "online"
   - `audience`: "new_families", "existing_families", "high_school"
   - `seasonal`: "true" (for content that changes seasonally, like events)

6. **Seasonal/temporary content**: Mark content that changes frequently (events, current class catalog, summer camps) with `"seasonal": "true"` in metadata. This makes it easy to identify and update chunks that need regular refresh.

7. **Section boundaries**: Use markdown headers (##, ###) in the source files as natural chunk boundaries. Each H2 or H3 section typically maps to one chunk, though very long sections may need to be split further.

8. **Cross-references**: If a chunk references another topic, include enough context that the reference makes sense. For example, if a pricing chunk mentions "see our refund policy," the pricing chunk should still be self-contained — the reader shouldn't NEED to find the refund policy chunk to understand the pricing.

## Chunk Structure in Database

Each chunk is stored in the `knowledge_chunks` table with:
- `source_file`: Which file the chunk came from (e.g., "programs.md")
- `section_title`: Descriptive title for the chunk
- `content`: The actual text content
- `embedding`: 1536-dimension vector from OpenAI text-embedding-3-small
- `metadata`: JSONB tags for filtering and categorization
- `is_active`: Boolean for soft-delete (deactivate instead of deleting)
- `version`: Auto-incremented on updates

## Updating Chunks

When knowledge base content changes:
1. Update the source .md file
2. Re-run the ingestion script
3. The script will deactivate old chunks from that file and insert new ones
4. Old chunks remain in the database (is_active = false) for audit purposes
5. The `knowledge_versions` table tracks each ingestion run
