import React, { useState, useEffect } from 'react';
import { Box, Container, Tab, Tabs, Typography, Paper, CircularProgress } from '@mui/material';
import SearchInterface from './components/SearchInterface';
import ChatInterface from './components/ChatInterface';
import SettingsTab from './components/settings/SettingsTab';
import VectorDBStats from './components/VectorDBStats';
import DatabaseManagement from './components/DatabaseManagement';

// Define the TabPanel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ height: 'calc(100vh - 120px)', overflow: 'auto' }}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [apisReady, setApisReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Check if APIs are available
  useEffect(() => {
    const checkAPIs = () => {
      const apis = [
        window.search,
        window.import,
        window.statistics,
        window.rag,
        window.llmProvider,
        window.modelCatalog
      ];

      const allApisAvailable = apis.every(api => api !== undefined);
      
      if (allApisAvailable) {
        console.log('All APIs are available');
        setApisReady(true);
      } else {
        console.log('APIs not yet available, retrying...');
        setRetryCount(prev => prev + 1);
        
        // If we've tried more than 10 times, show an error
        if (retryCount > 10) {
          console.error('Failed to load APIs after multiple attempts');
          // Continue anyway, some functionality might still work
          setApisReady(true);
        } else {
          // Try again in 500ms
          setTimeout(checkAPIs, 500);
        }
      }
    };

    checkAPIs();
  }, [retryCount]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!apisReady) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10, textAlign: 'center' }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Loading Application
          </Typography>
          <CircularProgress sx={{ mt: 2, mb: 2 }} />
          <Typography variant="body1">
            Initializing application components...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        VectorDB Manager
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Search" />
          <Tab label="Chat" />
          <Tab label="Providers" />
          <Tab label="Database" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <VectorDBStats />
          <SearchInterface />
        </Box>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <ChatInterface />
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <SettingsTab />
      </TabPanel>
      
      <TabPanel value={tabValue} index={3}>
        <DatabaseManagement />
      </TabPanel>
    </Container>
  );
}

export default App;
