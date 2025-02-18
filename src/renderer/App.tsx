import React, { useState, useEffect } from 'react';
import { ImportSettings } from '../shared/types/api';
import LLMProviderManager from './containers/LLMProviderManager';
import VectorDBStats from './components/VectorDBStats';
import SearchInterface from './components/SearchInterface';
import { ChatInterface } from './components/ChatInterface';
import ImportProgress from './components/ImportProgress';
import { Box, Tab, Tabs, Paper, Typography, Alert, Grid, ThemeProvider, createTheme, CssBaseline, Button, Divider } from '@mui/material';
import { GetSupportedTypesResponse } from '../main/preload/search.api';

console.log('App.tsx: Starting component initialization');

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

type ImportProps = 'files' | 'folder';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
});

const App: React.FC<{}> = () => {
  console.log('App.tsx: Rendering App component');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportProps>('files');
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([]);
  const [supportedFileTypes, setSupportedFileTypes] = useState<{ext: string, desc: string}[]>([]);
  const [importSettings, setImportSettings] = useState<ImportSettings | null>(null);
  const [importProgress, setImportProgress] = useState({
    filesProcessed: 0,
    totalFiles: 0,
    currentFile: '',
    status: ''
  });
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    console.log('App.tsx: Running initial useEffect');
    loadSettings();
    loadSupportedExtensions();
  }, []);

  const loadSettings = async () => {
    try {
      console.log('App.tsx: Loading import settings');
      const response = await window.import.getSettings();
      console.log('App.tsx: Import settings response:', response);
      
      if (!response.success) {
        console.error('App.tsx: Failed to load import settings:', response.error);
        setError(response.error || 'Failed to load import settings');
      } else if (response.settings) {
        const settings: ImportSettings = {
          chunkSize: response.settings.chunkSize,
          overlapSize: response.settings.overlapSize,
          skipDuplicates: response.settings.skipDuplicates,
          parsingStrategy: response.settings.parsingStrategy,
          fileTypes: response.settings.fileTypes
        };
        setImportSettings(settings);
      }
    } catch (err) {
      console.error('App.tsx: Exception in loadSettings:', err);
      setError('Failed to load import settings');
    }
  };

  const loadSupportedExtensions = async () => {
    try {
      console.log('App.tsx: Loading supported extensions');
      if (!window.search) {
        throw new Error('Search API not initialized');
      }
      const response = await window.search.getSupportedTypes();
      console.log('App.tsx: Supported extensions:', response);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get supported types');
      }

      const fileTypes = (response.extensions || []).map(ext => ({
        ext,
        desc: getFileTypeDescription(ext)
      }));
      setSupportedFileTypes(fileTypes);
      setSelectedExtensions(response.extensions || []); // Set all as selected by default
      console.log('App.tsx: Supported extensions loaded successfully');
    } catch (err) {
      console.error('App.tsx: Failed to load supported extensions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load supported file types');
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    console.log('App.tsx: Tab changed to:', newValue);
    setCurrentTab(newValue);
  };

  const handleImport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('App.tsx: Starting import process');
      
      setImportProgress(prev => ({
        ...prev,
        filesProcessed: 0,
        status: 'Starting import...'
      }));

      const result = await window.import.selectFiles();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to import files');
      }
      
      setImportProgress(prev => ({
        ...prev,
        filesProcessed: result.result?.filesProcessed || 0,
        totalFiles: result.result?.filesProcessed || 0,
        status: 'Import completed successfully'
      }));
    } catch (err) {
      console.error('App.tsx: Import error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setImportProgress(prev => ({
        ...prev,
        currentFile: '',
        status: error ? 'Import failed' : 'Import completed'
      }));

      setIsLoading(false);
    }
  };

  const getFileTypeDescription = (ext: string): string => {
    const descriptions: Record<string, string> = {
      '.clw': 'Clarion Source Files',
      '.inc': 'Clarion Include Files',
      '.equ': 'Clarion Equates Files',
      '.chm': 'Windows Help Files'
    };

    return descriptions[ext] || 'Unknown File Type';
  };

  console.log('App.tsx: Rendering main UI');
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ maxWidth: '1200px', margin: '0 auto', p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, color: 'primary.main' }}>VectorDB Manager</Typography>

        <Paper sx={{ mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Chat" />
            <Tab label="Import" />
            <Tab label="LLM Providers" />
          </Tabs>
        </Paper>

        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            {/* Left side: Import Section */}
            <Grid item xs={12} md={9}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Import Documents</Typography>
                {isLoading && <ImportProgress {...importProgress} />}
              </Paper>

              <Paper sx={{ p: 3, mb: 3, bgcolor: '#e3f2fd' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Import Options</Typography>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <label style={{ marginRight: '15px', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="importMode"
                        value="files"
                        checked={importMode === 'files'}
                        onChange={(e) => setImportMode(e.target.value as ImportProps)}
                        style={{ marginRight: '8px' }}
                      />
                      Select Files
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="importMode"
                        value="folder"
                        checked={importMode === 'folder'}
                        onChange={(e) => setImportMode(e.target.value as ImportProps)}
                        style={{ marginRight: '8px' }}
                      />
                      Select Folder
                    </label>
                  </Box>

                  <Typography variant="subtitle1" sx={{ mb: 1 }}>File Types to Import:</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {supportedFileTypes.map(type => (
                      <label key={type.ext} style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedExtensions.includes(type.ext)}
                          onChange={(e) => {
                            setSelectedExtensions(prev => 
                              e.target.checked
                                ? [...prev, type.ext]
                                : prev.filter(ext => ext !== type.ext)
                            );
                          }}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ whiteSpace: 'nowrap' }}>{type.ext} - {type.desc}</span>
                      </label>
                    ))}
                  </Box>
                </Box>

                <Button variant="contained" onClick={handleImport} disabled={isLoading} sx={{ mt: 2 }}>Import Documents</Button>
              </Paper>

              <Divider sx={{ my: 3 }} />

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Search Vector Database</Typography>
                <SearchInterface />
              </Paper>
            </Grid>

            {/* Right side: Statistics */}
            <Grid item xs={12} md={3}>
              <VectorDBStats />
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <LLMProviderManager />
        </TabPanel>

        <TabPanel value={currentTab} index={0}>
          <ChatInterface />
        </TabPanel>
      </Box>
    </ThemeProvider>
  );
};

export default App;