# ADR-062: Fix Folder Selection in Import Dialog

## Status
Implemented

## Context
The VectorDB Manager application had an issue with the folder selection functionality in the Import tab. When users selected the "Select Folder" option and clicked the "Import Documents" button, the file dialog was prompting for a file instead of a folder.

## Decision
We implemented the following changes to fix the folder selection issue:

1. Added a `selectFolder` method to the Import API in `src/main/preload/import.api.ts`
2. Added a corresponding handler in `src/main/handlers/import.handler.ts` that uses Electron's dialog API with the `openDirectory` property
3. Updated the `ImportOptions` interface in `src/main/services/vector-store.ts` to include an `isDirectory` flag
4. Modified the `importFiles` method in `src/main/services/vector-store.ts` to recursively process files in a directory when the `isDirectory` flag is set
5. Updated the `handleImport` function in `src/renderer/App.tsx` to call the appropriate import function based on the selected import mode

## Consequences
- Users can now select a folder for importing documents
- The application will recursively scan the selected folder for supported file types
- The import process will only process files with supported extensions
- The UI correctly reflects whether files or a folder is being imported