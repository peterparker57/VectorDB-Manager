export type LLMProviderType = 'local' | 'cloud' | 'ollama';

export interface LLMConfig {
    model: string;
    apiKey?: string;
    endpoint?: string;
}

export interface OllamaResponse {
    message: {
        role: string;
        content: string;
    };
}

export interface LLMProvider {
    id?: number;
    name: string;
    type: LLMProviderType;
    config: LLMConfig;
    isDefault: boolean;
    createdAt: string;
    lastUsed?: string;
}

export interface CreateLLMProviderRequest {
    name: string;
    type: LLMProviderType;
    config: LLMConfig;
    isDefault?: boolean;
}

export interface UpdateLLMProviderRequest {
    name?: string;
    type?: LLMProviderType;
    config?: Partial<LLMConfig>;
    isDefault?: boolean;
}

export interface UpdateLLMProviderWithId extends UpdateLLMProviderRequest {
    id: number;
}

export interface LLMProviderResponse {
    success: boolean;
    provider?: LLMProvider;
    error?: string;
}

export interface LLMProvidersResponse {
    success: boolean;
    providers: LLMProvider[];
    error?: string;
}