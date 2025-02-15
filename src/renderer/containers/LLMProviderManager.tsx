// Updated state management and removed chat components
import React, { useState, useEffect } from 'react';
import { Box, Alert, Snackbar, Typography } from '@mui/material';
import LLMProviderTable from '../components/LLMProviderTable';
import LLMProviderForm from '../components/LLMProviderForm';

useEffect(() => {
  setLocalProviders(providers);
  loadProviders();
}, []);

const loadProviders = async () => {
  try {
    const response = await window.llmProvider.listProviders();
    if (response.success) {
      setLocalProviders(response.providers || []);
    }
  } catch (error) {
    showNotification('Error loading providers', 'error');
  }
};