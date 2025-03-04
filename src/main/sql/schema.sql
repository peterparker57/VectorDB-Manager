-- VectorDB Manager Database Schema

-- Vector Store Table
CREATE TABLE IF NOT EXISTS vector_store (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    metadata TEXT NOT NULL,
    embedding BLOB,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Statistics Table
CREATE TABLE IF NOT EXISTS statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_documents INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 0,
    last_import DATETIME,
    last_search DATETIME,
    total_searches INTEGER DEFAULT 0,
    total_rag_queries INTEGER DEFAULT 0,
    last_rag_query DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize Statistics
INSERT OR IGNORE INTO statistics (id) VALUES (1);

-- Provider Types Table
CREATE TABLE IF NOT EXISTS provider_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    api_key TEXT,
    api_endpoint TEXT,
    api_config TEXT,
    is_enabled BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME
);

-- Provider Models Table
CREATE TABLE IF NOT EXISTS provider_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_type_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    cost_per_1m_tokens DECIMAL(10,4),
    is_available BOOLEAN DEFAULT true,
    last_checked DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_type_id) REFERENCES provider_types(id),
    UNIQUE(provider_type_id, name)
);

-- LLM Providers Table
CREATE TABLE IF NOT EXISTS llm_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME
);

-- Insert default providers if they don't exist
INSERT OR IGNORE INTO provider_types (name, description, api_endpoint, is_enabled)
VALUES ('ollama', 'Local Ollama server', 'http://localhost:11434', true);

INSERT OR IGNORE INTO provider_types (name, description, is_enabled)
VALUES ('anthropic', 'Anthropic Claude API', true);

-- Insert default LLM provider if it doesn't exist
INSERT OR IGNORE INTO llm_providers (name, type, config, is_enabled)
VALUES ('Default Ollama', 'ollama', '{"endpoint":"http://localhost:11434","model":"llama2"}', true);
