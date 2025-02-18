import React from 'react';
import { Box, LinearProgress, Typography, Paper } from '@mui/material';

interface ImportProgressProps {
    filesProcessed: number;
    totalFiles: number;
    currentFile: string;
    status: string;
}

const ImportProgress: React.FC<ImportProgressProps> = ({
    filesProcessed,
    totalFiles,
    currentFile,
    status
}) => {
    const progress = totalFiles > 0 ? (filesProcessed / totalFiles) * 100 : 0;

    return (
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#e3f2fd' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Import Progress</Typography>
            
            <Box sx={{ width: '100%', mb: 2 }}>
                <LinearProgress 
                    variant="determinate" 
                    value={progress} 
                    sx={{ 
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: '#bbdefb',
                        '& .MuiLinearProgress-bar': {
                            backgroundColor: '#1976d2'
                        }
                    }}
                />
                <Typography variant="body2" color="textSecondary" align="right" sx={{ mt: 0.5 }}>
                    {`${Math.round(progress)}%`}
                </Typography>
            </Box>

            <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="textSecondary">
                    Files Processed: {filesProcessed} / {totalFiles}
                </Typography>
            </Box>

            {currentFile && (
                <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="textSecondary" noWrap>
                        Current File: {currentFile}
                    </Typography>
                </Box>
            )}

            {status && (
                <Box>
                    <Typography variant="body2" color="textSecondary">
                        Status: {status}
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

export default ImportProgress;