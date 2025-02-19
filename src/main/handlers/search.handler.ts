import { ipcMain, BrowserWindow } from 'electron';
import { VectorDBService } from '../services/vector-db.service';
import { StatisticsService } from '../services/statistics.service';
import { DatabaseManager } from '../services/database';
import Logger from '../services/logger';

export class SearchHandler {
    private static instance: SearchHandler;
    private vectorStore: VectorDBService;
    private statisticsService: StatisticsService;
    private logger: Logger;
    private db: DatabaseManager;

    private constructor() {
        this.logger = Logger.getInstance();
        this.db = DatabaseManager.getInstance();
        this.vectorStore = VectorDBService.getInstance();
        this.statisticsService = StatisticsService.getInstance(this.db.getDatabase());
    }

    public static getInstance(): SearchHandler {
        if (!SearchHandler.instance) {
            SearchHandler.instance = new SearchHandler();
        }
        return SearchHandler.instance;
    }

    public setupHandlers(): void {
        ipcMain.handle('search:clear-database', async () => {
            try {
                await this.vectorStore.clearDatabase();
                // Notify statistics subscribers about the change
                await this.statisticsService.updateDatabaseStats();
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.webContents.send('statistics:updated', {
                        success: true,
                        statistics: await this.statisticsService.getStatistics()
                    });
                }
                return {
                    success: true
                };
            } catch (error) {
                const err = error as Error;
                this.logger.error('Failed to clear database:', err);
                return {
                    success: false,
                    error: err.message || 'Failed to clear database'
                };
            }
        });

        ipcMain.handle('search:search', async (_, query: string, filters?: any) => {
            try {
                const results = await this.vectorStore.query(query, filters);
                return {
                    success: true,
                    results
                };
            } catch (error) {
                const err = error as Error;
                this.logger.error('Search failed:', err);
                return {
                    success: false,
                    error: err.message || 'Search failed'
                };
            }
        });

        ipcMain.handle('search:get-supported-types', async () => {
            try {
                const extensions = await this.vectorStore.getSupportedExtensions();
                return {
                    success: true,
                    extensions
                };
            } catch (error) {
                const err = error as Error;
                this.logger.error('Failed to get supported types:', err);
                return {
                    success: false,
                    error: err.message || 'Failed to get supported types'
                };
            }
        });
    }
}