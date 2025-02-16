import { Database } from 'better-sqlite3';
import fetch from 'node-fetch';
import Logger from './logger';
import {
    LLMProvider,
    CreateLLMProviderRequest,
    UpdateLLMProviderRequest,
    LLMProviderResponse,
    LLMProvidersResponse,
    LLMConfig,
    LLMProviderType,
    OllamaResponse
} from '../../shared/types/llm-provider';

interface LLMProviderRow {
    id: number;
    name: string;
    type: LLMProviderType;
    config: string;
    isDefault: number;
    createdAt: string;
    lastUsed: string | null;
}

export class LLMProviderService {
    private db: Database;
    private logger: Logger;

    constructor(db: Database) {
        this.db = db;
        this.logger = Logger.getInstance();
    }

    /**
     * Get list of installed Ollama models
     */
    async getInstalledModels(endpoint: string): Promise<string[]> {
        try {
            if (!endpoint) {
                throw new Error('Endpoint is required');
            }

            const response = await fetch(`${endpoint}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as Array<{ name: string }>;
            return data.map(model => model.name);
        } catch (error) {
            this.logger.error('Error getting installed models:', error as Error);
            const err = error as Error;
            if (err.message.includes('ECONNREFUSED')) {
                throw new Error('Could not connect to Ollama server. Is it running?');
            }
            throw new Error(`Failed to get installed models: ${err.message}`);
        }
    }

    /**
     * Test a provider with a prompt
     */
    async testProvider(id: number, prompt: string): Promise<{ success: boolean; result?: string; error?: string }> {
        try {
            const provider = await this.getProviderById(id);
            if (!provider) {
                return { success: false, error: 'Provider not found' };
            }

            let result: string;

            if (provider.type === 'local') {
                try {
                    if (!provider.config.endpoint) {
                        throw new Error('Ollama endpoint not configured');
                    }

                    const response = await fetch(`${provider.config.endpoint}/api/generate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: provider.config.model,
                            prompt: prompt || 'Hello, can you hear me?'
                        }),
                        // Add timeout of 10 seconds
                        signal: AbortSignal.timeout(10000)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    // Read the response as text since it's streamed line by line
                    const text = await response.text();
                    
                    // Split into lines and parse each line as JSON
                    const lines = text.split('\n').filter(line => line.trim());
                    let finalResponse = '';
                    
                    for (const line of lines) {
                        const data = JSON.parse(line);
                        finalResponse += data.response;
                    }
                    
                    result = finalResponse || 'No response content';
                } catch (error) {
                    const err = error as Error;
                    if (err.name === 'AbortError') {
                        throw new Error('Request timed out after 10 seconds');
                    } else if (err.message.includes('ECONNREFUSED')) {
                        throw new Error('Could not connect to Ollama server. Is it running?');
                    } else {
                        throw new Error(`Failed to test Ollama provider: ${err.message}`);
                    }
                }
            } else {
                // For other provider types, keep the placeholder response
                result = `Test response from ${provider.name} (${provider.type}):\n` +
                        `Model: ${provider.config.model}\n` +
                        `Prompt: "${prompt}"\n\n` +
                        `Testing for ${provider.type} providers will be implemented in a future update.`;
            }

            // Update last used timestamp
            await this.updateLastUsed(id);

            return { success: true, result };
        } catch (error) {
            this.logger.error(`Error testing LLM provider ${id}:`, error as Error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to test provider' 
            };
        }
    }
}