import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { setupSearchHandlers } from './handlers/search.handler';
import { setupImportHandlers } from './handlers/import.handler';
import { setupLLMProviderHandlers } from './handlers/llm-provider.handler';
import { RAGHandler } from './handlers/rag.handler';
import { setupStatisticsHandlers } from './handlers/statistics.handler';
import { VectorStore } from './services/vector-store';
import Logger from './services/logger';
import { StatisticsService } from './services/statistics.service';

const logger = Logger.getInstance();
const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
    logger.info('Creating main window...');
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false // Temporarily disable for development
        }
    });

    if (isDev) {
        // In development, load from the dist directory
        const indexPath = path.join(__dirname, 'renderer', 'index.html');
        logger.debug(`Loading development index from: ${indexPath}`);
        mainWindow.loadFile(indexPath);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    }

    logger.info('Main window created successfully');
    return mainWindow;
}

async function initializeApp() {
    try {
        logger.info('Initializing application...');
        
        // Initialize vector store first as other services depend on it
        const vectorStore = await VectorStore.create();
        const db = vectorStore['db'].getDatabase();
        
        // Setup handlers in specific order
        logger.info('Setting up handlers...');
        
        // 1. Setup search handlers (core functionality)
        await setupSearchHandlers(vectorStore);
        
        let statsHandler: any = null;
        if (!StatisticsService.isInitialized()) {
            // 2. Setup statistics handler (core functionality)
            statsHandler = setupStatisticsHandlers(db);
        }
        
        // 3. Setup import handlers (depends on search and stats)
        await setupImportHandlers(vectorStore, statsHandler);
        
        // 4. Setup LLM provider handlers (depends on database)
        await setupLLMProviderHandlers(db);
        
        // 5. Initialize and setup RAG handler
        const ragHandler = new RAGHandler();
        await ragHandler.initialize();
        
        logger.info('All handlers initialized successfully');
        
        // Create main window
        const mainWindow = await createWindow();
        
        // Setup app event handlers
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });

        app.on('before-quit', async () => {
            logger.info('Application shutting down...');
            await vectorStore.close();
        });

    } catch (error) {
        logger.error('Failed to initialize application:', error as Error);
        app.quit();
    }
}

// Initialize app when ready
app.whenReady()
    .then(initializeApp)
    .catch((error) => {
        logger.error('Failed to start application:', error as Error);
        app.quit();
    });
