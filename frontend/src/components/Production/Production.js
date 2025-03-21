import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Typography, Alert, Button, CircularProgress
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { 
  fetchProductionSites, 
  createProductionSite, 
  updateProductionSite 
} from '../../services/productionSiteapi';
import ProductionSiteCard from './ProductionSiteCard';
import ProductionSiteForm from './ProductionSiteForm';

const Production = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchProductionSites();
      setSites(response);
      setError(null);
    } catch (error) {
      console.error('[Production] Fetch error:', error);
      setError('Failed to load production sites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSiteClick = (site) => {
    navigate(`/production-site/${site.companyId}/${site.productionSiteId}`);
  };

  const handleEditClick = (site, event) => {
    event.stopPropagation();
    setSelectedSite(site);
    setFormOpen(true);
  };

  const handleAddClick = () => {
    setSelectedSite(null);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedSite(null);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (selectedSite) {
        await updateProductionSite(selectedSite.productionSiteId, formData);
      } else {
        await createProductionSite(formData);
      }
      await fetchData();
      setFormOpen(false);
      setSelectedSite(null);
    } catch (error) {
      console.error('[Production] Form submit error:', error);
      setError('Failed to save production site');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Production Sites</Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchData}
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
            <Grid item xs={12} sm={6} md={4} key={site.productionSiteId}>
              <ProductionSiteCard 
                site={site}
                onView={() => handleSiteClick(site)}
                onEdit={(e) => handleEditClick(site, e)}
              />
            </Grid>
          ))
        )}
      </Grid>

      <ProductionSiteForm
        open={formOpen}
        site={selectedSite}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
      />
    </Box>
  );
};

export default Production;

