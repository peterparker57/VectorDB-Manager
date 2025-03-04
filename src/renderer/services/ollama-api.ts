/**
 * OllamaApiClient
 * 
 * A client for interacting with the Ollama API directly from the browser.
 * This bypasses the main process and connects directly to the Ollama server.
 */
export class OllamaApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    // Normalize the base URL to ensure it has the correct protocol and no trailing slash
    this.baseUrl = this.normalizeUrl(baseUrl);
    console.log(`OllamaApiClient initialized with baseUrl: ${this.baseUrl}`);
  }

  private normalizeUrl(url: string): string {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    
    // Remove trailing slash if present
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  /**
   * Test the connection to the Ollama server
   * @returns A boolean indicating whether the connection was successful
   */
  public async testConnection(): Promise<boolean> {
    try {
      console.log(`Testing connection to Ollama server at ${this.baseUrl}`);
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const success = response.ok;
      console.log(`Connection test ${success ? 'successful' : 'failed'}`);
      return success;
    } catch (error) {
      console.error('Error testing connection to Ollama:', error);
      return false;
    }
  }

  /**
   * List all available models from the Ollama server
   * @returns An array of model names
   */
  public async listModels(): Promise<string[]> {
    try {
      console.log(`Listing models from Ollama server at ${this.baseUrl}`);
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
      console.log('Ollama models response:', data);
      
      if (data && Array.isArray(data.models)) {
        const modelNames = data.models.map((model: any) => model.name);
        console.log(`Found ${modelNames.length} models:`, modelNames);
        return modelNames;
      }
      
      return [];
    } catch (error) {
      console.error('Error listing models from Ollama:', error);
      throw error;
    }
  }

  /**
   * Test a specific model by generating a simple response
   * @param model The name of the model to test
   * @returns The generated response
   */
  public async testModel(model: string): Promise<string> {
    try {
      console.log(`Testing model ${model} on Ollama server at ${this.baseUrl}`);
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
      console.log('Ollama test model response:', data);
      return data.response || 'Model responded but returned no content';
    } catch (error) {
      console.error(`Error testing model ${model} on Ollama:`, error);
      throw error;
    }
  }

  /**
   * Generate a response from a model
   * @param model The name of the model to use
   * @param prompt The prompt to send to the model
   * @returns The generated response
   */
  public async generateResponse(model: string, prompt: string): Promise<string> {
    try {
      console.log(`Generating response from model ${model} on Ollama server at ${this.baseUrl}`);
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
      console.log('Ollama generate response:', data);
      return data.response || 'Model responded but returned no content';
    } catch (error) {
      console.error(`Error generating response from model ${model} on Ollama:`, error);
      throw error;
    }
  }

  /**
   * Generate a response from a model with context
   * @param model The name of the model to use
   * @param prompt The prompt to send to the model
   * @param context Optional context from a previous response
   * @returns The generated response and updated context
   */
  public async generateResponseWithContext(
    model: string,
    prompt: string,
    context?: number[]
  ): Promise<{ response: string; context: number[] }> {
    try {
      console.log(`Generating response with context from model ${model} on Ollama server at ${this.baseUrl}`);
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt,
          context,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate response with context: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Ollama generate response with context:', data);
      return {
        response: data.response || 'Model responded but returned no content',
        context: data.context || []
      };
    } catch (error) {
      console.error(`Error generating response with context from model ${model} on Ollama:`, error);
      throw error;
    }
  }
}
