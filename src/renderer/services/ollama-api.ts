/**
 * OllamaApiClient - A client for direct browser-to-Ollama communication
 * 
 * This class provides methods for communicating directly with an Ollama server
 * from the browser using the fetch API, bypassing the Electron main process.
 */
export class OllamaApiClient {
    private baseUrl: string;

    /**
     * Creates a new OllamaApiClient
     * @param baseUrl The base URL of the Ollama server (e.g., "http://localhost:11434")
     */
    constructor(baseUrl: string) {
        // Normalize the base URL to ensure it has the correct protocol and no trailing slash
        this.baseUrl = this.normalizeUrl(baseUrl);
    }

    /**
     * Normalizes a URL to ensure it has the correct protocol and no trailing slash
     * @param url The URL to normalize
     * @returns The normalized URL
     */
    private normalizeUrl(url: string): string {
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }
        
        // Remove trailing slash if present
        return url.endsWith('/') ? url.slice(0, -1) : url;
    }

    /**
     * Tests the connection to the Ollama server
     * @returns A promise that resolves to true if the connection is successful, false otherwise
     */
    public async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error testing connection to Ollama:', error);
            return false;
        }
    }

    /**
     * Lists all available models on the Ollama server
     * @returns A promise that resolves to an array of model names
     */
    public async listModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to list models: ${response.statusText}`);
            }

            const data = await response.json();
            return data.models?.map((model: any) => model.name) || [];
        } catch (error) {
            console.error('Error listing Ollama models:', error);
            throw error;
        }
    }

    /**
     * Tests a specific model on the Ollama server
     * @param model The name of the model to test
     * @returns A promise that resolves to the model's response
     */
    public async testModel(model: string): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    prompt: 'Say "Hello, I am working correctly!"',
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to test model: ${response.statusText}`);
            }

            const data = await response.json();
            return data.response || 'No response received';
        } catch (error) {
            console.error(`Error testing Ollama model ${model}:`, error);
            throw error;
        }
    }

    /**
     * Generates a response from the Ollama server
     * @param model The name of the model to use
     * @param prompt The prompt to send to the model
     * @returns A promise that resolves to the model's response
     */
    public async generateResponse(model: string, prompt: string): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    prompt,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to generate response: ${response.statusText}`);
            }

            const data = await response.json();
            return data.response || 'No response received';
        } catch (error) {
            console.error(`Error generating response from Ollama model ${model}:`, error);
            throw error;
        }
    }

    /**
     * Generates a response with context from the Ollama server
     * @param model The name of the model to use
     * @param prompt The prompt to send to the model
     * @param context The context to provide to the model
     * @returns A promise that resolves to the model's response and the new context
     */
    public async generateResponseWithContext(
        model: string,
        prompt: string,
        context?: number[]
    ): Promise<{ response: string; context: number[] }> {
        try {
            const requestBody: any = {
                model,
                prompt,
                stream: false
            };

            if (context) {
                requestBody.context = context;
            }

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Failed to generate response: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                response: data.response || 'No response received',
                context: data.context || []
            };
        } catch (error) {
            console.error(`Error generating response with context from Ollama model ${model}:`, error);
            throw error;
        }
    }
}