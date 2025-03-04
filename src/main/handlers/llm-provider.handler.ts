import { ipcMain } from 'electron';
import { Database } from 'better-sqlite3';
import { LLMProviderService } from '../services/llm-provider.service';
import Logger from '../services/logger';
import { 
    CreateLLMProviderRequest, 
    UpdateLLMProviderRequest,
    LLMProviderType,
    LLMConfig
} from '../../shared/types/llm-provider';

const logger = Logger.getInstance();

export function setupLLMProviderHandlers(db: Database) {
    const service = new LLMProviderService(db);

    // Get all providers
    ipcMain.handle('llm-provider:list', async () => {
        try {
            logger.debug('llm-provider:list handler called');
            const result = await service.getProviders();
            return result.providers;
        } catch (error: any) {
            logger.error('Error in llm-provider:list handler:', error as Error);
            throw error;
        }
    });

    // Get default provider
    ipcMain.handle('llm-provider:get-default', async () => {
        try {
            logger.debug('llm-provider:get-default handler called');
            const defaultProvider = await service.getDefaultProvider();
            if (defaultProvider) {
                return defaultProvider;
            }
            
            // If no default provider exists, try to get the first provider
            const result = await service.getProviders();
            if (result.success && result.providers.length > 0) {
                // Return the first provider as default
                return result.providers[0];
            }
            
            // Return a mock default provider if no providers exist
            return {
                id: 'default',
                name: 'Default Provider',
                type: 'anthropic',
                config: {
                    apiKey: '',
                    model: 'claude-2'
                },
                isEnabled: true
            };
        } catch (error: any) {
            logger.error('Error in llm-provider:get-default handler:', error as Error);
            throw error;
        }
    });

    // Get provider by ID
    ipcMain.handle('llm-provider:get-by-id', async (_, id: number) => {
        try {
            logger.debug(`llm-provider:get-by-id handler called with id: ${id}`);
            const provider = await service.getProviderById(id);
            if (provider) {
                return provider;
            }
            throw new Error(`Provider not found with id: ${id}`);
        } catch (error: any) {
            logger.error(`Error in llm-provider:get-by-id handler for id ${id}:`, error as Error);
            throw error;
        }
    });

    // Create provider
    ipcMain.handle('llm-provider:create', async (_, request: CreateLLMProviderRequest) => {
        try {
            logger.debug(`llm-provider:create handler called with request: ${JSON.stringify(request)}`);
            return await service.createProvider(request);
        } catch (error: any) {
            logger.error(`Error in llm-provider:create handler:`, error as Error);
            throw error;
        }
    });

    // Update provider
    ipcMain.handle('llm-provider:update', async (_, id: number, request: UpdateLLMProviderRequest) => {
        try {
            logger.debug(`llm-provider:update handler called with id: ${id}, request: ${JSON.stringify(request)}`);
            return await service.updateProvider(id, request);
        } catch (error: any) {
            logger.error(`Error in llm-provider:update handler for id ${id}:`, error as Error);
            throw error;
        }
    });

    // Delete provider
    ipcMain.handle('llm-provider:delete', async (_, id: number) => {
        try {
            logger.debug(`llm-provider:delete handler called with id: ${id}`);
            return await service.deleteProvider(id);
        } catch (error: any) {
            logger.error(`Error in llm-provider:delete handler for id ${id}:`, error as Error);
            throw error;
        }
    });

    // Set default provider
    ipcMain.handle('llm-provider:set-default', async (_, id: number) => {
        try {
            logger.debug(`llm-provider:set-default handler called with id: ${id}`);
            return await service.setDefault(id);
        } catch (error: any) {
            logger.error(`Error in llm-provider:set-default handler for id ${id}:`, error as Error);
            throw error;
        }
    });

    // Test provider
    ipcMain.handle('llm-provider:test', async (_, id: number, prompt: string) => {
        try {
            logger.debug(`llm-provider:test handler called with id: ${id}, prompt: ${prompt}`);
            return await service.testProvider(id, prompt);
        } catch (error: any) {
            logger.error(`Error in llm-provider:test handler for id ${id}:`, error as Error);
            throw error;
        }
    });

    // Update last used timestamp
    ipcMain.handle('llm-provider:update-last-used', async (_, id: number) => {
        try {
            logger.debug(`llm-provider:update-last-used handler called with id: ${id}`);
            await service.updateLastUsed(id);
            return true;
        } catch (error: any) {
            logger.error(`Error in llm-provider:update-last-used handler for id ${id}:`, error as Error);
            throw error;
        }
    });

    // Get available models
    ipcMain.handle('llm-provider:get-available-models', async (_, type: LLMProviderType, config: LLMConfig) => {
        try {
            logger.debug(`llm-provider:get-available-models handler called with type: ${type}`);
            return await service.getAvailableModels(type, config);
        } catch (error: any) {
            logger.error(`Error in llm-provider:get-available-models handler for type ${type}:`, error as Error);
            throw error;
        }
    });

    // Validate config
    ipcMain.handle('llm-provider:validate-config', async (_, type: LLMProviderType, config: LLMConfig) => {
        try {
            logger.debug(`llm-provider:validate-config handler called with type: ${type}`);
            return await service.validateConfig(type, config);
        } catch (error: any) {
            logger.error(`Error in llm-provider:validate-config handler for type ${type}:`, error as Error);
            throw error;
        }
    });

    // Test connection
    ipcMain.handle('llm-provider:test-connection', async (_, providerId: number) => {
        try {
            logger.debug(`llm-provider:test-connection handler called with providerId: ${providerId}`);
            return await service.testConnection(providerId);
        } catch (error: any) {
            logger.error(`Error in llm-provider:test-connection handler for providerId ${providerId}:`, error as Error);
            throw error;
        }
    });

    logger.info('LLM Provider handlers initialized');
}