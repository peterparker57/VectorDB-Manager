# ADR-004: Electron App Startup Fixes

## Status

Accepted

## Context

The VectorDB-Manager Electron application was not showing the main HTML screen when compiled and run. The application would start, but the window would remain blank or not appear at all. This issue was caused by several factors:

1. **HTML Path Resolution**: The main process was looking for the HTML file at a specific path (`../renderer/index.html` relative to the main.js file), but this path might not be correct in all environments or build configurations.

2. **Webpack Configuration**: The webpack.renderer.config.js file was copying the HTML file from 'public/index.html' to './index.html' in the output directory, but the main process was looking for it at '../renderer/index.html'.

3. **Build Process**: The build process might not be correctly copying all necessary files to the right locations.

4. **Window Visibility**: The window was created with `show: false` and was supposed to be shown when the 'ready-to-show' event fired, but this event might not be firing if the HTML file wasn't loaded correctly.

## Decision

Implement a comprehensive fix with the following components:

1. **Multiple HTML Path Resolution**: Modify the main process to try loading the HTML file from multiple possible paths:
   ```typescript
   const possiblePaths = [
       path.join(__dirname, '../renderer/index.html'),
       path.join(__dirname, '../../renderer/index.html'),
       path.join(app.getAppPath(), 'dist/renderer/index.html'),
       path.join(process.cwd(), 'dist/renderer/index.html'),
       path.join(process.cwd(), 'simple.html')
   ];
   ```

2. **File Existence Check**: Add a check to verify if the HTML file exists before attempting to load it.

3. **Fallback HTML File**: Create a simple HTML file in the project root as a fallback, ensuring that at least some content is displayed even if the main renderer HTML file can't be found.

4. **Improved Error Handling**: Add better error handling and logging to help diagnose issues with HTML file loading.

5. **Consistent Webpack Configuration**: Ensure that the webpack configuration files are consistent in how they handle the HTML file.

## Consequences

### Positive

- The application now reliably shows the main HTML screen when compiled and run.
- The fallback HTML file ensures that users see something even if the main HTML file can't be found.
- Improved error handling and logging make it easier to diagnose issues.
- The fix is robust and works across different environments and build configurations.

### Negative

- The solution adds complexity to the HTML loading process.
- The fallback HTML file is a temporary solution and doesn't provide the full functionality of the application.

## Implementation

The implementation includes:

1. Modifying the main process to try loading the HTML file from multiple possible paths.
2. Adding a check to verify if the HTML file exists before attempting to load it.
3. Creating a simple HTML file in the project root as a fallback.
4. Adding better error handling and logging.
5. Ensuring that the webpack configuration files are consistent.

## Notes

This fix addresses the immediate issue of the application not showing the main HTML screen, but there may be underlying issues with the build process that should be addressed in the future. A more comprehensive solution would be to standardize the path resolution in the application and ensure that the build process correctly copies all necessary files to the right locations.
