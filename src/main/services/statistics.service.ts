import { DatabaseManager } from './database';
import Logger from './logger';

export interface Statistics {
    totalDocuments: number;
    totalChunks: number;
    lastImport: string | null;
    lastSearch: string | null;
    totalSearches: number;
    totalRagQueries: number;
    lastRagQuery: string | null;
}

type StatisticsUpdateListener = (stats: Statistics) => void;

export class StatisticsService {
    private db = DatabaseManager.getInstance().getDatabase();
    private logger = Logger.getInstance();
    private listeners: StatisticsUpdateListener[] = [];

    constructor() {
        this.logger.info('Statistics service initialized');
    }

    async getStatistics(): Promise<Statistics> {
        try {
            const stmt = this.db.prepare(`
                SELECT total_documents as totalDocuments,
                       total_chunks as totalChunks,
                       last_import as lastImport,
                       last_search as lastSearch,
                       total_searches as totalSearches,
                       total_rag_queries as totalRagQueries,
                       last_rag_query as lastRagQuery
                FROM statistics
                WHERE id = 1
            `);

            const row = stmt.get() as Statistics;
            return row || {
                totalDocuments: 0,
                totalChunks: 0,
                lastImport: null,
                lastSearch: null,
                totalSearches: 0,
                totalRagQueries: 0,
                lastRagQuery: null
            };
        } catch (error) {
            this.logger.error('Error getting statistics:', error as Error);
            return {
                totalDocuments: 0,
                totalChunks: 0,
                lastImport: null,
                lastSearch: null,
                totalSearches: 0,
                totalRagQueries: 0,
                lastRagQuery: null
            };
        }
    }

    async updateAfterImport(documentsAdded: number, chunksAdded: number): Promise<void> {
        try {
            const stmt = this.db.prepare(`
                UPDATE statistics
                SET total_documents = total_documents + ?,
                    total_chunks = total_chunks + ?,
                    last_import = DATETIME('now')
                WHERE id = 1
            `);

            stmt.run(documentsAdded, chunksAdded);
            this.logger.info(`Statistics updated after import: +${documentsAdded} documents, +${chunksAdded} chunks`);
            
            // Notify listeners
            await this.notifyListeners();
        } catch (error) {
            this.logger.error('Error updating statistics after import:', error as Error);
        }
    }

    async incrementSearchCount(): Promise<void> {
        try {
            const stmt = this.db.prepare(`
                UPDATE statistics
                SET total_searches = total_searches + 1,
                    last_search = DATETIME('now')
                WHERE id = 1
            `);

            stmt.run();
            this.logger.debug('Search count incremented');
            
            // Notify listeners
            await this.notifyListeners();
        } catch (error) {
            this.logger.error('Error incrementing search count:', error as Error);
        }
    }

    async incrementRagQueryCount(): Promise<void> {
        try {
            const stmt = this.db.prepare(`
                UPDATE statistics
                SET total_rag_queries = total_rag_queries + 1,
                    last_rag_query = DATETIME('now')
                WHERE id = 1
            `);

            stmt.run();
            this.logger.debug('RAG query count incremented');
            
            // Notify listeners
            await this.notifyListeners();
        } catch (error) {
            this.logger.error('Error incrementing RAG query count:', error as Error);
        }
    }

    async resetDocumentCounts(): Promise<void> {
        try {
            const stmt = this.db.prepare(`
                UPDATE statistics
                SET total_documents = 0,
                    total_chunks = 0
                WHERE id = 1
            `);

            stmt.run();
            this.logger.info('Document counts reset');
            
            // Notify listeners
            await this.notifyListeners();
        } catch (error) {
            this.logger.error('Error resetting document counts:', error as Error);
        }
    }

    onUpdate(listener: StatisticsUpdateListener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private async notifyListeners(): Promise<void> {
        try {
            const stats = await this.getStatistics();
            for (const listener of this.listeners) {
                listener(stats);
            }
        } catch (error) {
            this.logger.error('Error notifying statistics listeners:', error as Error);
        }
    }
}