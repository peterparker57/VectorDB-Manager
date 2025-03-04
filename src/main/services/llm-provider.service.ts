import { Database } from 'better-sqlite3';
import fetch, { RequestInit } from 'node-fetch';
import Logger from './logger';
import { AnthropicAPI } from './anthropic-api';
import { testOllamaConnection, checkOllamaModelExists } from './ollama-utils';
import {
    LLMProvider,
    CreateLLMProviderRequest,
    UpdateLLMProviderRequest,
    LLMProviderResponse,
    LLMProvidersResponse,
    LLMConfig,
    LLMProviderType,
    OllamaResponse,
    ModelsResponse,
    isOllamaConfig,
    isAnthropicConfig,
    createConfigFromProviderType,
    determineProviderType,
    extractModelFromConfig,
    OllamaConfig,
    AnthropicConfig
} from '../../shared/types/llm-provider';

interface LLMProviderRow {
    id: number;
    provider_type_id: number;
    name: string;
    model: string;
    isDefault: number;
    createdAt: string;
    lastUsed: string | null;
}

interface ProviderTypeRow {
    id: number;
    name: string;
    description: string | null;
    api_key: string | null;
    api_endpoint: string | null;
    api_config: string | null;
    is_enabled: number;
    created_at: string;
    last_used: string | null;
}

// Helper function to create a timeout signal
function createTimeoutSignal(timeoutMs: number): RequestInit['signal'] {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    controller.signal.addEventListener('abort', () => clearTimeout(timeoutId));
    return controller.signal as RequestInit['signal'];
}

// Type guard for partial config types
function isPartialOllamaConfig(config: Partial<LLMConfig>): config is Partial<OllamaConfig> {
    return 'endpoint' in config || !('apiKey' in config);
}

function isPartialAnthropicConfig(config: Partial<LLMConfig>): config is Partial<AnthropicConfig> {
    return 'apiKey' in config || !('endpoint' in config);
}

export class LLMProviderService {
    private db: Database;
    private logger: Logger;
    private anthropicApi: AnthropicAPI;

    constructor(db: Database) {
        this.db = db;
        this.logger = Logger.getInstance();
        this.anthropicApi = new AnthropicAPI();
    }

    /**
     * Create a new LLM provider
     */
    async createProvider(request: CreateLLMProviderRequest): Promise<LLMProviderResponse> {
        try {
            const { name, type, config, isDefault = false } = request;
            
            // Extract model from config
            const model = extractModelFromConfig(config);
            
            // Find or create provider type
            let providerTypeId: number;
            
            if (request.providerTypeId) {
                // Use the provided provider type ID
                providerTypeId = request.providerTypeId;
                
                // Update the provider type with any new information
                if (type === 'ollama' && isOllamaConfig(config)) {
                    const updateStmt = this.db.prepare(`
                        UPDATE provider_types
                        SET api_endpoint = ?
                        WHERE id = ?
                    `);
                    updateStmt.run(config.endpoint, providerTypeId);
                } else if (type === 'anthropic' && isAnthropicConfig(config)) {
                    const updateStmt = this.db.prepare(`
                        UPDATE provider_types
                        SET api_key = ?
                        WHERE id = ?
                    `);
                    updateStmt.run(config.apiKey, providerTypeId);
                }
            } else {
                // Determine provider type name
                let providerTypeName: string;
                let apiKey: string | null = null;
                let apiEndpoint: string | null = null;
                
                if (type === 'ollama') {
                    providerTypeName = 'Ollama';
                    apiEndpoint = isOllamaConfig(config) ? config.endpoint : 'http://localhost:11434';
                } else if (type === 'anthropic') {
                    providerTypeName = 'Anthropic';
                    apiKey = isAnthropicConfig(config) ? config.apiKey : null;
                } else {
                    providerTypeName = name;
                }
                
                // Check if provider type exists
                const findTypeStmt = this.db.prepare(`
                    SELECT id FROM provider_types WHERE name = ?
                `);
                
                const existingType = findTypeStmt.get(providerTypeName) as { id: number } | undefined;
                
                if (existingType) {
                    providerTypeId = existingType.id;
                    
                    // Update API key/endpoint if provided
                    if (apiKey !== null || apiEndpoint !== null) {
                        const updateTypeStmt = this.db.prepare(`
                            UPDATE provider_types
                            SET api_key = COALESCE(?, api_key),
                                api_endpoint = COALESCE(?, api_endpoint)
                            WHERE id = ?
                        `);
                        
                        updateTypeStmt.run(apiKey, apiEndpoint, providerTypeId);
                    }
                } else {
                    // Create new provider type
                    const createTypeStmt = this.db.prepare(`
                        INSERT INTO provider_types (
                            name, description, api_key, api_endpoint, is_enabled
                        ) VALUES (?, ?, ?, ?, 1)
                    `);
                    
                    const typeResult = createTypeStmt.run(
                        providerTypeName,
                        `${providerTypeName} provider`,
                        apiKey,
                        apiEndpoint
                    );
                    
                    providerTypeId = typeResult.lastInsertRowid as number;
                }
            }

            this.logger.info(`Creating new LLM provider: ${name}, type: ${type}, model: ${model}, provider_type_id: ${providerTypeId}`);

            // If this provider is to be default, unset current default
            if (isDefault) {
                await this.unsetCurrentDefault();
            }

            const stmt = this.db.prepare(`
                INSERT INTO llm_providers (
                    provider_type_id, name, model, is_default, created_at
                ) VALUES (?, ?, ?, ?, DATETIME('now'))
            `);

            const result = stmt.run(
                providerTypeId,
                name,
                model,
                isDefault ? 1 : 0
            );
            
            const provider = await this.getProviderById(result.lastInsertRowid as number);
            
            this.logger.info(`Created new LLM provider: ${name}`);
            return { success: true, provider: provider || undefined };
        } catch (error) {
            const err = error as Error;
            this.logger.error('Error creating LLM provider:', err);
            this.logger.error(`Error details: ${err.message}, Stack: ${err.stack}`);
            return { success: false, error: `Failed to create model: ${err.message}` };
        }
    }

    /**
     * Get all LLM providers
     */
    async getProviders(): Promise<LLMProvidersResponse> {
        try {
            const stmt = this.db.prepare(`
                SELECT lp.id, lp.provider_type_id, lp.name, lp.model, 
                       lp.is_default as isDefault, lp.created_at as createdAt, 
                       lp.last_used as lastUsed,
                       pt.name as providerTypeName, pt.api_key, pt.api_endpoint
                FROM llm_providers lp
                JOIN provider_types pt ON lp.provider_type_id = pt.id
                ORDER BY lp.is_default DESC, lp.name ASC
            `);

            const rows = stmt.all() as any[];
            const providers: LLMProvider[] = rows.map(row => {
                // Determine provider type
                const type = determineProviderType(row.providerTypeName);
                
                // Create config based on provider type
                let config: LLMConfig;
                if (type === 'ollama') {
                    config = {
                        endpoint: row.api_endpoint || 'http://localhost:11434',
                        model: row.model
                    };
                } else if (type === 'anthropic') {
                    config = {
                        apiKey: row.api_key || '',
                        model: row.model
                    };
                } else {
                    config = { model: row.model } as any;
                }
                
                return {
                    id: row.id,
                    name: row.name,
                    type,
                    config,
                    providerTypeId: row.provider_type_id,
                    isDefault: Boolean(row.isDefault),
                    createdAt: row.createdAt,
                    lastUsed: row.lastUsed || undefined
                };
            });

            return { success: true, providers };
        } catch (error) {
            this.logger.error('Error getting LLM providers:', error as Error);
            return { success: false, providers: [], error: 'Failed to get LLM providers' };
        }
    }

    /**
     * Get provider by ID
     */
    async getProviderById(id: number): Promise<LLMProvider | null> {
        try {
            this.logger.debug(`LLMProviderService.getProviderById called with ID: ${id}`);
            const stmt = this.db.prepare(`
                SELECT lp.id, lp.provider_type_id, lp.name, lp.model, 
                       lp.is_default as isDefault, lp.created_at as createdAt, 
                       lp.last_used as lastUsed,
                       pt.name as providerTypeName, pt.api_key, pt.api_endpoint
                FROM llm_providers lp
                JOIN provider_types pt ON lp.provider_type_id = pt.id
                WHERE lp.id = ?
            `);

            const row = stmt.get(id) as any;
            
            this.logger.debug(`LLMProviderService.getProviderById raw result: ${JSON.stringify(row)}`);
            
            if (!row) {
                this.logger.debug(`LLMProviderService.getProviderById: No provider found with ID ${id}`);
                return null;
            }

            // Determine provider type
            const type = determineProviderType(row.providerTypeName);
            
            // Create config based on provider type
            let config: LLMConfig;
            if (type === 'ollama') {
                config = {
                    endpoint: row.api_endpoint || 'http://localhost:11434',
                    model: row.model
                };
            } else if (type === 'anthropic') {
                config = {
                    apiKey: row.api_key || '',
                    model: row.model
                };
            } else {
                config = { model: row.model } as any;
            }

            const provider: LLMProvider = {
                id: row.id,
                name: row.name,
                type,
                config,
                providerTypeId: row.provider_type_id,
                isDefault: Boolean(row.isDefault),
                createdAt: row.createdAt,
                lastUsed: row.lastUsed || undefined
            };

            this.logger.debug(`LLMProviderService.getProviderById returning provider: ${JSON.stringify({
                ...provider,
                config: type === 'anthropic' ? { ...provider.config, apiKey: '[REDACTED]' } : provider.config
            })}`);
            
            // Specifically check for Anthropic provider and API key
            if (type === 'anthropic') {
                if (isAnthropicConfig(config)) {
                    this.logger.debug(`LLMProviderService.getProviderById: Anthropic provider has API key: ${config.apiKey ? 'Yes' : 'No'}`);
                    if (config.apiKey) {
                        this.logger.debug(`LLMProviderService.getProviderById: API key length: ${config.apiKey.length}`);
                        this.logger.debug(`LLMProviderService.getProviderById: API key first 5 chars: ${config.apiKey.substring(0, 5)}`);
                    }
                } else {
                    this.logger.debug(`LLMProviderService.getProviderById: Anthropic provider has invalid config structure`);
                }
            }

            return provider;
        } catch (error) {
            this.logger.error(`Error getting LLM provider ${id}:`, error as Error);
            return null;
        }
    }

    /**
     * Get available models for a provider type
     */
    async getAvailableModels(type: LLMProviderType, config: LLMConfig): Promise<ModelsResponse> {
        try {
            let models: string[] = [];

            if (type === 'ollama' && isOllamaConfig(config)) {
                models = await this.getInstalledModels(config.endpoint);
            } else if (type === 'anthropic' && isAnthropicConfig(config)) {
                models = await this.anthropicApi.getModels(config.apiKey);
            } else {
                throw new Error(`Unsupported provider type: ${type}`);
            }

            return { success: true, models };
        } catch (error) {
            this.logger.error('Error getting available models:', error as Error);
            return { 
                success: false, 
                models: [],
                error: error instanceof Error ? error.message : 'Failed to get models'
            };
        }
    }

    /**
     * Validate provider configuration
     */
    async validateConfig(type: LLMProviderType, config: LLMConfig): Promise<boolean> {
        try {
            if (type === 'ollama' && isOllamaConfig(config)) {
                this.logger.debug(`Validating Ollama config with endpoint: ${config.endpoint}`);
                await this.getInstalledModels(config.endpoint);
                this.logger.debug(`Ollama config validation successful`);
                return true;
            } else if (type === 'anthropic' && isAnthropicConfig(config)) {
                this.logger.debug(`Validating Anthropic config with API key: ${config.apiKey.substring(0, 5)}...`);
                const isValid = await this.anthropicApi.validateApiKey(config.apiKey);
                this.logger.debug(`Anthropic config validation ${isValid ? 'successful' : 'failed'}`);
                return await this.anthropicApi.validateApiKey(config.apiKey);
            }
            return false;
        } catch (error) {
            this.logger.error(`Config validation failed:`, error as Error);
            return false;
        }
    }

    /**
     * Update an existing LLM provider
     */
    async updateProvider(id: number, request: UpdateLLMProviderRequest): Promise<LLMProviderResponse> {
        try {
            const provider = await this.getProviderById(id);
            this.logger.debug(`LLMProviderService.updateProvider: Current provider: ${JSON.stringify(provider)}`);
            if (!provider) {
                return { success: false, error: 'Provider not found' };
            }

            // Start a transaction
            this.db.transaction(() => {
                // Update provider_type if needed
                if (provider.providerTypeId && request.config) {
                    const updateTypeStmt = this.db.prepare(`
                        UPDATE provider_types
                        SET api_key = COALESCE(?, api_key),
                            api_endpoint = COALESCE(?, api_endpoint)
                        WHERE id = ?
                    `);
                    
                    let apiKey: string | null = null;
                    let apiEndpoint: string | null = null;
                    
                    if (provider.type === 'ollama' && isOllamaConfig(provider.config) && 
                        isPartialOllamaConfig(request.config) && request.config.endpoint) {
                        apiEndpoint = request.config.endpoint;
                    } else if (provider.type === 'anthropic' && isAnthropicConfig(provider.config) && 
                               isPartialAnthropicConfig(request.config) && request.config.apiKey) {
                        apiKey = request.config.apiKey;
                    }
                    
                    updateTypeStmt.run(apiKey, apiEndpoint, provider.providerTypeId);
                }
                
                // Update llm_provider
                const updates: string[] = [];
                const values: any[] = [];
                
                if (request.name !== undefined) {
                    updates.push('name = ?');
                    values.push(request.name);
                }
                
                if (request.config) {
                    let model: string | undefined;
                    
                    if (provider.type === 'ollama' && isOllamaConfig(provider.config) && 
                        isPartialOllamaConfig(request.config) && request.config.model) {
                        model = request.config.model;
                    } else if (provider.type === 'anthropic' && isAnthropicConfig(provider.config) && 
                               isPartialAnthropicConfig(request.config) && request.config.model) {
                        model = request.config.model;
                    }
                    
                    if (model) {
                        updates.push('model = ?');
                        values.push(model);
                    }
                }
                
                if (request.isDefault !== undefined) {
                    if (request.isDefault) {
                        this.unsetCurrentDefault();
                    }
                    updates.push('is_default = ?');
                    values.push(request.isDefault ? 1 : 0);
                }
                
                if (updates.length > 0) {
                    const updateStmt = this.db.prepare(`
                        UPDATE llm_providers
                        SET ${updates.join(', ')}
                        WHERE id = ?
                    `);
                    
                    values.push(id);
                    updateStmt.run(...values);
                }
            })();

            const updatedProvider = await this.getProviderById(id);
            this.logger.debug(`LLMProviderService.updateProvider: Updated provider: ${JSON.stringify(updatedProvider)}`);
            this.logger.info(`Updated LLM provider: ${id}`);
            
            return { success: true, provider: updatedProvider || undefined };
        } catch (error) {
            this.logger.error(`Error updating LLM provider ${id}:`, error as Error);
            return { success: false, error: 'Failed to update LLM provider' };
        }
    }

    /**
     * Delete an LLM provider
     */
    async deleteProvider(id: number): Promise<LLMProviderResponse> {
        try {
            const provider = await this.getProviderById(id);
            if (!provider) {
                return { success: false, error: 'Provider not found' };
            }

            // Don't allow deleting the default provider
            if (provider.isDefault) {
                return { success: false, error: 'Cannot delete default provider' };
            }

            const stmt = this.db.prepare('DELETE FROM llm_providers WHERE id = ?');
            stmt.run(id);

            this.logger.info(`Deleted LLM provider: ${id}`);
            return { success: true };
        } catch (error) {
            this.logger.error(`Error deleting LLM provider ${id}:`, error as Error);
            return { success: false, error: 'Failed to delete LLM provider' };
        }
    }

    /**
     * Set a provider as default
     */
    async setDefault(id: number): Promise<LLMProviderResponse> {
        try {
            const provider = await this.getProviderById(id);
            if (!provider) {
                return { success: false, error: 'Provider not found' };
            }

            await this.unsetCurrentDefault();

            const stmt = this.db.prepare(`
                UPDATE llm_providers
                SET is_default = 1
                WHERE id = ?
            `);
            stmt.run(id);

            const updatedProvider = await this.getProviderById(id);
            this.logger.info(`Set default LLM provider: ${id}`);
            
            return { success: true, provider: updatedProvider || undefined };
        } catch (error) {
            this.logger.error(`Error setting default LLM provider ${id}:`, error as Error);
            return { success: false, error: 'Failed to set default provider' };
        }
    }

    /**
     * Get the current default provider
     */
    async getDefaultProvider(): Promise<LLMProvider | null> {
        try {
            const stmt = this.db.prepare(`
                SELECT lp.id, lp.provider_type_id, lp.name, lp.model, 
                       lp.is_default as isDefault, lp.created_at as createdAt, 
                       lp.last_used as lastUsed,
                       pt.name as providerTypeName, pt.api_key, pt.api_endpoint
                FROM llm_providers lp
                JOIN provider_types pt ON lp.provider_type_id = pt.id
                WHERE lp.is_default = 1
                LIMIT 1
            `);

            const row = stmt.get() as any;
            
            if (!row) {
                return null;
            }

            // Determine provider type
            const type = determineProviderType(row.providerTypeName);
            
            // Create config based on provider type
            let config: LLMConfig;
            if (type === 'ollama') {
                config = {
                    endpoint: row.api_endpoint || 'http://localhost:11434',
                    model: row.model
                };
            } else if (type === 'anthropic') {
                config = {
                    apiKey: row.api_key || '',
                    model: row.model
                };
            } else {
                config = { model: row.model } as any;
            }

            const provider: LLMProvider = {
                id: row.id,
                name: row.name,
                type,
                config,
                providerTypeId: row.provider_type_id,
                isDefault: Boolean(row.isDefault),
                createdAt: row.createdAt,
                lastUsed: row.lastUsed || undefined
            };

            return provider;
        } catch (error) {
            this.logger.error('Error getting default LLM provider:', error as Error);
            return null;
        }
    }

    /**
     * Update last used timestamp for a provider
     */
    async updateLastUsed(id: number): Promise<void> {
        try {
            const stmt = this.db.prepare(`
                UPDATE llm_providers
                SET last_used = DATETIME('now')
                WHERE id = ?
            `);
            stmt.run(id);
        } catch (error) {
            this.logger.error(`Error updating last used timestamp for provider ${id}:`, error as Error);
        }
    }

    /**
     * Get list of installed Ollama models
     */
    private async getInstalledModels(endpoint: string): Promise<string[]> {
        try {
            if (!endpoint) {
                this.logger.error('Endpoint is empty');
                throw new Error('Endpoint is required');
            }

            // Normalize the endpoint URL to ensure it doesn't have a trailing slash
            let normalizedEndpoint = endpoint.endsWith('/') 
                ? endpoint.slice(0, -1) 
                : endpoint;
            
            // Ensure the endpoint has a protocol; if not, default to http://
            if (!normalizedEndpoint.startsWith("http://") && !normalizedEndpoint.startsWith("https://")) {
                normalizedEndpoint = "http://" + normalizedEndpoint;
            }

            // Test the connection to the Ollama server first
            const isConnected = await testOllamaConnection(normalizedEndpoint);
            if (!isConnected) {
                throw new Error(`Could not connect to Ollama server at ${normalizedEndpoint}. Please check if the service is running.`);
            }

            const apiUrl = `${normalizedEndpoint}/api/tags`;
            this.logger.debug(`Original endpoint: ${endpoint}`);
            this.logger.debug(`Fetching models from: ${apiUrl}`);

            const response = await fetch(`${normalizedEndpoint}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: createTimeoutSignal(10000)
            });

            this.logger.debug(`Response status: ${response.status}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            try {
                const data = JSON.parse(text) as { models: Array<{ name: string }> };
                this.logger.debug(`Found ${data.models.length} models`);
                return data.models.map(model => model.name);
            } catch (parseError) {
                this.logger.warn(`Failed to parse JSON response from Ollama API: ${parseError}`);
                // Attempt to extract model names using regex
                const modelNames = text.match(/"name":"([^"]*)"/g)?.map(match => match.replace(/^"name":"|"$/g, '')) || [];
                if (modelNames.length === 0) {
                    throw new Error('Failed to parse model list from Ollama API');
                }
                return modelNames;
            }
        } catch (error) {
            this.logger.error('Error getting installed models:', error as Error);
            const err = error as Error;
            this.logger.debug(`Error message: ${err.message}`);
            this.logger.debug(`Error stack: ${err.stack}`);
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

            if (provider.type === 'ollama' && isOllamaConfig(provider.config)) {
                try {
                    // Normalize the endpoint URL
                    let normalizedEndpoint = provider.config.endpoint.endsWith('/') 
                        ? provider.config.endpoint.slice(0, -1) 
                        : provider.config.endpoint;
                    
                    // Ensure the endpoint has a protocol; if not, default to http://
                    if (!normalizedEndpoint.startsWith("http://") && !normalizedEndpoint.startsWith("https://")) {
                        normalizedEndpoint = "http://" + normalizedEndpoint;
                    }

                    const response = await fetch(`${normalizedEndpoint}/api/generate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: provider.config.model,
                            prompt: prompt || 'Hello, can you hear me?'
                        }),
                        signal: createTimeoutSignal(10000)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const text = await response.text();
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
            } else if (provider.type === 'anthropic' && isAnthropicConfig(provider.config)) {
                result = await this.anthropicApi.generateResponse(
                    provider.config.apiKey,
                    provider.config.model,
                    prompt
                );
            } else {
                return { success: false, error: 'Invalid provider configuration' };
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

    /**
     * Generate a response using the LLM provider
     */
    async generateResponse(prompt: string, provider: LLMProvider): Promise<string> {
        try {
            let result: string;

            this.logger.debug(`LLMProviderService.generateResponse called with provider ID: ${provider.id}`);
            this.logger.debug(`Generating response with provider: ${provider.name} (${provider.type}), ID: ${provider.id}`);
            this.logger.debug(`Provider config: ${JSON.stringify(provider.config)}`);

            if (provider.type === 'ollama' && isOllamaConfig(provider.config)) {
                // Normalize the endpoint URL to ensure it has a protocol and no trailing slash
                let normalizedEndpoint = provider.config.endpoint.endsWith('/') 
                    ? provider.config.endpoint.slice(0, -1) 
                    : provider.config.endpoint;
                
                // Ensure the endpoint has a protocol; if not, default to http://
                if (!normalizedEndpoint.startsWith("http://") && !normalizedEndpoint.startsWith("https://")) {
                    normalizedEndpoint = "http://" + normalizedEndpoint;
                }

                // Test the connection to the Ollama server first
                const isConnected = await testOllamaConnection(normalizedEndpoint);
                if (!isConnected) {
                    this.logger.error(`Could not connect to Ollama server at ${normalizedEndpoint}`);
                    throw new Error(`Could not connect to Ollama server at ${normalizedEndpoint}. Please check if the service is running.`);
                }

                // Check if the model exists
                const modelExists = await checkOllamaModelExists(normalizedEndpoint, provider.config.model);
                if (!modelExists) {
                    this.logger.error(`Model ${provider.config.model} does not exist on Ollama server at ${normalizedEndpoint}`);
                    throw new Error(`Model ${provider.config.model} does not exist on Ollama server. Please check the model name or pull the model first.`);
                }
                
                this.logger.debug(`Using Ollama endpoint: ${normalizedEndpoint}, model: ${provider.config.model}`);

                const response = await fetch(`${normalizedEndpoint}/api/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: provider.config.model,
                        prompt: prompt
                    }),
                    signal: createTimeoutSignal(30000) // 30 second timeout for RAG
                });
                this.logger.debug(`Ollama response status: ${response.status}`);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const text = await response.text();
                const lines = text.split('\n').filter(line => line.trim());
                let finalResponse = '';
                
                for (const line of lines) {
                    const data = JSON.parse(line);
                    finalResponse += data.response;
                }
                
                result = finalResponse || 'No response content';
            } else if (provider.type === 'anthropic' && isAnthropicConfig(provider.config)) {
                // Add debug logging to see what's happening with the API key
                this.logger.debug(`Using Anthropic model: ${provider.config.model}`);
                const apiKey = provider.config.apiKey;
                this.logger.debug(`LLMProviderService.generateResponse: API Key length: ${apiKey ? apiKey.length : 0}`);
                this.logger.debug(`LLMProviderService.generateResponse: API Key first 5 chars: ${apiKey ? apiKey.substring(0, 5) : 'none'}`);

                if (!apiKey) {
                    // Try to get the provider again directly from the database to ensure we have the latest config
                    if (provider.id) {
                        this.logger.debug(`LLMProviderService.generateResponse: Attempting to reload provider ${provider.id} from database`);
                        const refreshedProvider = await this.getProviderById(provider.id);
                        this.logger.debug(`LLMProviderService.generateResponse: Reloaded provider: ${JSON.stringify(refreshedProvider)}`);
                        if (refreshedProvider && 
                            refreshedProvider.type === 'anthropic' && 
                            isAnthropicConfig(refreshedProvider.config)) {
                            this.logger.debug(`LLMProviderService.generateResponse: Successfully reloaded provider with type: ${refreshedProvider.type}`);
                            if (refreshedProvider.config.apiKey) {
                                this.logger.debug(`LLMProviderService.generateResponse: Reloaded provider has API key of length: ${refreshedProvider.config.apiKey.length}`);
                                provider = refreshedProvider;
                            } else {
                                this.logger.debug(`LLMProviderService.generateResponse: Reloaded provider has no API key`);
                                throw new Error(`Anthropic API key is missing. Please check your provider configuration.`);
                            }
                        } else {
                            this.logger.debug(`LLMProviderService.generateResponse: Reloaded provider is not valid Anthropic provider`);
                            throw new Error(`Anthropic API key is missing. Please check your provider configuration.`);
                        }
                    } else {
                        this.logger.debug(`LLMProviderService.generateResponse: Provider has no ID, cannot reload`);
                        throw new Error(`Anthropic API key is missing. Please check your provider configuration.`);
                    }
                }

                result = await this.anthropicApi.generateResponse(
                    isAnthropicConfig(provider.config) ? provider.config.apiKey.trim() : '',
                    provider.config.model,
                    prompt
                );
            } else {
                throw new Error(`Invalid provider configuration`);
            }

            // Update last used timestamp
            if (provider.id !== undefined) {
                await this.updateLastUsed(provider.id);
            }

            return result;
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Error generating response with provider ${provider.id}:`, err);
            this.logger.error(`Error details: ${err.message}`);
            if (err.stack) {
                this.logger.debug(`Error stack: ${err.stack}`);
            }
            
            // Check for specific error types to provide better diagnostics
            if (err.message.includes('ECONNREFUSED')) {
                this.logger.error(`Connection refused error. Provider endpoint may be incorrect or service not running.`);
                if (provider.type === 'ollama' && isOllamaConfig(provider.config)) {
                    this.logger.error(`Ollama endpoint: ${provider.config.endpoint}`);
                }
            } else if (err.message.includes('timeout') || err.message.includes('abort')) {
                this.logger.error(`Request timed out. The operation took too long to complete.`);
            }
            
            throw error instanceof Error ? error : new Error('Failed to generate response');
        }
    }

    /**
     * Test connection to a provider
     */
    async testConnection(providerId: number): Promise<{ success: boolean; message: string; details?: string }> {
        try {
            this.logger.info(`Testing connection to provider ID: ${providerId}`);

            const provider = await this.getProviderById(providerId);
            if (!provider) {
                return { 
                    success: false, 
                    message: `Provider with ID ${providerId} not found` 
                };
            }

            this.logger.info(`Testing connection to ${provider.name} (${provider.type})`);

            if (provider.type === 'ollama' && isOllamaConfig(provider.config)) {
                // Normalize the endpoint URL
                let normalizedEndpoint = provider.config.endpoint.endsWith('/') 
                    ? provider.config.endpoint.slice(0, -1) 
                    : provider.config.endpoint;
                
                // Ensure the endpoint has a protocol; if not, default to http://
                if (!normalizedEndpoint.startsWith("http://") && !normalizedEndpoint.startsWith("https://")) {
                    normalizedEndpoint = "http://" + normalizedEndpoint;
                }
                
                this.logger.info(`Testing Ollama connection to ${normalizedEndpoint}`);

                try {
                    // Use the improved testOllamaConnection function to test the connection
                    const isConnected = await testOllamaConnection(normalizedEndpoint);
                    if (!isConnected) {
                        return { 
                            success: false, 
                            message: `Could not connect to Ollama server at ${normalizedEndpoint}`,
                            details: "Please check if the Ollama service is running and the endpoint is correct."
                        };
                    }
                    
                    // Now check if the model exists
                    const modelExists = await checkOllamaModelExists(normalizedEndpoint, provider.config.model);
                    if (!modelExists) {
                        return { 
                            success: false, 
                            message: `Model ${provider.config.model} does not exist on Ollama server`,
                            details: "Please check the model name or pull the model first."
                     };
                       }
                    
                    return { 
                        success: true, 
                        message: `Successfully connected to Ollama server at ${normalizedEndpoint} and verified model ${provider.config.model} exists.`
                    };
                } catch (error) {
                    const err = error as Error;
                    this.logger.error(`Error testing Ollama connection:`, err);
                    return { 
                        success: false, 
                        message: `Error testing connection to Ollama server`,
                        details: err.message
                    };
                }
            } else if (provider.type === 'anthropic' && isAnthropicConfig(provider.config)) {
                try {
                    const isValid = await this.anthropicApi.validateApiKey(provider.config.apiKey);
                    if (!isValid) {
                        return { 
                            success: false, 
                            message: "Invalid Anthropic API key",
                            details: "The API key was rejected by the Anthropic API."
                        };
                    }
                    
                    return { 
                        success: true, 
                        message: "Successfully connected to Anthropic API and validated API key."
                    };
                } catch (error) {
                    const err = error as Error;
                    return { 
                        success: false, 
                        message: "Failed to connect to Anthropic API",
                        details: err.message
                    };
                }
            } else {
                return { 
                    success: false, 
                    message: `Unsupported provider type: ${provider.type}`,
                    details: "Only Ollama and Anthropic providers are currently supported."
                };
            }
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Error testing connection to provider ${providerId}:`, err);
            return { 
                success: false, 
                message: "An unexpected error occurred while testing the connection",
                details: err.message
            };
        }
    }

    /**
     * Unset the current default provider
     */
    private async unsetCurrentDefault(): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE llm_providers
            SET is_default = 0
            WHERE is_default = 1
        `);
        stmt.run();
    }
}