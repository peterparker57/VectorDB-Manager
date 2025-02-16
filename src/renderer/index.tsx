import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Error boundary for catching React render errors
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error) {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        if (errorInfo.componentStack) {
            window.api.log.error('React render error', error);
            window.api.log.error('React error details', new Error(errorInfo.componentStack));
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ 
                    padding: '20px',
                    color: '#721c24',
                    backgroundColor: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '4px'
                }}>
                    <h2>Something went wrong</h2>
                    <p>The application encountered an error. Please check the logs for details.</p>
                </div>
            );
        }

        return this.props.children;
    }
}

// Create a simple error display component
const ErrorDisplay = ({ error }: { error: string }) => (
    <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff'
    }}>
        <div style={{
            padding: '20px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24'
        }}>
            <h2>Error</h2>
            <p>{error}</p>
        </div>
    </div>
);

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing React');
    
    try {
        // Create root element
        const container = document.getElementById('root');
        if (!container) {
            document.body.innerHTML = '<div style="color: red; padding: 20px;">Root element not found</div>';
            throw new Error('Root element not found');
        }

        console.log('Creating React root...');
        const root = createRoot(container);

        // Render application
        console.log('Rendering React application...');
        console.log('React version:', React.version);
        console.log('Container:', container);

        // Add a test element to verify rendering
        const testDiv = document.createElement('div');
        testDiv.style.padding = '20px';
        testDiv.style.backgroundColor = '#e3f2fd';
        testDiv.textContent = 'React initialization in progress...';
        container.appendChild(testDiv);

        root.render(
            <React.StrictMode>
                <ErrorBoundary>
                    <App />
                </ErrorBoundary>
            </React.StrictMode>
        );
        console.log('React application rendered successfully');
    } catch (error) {
        console.error('Failed to initialize React application:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        document.body.innerHTML = `<div style="color: red; padding: 20px;">Error: ${errorMessage}</div>`;
        throw error;
    }
});