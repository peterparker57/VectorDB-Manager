/**
 * LLM Provider Types
 * 
 * This file contains types for LLM providers and their configurations.
 */

export interface LLMProvider {
  id?: number;
  name: string;
  type: string;
  config: OllamaConfig | AnthropicConfig | OpenAIConfig;
  isEnabled?: boolean;
}

export interface OllamaConfig {
  endpoint: string;
  model: string;
}

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface LLMResponse {
  success: boolean;
  response?: string;
  error?: string;
}

export interface LLMConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface LLMProviderListResponse {
  success: boolean;
  providers?: LLMProvider[];
  error?: string;
}

// Type guard functions
export function isOllamaConfig(config: any): config is OllamaConfig {
  return config && typeof config === 'object' && 'endpoint' in config && 'model' in config;
}

export function isAnthropicConfig(config: any): config is AnthropicConfig {
  return config && typeof config === 'object' && 'apiKey' in config && 'model' in config;
}

export function isOpenAIConfig(config: any): config is OpenAIConfig {
  return config && typeof config === 'object' && 'apiKey' in config && 'model' in config;
}
