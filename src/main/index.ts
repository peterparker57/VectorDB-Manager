// Updated to store dbManager reference and improve initialization
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { VectorStore } from './services/vector-store';
import { DatabaseManager } from './services/database';
import Logger from './services/logger';
import { setupLLMProviderHandlers } from './handlers/llm-provider.handler';

// Initialize database first
const dbManager = DatabaseManager.getInstance();
logger.info('Initializing database...');
refs.dbManager = dbManager;
await dbManager.initialize();
logger.info('Database initialized successfully');