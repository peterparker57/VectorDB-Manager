import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as log from 'electron-log';
import { SearchHandler } from './handlers/search.handler';
import { ImportHandler } from './handlers/import.handler';
import { StatisticsHandler } from './handlers/statistics.handler';
import { RAGHandler } from './handlers/rag.handler';
import { LLMProviderHandler } from './handlers/llm-provider.handler';
import { ModelCatalogHandler } from './handlers/model-catalog.handler';
import { DirectModelHandler } from './handlers/direct-model.handler';

// Configure logger
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';
const logger = log.scope('main');

// Keep a global reference of the window object to avoid garbage collection
let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  logger.info('Creating main window...');
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false // Don't show the window until it's ready
  });

  // Define possible HTML paths to try
  const possiblePaths = [
    path.join(__dirname, '../renderer/index.html'),
    path.join(__dirname, '../../renderer/index.html'),
    path.join(app.getAppPath(), 'dist/renderer/index.html'),
    path.join(process.cwd(), 'dist/renderer/index.html'),
    path.join(process.cwd(), 'simple.html')
  ];

  // Try to load the HTML file from each path
  tryLoadHTML(mainWindow, possiblePaths, 0);

  // Show the window when it's ready to be shown
  mainWindow.once('ready-to-show', () => {
    logger.info('Window ready to show');
    if (mainWindow) {
      mainWindow.show();
      // Open DevTools in development
      if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    logger.info('Window closed');
    mainWindow = null;
  });
}

// Function to try loading HTML from multiple paths
function tryLoadHTML(window: BrowserWindow, paths: string[], index: number) {
  if (index >= paths.length) {
    logger.error('Failed to load HTML from any of the possible paths');
    dialog.showErrorBox(
      'Application Error',
      'Failed to load the application interface. Please restart the application.'
    );
    return;
  }

  const currentPath = paths[index];
  logger.info(`Trying to load HTML from path ${index + 1}/${paths.length}: ${currentPath}`);

  // Check if the file exists
  if (fs.existsSync(currentPath)) {
    logger.info(`HTML file exists at: ${currentPath}`);
    
    window.loadFile(currentPath)
      .then(() => {
        logger.info(`Successfully loaded HTML from: ${currentPath}`);
      })
      .catch(err => {
        logger.error(`Failed to load HTML from path ${index + 1}/${paths.length}:`, err);
        tryLoadHTML(window, paths, index + 1);
      });
  } else {
    logger.warn(`HTML file does not exist at: ${currentPath}`);
    tryLoadHTML(window, paths, index + 1);
  }
}

// This method will be called when Electron has finished initialization
app.on('ready', async () => {
  logger.info('Application ready');
  
  try {
    // Initialize handlers
    logger.info('Initializing handlers...');
    
    const searchHandler = new SearchHandler();
    await searchHandler.initialize();
    logger.info('Search handlers initialized');
    
    const importHandler = new ImportHandler();
    await importHandler.initialize();
    logger.info('Import handlers initialized');
    
    const statisticsHandler = new StatisticsHandler();
    await statisticsHandler.initialize();
    logger.info('Statistics handlers initialized');
    
    const ragHandler = new RAGHandler();
    await ragHandler.initialize();
    logger.info('RAG handlers initialized');
    
    const llmProviderHandler = new LLMProviderHandler();
    await llmProviderHandler.initialize();
    logger.info('LLM Provider handlers initialized');
    
    const modelCatalogHandler = new ModelCatalogHandler();
    await modelCatalogHandler.initialize();
    logger.info('Model Catalog handlers initialized');
    
    const directModelHandler = new DirectModelHandler();
    await directModelHandler.initialize();
    logger.info('Direct Model handlers initialized');
    
    // Create the main window
    createWindow();
  } catch (error) {
    logger.error('Error during initialization:', error);
    dialog.showErrorBox(
      'Initialization Error',
      `Failed to initialize the application: ${error instanceof Error ? error.message : String(error)}`
    );
    app.quit();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  logger.info('All windows closed');
  // On macOS it is common for applications to stay open until the user quits explicitly
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window when the dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  dialog.showErrorBox(
    'Unexpected Error',
    `An unexpected error occurred: ${error.message}`
  );
});
