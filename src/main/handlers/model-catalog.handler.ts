import { ipcMain } from 'electron';
import { ModelCatalogService } from '../services/model-catalog.service';
import { DatabaseManager } from '../services/database';
import Logger from '../services/logger';

export class ModelCatalogHandler {
    private service!: ModelCatalogService;
    private logger: Logger;
    private initialized: boolean = false;

    constructor() {
        this.logger = Logger.getInstance();
    }

    async initialize() {
        if (this.initialized) {
            return this;
        }

        try {
            const db = DatabaseManager.getInstance().getDatabase();
            this.service = new ModelCatalogService(db);
            this.registerHandlers();
            this.initialized = true;
            return this;
        } catch (error) {
            this.logger.error('Failed to initialize model catalog handler:', error as Error);
            throw error;
        }
    }

    private registerHandlers(): void {
        // Get provider types
        ipcMain.handle('model-catalog:getProviderTypes', async () => {
            try {
                this.logger.debug('model-catalog:getProviderTypes handler called');
                return await this.service.getProviderTypes();
            } catch (error) {
                this.logger.error('Error in model-catalog:getProviderTypes handler:', error as Error);
                throw error;
            }
        });

        // Create provider
        ipcMain.handle('model-catalog:createProvider', async (_, provider: any) => {
            try {
                this.logger.debug(`model-catalog:createProvider handler called with provider: ${JSON.stringify(provider)}`);
                return await this.service.createProvider(provider);
            } catch (error) {
                this.logger.error('Error in model-catalog:createProvider handler:', error as Error);
                throw error;
            }
        });

        // Update provider
        ipcMain.handle('model-catalog:updateProvider', async (_, id: number, provider: any) => {
            try {
                this.logger.debug(`model-catalog:updateProvider handler called with id: ${id}, provider: ${JSON.stringify(provider)}`);
                return await this.service.updateProvider(id, provider);
            } catch (error) {
                this.logger.error(`Error in model-catalog:updateProvider handler for id ${id}:`, error as Error);
                throw error;
            }
        });

        // Delete provider
        ipcMain.handle('model-catalog:deleteProvider', async (_, id: number) => {
            try {
                this.logger.debug(`model-catalog:deleteProvider handler called with id: ${id}`);
                return await this.service.deleteProvider(id);
            } catch (error) {
                this.logger.error(`Error in model-catalog:deleteProvider handler for id ${id}:`, error as Error);
                throw error;
            }
        });

        // Toggle provider
        ipcMain.handle('model-catalog:toggleProvider', async (_, id: number, isEnabled: boolean) => {
            try {
                this.logger.debug(`model-catalog:toggleProvider handler called with id: ${id}, isEnabled: ${isEnabled}`);
                return await this.service.toggleProvider(id, isEnabled);
            } catch (error) {
                this.logger.error(`Error in model-catalog:toggleProvider handler for id ${id}:`, error as Error);
                throw error;
            }
        });

        // Get provider models
        ipcMain.handle('model-catalog:getProviderModels', async (_, providerId: number) => {
            try {
                this.logger.debug(`model-catalog:getProviderModels handler called with providerId: ${providerId}`);
                return await this.service.getProviderModels(providerId);
            } catch (error) {
                this.logger.error(`Error in model-catalog:getProviderModels handler for providerId ${providerId}:`, error as Error);
                throw error;
            }
        });

        // Refresh provider models
        ipcMain.handle('model-catalog:refreshProviderModels', async (_, providerId: number) => {
            try {
                this.logger.debug(`model-catalog:refreshProviderModels handler called with providerId: ${providerId}`);
                return await this.service.refreshProviderModels(providerId);
            } catch (error) {
                this.logger.error(`Error in model-catalog:refreshProviderModels handler for providerId ${providerId}:`, error as Error);
                throw error;
            }
        });
    }
}