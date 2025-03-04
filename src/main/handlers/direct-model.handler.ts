import { ipcMain } from 'electron';
import fetch from 'node-fetch';
import Logger from '../services/logger';

export class DirectModelHandler {
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
            this.registerHandlers();
            this.initialized = true;
            return this;
        } catch (error) {
            this.logger.error('Failed to initialize direct model handler:', error as Error);
            throw error;
        }
    }

    private registerHandlers(): void {
        // Test connection to Ollama server
        ipcMain.handle('direct-model:test-connection', async (_, endpoint: string) => {
            try {
                this.logger.debug(`direct-model:test-connection handler called with endpoint: ${endpoint}`);
                
                // Normalize the endpoint URL
                let normalizedEndpoint = endpoint.endsWith('/') 
                    ? endpoint.slice(0, -1) 
                    : endpoint;
                
                // Ensure the endpoint has a protocol; if not, default to http://
                if (!normalizedEndpoint.startsWith("http://") && !normalizedEndpoint.startsWith("https://")) {
                    normalizedEndpoint = "http://" + normalizedEndpoint;
                }
                
                const response = await fetch(`${normalizedEndpoint}/api/tags`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 5000
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return { success: true, message: 'Connection successful' };
            } catch (error) {
                const err = error as Error;
                this.logger.error('Error in direct-model:test-connection handler:', err);
                return { 
                    success: false, 
                    error: err.message.includes('ECONNREFUSED') 
                        ? 'Could not connect to Ollama server. Is it running?' 
                        : err.message 
                };
            }
        });

        // List models from Ollama server
        ipcMain.handle('direct-model:list-models', async (_, endpoint: string) => {
            try {
                this.logger.debug(`direct-model:list-models handler called with endpoint: ${endpoint}`);
                
                // Normalize the endpoint URL
                let normalizedEndpoint = endpoint.endsWith('/') 
                    ? endpoint.slice(0, -1) 
                    : endpoint;
                
                // Ensure the endpoint has a protocol; if not, default to http://
                if (!normalizedEndpoint.startsWith("http://") && !normalizedEndpoint.startsWith("https://")) {
                    normalizedEndpoint = "http://" + normalizedEndpoint;
                }
                
                const response = await fetch(`${normalizedEndpoint}/api/tags`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 5000
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json() as { models: Array<{ name: string }> };
                const models = data.models.map(model => model.name);
                
                return { success: true, models };
            } catch (error) {
                const err = error as Error;
                this.logger.error('Error in direct-model:list-models handler:', err);
                return { 
                    success: false, 
                    models: [],
                    error: err.message.includes('ECONNREFUSED') 
                        ? 'Could not connect to Ollama server. Is it running?' 
                        : err.message 
                };
            }
        });

        // Generate response from Ollama model
        ipcMain.handle('direct-model:generate-response', async (_, endpoint: string, model: string, prompt: string) => {
            try {
                this.logger.debug(`direct-model:generate-response handler called with endpoint: ${endpoint}, model: ${model}`);
                
                // Normalize the endpoint URL
                let normalizedEndpoint = endpoint.endsWith('/') 
                    ? endpoint.slice(0, -1) 
                    : endpoint;
                
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
                        model,
                        prompt,
                        stream: false
                    }),
                    timeout: 30000 // 30 second timeout
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json() as { response: string };
                
                return { success: true, response: data.response };
            } catch (error) {
                const err = error as Error;
                this.logger.error('Error in direct-model:generate-response handler:', err);
                return { 
                    success: false, 
                    error: err.message.includes('ECONNREFUSED') 
                        ? 'Could not connect to Ollama server. Is it running?' 
                        : err.message 
                };
            }
        });
    }
}