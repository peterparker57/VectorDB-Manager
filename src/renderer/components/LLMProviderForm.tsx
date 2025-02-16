import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Box,
    CircularProgress
} from '@mui/material';
import {
    LLMProvider,
    CreateLLMProviderRequest,
    UpdateLLMProviderRequest,
    UpdateLLMProviderWithId,
    LLMProviderType
} from '../../shared/types/llm-provider';

interface LLMProviderFormProps {
    open: boolean;
    provider?: LLMProvider;
    onSubmit: (provider: CreateLLMProviderRequest | UpdateLLMProviderWithId) => Promise<void>;
    onClose: () => void;
}

const LLMProviderForm: React.FC<LLMProviderFormProps> = ({
    open,
    provider,
    onSubmit,
    onClose
}) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<LLMProviderType>('local');
    const [model, setModel] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [endpoint, setEndpoint] = useState('');
    const [installedModels, setInstalledModels] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [modelError, setModelError] = useState('');

    useEffect(() => {
        if (provider) {
            setName(provider.name);
            setType(provider.type);
            setModel(provider.config.model);
            setApiKey(provider.config.apiKey || '');
            setEndpoint(provider.config.endpoint || '');
        } else {
            resetForm();
        }
    }, [provider]);

    useEffect(() => {
        const fetchModels = async () => {
            if (type === 'local' && endpoint.trim()) {
                setIsLoadingModels(true);
                setModelError('');
                try {
                    const models = await window.llmProvider.getInstalledModels(endpoint);
                    setInstalledModels(models);
                    if (!models.includes(model)) {
                        setModel('');
                    }
                } catch (error) {
                    setModelError('Failed to fetch models. Is Ollama running?');
                    setInstalledModels([]);
                }
                setIsLoadingModels(false);
            }
        };
        fetchModels();
    }, [endpoint, type]);

    const resetForm = () => {
        setName('');
        setType('local');
        setModel('');
        setApiKey('');
        setEndpoint('');
        setErrors({});
        setInstalledModels([]);
        setModelError('');
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!model.trim()) {
            newErrors.model = 'Model is required';
        }

        if (type === 'cloud' && !apiKey.trim()) {
            newErrors.apiKey = 'API key is required for cloud providers';
        }

        if (type === 'local' && !endpoint.trim()) {
            newErrors.endpoint = 'Endpoint is required for local providers';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        const providerData = {
            name,
            type,
            config: {
                model,
                ...(type === 'cloud' ? { apiKey } : { endpoint })
            }
        };

        if (provider?.id) {
            await onSubmit({
                id: provider.id,
                ...providerData
            });
        } else {
            await onSubmit(providerData);
        }
        
        resetForm();
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {provider ? 'Edit Provider' : 'Add Provider'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <TextField
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={!!errors.name}
                        helperText={errors.name}
                        fullWidth
                    />

                    <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={type}
                            label="Type"
                            onChange={(e) => setType(e.target.value as LLMProviderType)}
                        >
                            <MenuItem value="local">Local</MenuItem>
                            <MenuItem value="cloud">Cloud</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth error={!!errors.model || !!modelError}>
                        {type === 'local' ? (
                            <>
                                <InputLabel>Model</InputLabel>
                                <Select
                                    value={model}
                                    label="Model"
                                    onChange={(e) => setModel(e.target.value)}
                                    disabled={isLoadingModels}
                                >
                                    {installedModels.map((option) => (
                                        <MenuItem key={option} value={option}>
                                            {option}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {isLoadingModels && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                                        <CircularProgress size={20} />
                                    </Box>
                                )}
                                {(errors.model || modelError) && 
                                    <FormHelperText>{errors.model || modelError}</FormHelperText>}
                            </>
                        ) : (
                            <>
                                <InputLabel>Model</InputLabel>
                                <Select
                                    value={model}
                                    label="Model"
                                    onChange={(e) => setModel(e.target.value)}
                                >
                                    {['claude-3', 'gpt-4', 'gpt-3.5-turbo'].map((option) => (
                                        <MenuItem key={option} value={option}>
                                            {option}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.model && <FormHelperText>{errors.model}</FormHelperText>}
                            </>
                        )}
                    </FormControl>

                    {type === 'cloud' ? (
                        <TextField
                            label="API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            error={!!errors.apiKey}
                            helperText={errors.apiKey}
                            type="password"
                            fullWidth
                        />
                    ) : (
                        <TextField
                            label="Endpoint"
                            value={endpoint}
                            onChange={(e) => setEndpoint(e.target.value)}
                            error={!!errors.endpoint}
                            helperText={errors.endpoint || 'e.g., http://localhost:11434'}
                            fullWidth
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">
                    {provider ? 'Update' : 'Add'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LLMProviderForm;