import fetch, { RequestInit } from 'node-fetch';
import Logger from './logger';

// Helper function to create a timeout signal
function createTimeoutSignal(timeoutMs: number): RequestInit['signal'] {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    controller.signal.addEventListener('abort', () => clearTimeout(timeoutId));
    return controller.signal as RequestInit['signal'];
}

/**
 * Test the connection to an Ollama server
 */
export async function testOllamaConnection(endpoint: string): Promise<boolean> {
    const logger = Logger.getInstance();
    try {
        logger.info(`Testing connection to Ollama server at: ${endpoint}`);
        
        // Normalize the endpoint URL
        let normalizedEndpoint = endpoint.endsWith('/')
            ? endpoint.slice(0, -1)
            : endpoint;
        // Ensure the endpoint has a protocol; if not, default to http://
        if (!normalizedEndpoint.startsWith("http://") && !normalizedEndpoint.startsWith("https://")) {
            normalizedEndpoint = "http://" + normalizedEndpoint;
        }

        logger.info(`Normalized endpoint: ${normalizedEndpoint}`);
        
        // Try the tags endpoint first since we know it works for "Refresh Models"
        const tagsUrl = `${normalizedEndpoint}/api/tags`;
        logger.info(`STEP 1: Trying tags endpoint first: ${tagsUrl}`);
        
        try {
            const tagsResponse = await fetch(tagsUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: createTimeoutSignal(10000)
            });
            
            logger.info(`Tags endpoint response status: ${tagsResponse.status}`);
            
            if (tagsResponse.ok) {
                try {
                    const text = await tagsResponse.text();
                    logger.info(`Tags endpoint response body length: ${text.length} characters`);
                    logger.info(`Tags endpoint response body preview: ${text.substring(0, 100)}...`);
                    
                    try {
                        // Try to parse as JSON to validate it's a proper response
                        JSON.parse(text);
                        logger.info(`Successfully connected to Ollama via tags endpoint and received valid JSON`);
                        return true;
                    } catch (jsonError) {
                        logger.warn(`Tags endpoint returned non-JSON response: ${jsonError}`);
                        
                        // Even if it's not valid JSON, if we got a 200 OK, consider it a success
                        if (text.length > 0) {
                            logger.info(`Tags endpoint returned non-empty response, considering connection successful`);
                            return true;
                        }
                    }
                } catch (textError) {
                    logger.warn(`Error reading tags endpoint response body: ${textError}`);
                    // Still consider it a success if the status was OK
                    logger.info(`Tags endpoint returned OK status, considering connection successful despite body read error`);
                    return true;
                }
            } else {
                logger.warn(`Tags endpoint failed with status: ${tagsResponse.status}`);
                try {
                    const errorText = await tagsResponse.text();
                    logger.warn(`Tags endpoint error response: ${errorText}`);
                } catch (e) {
                    logger.warn(`Could not read tags endpoint error response: ${e}`);
                }
            }
        } catch (tagsError) {
            const err = tagsError as Error;
            logger.warn(`Error connecting to tags endpoint: ${err.message}`);
            if (err.stack) {
                logger.debug(`Tags endpoint error stack: ${err.stack}`);
            }
        }
        
        // If tags endpoint failed, try the API version endpoint
        const apiUrl = `${normalizedEndpoint}/api/version`;
        logger.info(`STEP 2: Trying API version endpoint: ${apiUrl}`);
        
        try {
            const apiResponse = await fetch(apiUrl, {
                method: 'GET',
                signal: createTimeoutSignal(5000)
            });
            
            logger.info(`API version endpoint response status: ${apiResponse.status}`);
            
            if (apiResponse.ok) {
                try {
                    const text = await apiResponse.text();
                    logger.info(`API version response body: ${text}`);
                    return true;
                } catch (e) {
                    logger.warn(`Could not read API version response body: ${e}`);
                    // Still consider it a success if the status was OK
                    return true;
                }
            } else {
                logger.warn(`API version endpoint failed with status: ${apiResponse.status}`);
            }
        } catch (apiError) {
            const err = apiError as Error;
            logger.warn(`Error connecting to API version endpoint: ${err.message}`);
            if (err.stack) {
                logger.debug(`API version endpoint error stack: ${err.stack}`);
            }
        }
        
        // As a last resort, try the root endpoint
        const rootUrl = `${normalizedEndpoint}`;
        logger.info(`STEP 3: Trying root endpoint as last resort: ${rootUrl}`);
        
        try {
            const rootResponse = await fetch(rootUrl, {
                method: 'GET',
                signal: createTimeoutSignal(5000)
            });
            
            logger.info(`Root endpoint response status: ${rootResponse.status}`);
            
            if (rootResponse.ok) {
                try {
                    const rootText = await rootResponse.text();
                    logger.info(`Root endpoint response body: ${rootText}`);
                    
                    // Accept any successful response from the root endpoint
                    return true;
                } catch (e) {
                    logger.warn(`Could not read root endpoint response body: ${e}`);
                    // Still consider it a success if the status was OK
                    return true;
                }
            } else {
                logger.warn(`Root endpoint failed with status: ${rootResponse.status}`);
            }
        } catch (rootError) {
            const err = rootError as Error;
            logger.warn(`Error connecting to root endpoint: ${err.message}`);
            if (err.stack) {
                logger.debug(`Root endpoint error stack: ${err.stack}`);
            }
        }
        
        // If we've tried all endpoints and none worked, return false
        logger.error(`All connection attempts to Ollama server at ${normalizedEndpoint} failed`);
        return false;
    } catch (error) {
        const err = error as Error;
        logger.error(`Unexpected error testing Ollama connection: ${err.message}`);
        if (err.stack) {
            logger.info(`Error stack: ${err.stack}`);
        }
        return false;
    }
}

/**
 * Check if an Ollama model exists on the server
 */
export async function checkOllamaModelExists(endpoint: string, model: string): Promise<boolean> {
    const logger = Logger.getInstance();
    try {
        logger.debug(`Checking if model ${model} exists on Ollama server at: ${endpoint}`);
        
        // Normalize the endpoint URL
        let normalizedEndpoint = endpoint.endsWith('/') 
            ? endpoint.slice(0, -1) 
            : endpoint;

        // Ensure the endpoint has a protocol; if not, default to http://
        if (!normalizedEndpoint.startsWith("http://") && !normalizedEndpoint.startsWith("https://")) {
            normalizedEndpoint = "http://" + normalizedEndpoint;
        }
        
        // First check if we can connect to the server
        const isConnected = await testOllamaConnection(normalizedEndpoint);
        if (!isConnected) {
            logger.error(`Cannot check model existence: Unable to connect to Ollama server at ${normalizedEndpoint}`);
            return false;
        }
        
        // Get the list of models
        const response = await fetch(`${normalizedEndpoint}/api/tags`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: createTimeoutSignal(10000)
        });
        
        if (!response.ok) {
            logger.error(`Failed to get model list: HTTP error ${response.status}`);
            return false;
        }
        
        const text = await response.text();
        try {
            const data = JSON.parse(text) as { models: Array<{ name: string }> };
            const models = data.models.map(m => m.name);
            const exists = models.includes(model);
            logger.debug(`Model ${model} ${exists ? 'exists' : 'does not exist'} on server`);
            return exists;
        } catch (parseError) {
            logger.warn(`Failed to parse JSON response from Ollama API: ${parseError}`);
            // Attempt to extract model names using regex and check
            const modelNames = text.match(/"name":"([^"]*)"/g)?.map(match => match.replace(/^"name":"|"$/g, '')) || [];
            const exists = modelNames.includes(model);
            logger.debug(`Model ${model} ${exists ? 'exists' : 'does not exist'} on server (regex match)`);
            return exists;
        }
    } catch (error) {
        const err = error as Error;
        logger.error(`Error checking if model exists: ${err.message}`);
        return false;
    }
}