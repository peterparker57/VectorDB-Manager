# VectorDB-Manager

A project to manage and test vector databases for use in a RAG implementation.

## Features

- Import documents into a vector database
- Search the vector database using semantic search
- Chat with your documents using RAG (Retrieval Augmented Generation)
- Configure and manage LLM providers (Anthropic, Ollama)
- View statistics about your vector database

## Installation

```bash
# Clone the repository
git clone https://github.com/peterparker57/VectorDB-Manager.git

# Navigate to the project directory
cd VectorDB-Manager

# Install dependencies
npm install

# Build the application
npm run build

# Start the application
npm start
```

## Development

```bash
# Start the application in development mode
npm run dev
```

## Project Structure

- `src/main`: Electron main process code
  - `handlers`: IPC handlers for communication with the renderer process
  - `services`: Business logic and services
  - `sql`: SQL schema and migrations
- `src/renderer`: React frontend code
  - `components`: React components
  - `containers`: Container components
  - `services`: Frontend services
- `src/shared`: Shared code between main and renderer processes
  - `types`: TypeScript interfaces and types

## Recent Fixes

- Fixed issue with Anthropic API key not being saved and used correctly
- Fixed the 'Failed to load providers' error in the LLM Models tab
- Fixed issue where the application was not showing the main HTML screen
- Fixed API mismatches between the preload script and renderer code

## Documentation

See the `docs` directory for detailed documentation on the project architecture and implementation details.

## License

MIT
