import { HierarchicalNSW } from 'hnswlib-node';
import { DatabaseManager } from './database';
import { ProcessorRegistry } from './processors/processor-registry';
import * as path from 'path';
import { app } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { StatisticsService } from './statistics.service';

export interface SearchOptions {
    limit?: number;
    minScore?: number;
    includeVectors?: boolean;
}

export interface SearchResult {
    content: string;
    confidence: number;
    fileType: string;
    location: string;
    context: string;
}

export interface ImportStats {
    success: boolean;
    filesProcessed: number;
    vectorCount: number;
    errors?: Array<{
        file: string;
        error: string;
        retryable: boolean;
    }>;
}

export interface ImportOptions {
    chunkSize?: number;
    overlapSize?: number;
    skipDuplicates?: boolean;
    forceUpdate?: boolean;
}

export class VectorStore {
    private static instance: VectorStore;
    private index!: HierarchicalNSW;
    private db: DatabaseManager;
    private statisticsService: StatisticsService;
    private processorRegistry: ProcessorRegistry;
    private embedder: any;
    private initialized: boolean = false;
    private readonly dimension = 384; // Default for all-MiniLM-L6-v2

    private constructor() {
        this.db = DatabaseManager.getInstance();
        this.statisticsService = new StatisticsService(this.db.getDatabase());
        this.processorRegistry = ProcessorRegistry.getInstance();
    }

    static getInstance(): VectorStore {
        if (!VectorStore.instance) {
            VectorStore.instance = new VectorStore();
        }
        return VectorStore.instance;
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Initialize database
            await this.db.initialize();

            // Initialize embedder using dynamic import
            const transformers = await import('@xenova/transformers');
            this.embedder = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

            // Initialize HNSW index
            const indexPath = path.join(app.getPath('userData'), 'vectors.index');
            
            // Initialize HNSW index
            this.index = new HierarchicalNSW('cosine', this.dimension);

            if (fs.existsSync(indexPath)) {
                try {
                    // Try to load existing index
                    this.index.readIndex(indexPath);
                    console.log('Loaded existing vector index');
                } catch (error) {
                    console.warn('Failed to load existing index, creating new one:', error);
                    // Only remove and recreate if loading fails
                    fs.unlinkSync(indexPath);
                    this.index.initIndex(1000);
                    console.log('Created new vector index');
                }
            } else {
                // Create new index if none exists
                this.index.initIndex(1000);
                console.log('Created new vector index');
            }

            this.initialized = true;
            console.log('Vector store initialized successfully');
        } catch (error) {
            console.error('Failed to initialize vector store:', error);
            throw error;
        }
    }

    private async generateEmbedding(text: string): Promise<Float32Array> {
        const output = await this.embedder(text, { pooling: 'mean', normalize: true });
        if (!output?.data) {
            throw new Error('Failed to generate embedding');
        }

        return new Float32Array(
            Object.keys(output.data)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(key => output.data[key])
        );
    }

    private generateContentHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    async importFiles(filePaths: string[], options: ImportOptions = {}): Promise<ImportStats> {
        if (!this.initialized) {
            await this.initialize();
        }

        const stats: ImportStats = {
            success: true,
            filesProcessed: 0,
            vectorCount: 0,
            errors: []
        };

        const documentVectors = new Map<number, number>(); // Track vectors per document

        try {
            for (const filePath of filePaths) {
                try {
                    // Get appropriate processor
                    const processor = this.processorRegistry.getProcessor(filePath);
                    if (!processor) {
                        stats.errors?.push({
                            file: filePath,
                            error: 'No processor found for file type',
                            retryable: false
                        });
                        continue;
                    }

                    // Process file
                    const result = await processor.processFile(filePath, options);

                    // Add each chunk to vector store
                    for (let i = 0; i < result.contents.length; i++) {
                        const content = result.contents[i];
                        const meta = result.metadata[i];

                        try {
                            // Generate embedding
                            const vector = await this.generateEmbedding(content);

                            // Add to database
                            const docId = this.db.addDocument({
                                content,
                                source: meta.source,
                                type: meta.type,
                                title: meta.title,
                                category: meta.category,
                                content_hash: this.generateContentHash(content)
                            });

                            // Add to vector index
                            this.index.addPoint(Array.from(vector), docId);

                            // Track vectors per document
                            documentVectors.set(
                                docId,
                                (documentVectors.get(docId) || 0) + 1
                            );

                            // Update total vector count
                            stats.vectorCount++;
                        } catch (error) {
                            console.error(`Error processing chunk from ${filePath}:`, error);
                        }
                    }

                    stats.filesProcessed++;
                } catch (error) {
                    stats.errors?.push({
                        file: filePath,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        retryable: true
                    });
                }
            }

            // Update statistics if vectors were added successfully
            if (stats.success && stats.vectorCount > 0) {
                // Update document vector statistics
                for (const [docId, vectorCount] of documentVectors.entries()) {
                    await this.statisticsService.updateDocumentVectorStats({
                        documentId: docId,
                        vectorCount: vectorCount,
                        averageVectorLength: this.dimension,
                        totalTokens: vectorCount * this.dimension,
                        chunksCount: vectorCount,
                        lastUpdated: new Date().toISOString()
                    });
                }

                // Update overall database statistics
                await this.statisticsService.updateDatabaseStats();
            }

            // Save index
            const indexPath = path.join(app.getPath('userData'), 'vectors.index');
            this.index.writeIndex(indexPath);

            return stats;
        } catch (error) {
            console.error('Error importing files:', error);
            return {
                success: false,
                filesProcessed: stats.filesProcessed,
                vectorCount: stats.vectorCount,
                errors: [{
                    file: 'batch',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    retryable: true
                }]
            };
        }
    }

    async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        const {
            limit = 10,
            minScore = 0.4,
            includeVectors = false
        } = options;

        try {
            // Generate query embedding
            const queryVector = await this.generateEmbedding(query);

            // Search for nearest neighbors
            const numElements = Math.min(limit * 2, this.index.getCurrentCount());
            if (numElements === 0) return [];

            const result = this.index.searchKnn(Array.from(queryVector), numElements);

            // Process results
            const results: SearchResult[] = [];
            for (let i = 0; i < result.neighbors.length; i++) {
                const docId = result.neighbors[i];
                const score = 1 - result.distances[i];

                if (score < minScore) continue;

                const doc = this.db.getDocument(docId);
                if (!doc) continue;

                results.push({
                    content: doc.content,
                    confidence: score,
                    fileType: doc.type,
                    location: doc.source,
                    context: doc.title || ''
                });

                if (results.length >= limit) break;
            }

            return results;
        } catch (error) {
            console.error('Search failed:', error);
            throw error;
        }
    }

    getSupportedExtensions(): string[] {
        return this.processorRegistry.getSupportedExtensions();
    }

    async close(): Promise<void> {
        if (this.initialized) {
            try {
                const indexPath = path.join(app.getPath('userData'), 'vectors.index');
                if (this.index && this.index.getCurrentCount() > 0) {
                    await this.index.writeIndex(indexPath);
                    console.log('Vector index saved successfully');
                }
                this.db.close();
            } catch (error) {
                console.error('Error during close:', error);
            } finally {
                this.initialized = false;
            }
        }
    }
}