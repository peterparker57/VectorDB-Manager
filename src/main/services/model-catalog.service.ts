import { Database } from 'better-sqlite3';
import Logger from './logger';
import { AnthropicAPI } from './anthropic-api';
import { testOllamaConnection } from './ollama-utils';
import fetch from 'node-fetch';

export interface ProviderType {
    id: number;
    name: string;
    description?: string;
    apiKey?: string;
    apiEndpoint?: string;
    apiConfig?: string;
    isEnabled: boolean;
    createdAt: string;
    lastUsed?: string;
}

export interface ProviderModel {
    id: number;
    providerTypeId: number;
    name: string;
    description?: string;
    costPer1mTokens?: number;
    isAvailable: boolean;
    lastChecked?: string;
    createdAt: string;
}

export interface CreateProviderRequest {
    name: string;
    description?: string;
    apiKey?: string;
    apiEndpoint?: string;
    apiConfig?: string;
}

export interface UpdateProviderRequest {
    name?: string;
    description?: string;
    apiKey?: string;
    apiEndpoint?: string;
    apiConfig?: string;
}

export interface ProviderResponse {
    success: boolean;
    provider?: ProviderType;
    error?: string;
}

export interface ProviderListResponse {
    success: boolean;
    providers?: ProviderType[];
    error?: string;
}

export interface ModelListResponse {
    success: boolean;
    models?: ProviderModel[];
    error?: string;
}

export interface RefreshModelsResponse {
    success: boolean;
    modelsAdded?: number;
    modelsUpdated?: number;
    error?: string;
}

export class ModelCatalogService {
    private db: Database;
    private logger: Logger;
    private anthropicApi: AnthropicAPI;

    constructor(db: Database) {
        this.db = db;
        this.logger = Logger.getInstance();
        this.anthropicApi = new AnthropicAPI();
        this.initializeSchema();
    }

    private initializeSchema(): void {
        try {
            // Ensure provider_types table exists
            this.db.exec(`
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
                )
            `);

            // Ensure provider_models table exists
            this.db.exec(`
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
                )
            `);

            // Insert default provider types if they don't exist
            const insertDefaultProviders = this.db.prepare(`
                INSERT OR IGNORE INTO provider_types (name, description, api_endpoint, is_enabled)
                VALUES (?, ?, ?, ?)
            `);

            // Ollama provider
            insertDefaultProviders.run(
                'Ollama',
                'Local Ollama server',
                'http://localhost:11434',
                1
            );

            // Anthropic provider
            insertDefaultProviders.run(
                'Anthropic',
                'Anthropic Claude API',
                null,
                1
            );

            this.logger.info('Model catalog schema initialized');
        } catch (error) {
            this.logger.error('Error initializing model catalog schema:', error as Error);
        }
    }

    /**
     * Get all provider types
     */
    async getProviderTypes(): Promise<ProviderType[]> {
        try {
            const stmt = this.db.prepare(`
                SELECT id, name, description, api_key, api_endpoint, api_config, 
                       is_enabled as isEnabled, created_at as createdAt, last_used as lastUsed
                FROM provider_types
                ORDER BY name ASC
            `);

            const rows = stmt.all() as any[];
            return rows.map(row => ({
                id: row.id,
                name: row.name,
                description: row.description || undefined,
                apiKey: row.api_key || undefined,
                apiEndpoint: row.api_endpoint || undefined,
                apiConfig: row.api_config || undefined,
                isEnabled: Boolean(row.isEnabled),
                createdAt: row.createdAt,
                lastUsed: row.lastUsed || undefined
            }));
        } catch (error) {
            this.logger.error('Error getting provider types:', error as Error);
            return [];
        }
    }

    /**
     * Get provider type by ID
     */
    async getProviderById(id: number): Promise<ProviderType | null> {
        try {
            const stmt = this.db.prepare(`
                SELECT id, name, description, api_key, api_endpoint, api_config, 
                       is_enabled as isEnabled, created_at as createdAt, last_used as lastUsed
                FROM provider_types
                WHERE id = ?
            `);

            const row = stmt.get(id) as any;
            if (!row) {
                return null;
            }

            return {
                id: row.id,
                name: row.name,
                description: row.description || undefined,
                apiKey: row.api_key || undefined,
                apiEndpoint: row.api_endpoint || undefined,
                apiConfig: row.api_config || undefined,
                isEnabled: Boolean(row.isEnabled),
                createdAt: row.createdAt,
                lastUsed: row.lastUsed || undefined
            };
        } catch (error) {
            this.logger.error(`Error getting provider type ${id}:`, error as Error);
            return null;
        }
    }

    /**
     * Create a new provider type
     */
    async createProvider(request: CreateProviderRequest): Promise<ProviderResponse> {
        try {
            const { name, description, apiKey, apiEndpoint, apiConfig } = request;

            // Check if provider with this name already exists
            const checkStmt = this.db.prepare('SELECT id FROM provider_types WHERE name = ?');
            const existing = checkStmt.get(name) as { id: number } | undefined;

            if (existing) {
                return { success: false, error: `Provider with name '${name}' already exists` };
            }

            const stmt = this.db.prepare(`
                INSERT INTO provider_types (
                    name, description, api_key, api_endpoint, api_config, is_enabled, created_at
                ) VALUES (?, ?, ?, ?, ?, 1, DATETIME('now'))
            `);

            const result = stmt.run(
                name,
                description || null,
                apiKey || null,
                apiEndpoint || null,
                apiConfig || null
            );

            const provider = await this.getProviderById(result.lastInsertRowid as number);

            this.logger.info(`Created new provider type: ${name}`);
            return { success: true, provider: provider || undefined };
        } catch (error) {
            this.logger.error('Error creating provider type:', error as Error);
            return { success: false, error: 'Failed to create provider' };
        }
    }

    /**
     * Update an existing provider type
     */
    async updateProvider(id: number, request: UpdateProviderRequest): Promise<ProviderResponse> {
        try {
            const provider = await this.getProviderById(id);
            if (!provider) {
                return { success: false, error: 'Provider not found' };
            }

            const updates: string[] = [];
            const values: any[] = [];

            if (request.name !== undefined) {
                // Check if another provider with this name already exists
                const checkStmt = this.db.prepare('SELECT id FROM provider_types WHERE name = ? AND id != ?');
                const existing = checkStmt.get(request.name, id) as { id: number } | undefined;

                if (existing) {
                    return { success: false, error: `Another provider with name '${request.name}' already exists` };
                }

                updates.push('name = ?');
                values.push(request.name);
            }

            if (request.description !== undefined) {
                updates.push('description = ?');
                values.push(request.description || null);
            }

            if (request.apiKey !== undefined) {
                updates.push('api_key = ?');
                values.push(request.apiKey || null);
            }

            if (request.apiEndpoint !== undefined) {
                updates.push('api_endpoint = ?');
                values.push(request.apiEndpoint || null);
            }

            if (request.apiConfig !== undefined) {
                updates.push('api_config = ?');
                values.push(request.apiConfig || null);
            }

            if (updates.length === 0) {
                return { success: true, provider };
            }

            const stmt = this.db.prepare(`
                UPDATE provider_types
                SET ${updates.join(', ')}
                WHERE id = ?
            `);

            values.push(id);
            stmt.run(...values);

            const updatedProvider = await this.getProviderById(id);

            this.logger.info(`Updated provider type: ${id}`);
            return { success: true, provider: updatedProvider || undefined };
        } catch (error) {
            this.logger.error(`Error updating provider type ${id}:`, error as Error);
            return { success: false, error: 'Failed to update provider' };
        }
    }

    /**
     * Delete a provider type
     */
    async deleteProvider(id: number): Promise<ProviderResponse> {
        try {
            const provider = await this.getProviderById(id);
            if (!provider) {
                return { success: false, error: 'Provider not found' };
            }

            // Check if there are any models associated with this provider
            const checkStmt = this.db.prepare('SELECT COUNT(*) as count FROM provider_models WHERE provider_type_id = ?');
            const result = checkStmt.get(id) as { count: number };

            if (result.count > 0) {
                // Delete associated models first
                const deleteModelsStmt = this.db.prepare('DELETE FROM provider_models WHERE provider_type_id = ?');
                deleteModelsStmt.run(id);
            }

            // Now delete the provider
            const stmt = this.db.prepare('DELETE FROM provider_types WHERE id = ?');
            stmt.run(id);

            this.logger.info(`Deleted provider type: ${id}`);
            return { success: true };
        } catch (error) {
            this.logger.error(`Error deleting provider type ${id}:`, error as Error);
            return { success: false, error: 'Failed to delete provider' };
        }
    }

    /**
     * Toggle provider enabled/disabled state
     */
    async toggleProvider(id: number, isEnabled: boolean): Promise<ProviderResponse> {
        try {
            const provider = await this.getProviderById(id);
            if (!provider) {
                return { success: false, error: 'Provider not found' };
            }

            const stmt = this.db.prepare(`
                UPDATE provider_types
                SET is_enabled = ?
                WHERE id = ?
            `);

            stmt.run(isEnabled ? 1 : 0, id);

            const updatedProvider = await this.getProviderById(id);

            this.logger.info(`${isEnabled ? 'Enabled' : 'Disabled'} provider type: ${id}`);
            return { success: true, provider: updatedProvider || undefined };
        } catch (error) {
            this.logger.error(`Error toggling provider type ${id}:`, error as Error);
            return { success: false, error: 'Failed to toggle provider' };
        }
    }

    /**
     * Get models for a provider type
     */
    async getProviderModels(providerTypeId: number): Promise<ProviderModel[]> {
        try {
            const stmt = this.db.prepare(`
                SELECT id, provider_type_id as providerTypeId, name, description, 
                       cost_per_1m_tokens as costPer1mTokens, is_available as isAvailable, 
                       last_checked as lastChecked, created_at as createdAt
                FROM provider_models
                WHERE provider_type_id = ?
                ORDER BY name ASC
            `);

            const rows = stmt.all(providerTypeId) as any[];
            return rows.map(row => ({
                id: row.id,
                providerTypeId: row.providerTypeId,
                name: row.name,
                description: row.description || undefined,
                costPer1mTokens: row.costPer1mTokens,
                isAvailable: Boolean(row.isAvailable),
                lastChecked: row.lastChecked || undefined,
                createdAt: row.createdAt
            }));
        } catch (error) {
            this.logger.error(`Error getting models for provider type ${providerTypeId}:`, error as Error);
            return [];
        }
    }

    /**
     * Refresh models for a provider type
     */
    async refreshProviderModels(providerTypeId: number): Promise<RefreshModelsResponse> {
        try {
            const provider = await this.getProviderById(providerTypeId);
            if (!provider) {
                return { success: false, error: 'Provider not found' };
            }

            let models: string[] = [];
            let modelsAdded = 0;
            let modelsUpdated = 0;

            // Get models based on provider type
            if (provider.name.toLowerCase().includes('ollama')) {
                // Get models from Ollama
                models = await this.getOllamaModels(provider.apiEndpoint || 'http://localhost:11434');
            } else if (provider.name.toLowerCase().includes('anthropic')) {
                // Get models from Anthropic
                models = await this.anthropicApi.getModels(provider.apiKey || '');
            } else {
                return { success: false, error: 'Unsupported provider type' };
            }

            // Get existing models
            const existingModels = await this.getProviderModels(providerTypeId);
            const existingModelNames = new Set(existingModels.map(m => m.name));

            // Update or insert models
            const insertStmt = this.db.prepare(`
                INSERT INTO provider_models (
                    provider_type_id, name, description, is_available, last_checked
                ) VALUES (?, ?, ?, 1, DATETIME('now'))
            `);

            const updateStmt = this.db.prepare(`
                UPDATE provider_models
                SET is_available = 1, last_checked = DATETIME('now')
                WHERE provider_type_id = ? AND name = ?
            `);

            for (const model of models) {
                if (existingModelNames.has(model)) {
                    // Update existing model
                    updateStmt.run(providerTypeId, model);
                    modelsUpdated++;
                } else {
                    // Insert new model
                    insertStmt.run(
                        providerTypeId,
                        model,
                        `${provider.name} model: ${model}`
                    );
                    modelsAdded++;
                }
            }

            // Mark models not in the list as unavailable
            const markUnavailableStmt = this.db.prepare(`
                UPDATE provider_models
                SET is_available = 0, last_checked = DATETIME('now')
                WHERE provider_type_id = ? AND name NOT IN (${models.map(() => '?').join(', ')})
            `);

            if (models.length > 0) {
                markUnavailableStmt.run(providerTypeId, ...models);
            }

            this.logger.info(`Refreshed models for provider type ${providerTypeId}: ${modelsAdded} added, ${modelsUpdated} updated`);
            return { success: true, modelsAdded, modelsUpdated };
        } catch (error) {
            this.logger.error(`Error refreshing models for provider type ${providerTypeId}:`, error as Error);
            return { success: false, error: 'Failed to refresh models' };
        }
    }

    /**
     * Get models from Ollama
     */
    private async getOllamaModels(endpoint: string): Promise<string[]> {
        try {
            this.logger.debug(`Getting models from Ollama at ${endpoint}`);
            
            // Normalize the endpoint URL
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

            const response = await fetch(`${normalizedEndpoint}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            try {
                const data = JSON.parse(text) as { models: Array<{ name: string }> };
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
            this.logger.error('Error getting Ollama models:', error as Error);
            throw error;
        }
    }
}