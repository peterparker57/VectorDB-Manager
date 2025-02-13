# VectorDB Manager

A desktop application for managing and searching through documentation using vector embeddings. Supports Clarion source files (.clw, .inc, .equ) and Windows Help Files (.chm).

## Project Status

This project is being developed in phases:

1. ✅ Phase 1 (Complete) - Initial Setup
   - Basic application structure
   - Electron/React setup
   - Build system implementation

2. ✅ Phase 2 (Complete) - Vector Database Integration
   - MCP service integration
   - File import capabilities
   - Semantic search implementation
   - Batch processing
   - Performance optimizations

3. 🚧 Phase 3 (In Progress) - Self-contained Architecture
   - Architecture refinement
   - Component isolation
   - Performance optimization
   - Deployment improvements

## Features

- Import and process multiple file types:
  - Clarion source files (.clw, .inc, .equ)
  - Windows Help Files (.chm)
- Advanced semantic search capabilities:
  - Natural language queries
  - File type filtering
  - Date range filtering
  - Relevance scoring
  - Result caching
- Batch processing with:
  - Configurable batch sizes
  - Automatic retry mechanisms
  - Progress tracking
  - Error recovery
- Integration with data-store MCP for vector operations
- Local storage with SQLite
- Configurable import settings
- Offline-first operation with no external dependencies

## Prerequisites

- Node.js 18+ (LTS recommended)
- Windows 10/11
- PowerShell 7+ (for build scripts)

## Development Setup

1. Clone the repository:
```powershell
git clone [repository-url]
cd VectorDB-Manager
```

2. Install dependencies:
```powershell
npm install
```

3. Start the development server:
```powershell
npm run dev
```

## Building

To create a production build:

```powershell
# Build using PowerShell script (recommended)
./build.ps1

# Or use npm scripts individually
npm run build      # Build TypeScript/Webpack
npm run pack       # Create unpacked version
npm run dist       # Create installer
```

The built application will be available in the `release` directory.

## Project Structure

```
VectorDB-Manager/
├── src/
│   ├── main/           # Electron main process
│   │   ├── services/   # Core services
│   │   └── sql/        # SQL schemas
│   ├── renderer/       # React UI
│   └── shared/         # Shared types
├── public/            # Static assets
└── dist/             # Build output
```

## Architecture

The application uses a self-contained architecture with:

- SQLite for document and metadata storage
- HNSW for vector similarity search
- Electron for cross-platform desktop support
- React for the user interface
- MCP integration for vector operations
- Batch processing system for large imports

All vector operations and file processing are performed locally without external dependencies.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build the application
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code
- `npm run pack` - Create unpacked version
- `npm run dist` - Create installer

### Adding New File Types

To add support for new file types:

1. Create a new processor in `src/main/services/processors/`
2. Implement the `FileProcessor` interface
3. Register the processor in `ProcessorRegistry`

## Configuration

Import settings can be configured through the UI:

- Chunk size
- Overlap size
- Parsing strategy
- File types
- Batch processing settings:
  - Batch size
  - Retry attempts
  - Timeout settings

## Data Storage

- Documents and metadata are stored in SQLite
- Vector indices are stored using HNSW
- All data is stored in the user's application data directory
- Caching system for frequent searches

## Search Features

- Natural language query processing
- Advanced filtering options:
  - File type filters
  - Date range filters
  - Confidence score thresholds
- Result ranking and scoring
- Context-aware search results
- Performance optimizations through caching

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC License