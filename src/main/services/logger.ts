import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export default class Logger {
    private static instance: Logger;
    private logFile: string;
    private debugMode: boolean = process.env.NODE_ENV === 'development';

    private constructor() {
        this.logFile = path.join(app.getPath('userData'), 'app.log');
        this.info('Logger initialized');
        this.debug(`Log file location: ${this.logFile}`);
        this.debug(`Debug mode: ${this.debugMode}`);
    }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private writeToFile(level: string, message: string, error?: Error) {
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp} [${level}] ${message}${error ? `\nError: ${error.message}\nStack: ${error.stack}` : ''}\n`;
        
        // Write to console in development
        if (this.debugMode) {
            console.log(logEntry);
        }

        // Always write to file
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (err) {
            console.error('Failed to write to log file:', err);
        }
    }

    debug(message: string) {
        if (this.debugMode) {
            this.writeToFile('DEBUG', message);
        }
    }

    info(message: string) {
        this.writeToFile('INFO', message);
    }

    warn(message: string) {
        this.writeToFile('WARN', message);
    }

    error(message: string, error?: Error) {
        this.writeToFile('ERROR', message, error);
    }

    getLogPath(): string {
        return this.logFile;
    }

    clearLog() {
        try {
            fs.writeFileSync(this.logFile, '');
            this.info('Log file cleared');
        } catch (err) {
            console.error('Failed to clear log file:', err);
        }
    }
}