-- Migration 002: Model Catalog System

-- Ensure provider_types table has all required columns
ALTER TABLE provider_types ADD COLUMN IF NOT EXISTS api_key TEXT;
ALTER TABLE provider_types ADD COLUMN IF NOT EXISTS api_endpoint TEXT;
ALTER TABLE provider_types ADD COLUMN IF NOT EXISTS api_config TEXT;

-- Ensure provider_models table exists
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

-- Insert default models for Ollama if they don't exist
INSERT OR IGNORE INTO provider_models (provider_type_id, name, description, is_available)
SELECT id, 'llama2', 'Llama 2 model', true
FROM provider_types
WHERE name = 'ollama';

INSERT OR IGNORE INTO provider_models (provider_type_id, name, description, is_available)
SELECT id, 'mistral', 'Mistral model', true
FROM provider_types
WHERE name = 'ollama';

-- Insert default models for Anthropic if they don't exist
INSERT OR IGNORE INTO provider_models (provider_type_id, name, description, is_available)
SELECT id, 'claude-3-opus-20240229', 'Claude 3 Opus - Most powerful model', true
FROM provider_types
WHERE name = 'anthropic';

INSERT OR IGNORE INTO provider_models (provider_type_id, name, description, is_available)
SELECT id, 'claude-3-sonnet-20240229', 'Claude 3 Sonnet - Balanced model', true
FROM provider_types
WHERE name = 'anthropic';

INSERT OR IGNORE INTO provider_models (provider_type_id, name, description, is_available)
SELECT id, 'claude-3-haiku-20240307', 'Claude 3 Haiku - Fast model', true
FROM provider_types
WHERE name = 'anthropic';
