# Knowledge Base

Markdown files in this folder are the source content for Maribel's RAG (Retrieval-Augmented Generation) system. Each file is chunked into semantic sections and embedded using OpenAI's `text-embedding-3-small` model, then stored in the `knowledge_chunks` Supabase table.

## Files

- `programs.md` — All program details, pricing, schedules, locations
- `faq.md` — 30+ frequently asked questions and answers
- `enrollment-process.md` — Step-by-step enrollment flow
- `events.md` — Upcoming events (update seasonally)
- `chunking-guide.md` — How content is chunked for RAG

## Updating Content

1. Edit the relevant `.md` file
2. Run the ingestion script: `scripts/ingest_knowledge_base.sh`
3. Or trigger re-embedding via the admin UI's Knowledge Editor

## Chunking Rules

- Chunks are split by semantic section (headings, topics), not arbitrary character count
- Target: 200-800 tokens per chunk
- Each chunk should be self-contained and answerable
- See `chunking-guide.md` for full guidelines
