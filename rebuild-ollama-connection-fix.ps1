# Rebuild script for VectorDB-Manager with Ollama connection fixes

Write-Host "Rebuilding VectorDB-Manager with Ollama connection fixes..." -ForegroundColor Green

# Navigate to the project directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Clean previous build
Write-Host "Cleaning previous build..." -ForegroundColor Yellow
npm run clean

# Build the application
Write-Host "Building application..." -ForegroundColor Yellow
npm run build

# Start the application in development mode
Write-Host "Starting application in development mode..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Yellow
npm run start

# Note: To create a production build, use:
# npm run package