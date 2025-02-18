import { Database } from 'better-sqlite3';
import Logger from './logger';
import { DatabaseStats, DocumentVectorStats, ImportOperation, VectorDBStatistics } from '../../shared/types/statistics';
import { ipcMain } from 'electron';

export class StatisticsService {
    private static instance: StatisticsService;
    private static initialized: boolean = false;
    private db: Database;
    private logger: Logger;
    private subscribers: Set<(stats: VectorDBStatistics) => void>;

    private constructor(db: Database) {
        this.db = db;
        this.logger = Logger.getInstance();
        this.subscribers = new Set();
        this.setupIpcHandlers();
        StatisticsService.initialized = true;
    }

    public static getInstance(db: Database): StatisticsService {
        if (!StatisticsService.instance) {
            StatisticsService.instance = new StatisticsService(db);
        }
        return StatisticsService.instance;
    }

    public static isInitialized(): boolean {
        return StatisticsService.initialized;
    }

    private setupIpcHandlers() {
        ipcMain.handle('statistics:get', async () => {
            try {
                const stats = await this.getStatistics();
                return {
                    success: true,
                    statistics: stats
                };
            } catch (error) {
                const err = error as Error;
                this.logger.error('Failed to get statistics:', err);
                return {
                    success: false,
                    error: err.message || 'Failed to get statistics'
                };
            }
        });

        ipcMain.on('statistics:subscribe', (event) => {
            const webContents = event.sender;
            const sendStats = async () => {
                try {
                    const stats = await this.getStatistics();
                    if (!webContents.isDestroyed()) {
                        webContents.send('statistics:update', stats);
                    }
                } catch (error) {
                    const err = error as Error;
                    this.logger.error('Error sending statistics update:', err);
                }
            };
            this.subscribers.add(sendStats);
            webContents.on('destroyed', () => {
                this.subscribers.delete(sendStats);
            });
        });

        ipcMain.on('statistics:unsubscribe', (event) => {
            const webContents = event.sender;
            this.subscribers.forEach(subscriber => {
                if (subscriber.name === webContents.id.toString()) {
                    this.subscribers.delete(subscriber);
                }
            });
        });
    }

    private async notifySubscribers() {
        try {
            const stats = await this.getStatistics();
            this.subscribers.forEach(subscriber => {
                try {
                    subscriber(stats);
                } catch (error) {
                    const err = error as Error;
                    this.logger.error('Error notifying subscriber:', err);
                }
            });
        } catch (error) {
            const err = error as Error;
            this.logger.error('Error getting statistics for subscribers:', err);
        }
    }

    async startImportOperation(configuration: any): Promise<number> {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO import_operations (
                    started_at, status, configuration
                ) VALUES (
                    DATETIME('now'), 'running', ?
                )
            `);
            const result = stmt.run(JSON.stringify(configuration));
            await this.notifySubscribers();
            return result.lastInsertRowid as number;
        } catch (error) {
            const err = error as Error;
            this.logger.error('Error starting import operation:', err);
            throw err;
        }
    }

    async updateImportOperation(id: number, update: Partial<ImportOperation>): Promise<void> {
        try {
            const sets: string[] = [];
            const values: any[] = [];

            if (update.status) {
                sets.push('status = ?');
                values.push(update.status);
            }
            if (update.filesProcessed !== undefined) {
                sets.push('files_processed = ?');
                values.push(update.filesProcessed);
            }
            if (update.filesFailed !== undefined) {
                sets.push('files_failed = ?');
                values.push(update.filesFailed);
            }
            if (update.totalProcessingTime !== undefined) {
                sets.push('total_processing_time = ?');
                values.push(update.totalProcessingTime);
            }
            if (update.errorDetails !== undefined) {
                sets.push('error_details = ?');
                values.push(update.errorDetails);
            }
            if (update.status === 'completed' || update.status === 'failed') {
                sets.push('completed_at = DATETIME("now")');
            }

            if (sets.length > 0) {
                const stmt = this.db.prepare(`
                    UPDATE import_operations
                    SET ${sets.join(', ')}
                    WHERE id = ?
                `);
                stmt.run(...values, id);
                await this.notifySubscribers();
            }
        } catch (error) {
            const err = error as Error;
            this.logger.error('Error updating import operation:', err);
            throw err;
        }
    }

    async updateDocumentVectorStats(stats: DocumentVectorStats): Promise<void> {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO document_vectors (
                    document_id, vector_count, average_vector_length,
                    total_tokens, chunks_count, last_updated
                ) VALUES (?, ?, ?, ?, ?, DATETIME('now'))
                ON CONFLICT(document_id) DO UPDATE SET
                    vector_count = excluded.vector_count,
                    average_vector_length = excluded.average_vector_length,
                    total_tokens = excluded.total_tokens,
                    chunks_count = excluded.chunks_count,
                    last_updated = DATETIME('now')
            `);
            stmt.run(
                stats.documentId,
                stats.vectorCount,
                stats.averageVectorLength,
                stats.totalTokens,
                stats.chunksCount
            );
            await this.notifySubscribers();
        } catch (error) {
            const err = error as Error;
            this.logger.error('Error updating document vector stats:', err);
            throw err;
        }
    }

    async updateDatabaseStats(): Promise<void> {
        try {
            // Calculate totals from document_vectors
            const vectorStats = this.db.prepare(`
                SELECT 
                    COUNT(DISTINCT document_id) as total_documents,
                    SUM(vector_count) as total_vectors,
                    SUM(total_tokens) as total_tokens,
                    SUM(chunks_count) as total_chunks,
                    AVG(vector_count) as avg_vectors_per_doc
                FROM document_vectors
            `).get() as any;

            // Get total content size from documents
            const sizeStats = this.db.prepare(`
                SELECT SUM(LENGTH(content)) as total_size
                FROM documents
            `).get() as any;

            // Get last import time
            const lastImport = this.db.prepare(`
                SELECT completed_at
                FROM import_operations
                WHERE status = 'completed'
                ORDER BY completed_at DESC
                LIMIT 1
            `).get() as any;

            const stmt = this.db.prepare(`
                INSERT INTO database_stats (
                    id, total_documents, total_vectors, total_tokens,
                    total_chunks, average_vectors_per_doc, total_content_size,
                    last_import_at, last_updated
                ) VALUES (
                    1, ?, ?, ?, ?, ?, ?, ?, DATETIME('now')
                )
                ON CONFLICT(id) DO UPDATE SET
                    total_documents = excluded.total_documents,
                    total_vectors = excluded.total_vectors,
                    total_tokens = excluded.total_tokens,
                    total_chunks = excluded.total_chunks,
                    average_vectors_per_doc = excluded.average_vectors_per_doc,
                    total_content_size = excluded.total_content_size,
                    last_import_at = excluded.last_import_at,
                    last_updated = excluded.last_updated
            `);

            stmt.run(
                vectorStats.total_documents || 0,
                vectorStats.total_vectors || 0,
                vectorStats.total_tokens || 0,
                vectorStats.total_chunks || 0,
                vectorStats.avg_vectors_per_doc || 0,
                sizeStats.total_size || 0,
                lastImport?.completed_at || null
            );

            await this.notifySubscribers();
        } catch (error) {
            const err = error as Error;
            this.logger.error('Error updating database stats:', err);
            throw err;
        }
    }

    async getStatistics(): Promise<VectorDBStatistics> {
        try {
            // Get current import operation
            const currentOp = this.db.prepare(`
                SELECT *
                FROM import_operations
                WHERE status = 'running'
                ORDER BY started_at DESC
                LIMIT 1
            `).get() as any;

            // Get recent operations
            const recentOps = this.db.prepare(`
                SELECT *
                FROM import_operations
                WHERE status != 'running'
                ORDER BY started_at DESC
                LIMIT 5
            `).all() as any[];

            // Get database stats
            const stats = this.db.prepare(`
                SELECT *
                FROM database_stats
                WHERE id = 1
            `).get() as any;

            // Get import settings
            const settings = this.db.prepare(`
                SELECT *
                FROM import_settings
                WHERE id = 1
            `).get() as any;

            return {
                currentOperation: currentOp ? this.mapImportOperation(currentOp) : undefined,
                recentOperations: recentOps.map(this.mapImportOperation),
                databaseStats: {
                    totalDocuments: stats?.total_documents || 0,
                    totalVectors: stats?.total_vectors || 0,
                    totalTokens: stats?.total_tokens || 0,
                    totalChunks: stats?.total_chunks || 0,
                    averageVectorsPerDoc: stats?.average_vectors_per_doc || 0,
                    totalContentSize: stats?.total_content_size || 0,
                    lastImportAt: stats?.last_import_at || null,
                    lastUpdated: stats?.last_updated || null
                },
                importSettings: settings ? {
                    chunkSize: settings.chunk_size,
                    overlapSize: settings.overlap_size,
                    batchSize: settings.batch_size,
                    parsingStrategy: settings.parsing_strategy,
                    fileTypes: JSON.parse(settings.file_types)
                } : {
                    chunkSize: 8000,
                    overlapSize: 200,
                    batchSize: 10,
                    parsingStrategy: 'semantic',
                    fileTypes: ['.clw', '.inc', '.equ']
                }
            };
        } catch (error) {
            const err = error as Error;
            this.logger.error('Error getting statistics:', err);
            throw err;
        }
    }

    private mapImportOperation(row: any): ImportOperation {
        return {
            id: row.id,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            status: row.status,
            filesProcessed: row.files_processed,
            filesFailed: row.files_failed,
            totalProcessingTime: row.total_processing_time,
            errorDetails: row.error_details,
            configuration: JSON.parse(row.configuration)
        };
    }
}
