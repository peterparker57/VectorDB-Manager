import { contextBridge, ipcRenderer } from 'electron';

// Log that preload script is running
console.log('Preload script running');

// Define the API for the renderer process
const searchApi = {
  search: async (query: string, filters: any) => {
    console.log('Calling search.search with query:', query);
    try {
      const result = await ipcRenderer.invoke('search:search', query, filters);
      console.log('search.search response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('search.search error:', error);
      return { success: false, error: errorMessage };
    }
  },
  clearDatabase: async () => {
    console.log('Calling search.clearDatabase');
    try {
      const result = await ipcRenderer.invoke('search:clear-database');
      console.log('search.clearDatabase response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('search.clearDatabase error:', error);
      return { success: false, error: errorMessage };
    }
  }
};

const importApi = {
  selectFiles: async () => {
    console.log('Calling import.selectFiles');
    try {
      const result = await ipcRenderer.invoke('import:select-files');
      console.log('import.selectFiles response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('import.selectFiles error:', error);
      return { success: false, error: errorMessage };
    }
  },
  selectFolder: async () => {
    console.log('Calling import.selectFolder');
    try {
      const result = await ipcRenderer.invoke('import:select-folder');
      console.log('import.selectFolder response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('import.selectFolder error:', error);
      return { success: false, error: errorMessage };
    }
  },
  onProgress: (callback: (progress: any) => void) => {
    console.log('Setting up import.onProgress listener');
    const listener = (_event: any, progress: any) => {
      console.log('import.onProgress event received:', progress);
      callback(progress);
    };
    ipcRenderer.on('import:progress', listener);
    return () => {
      console.log('Removing import.onProgress listener');
      ipcRenderer.removeListener('import:progress', listener);
    };
  }
};

const statisticsApi = {
  getStatistics: async () => {
    console.log('Calling statistics.getStatistics');
    try {
      const result = await ipcRenderer.invoke('statistics:get');
      console.log('statistics.getStatistics response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('statistics.getStatistics error:', error);
      return { success: false, error: errorMessage };
    }
  },
  onUpdate: (callback: (stats: any) => void) => {
    console.log('Setting up statistics.onUpdate listener');
    const listener = (_event: any, stats: any) => {
      console.log('statistics.onUpdate event received:', stats);
      callback(stats);
    };
    ipcRenderer.on('statistics:update', listener);
    return () => {
      console.log('Removing statistics.onUpdate listener');
      ipcRenderer.removeListener('statistics:update', listener);
    };
  }
};

const ragApi = {
  askQuestion: async (question: string, context: any) => {
    console.log('Calling rag.askQuestion with question:', question);
    try {
      const result = await ipcRenderer.invoke('rag:ask-question', question, context);
      console.log('rag.askQuestion response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('rag.askQuestion error:', error);
      return { success: false, error: errorMessage };
    }
  }
};

const llmProviderApi = {
  listProviders: async () => {
    console.log('Calling llmProvider.listProviders');
    try {
      const providers = await ipcRenderer.invoke('llm-provider:list');
      console.log('llmProvider.listProviders response:', providers);
      return { success: true, providers };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('llmProvider.listProviders error:', error);
      return { success: false, providers: [], error: errorMessage };
    }
  },
  getProviderById: async (id: number) => {
    console.log('Calling llmProvider.getProviderById with id:', id);
    try {
      const provider = await ipcRenderer.invoke('llm-provider:get-by-id', id);
      console.log('llmProvider.getProviderById response:', provider);
      return provider;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('llmProvider.getProviderById error for id', id, ':', error);
      return null;
    }
  },
  getDefaultProvider: async () => {
    console.log('Calling llmProvider.getDefaultProvider');
    try {
      const provider = await ipcRenderer.invoke('llm-provider:get-default');
      console.log('llmProvider.getDefaultProvider response:', provider);
      return provider;
    } catch (error: unknown) {
      console.error('llmProvider.getDefaultProvider error:', error);
      // Return a mock default provider if the handler is not registered
      return {
        id: 1,
        name: 'Default Ollama Provider',
        type: 'ollama',
        config: {
          endpoint: 'http://localhost:11434',
          model: 'llama2'
        },
        isEnabled: true
      };
    }
  },
  testConnection: async (provider: any) => {
    console.log('Calling llmProvider.testConnection with provider:', provider);
    try {
      const result = await ipcRenderer.invoke('llm-provider:test-connection', provider);
      console.log('llmProvider.testConnection response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('llmProvider.testConnection error:', error);
      return { success: false, error: errorMessage };
    }
  },
  generateResponse: async (provider: any, prompt: string) => {
    console.log('Calling llmProvider.generateResponse with provider:', provider);
    try {
      const result = await ipcRenderer.invoke('llm-provider:generate-response', provider, prompt);
      console.log('llmProvider.generateResponse response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('llmProvider.generateResponse error:', error);
      return { success: false, error: errorMessage };
    }
  }
};

const modelCatalogApi = {
  getProviderTypes: async () => {
    console.log('Calling modelCatalog.getProviderTypes');
    try {
      const types = await ipcRenderer.invoke('model-catalog:getProviderTypes');
      console.log('modelCatalog.getProviderTypes response:', types);
      return types;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('modelCatalog.getProviderTypes error:', error);
      return [];
    }
  },
  createProvider: async (provider: any) => {
    console.log('Calling modelCatalog.createProvider with provider:', provider);
    try {
      const result = await ipcRenderer.invoke('model-catalog:createProvider', provider);
      console.log('modelCatalog.createProvider response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('modelCatalog.createProvider error:', error);
      return { success: false, error: errorMessage };
    }
  },
  updateProvider: async (id: number, provider: any) => {
    console.log('Calling modelCatalog.updateProvider with id:', id, 'provider:', provider);
    try {
      const result = await ipcRenderer.invoke('model-catalog:updateProvider', id, provider);
      console.log('modelCatalog.updateProvider response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('modelCatalog.updateProvider error:', error);
      return { success: false, error: errorMessage };
    }
  },
  deleteProvider: async (id: number) => {
    console.log('Calling modelCatalog.deleteProvider with id:', id);
    try {
      const result = await ipcRenderer.invoke('model-catalog:deleteProvider', id);
      console.log('modelCatalog.deleteProvider response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('modelCatalog.deleteProvider error:', error);
      return { success: false, error: errorMessage };
    }
  },
  toggleProvider: async (id: number, isEnabled: boolean) => {
    console.log('Calling modelCatalog.toggleProvider with id:', id, 'isEnabled:', isEnabled);
    try {
      const result = await ipcRenderer.invoke('model-catalog:toggleProvider', id, isEnabled);
      console.log('modelCatalog.toggleProvider response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('modelCatalog.toggleProvider error:', error);
      return { success: false, error: errorMessage };
    }
  },
  getProviderModels: async (providerId: number) => {
    console.log('Calling modelCatalog.getProviderModels with providerId:', providerId);
    try {
      const models = await ipcRenderer.invoke('model-catalog:getProviderModels', providerId);
      console.log('modelCatalog.getProviderModels response:', models);
      return models;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('modelCatalog.getProviderModels error:', error);
      return [];
    }
  },
  refreshProviderModels: async (providerId: number) => {
    console.log('Calling modelCatalog.refreshProviderModels with providerId:', providerId);
    try {
      const result = await ipcRenderer.invoke('model-catalog:refreshProviderModels', providerId);
      console.log('modelCatalog.refreshProviderModels response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('modelCatalog.refreshProviderModels error:', error);
      return { success: false, error: errorMessage };
    }
  }
};

const directModelApi = {
  testConnection: async (endpoint: string) => {
    console.log('Calling directModel.testConnection with endpoint:', endpoint);
    try {
      const result = await ipcRenderer.invoke('direct-model:test-connection', endpoint);
      console.log('directModel.testConnection response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('directModel.testConnection error:', error);
      return { success: false, error: errorMessage };
    }
  },
  listModels: async (endpoint: string) => {
    console.log('Calling directModel.listModels with endpoint:', endpoint);
    try {
      const result = await ipcRenderer.invoke('direct-model:list-models', endpoint);
      console.log('directModel.listModels response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('directModel.listModels error:', error);
      return { success: false, models: [], error: errorMessage };
    }
  },
  generateResponse: async (endpoint: string, model: string, prompt: string) => {
    console.log('Calling directModel.generateResponse with endpoint:', endpoint, 'model:', model);
    try {
      const result = await ipcRenderer.invoke('direct-model:generate-response', endpoint, model, prompt);
      console.log('directModel.generateResponse response:', result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('directModel.generateResponse error:', error);
      return { success: false, error: errorMessage };
    }
  }
};

// Expose the APIs to the renderer process
contextBridge.exposeInMainWorld('search', searchApi);
contextBridge.exposeInMainWorld('import', importApi);
contextBridge.exposeInMainWorld('statistics', statisticsApi);
contextBridge.exposeInMainWorld('rag', ragApi);
contextBridge.exposeInMainWorld('llmProvider', llmProviderApi);
contextBridge.exposeInMainWorld('modelCatalog', modelCatalogApi);
contextBridge.exposeInMainWorld('directModel', directModelApi);

// Also expose the APIs through electronAPI for backward compatibility
contextBridge.exposeInMainWorld('electronAPI', {
  search: searchApi,
  import: importApi,
  statistics: statisticsApi,
  rag: ragApi,
  llmProvider: llmProviderApi,
  modelCatalog: modelCatalogApi,
  directModel: directModelApi
});

// Log that preload script has completed
console.log('Preload script completed');
