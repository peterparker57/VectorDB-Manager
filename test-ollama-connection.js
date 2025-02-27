// Simple test script to verify Ollama connection
const fetch = require('node-fetch');

async function testOllamaConnection(endpoint) {
    console.log(`Testing connection to Ollama server at: ${endpoint}`);
    
    // Normalize the endpoint URL
    let normalizedEndpoint = endpoint.endsWith('/')
        ? endpoint.slice(0, -1)
        : endpoint;
    
    // Ensure the endpoint has a protocol; if not, default to http://
    if (!normalizedEndpoint.startsWith("http://") && !normalizedEndpoint.startsWith("https://")) {
        normalizedEndpoint = "http://" + normalizedEndpoint;
    }

    console.log(`Normalized endpoint: ${normalizedEndpoint}`);
    
    try {
        // Try the tags endpoint
        const tagsUrl = `${normalizedEndpoint}/api/tags`;
        console.log(`Trying tags endpoint: ${tagsUrl}`);
        
        const tagsResponse = await fetch(tagsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000
        });
        
        console.log(`Tags endpoint response status: ${tagsResponse.status}`);
        
        if (tagsResponse.ok) {
            const text = await tagsResponse.text();
            console.log(`Tags endpoint response body preview: ${text.substring(0, 100)}...`);
            console.log(`Successfully connected to Ollama via tags endpoint`);
            return true;
        } else {
            console.log(`Tags endpoint failed with status: ${tagsResponse.status}`);
        }
    } catch (error) {
        console.error(`Error connecting to Ollama: ${error.message}`);
    }
    
    return false;
}

// Test with different endpoint formats
async function runTests() {
    const endpoints = [
        'localhost:11434',           // No protocol
        'http://localhost:11434',    // With http protocol
        'localhost:11434/',          // No protocol with trailing slash
        'http://localhost:11434/'    // With protocol and trailing slash
    ];
    
    for (const endpoint of endpoints) {
        console.log('\n' + '='.repeat(50));
        console.log(`Testing endpoint: "${endpoint}"`);
        const result = await testOllamaConnection(endpoint);
        console.log(`Test result: ${result ? 'SUCCESS' : 'FAILURE'}`);
        console.log('='.repeat(50) + '\n');
    }
}

runTests().catch(err => console.error('Test failed:', err));