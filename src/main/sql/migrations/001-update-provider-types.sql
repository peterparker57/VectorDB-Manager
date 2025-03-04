-- Migration 001: Update Provider Types

-- Add API key column if it doesn't exist
ALTER TABLE provider_types ADD COLUMN IF NOT EXISTS api_key TEXT;

-- Update Anthropic provider with default API key placeholder
UPDATE provider_types
SET api_key = ''
WHERE name = 'anthropic' AND api_key IS NULL;
