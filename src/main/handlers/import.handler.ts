import { ipcMain, dialog, BrowserWindow } from 'electron';
import { VectorStore } from '../services/vector-store';
import { StatisticsService } from '../services/statistics.service';
import Logger from '../services/logger';

export class ImportHandler {
    private vectorStore!: VectorStore;
    private statisticsService!: StatisticsService;
    private logger: Logger;
    private initialized: boolean = false;

    constructor() {
        this.logger = Logger.getInstance();
    }

    async initialize() {
        if (this.initialized) {
            return this;
        }

        try {
            this.vectorStore = await VectorStore.create();
            this.statisticsService = new StatisticsService();
            this.registerHandlers();
            this.initialized = true;
            return this;
        } catch (error) {
            this.logger.error('Failed to initialize import handler:', error as Error);
            throw error;
        }
    }

    private registerHandlers(): void {
        ipcMain.handle('import:select-files', async (event) => {
            try {
                this.logger.debug('Opening file selection dialog...');
                const result = await dialog.showOpenDialog({
                    properties: ['openFile', 'multiSelections'],
                    filters: [
                        { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md', 'html', 'clw', 'inc'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (!result.canceled && result.filePaths.length > 0) {
                    const filePaths = result.filePaths;
                    this.logger.info(`Selected ${filePaths.length} files for import`);
                    
                    // Get the window to send progress updates
                    const window = BrowserWindow.fromWebContents(event.sender);
                    
                    // Get current settings
                    const currentSettings = {
                        chunkSize: 1000,
                        overlapSize: 200,
                        skipDuplicates: true
                    };
                    
                    const importResult = await this.vectorStore.importFiles(filePaths, {
                        chunkSize: currentSettings.chunkSize,
                        overlapSize: currentSettings.overlapSize,
                        skipDuplicates: currentSettings.skipDuplicates
                    }, (progress) => {
                        // Send progress updates to the renderer
                        if (window && !window.isDestroyed()) {
                            this.logger.debug(`Sending progress update: ${JSON.stringify(progress)}`);
                            setImmediate(() => {
                                window.webContents.send('import:progress', progress);
                            });
                        }
                    });
                    
                    // Update statistics
                    await this.statisticsService.updateAfterImport(importResult.filesProcessed, importResult.chunksCreated);
                    
                    // Send updated statistics to all windows
                    const statistics = await this.statisticsService.getStatistics();
                    const allWindows = BrowserWindow.getAllWindows();
                    for (const win of allWindows) {
                        if (!win.isDestroyed()) {
                            win.webContents.send('statistics:update', statistics);
                        }
                    }
                    
                    return { success: true, result: importResult };
                }
                
                return { success: false, error: 'No files selected' };
            } catch (error) {
                const err = error as Error;
                this.logger.error('Error in import:select-files handler:', err);
                return { success: false, error: err.message };
            }
        });

        ipcMain.handle('import:select-folder', async (event) => {
            try {
                this.logger.debug('Opening folder selection dialog...');
                const result = await dialog.showOpenDialog({
                    properties: ['openDirectory'],
                });

                if (!result.canceled && result.filePaths.length > 0) {
                    const folderPath = result.filePaths[0];
                    this.logger.debug(`Selected folder: ${folderPath}`);
                    
                    // Import the selected folder
                    this.logger.info(`Starting import of folder: ${folderPath}...`);
                    
                    // Get the window to send progress updates
                    const window = BrowserWindow.fromWebContents(event.sender);
                    
                    // Get current settings
                    const currentSettings = {
                        chunkSize: 1000,
                        overlapSize: 200,
                        skipDuplicates: true
                    };
                    
                    const importResult = await this.vectorStore.importFiles([folderPath], {
                        chunkSize: currentSettings.chunkSize,
                        overlapSize: currentSettings.overlapSize,
                        skipDuplicates: currentSettings.skipDuplicates,
                        isDirectory: true
                    }, (progress) => {
                        // Send progress updates to the renderer
                        if (window && !window.isDestroyed()) {
                            this.logger.debug(`Sending progress update: ${JSON.stringify(progress)}`);
                            setImmediate(() => {
                                window.webContents.send('import:progress', progress);
                            });
                        }
                    });
                    
                    // Update statistics
                    await this.statisticsService.updateAfterImport(importResult.filesProcessed, importResult.chunksCreated);
                    
                    // Send updated statistics to all windows
                    const statistics = await this.statisticsService.getStatistics();
                    const allWindows = BrowserWindow.getAllWindows();
                    for (const win of allWindows) {
                        if (!win.isDestroyed()) {
                            win.webContents.send('statistics:update', statistics);
                        }
                    }
                    
                    return { success: true, result: importResult };
                }
                
                return { success: false, error: 'No folder selected' };
            } catch (error) {
                const err = error as Error;
                this.logger.error('Error in import:select-folder handler:', err);
                return { success: false, error: err.message };
            }
        });
    }
}