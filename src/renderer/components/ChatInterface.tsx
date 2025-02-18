import React, { useState, useCallback } from 'react';
import { Box, TextField, Button, Typography, Paper, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface Message {
    type: 'user' | 'assistant';
    content: string;
}

export const ChatInterface: React.FC = () => {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);

        // Add user message
        setMessages(prev => [...prev, { type: 'user', content: query }]);

        try {
            // Get default provider
            const provider = await window.llmProvider.getDefaultProvider();
            if (!provider) {
                throw new Error('No default LLM provider configured');
            }

            if (provider.id === undefined) {
                throw new Error('Invalid provider: missing ID');
            }
            
            // Send query to RAG system
            const response = await window.rag.askQuestion(query, provider.id);
            
            if (!response.success || !response.response) {
                throw new Error(response.error || 'Failed to get response');
            }

            // Add assistant message
            setMessages(prev => [...prev, { type: 'assistant', content: response.response! }]);
            setQuery('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [query]);

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
            {/* Messages display */}
            <Paper 
                elevation={3}
                sx={{
                    flex: 1,
                    p: 2,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                }}
            >
                {messages.map((message, index) => (
                    <Box
                        key={index}
                        sx={{
                            alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            backgroundColor: message.type === 'user' ? 'primary.main' : 'grey.100',
                            color: message.type === 'user' ? 'white' : 'text.primary',
                            borderRadius: 2,
                            p: 2
                        }}
                    >
                        <Typography
                            sx={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}
                        >
                            {message.content}
                        </Typography>
                    </Box>
                ))}
            </Paper>

            {/* Error display */}
            {error && (
                <Typography color="error" variant="body2">
                    {error}
                </Typography>
            )}

            {/* Input area */}
            <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about your documents..."
                    disabled={isLoading}
                    sx={{ flex: 1 }}
                />
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={isLoading || !query.trim()}
                    sx={{ minWidth: 120 }}
                >
                    {isLoading ? (
                        <CircularProgress size={24} color="inherit" />
                    ) : (
                        <>
                            <SendIcon sx={{ mr: 1 }} />
                            Send
                        </>
                    )}
                </Button>
            </Box>
        </Box>
    );
};