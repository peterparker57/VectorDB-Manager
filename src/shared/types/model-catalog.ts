/**
 * Model Catalog Types
 * 
 * This file contains types for the model catalog system.
 */

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
