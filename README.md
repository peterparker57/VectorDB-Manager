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

## Recent Updates

- Fixed import settings handler initialization
- Improved search API reliability
- Enhanced error handling in file processors
- Added comprehensive logging system
- Optimized vector store performance
- Added support for large file imports

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

## System Requirements

### Minimum Requirements
- OS: Windows 10 (64-bit) or Windows 11
- Processor: Intel Core i5 (8th gen) or equivalent
- RAM: 8GB
- Storage: 1GB available space
- PowerShell 7+
- Node.js 18+ (LTS recommended)

### Recommended Requirements
- Processor: Intel Core i7/AMD Ryzen 7 or better
- RAM: 16GB
- Storage: 2GB+ available space (SSD recommended)
- Display: 1920x1080 or higher resolution

## Installation

### Development Setup

1. Clone the repository:
```powershell
git clone [repository-url]
cd VectorDB-Manager
```

2. Install dependencies:
```powershell
npm install
```

3. Rebuild native modules for Electron:
```powershell
npm install --save-dev @electron/rebuild
npx electron-rebuild
```

4. Start the development server:
```powershell
npm run dev
```

### Production Installation

1. Download the latest release installer
2. Run the installer with administrator privileges
3. Follow the installation wizard
4. Launch the application from the Start menu

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

## Architecture

The application uses a self-contained architecture with:

- SQLite for document and metadata storage
- HNSW for vector similarity search
- Electron for cross-platform desktop support
- React for the user interface
- MCP integration for vector operations
- Batch processing system for large imports

### Vector Search

- Model: all-MiniLM-L6-v2 (via Xenova Transformers)
- Vector Dimension: 384
- Similarity Metric: Cosine similarity
- Implementation: Local processing using @xenova/transformers
- No API keys or external services required

### Storage

- Documents and metadata stored in SQLite
- Vector indices using HNSW
- All processing performed locally

## Performance Considerations

- Memory Usage:
  - Batch size affects memory consumption
  - Vector index is memory-mapped
  - Configurable cache sizes
- CPU Usage:
  - Vector operations are CPU-intensive
  - Parallel processing for imports
  - Background processing for large operations
- Disk I/O:
  - SSD recommended for better performance
  - Configurable write buffer sizes
  - Automatic index optimization

## Security Features

- Local-only processing
- No external API dependencies
- File integrity verification
- Secure storage of settings
- Input sanitization
- Error handling and logging
- Access control for file operations

## Backup and Recovery

### Automatic Backups
- Vector index backups
- Database backups
- Settings backups
- Configurable backup frequency

### Recovery Options
- Automatic recovery from corrupted indices
- Database restoration
- Settings recovery
- Import session recovery

## Troubleshooting

### Common Issues

1. Application fails to start:
   - Verify Node.js version (18+ required)
   - Check PowerShell version (7+ required)
   - Rebuild native modules if needed

2. Import errors:
   - Verify file permissions
   - Check disk space
   - Ensure file format is supported
   - Review import settings

3. Search not working:
   - Verify vector store initialization
   - Check database connection
   - Review search filters
   - Clear search cache if needed

4. Performance issues:
   - Adjust batch sizes
   - Configure cache settings
   - Check system resources
   - Optimize vector index

### Error Logging

Logs are stored in:
`%APPDATA%/vectordb-manager/logs`

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

## Development

### Project Structure

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write unit tests for new features
- Update documentation
- Follow the existing code style
- Use conventional commits

## License

ISC License