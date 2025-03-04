import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, CircularProgress, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MessageDisplay from './MessageDisplay';
import LLMProviderSelector from './LLMProviderSelector';
import { OllamaApiClient } from '../services/ollama-api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ollamaClientRef = useRef<OllamaApiClient | null>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load default provider on mount
  useEffect(() => {
    const loadDefaultProvider = async () => {
      try {
        const provider = await window.llmProvider.getDefaultProvider();
        setSelectedProvider(provider);
        console.log('Default provider loaded:', provider);
      } catch (error) {
        console.error('Error loading default provider:', error);
        setError('Failed to load default provider. Please select a provider manually.');
      }
    };

    loadDefaultProvider();
  }, []);

  // Initialize Ollama client when provider changes
  useEffect(() => {
    if (selectedProvider?.type === 'ollama' && selectedProvider?.config?.endpoint) {
      ollamaClientRef.current = new OllamaApiClient(selectedProvider.config.endpoint);
    }
  }, [selectedProvider]);

  const handleProviderChange = (provider: any) => {
    setSelectedProvider(provider);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const testConnection = async () => {
    if (!selectedProvider) {
      setError('Please select a provider first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // For Ollama, use direct browser fetch
      if (selectedProvider.type === 'ollama' && ollamaClientRef.current) {
        const isConnected = await ollamaClientRef.current.testConnection();
        if (isConnected) {
          setError('✅ Connection successful using direct browser fetch');
        } else {
          setError('❌ Could not connect to Ollama server');
        }
      } else {
        // For other providers, use the main process
        const result = await window.llmProvider.testConnection(selectedProvider);
        if (result.success) {
          setError(`✅ ${result.message || 'Connection successful'}`);
        } else {
          setError(`❌ ${result.error || 'Connection failed'}`);
        }
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      setError(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedProvider) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    setPrompt(null);

    try {
      // For Ollama, use direct browser fetch
      if (selectedProvider.type === 'ollama' && ollamaClientRef.current) {
        try {
          const response = await ollamaClientRef.current.generateResponse(
            selectedProvider.config.model,
            input
          );
          
          const assistantMessage: Message = { role: 'assistant', content: response };
          setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
          console.error('Error generating response with direct fetch:', err);
          setError(`Failed to generate response: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        // For other providers, use RAG service
        const result = await window.rag.askQuestion(input, { provider: selectedProvider });
        
        if (result.success) {
          const assistantMessage: Message = { role: 'assistant', content: result.response };
          setMessages(prev => [...prev, assistantMessage]);
          
          // If the response includes a prompt, store it
          if (result.prompt) {
            setPrompt(result.prompt);
          }
        } else {
          setError(`Failed to process your question: ${result.error}`);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <LLMProviderSelector
          selectedProvider={selectedProvider}
          onProviderChange={handleProviderChange}
        />
        
        <Button
          variant="outlined"
          onClick={testConnection}
          disabled={isLoading || !selectedProvider}
          sx={{ minWidth: 120 }}
        >
          Test Connection
        </Button>
      </Box>

      {error && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 1, 
            mb: 2, 
            backgroundColor: error.startsWith('✅') ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
            color: error.startsWith('✅') ? 'success.main' : 'error.main',
            borderRadius: 1
          }}
        >
          <Typography variant="body2">{error}</Typography>
        </Paper>
      )}

      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          mb: 2, 
          flexGrow: 1, 
          maxHeight: 'calc(100vh - 300px)', 
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {messages.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="body1" color="text.secondary">
              Start a conversation by sending a message
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageDisplay key={index} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </Paper>

      {prompt && (
        <Paper elevation={1} sx={{ p: 1, mb: 2, backgroundColor: 'rgba(0, 0, 0, 0.05)' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
            Prompt sent to model:
          </Typography>
          <Typography variant="caption" component="pre" sx={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            fontSize: '0.7rem',
            mt: 0.5,
            p: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: 1,
            maxHeight: '100px',
            overflow: 'auto'
          }}>
            {prompt}
          </Typography>
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here..."
          disabled={isLoading}
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="contained"
          color="primary"
          endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          onClick={handleSend}
          disabled={isLoading || !input.trim() || !selectedProvider}
        >
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default ChatInterface;
