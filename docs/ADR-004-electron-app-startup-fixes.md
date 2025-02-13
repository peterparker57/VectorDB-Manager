# ADR-004: Electron App Startup Fixes

## Status
Accepted

## Context
The Electron application was failing to start with two main issues:
1. HTML file loading error: The application couldn't find the renderer's HTML file because it was looking in the wrong location
2. Database access error: The LLM provider handler couldn't access the SQLite database because the DatabaseManager class didn't expose its database instance

These issues are common in Electron applications due to:
- The complexity of managing file paths across development and production environments
- The need to balance encapsulation of database access with practical service requirements

## Decision

### 1. Webpack Configuration Fix
Modified the webpack configuration to ensure consistent output paths:
- Main process files -> dist/main/
- Renderer files -> dist/renderer/
- Preload script -> dist/main/
- Updated package.json "main" field to point to "dist/main/index.js"

### 2. Database Access Pattern
Added a controlled way to access the database instance:
- Added `getDatabase()` method to DatabaseManager class
- Maintains encapsulation while providing necessary access
- Allows LLM provider handler to initialize with direct database access

## Implementation Details

### Webpack Config Changes
```javascript
const mainConfig = {
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist/main'),
  }
};

const rendererConfig = {
  output: {
    filename: 'renderer.js',
    path: path.resolve(__dirname, 'dist/renderer'),
  }
};
```

### DatabaseManager Changes
```typescript
export class DatabaseManager {
  private db: Database.Database;
  
  // Added method to expose database instance
  getDatabase(): Database.Database {
    return this.db;
  }
}
```

## Consequences

### Positive
- Application starts successfully
- Clear separation of built files
- Maintainable database access pattern
- Better error handling for file loading
- Consistent behavior across development and production

### Negative
- Slightly reduced database encapsulation
- Need to maintain correct file paths in multiple configurations

## Notes
This pattern of issues often recurs in Electron applications because:
1. File paths need to work both in development (loose files) and production (packaged asar)
2. Services often need controlled access to lower-level resources

To avoid similar issues in future:
1. Always use path.join for file paths
2. Consider file locations in both dev and prod
3. Design services with clear access patterns
4. Document required access patterns in interfaces

## References
- [Electron File Path Best Practices](https://www.electronjs.org/docs/latest/api/app#appgetapppath)
- [Webpack Output Management](https://webpack.js.org/concepts/output/)
- [SQLite Database Access Patterns](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)