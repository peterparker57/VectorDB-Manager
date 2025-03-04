import { ipcMain, BrowserWindow } from 'electron';
import { VectorStore } from '../services/vector-store';
import { StatisticsService } from '../services/statistics.service';
import Logger from '../services/logger';

export class SearchHandler {
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
            this.logger.error('Failed to initialize search handler:', error as Error);
            throw error;
        }
    }

    private registerHandlers(): void {
        ipcMain.handle('search:search', async (_, query: string, filters: any) => {
            try {
                this.logger.info(`Search handler: Searching for "${query}" with filters:`, filters);
                const startTime = Date.now();
                const results = await this.vectorStore.search(query, filters);
                const executionTime = Date.now() - startTime;
                
                // Update statistics
                await this.statisticsService.incrementSearchCount();
                
                this.logger.info(`Search completed in ${executionTime}ms, found ${results.length} results`);
                return {
                    success: true,
                    results,
                    totalResults: results.length,
                    executionTime
                };
            } catch (error) {
                const err = error as Error;
                this.logger.error(`Error in search handler: ${err.message}`);
                return {
                    success: false,
                    results: [],
                    error: err.message
                };
            }
        });

        ipcMain.handle('search:clear-database', async (event) => {
            try {
                this.logger.info('Search handler: Clearing database');
                await this.vectorStore.clearDatabase();
                
                // Update statistics
                await this.statisticsService.resetDocumentCounts();
                
                // Notify all windows about the statistics update
                const window = BrowserWindow.fromWebContents(event.sender);
                if (window) {
                    const allWindows = BrowserWindow.getAllWindows();
                    for (const win of allWindows) {
                        if (!win.isDestroyed()) {
                            win.webContents.send('statistics:update', await this.statisticsService.getStatistics());
                        }
                    }
                }
                
                this.logger.info('Database cleared successfully');
                return { success: true };
            } catch (error) {
                const err = error as Error;
                this.logger.error(`Error clearing database: ${err.message}`);
                return {
                    success: false,
                    error: err.message
                };
            }
        });
    }
}