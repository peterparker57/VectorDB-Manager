import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { DatabaseManager } from './services/database';
import { SearchHandler } from './handlers/search.handler';
import { RAGHandler } from './handlers/rag.handler';
import { setupLLMProviderHandlers } from './handlers/llm-provider.handler';
import { setupImportHandlers } from './handlers/import.handler';
import { VectorStore } from './services/vector-store';
import Logger from './services/logger';

const logger = Logger.getInstance();

app.on('ready', async () => {
    try {
        logger.info('Initializing application...');
        logger.info(`Current directory: ${__dirname}`);
        
        // Initialize database
        const dbManager = DatabaseManager.getInstance();
        await dbManager.initialize();

        // Initialize vector store
        const vectorStore = await VectorStore.create();
        
        // Initialize handlers
        SearchHandler.getInstance().setupHandlers();
        logger.info('Search handlers initialized');

        // Initialize RAG handler
        const ragHandler = new RAGHandler();
        await ragHandler.initialize();
        logger.info('RAG handlers initialized');
        
        setupLLMProviderHandlers(dbManager.getDatabase());
        await setupImportHandlers(vectorStore, null);
        logger.info('Import handlers initialized');

        // Create the browser window
        const mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true
            }
        });
        logger.info('Browser window created');
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html')).catch(err => logger.error('Failed to load HTML:', err));

        // Open DevTools in development
        mainWindow.webContents.openDevTools();
        
        logger.info('Application initialized successfully');
    } catch (error) {
        logger.error('Stack trace:', new Error((error as Error).stack));
        logger.error('Failed to initialize application:', error as Error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    try {
        const db = DatabaseManager.getInstance();
        db.close();
        logger.info('Application closed successfully');
    } catch (error) {
        logger.error('Error during application shutdown:', error as Error);
    }
});