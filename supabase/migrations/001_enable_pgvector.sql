-- Migration 001: Enable pgvector extension for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;
