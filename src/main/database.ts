import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

// Simple console logger
export const logger = {
  info: (...args: any[]) => console.log(...args),
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args),
  debug: (...args: any[]) => console.debug(...args)
};

// Default providers
export const defaultProviders = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'anthropic',
    apiKey: '',
    baseUrl: 'https://api.anthropic.com',
    models: [
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000 },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', contextWindow: 200000 },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', contextWindow: 200000 },
      { id: 'claude-2.1', name: 'Claude 2.1', contextWindow: 200000 },
      { id: 'claude-2.0', name: 'Claude 2.0', contextWindow: 100000 },
      { id: 'claude-instant-1.2', name: 'Claude Instant 1.2', contextWindow: 100000 }
    ],
    isEnabled: true
  },
  {
    id: 'ollama',
    name: 'Ollama',
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    models: [
      { id: 'llama2', name: 'Llama 2', contextWindow: 4096 },
      { id: 'mistral', name: 'Mistral', contextWindow: 8192 },
      { id: 'codellama', name: 'Code Llama', contextWindow: 16384 }
    ],
    isEnabled: true
  }
];

// Get the database path
export function getDatabasePath() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'vectordb.sqlite');
  logger.info(`Database path: ${dbPath}`);
  return dbPath;
}

// Check if the database exists
export function databaseExists() {
  const dbPath = getDatabasePath();
  return fs.existsSync(dbPath);
}

// Get providers from the database
export function getProviders() {
  // If the database doesn't exist, return the default providers
  if (!databaseExists()) {
    logger.info('Database does not exist, returning default providers');
    return defaultProviders;
  }

  // Otherwise, return the default providers for now
  // In a real implementation, we would query the database
  logger.info('Database exists, but we are returning default providers for simplicity');
  return defaultProviders;
}

// Setup database
export function setupDatabase() {
  logger.info('Setting up database...');
  
  // Check if the database exists
  if (databaseExists()) {
    logger.info('Database already exists');
    return;
  }

  // In a real implementation, we would create the database and tables
  logger.info('Database does not exist, would create it in a real implementation');
}