/**
 * API Types
 * 
 * This file contains types for the API interfaces between the main and renderer processes.
 */

export interface SearchResult {
  id: string;
  content: string;
  metadata: {
    source: string;
    [key: string]: any;
  };
  score: number;
}

export interface SearchResponse {
  success: boolean;
  results?: SearchResult[];
  error?: string;
  totalResults?: number;
  executionTime?: number;
}

export interface ImportResult {
  success: boolean;
  filesProcessed: number;
  chunksCreated: number;
  error?: string;
}

export interface ImportProgress {
  filesProcessed: number;
  totalFiles: number;
  currentFile?: string;
  chunksCreated: number;
  status: string;
  error?: string;
  isComplete?: boolean;
}

export interface ImportOptions {
  chunkSize?: number;
  overlapSize?: number;
  skipDuplicates?: boolean;
  forceUpdate?: boolean;
  isDirectory?: boolean;
}

export interface RAGResponse {
  success: boolean;
  response?: string;
  prompt?: string;
  sources?: SearchResult[];
  error?: string;
  executionTime?: number;
}

export interface RAGContext {
  provider?: any;
  maxResults?: number;
  minScore?: number;
  includePrompt?: boolean;
}
