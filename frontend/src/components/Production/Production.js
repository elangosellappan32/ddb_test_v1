import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box, Grid, Typography, Alert, Button, CircularProgress
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import productionSiteApi from '../../services/productionSiteapi';
import ProductionSiteCard from './ProductionSiteCard';
import ProductionSiteDialog from './ProductionSiteDialog';

const Production = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Add error state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);

  const fetchSites = useCallback(async () => {
    try {
      setError(null); // Reset error state
      setLoading(true);
      console.log('[Production] Fetching sites...');
      const data = await productionSiteApi.fetchAll();
      console.log('[Production] Sites fetched:', data);
      setSites(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[Production] Fetch error:', err);
      setError(err.message || 'Failed to load sites'); // Set error message
      enqueueSnackbar('Failed to load sites', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const handleSiteClick = (site) => {
    console.log('[Production] Navigating to site:', site);
    navigate(`/production/${site.companyId}/${site.productionSiteId}`);
  };

  const handleAddClick = () => {
    console.log('[Production] Opening create dialog');
    setSelectedSite(null);
    setDialogOpen(true);
  };

  const handleEditSite = (site) => {
    console.log('[Production] Opening edit dialog for site:', site);
    setSelectedSite(site);
    setDialogOpen(true);
  };

  const handleDeleteClick = async (site) => {
    try {
      if (!site.companyId || !site.productionSiteId) {
        throw new Error('Invalid site data');
      }

      const confirmed = window.confirm(`Are you sure you want to delete "${site.name}"?`);
      if (!confirmed) return;

      setLoading(true);
      await productionSiteApi.delete(site.companyId, site.productionSiteId);
      
      enqueueSnackbar('Site deleted successfully', { variant: 'success' });
      fetchSites();
    } catch (error) {
      console.error('[Production] Delete error:', error);
      enqueueSnackbar(error.message || 'Failed to delete site', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    console.log('[Production] Closing dialog');
    setSelectedSite(null);
    setDialogOpen(false);
  };

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      const submitData = {
        ...formData,
        companyId: 1, // Set fixed companyId
        version: selectedSite?.version || 1
      };

      const response = selectedSite
        ? await productionSiteApi.update(1, selectedSite.productionSiteId, submitData)
        : await productionSiteApi.create(submitData);

      console.log('[Production] Submit response:', response);
      
      enqueueSnackbar(
        `Production site ${selectedSite ? 'updated' : 'created'} successfully`,
        { variant: 'success' }
      );
      
      handleCloseDialog();
      fetchSites();
    } catch (error) {
      console.error('[Production] Submit error:', error);
      enqueueSnackbar(error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Production Sites</Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchSites}
            sx={{ mr: 2 }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            Add Site
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {loading ? (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          </Grid>
        ) : sites.length === 0 ? (
          <Grid item xs={12}>
            <Alert severity="info">No production sites found.</Alert>
          </Grid>
        ) : (
          sites.map((site) => (
            <Grid item xs={12} sm={6} md={4} key={`${site.companyId}_${site.productionSiteId}`}>
              <ProductionSiteCard 
                site={site}
                onView={() => handleSiteClick(site)}
                onEdit={() => handleEditSite(site)}
                onDelete={() => handleDeleteClick(site)}
              />
            </Grid>
          ))
        )}
      </Grid>

      <ProductionSiteDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
        initialData={selectedSite}
        loading={loading}
      />
    </Box>
  );
};

export default Production;

