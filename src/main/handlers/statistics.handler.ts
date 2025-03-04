import { ipcMain, BrowserWindow } from 'electron';
import { StatisticsService } from '../services/statistics.service';
import Logger from '../services/logger';

export class StatisticsHandler {
    private service!: StatisticsService;
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
            this.service = new StatisticsService();
            this.registerHandlers();
            this.initialized = true;
            return this;
        } catch (error) {
            this.logger.error('Failed to initialize statistics handler:', error as Error);
            throw error;
        }
    }

    private registerHandlers(): void {
        ipcMain.handle('statistics:get', async () => {
            try {
                this.logger.debug('statistics:get handler called');
                return await this.service.getStatistics();
            } catch (error) {
                this.logger.error('Error in statistics:get handler:', error as Error);
                throw error;
            }
        });

        // Subscribe to statistics updates
        this.service.onUpdate((stats) => {
            this.logger.debug('Broadcasting statistics update to all windows');
            const allWindows = BrowserWindow.getAllWindows();
            for (const window of allWindows) {
                if (!window.isDestroyed()) {
                    window.webContents.send('statistics:update', stats);
                }
            }
        });
    }
}