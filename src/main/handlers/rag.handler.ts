import { ipcMain } from 'electron';
import { RAGService } from '../services/rag.service';
import { VectorStore } from '../services/vector-store';
import { LLMProviderService } from '../services/llm-provider.service';
import { DatabaseManager } from '../services/database';
import Logger from '../services/logger';

export class RAGHandler {
    private ragService!: RAGService;
    private llmProviderService!: LLMProviderService;
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
            const vectorStore = await VectorStore.create();
            this.llmProviderService = new LLMProviderService(db);
            this.ragService = new RAGService(vectorStore, this.llmProviderService);
            this.registerHandlers();
            this.initialized = true;
            return this;
        } catch (error) {
            this.logger.error('Failed to initialize RAG handler:', error as Error);
            throw error;
        }
    }

    private registerHandlers(): void {
        ipcMain.handle('rag:ask-question', async (_, query: string, providerId?: number) => {
            try {
                this.logger.info(`RAG handler: Asking question with provider ID: ${providerId || 'default'}`);

                // Always require a provider ID
                if (!providerId) {
                    this.logger.error(`RAG handler: No provider ID specified`);
                    return {
                        success: false,
                        error: 'No LLM provider selected. Please select a provider from the dropdown.'
                    };
                }

                // Validate the specified provider exists
                try {
                    const provider = await this.llmProviderService.getProviderById(providerId);
                    if (!provider) {
                        this.logger.error(`RAG handler: Provider with ID ${providerId} not found`);
                        return {
                            success: false,
                            error: `Selected LLM provider (ID: ${providerId}) not found. Please select a valid provider.`
                        };
                    }
                    this.logger.info(`RAG handler: Using provider ${provider.name} (${provider.type})`);
                } catch (err) {
                    this.logger.error(`RAG handler: Error getting provider with ID ${providerId}: ${err}`);
                    return {
                        success: false,
                        error: `Error retrieving the selected LLM provider. Please try again or select a different provider.`
                    };
                }
                
                // Generate the response using the specified provider
                try {
                    const result = await this.ragService.askQuestion(query, providerId);
                    this.logger.debug('RAG response generated successfully');
                    this.logger.debug(`RAG prompt: ${result.prompt.substring(0, 100)}...`);
                    return { success: true, response: result.response, prompt: result.prompt };
                } catch (error) {
                    const err = error as Error;
                    this.logger.error(`Error in RAG handler: ${err.message}`);
                    
                    // Provide more specific error messages
                    let errorMessage = err.message;
                    if (err.message.includes('ECONNREFUSED') || err.message.includes('connect')) {
                        errorMessage = `Connection error: Could not connect to the LLM provider. Please check if the service is running.`;
                    } else if (err.message.includes('timeout') || err.message.includes('abort')) {
                        errorMessage = `Request timed out: The LLM provider took too long to respond. Please try again later.`;
                    } else if (err.message.includes('model')) {
                        errorMessage = `Model error: The selected model may not be available. ${err.message}`;
                    }
                    
                    return {
                        success: false,
                        error: errorMessage
                    };
                }
            } catch (error) {
                const err = error as Error;
                this.logger.error(`Unexpected error in RAG handler: ${err.message}`);
                if (err.stack) {
                    this.logger.debug(`Error stack: ${err.stack}`);
                }
                
                return {
                    success: false,
                    error: `An unexpected error occurred: ${err.message}`
                };
            }
        });
    }
}