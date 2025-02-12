# VectorDB Manager

A desktop application for managing and querying vector databases, built with Electron, React, and TypeScript. This application provides a modern, user-friendly interface for importing various file types into a vector database and performing semantic searches on the content.

## Overview

VectorDB Manager is designed to make working with vector databases more accessible. It leverages the data-store MCP (Model Context Protocol) for vector operations, providing a seamless interface between the user and the underlying vector database technology.

### Current Status: Phase 1 Complete

- ✅ Basic application structure implemented
- ✅ Electron + React + TypeScript setup
- ✅ IPC communication between main and renderer processes
- ✅ Modern UI with error handling and loading states
- ✅ Build pipeline configured with webpack
- ⏳ Vector database integration (Phase 2)
- ⏳ File import functionality (Phase 2)
- ⏳ Semantic search implementation (Phase 2)

## Features

Current:
- Modern, responsive UI with error handling
- Cross-platform desktop application
- Type-safe IPC communication
- Development hot-reload support

Planned (Phase 2):
- Import various file types:
  - CHM documentation files
  - Clarion source files (.clw)
  - Include files (.inc)
  - Equates files (.equ)
- Semantic search capabilities
- Vector database management
- Search result visualization
- Export functionality

## Development Setup

### Prerequisites

- Node.js v20.11.0 or higher
- npm v10 or higher
- Windows, macOS, or Linux

### Installation

1. Clone the repository:
```bash
git clone https://github.com/peterparker57/VectorDB-Manager.git
cd VectorDB-Manager
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

5. Start the production build:
```bash
npm start
```

## Project Structure

```
VectorDB-Manager/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Main entry point
│   │   └── preload.ts  # Preload script for IPC
│   ├── renderer/       # Frontend UI
│   │   ├── components/ # React components
│   │   ├── App.tsx    # Main React component
│   │   └── index.tsx  # Renderer entry point
│   └── shared/         # Shared types/utilities
│       └── types/      # TypeScript interfaces
├── public/             # Static assets
│   └── index.html     # HTML template
└── dist/              # Build output
```

## Technologies

- **Electron**: Cross-platform desktop application framework
- **React**: UI library for building user interfaces
- **TypeScript**: Type-safe JavaScript
- **Webpack**: Module bundler and build tool
- **data-store MCP**: Vector database operations
- **Node.js**: JavaScript runtime

## Development Workflow

1. Development mode (`npm run dev`):
   - Hot reload enabled
   - Developer tools available
   - Console logging enabled

2. Production mode (`npm run build && npm start`):
   - Optimized build
   - No developer tools
   - Minimal logging

## Roadmap

### Phase 1 (Completed)
- ✅ Basic application setup
- ✅ Development environment configuration
- ✅ UI implementation
- ✅ IPC communication

### Phase 2 (In Progress)
- Vector database integration
- File import functionality
- Semantic search implementation
- Result visualization

### Phase 3 (Planned)
- Advanced search features
- Batch processing
- Export functionality
- Search history

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Acknowledgments

- data-store MCP for vector database operations
- Electron team for the amazing framework
- React team for the UI library