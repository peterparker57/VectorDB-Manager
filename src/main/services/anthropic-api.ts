import fetch, { RequestInit } from 'node-fetch';
import { AnthropicModelsResponse } from '../../shared/types/llm-provider';
import Logger from './logger';

// Helper function to create a timeout signal
function createTimeoutSignal(timeoutMs: number): RequestInit['signal'] {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    controller.signal.addEventListener('abort', () => clearTimeout(timeoutId));
    return controller.signal as RequestInit['signal'];
}

export class AnthropicAPI {
    private logger: Logger;
    private baseUrl = 'https://api.anthropic.com/v1';
    private modelListCache: { models: string[]; timestamp: number } | null = null;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.logger = Logger.getInstance();
    }

    /**
     * Validate API key by attempting to list models
     */
    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            await this.getModels(apiKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get available models from Anthropic
     */
    async getModels(apiKey: string): Promise<string[]> {
        try {
            this.logger.debug('Getting Anthropic models...');

            // Check cache first
            if (this.modelListCache && 
                Date.now() - this.modelListCache.timestamp < this.CACHE_TTL) {
                this.logger.debug('Returning cached models');
                return this.modelListCache.models;
            }

            this.logger.debug('Making request to Anthropic API...');
            this.logger.debug(`API Key type: ${typeof apiKey}`);
            this.logger.debug(`API Key length: ${apiKey ? apiKey.length : 0}`);
            this.logger.debug(`API Key first 5 chars: ${apiKey && apiKey.length > 5 ? apiKey.substring(0, 5) : 'none'}`);
            
            const response = await fetch(`${this.baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                signal: createTimeoutSignal(10000)
            });

            this.logger.debug(`Response status: ${response.status}`);
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error('Anthropic API error response', new Error(errorText));
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const responseText = await response.text();
            this.logger.debug(`Raw response: ${responseText}`);

            let data: any;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                this.logger.error('Failed to parse JSON response:', parseError as Error);
                throw new Error('Invalid JSON response from Anthropic API');
            }

            this.logger.debug(`Parsed response: ${JSON.stringify(data, null, 2)}`);

            // Extract models from the response, handling different possible formats
            let models: string[] = [];
            
            if (data && Array.isArray(data.models)) {
                // Standard format: { models: [ { id: "...", name: "...", ... }, ... ] }
                models = data.models.map((model: any) => model.id || model.name);
            } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
                // Alternative format: { data: [ { id: "...", ... }, ... ] }
                models = data.data.map((model: any) => model.id || model.name);
            } else if (data && Array.isArray(data)) {
                // Simple array format: [ { id: "...", ... }, ... ]
                models = data.map((model: any) => model.id || model.name);
            } else {
                this.logger.warn(`Unexpected response format from Anthropic API: ${JSON.stringify(data)}`);
                this.logger.warn(`Unexpected response format: ${JSON.stringify(data)}`);
                this.logger.warn(`Falling back to default models`);
                models = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1', 'claude-2.0', 'claude-instant-1.2'];
            }
            
            this.logger.debug(`Found models: ${models.join(', ')}`);

            
            // Update cache
            this.modelListCache = {
                models,
                timestamp: Date.now()
            }

            return models;
        } catch (error: any) {
            this.logger.error('Error getting Anthropic models:', error as Error);
            if (error.stack) {
                this.logger.error('Stack trace:', error as Error);
            }
            
            // Return default models on error to ensure the application still works
            const defaultModels = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1', 'claude-2.0', 'claude-instant-1.2'];
            this.logger.debug(`Using default models due to error: ${defaultModels.join(', ')}`);

            this.modelListCache = {
                models: defaultModels,
                timestamp: Date.now()
            };

            return defaultModels;
        }
    }

    /**
     * Generate a response using Anthropic's API
     */
    async generateResponse(apiKey: string, model: string, prompt: string): Promise<string> {
        try {
            this.logger.debug(`Generating response with model: ${model}`);
            this.logger.debug(`API Key type: ${typeof apiKey}`);
            this.logger.debug(`API Key length: ${apiKey ? apiKey.length : 0}`);
            this.logger.debug(`API Key first 5 chars: ${apiKey && apiKey.length > 5 ? apiKey.substring(0, 5) : 'none'}`);
            
            if (!apiKey || apiKey.trim() === '') {
                throw new Error('Anthropic API key is missing. Please check your provider configuration.');
            }
            
            const response = await fetch(`${this.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1024
                }),
                signal: createTimeoutSignal(30000)
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error('Anthropic API error response', new Error(errorText));
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const data = await response.json();
            return data.content[0].text;
        } catch (error: any) {
            this.logger.error('Error generating Anthropic response:', error as Error);
            if (error.stack) {
                this.logger.error('Stack trace:', error as Error);
            }
            throw new Error(`Failed to generate response from Anthropic: ${error.message}`);
        }
    }

    /**
     * Clear the model list cache
     */
    clearCache(): void {
        this.modelListCache = null;
    }
}