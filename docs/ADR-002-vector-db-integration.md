# ADR 002: Vector Database Integration and Search Implementation

## Status
Proposed

## Context
With the basic application structure in place from Phase 1, we need to implement the core functionality of the VectorDB Manager:
1. Integration with the data-store MCP for vector operations
2. File import capabilities for various file types (.chm, .clw, .inc, .equ)
3. Semantic search functionality
4. Result visualization

## Decision

### 1. Vector Database Integration
We will use the data-store MCP's tools and resources for vector operations:

```typescript
interface VectorDBService {
  importFiles(paths: string[]): Promise<ImportResult>;
  query(text: string): Promise<QueryResult>;
}
```

#### MCP Integration Strategy
- Use `import_files_with_description` for file imports
- Use `search_code` for semantic searches
- Implement proper error handling and retry mechanisms
- Cache results for better performance

### 2. File Import Implementation

#### File Type Handlers
```typescript
interface FileHandler {
  canHandle(file: string): boolean;
  extractContent(file: string): Promise<string>;
  getMetadata(file: string): Promise<FileMetadata>;
}

// Specific implementations for each file type
class CHMHandler implements FileHandler { ... }
class ClarionSourceHandler implements FileHandler { ... }
```

#### Import Process
1. File Selection:
   - Native file picker dialog
   - Drag-and-drop support
   - Directory scanning

2. Processing Pipeline:
   ```
   Select Files → Validate → Extract Content → Generate Metadata → Import to Vector DB
   ```

3. Progress Tracking:
   - File-level progress
   - Batch progress
   - Error handling with retry options

### 3. Search Implementation

#### Search Features
- Natural language queries
- Code-specific search patterns
- Filters by file type and metadata
- Relevance scoring

#### Query Processing
```typescript
interface QueryProcessor {
  preprocess(query: string): string;
  enhanceWithContext(query: string, context: SearchContext): string;
  postprocessResults(results: SearchResult[]): ProcessedResults;
}
```

#### Result Ranking
- Use confidence scores from vector similarity
- Consider file metadata in ranking
- Apply relevance boosting based on user feedback

### 4. UI/UX Design

#### Import Interface
- Drag-and-drop zone
- Progress visualization
- Error handling with user feedback
- Import history

#### Search Interface
- Real-time search suggestions
- Advanced search filters
- Result previews
- Code syntax highlighting

#### Result Visualization
- List and grid views
- Code context display
- Relevance score indicators
- Quick actions (open file, copy snippet)

## Technical Implementation

### 1. Main Process Changes
```typescript
// Add MCP service handlers
ipcMain.handle('import-files', async (_event, paths: string[]) => {
  const service = new VectorDBService();
  return service.importFiles(paths);
});

ipcMain.handle('search', async (_event, query: string) => {
  const service = new VectorDBService();
  return service.query(query);
});
```

### 2. Renderer Process Updates
```typescript
// New React components
interface ImportZoneProps {
  onFilesSelected: (files: File[]) => Promise<void>;
  onProgress: (progress: number) => void;
}

interface SearchBarProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onFilterChange: (filters: SearchFilters) => void;
}
```

### 3. Data Models
```typescript
interface ImportResult {
  success: boolean;
  filesProcessed: number;
  errors?: ImportError[];
  vectorCount: number;
}

interface SearchResult {
  content: string;
  confidence: number;
  fileType: string;
  location: string;
  context: string;
}
```

## Consequences

### Advantages
1. Structured approach to file processing
2. Type-safe integration with data-store MCP
3. Scalable search implementation
4. User-friendly import and search experience
5. Efficient error handling and recovery

### Challenges
1. Complex file type handling
2. Performance with large file imports
3. Search result relevance tuning
4. UI responsiveness during operations

### Mitigation Strategies
1. Implement file processing in chunks
2. Use worker threads for heavy operations
3. Cache frequently accessed data
4. Implement progressive loading
5. Add user feedback mechanisms for search relevance

## Implementation Plan

### Phase 2.1: Core Integration
1. Set up MCP service integration
2. Implement basic file handlers
3. Add import pipeline
4. Create search infrastructure

### Phase 2.2: UI Implementation
1. Design and implement import interface
2. Create search components
3. Add result visualization
4. Implement progress tracking

### Phase 2.3: Optimization
1. Add caching mechanisms
2. Implement batch processing
3. Add performance monitoring
4. Optimize search results

## Success Criteria
- Successfully import all supported file types
- Search results with >80% relevance
- Import processing time within acceptable limits
- Smooth UI experience during operations
- Proper error handling and recovery

## Notes
- Regular testing throughout implementation
- Performance benchmarking
- User feedback collection
- Documentation updates