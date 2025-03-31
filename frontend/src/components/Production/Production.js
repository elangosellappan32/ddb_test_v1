import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box, Grid, Typography, Alert, Button, CircularProgress, Paper, IconButton
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import productionSiteApi from '../../services/productionSiteapi';
import ProductionSiteCard from './ProductionSiteCard';
import ProductionSiteDialog from './ProductionSiteDialog';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';

const Production = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);

  // Check permissions
  const permissions = useMemo(() => ({
    create: hasPermission(user, 'production', 'CREATE'),
    read: hasPermission(user, 'production', 'READ'),
    update: hasPermission(user, 'production', 'UPDATE'),
    delete: hasPermission(user, 'production', 'DELETE')
  }), [user]);

  // Fetch sites data
  const fetchSites = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await productionSiteApi.fetchAll();
      
      // Transform data based on schema
      const formattedData = response?.data?.map(site => ({
        companyId: Number(site.companyId) || 1,
        productionSiteId: Number(site.productionSiteId),
        name: site.name,
        type: site.type,
        location: site.location,
        capacity_MW: Number(site.capacity_MW),
        injectionVoltage_KV: Number(site.injectionVoltage_KV),
        annualProduction_L: Number(site.annualProduction_L),
        htscNo: site.htscNo,
        banking: Number(site.banking),
        status: site.status,
        version: Number(site.version) || 1
      })) || [];

      console.log('Formatted Sites Data:', formattedData);
      setSites(formattedData);
    } catch (err) {
      console.error('[Production] Fetch error:', err);
      setError(err.message || 'Failed to load sites');
      enqueueSnackbar('Failed to load sites', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const handleSiteClick = useCallback((site) => {
    if (!site?.companyId || !site?.productionSiteId) {
      enqueueSnackbar('Invalid site data', { variant: 'error' });
      return;
    }
    navigate(`/production/${site.companyId}/${site.productionSiteId}`);
  }, [navigate, enqueueSnackbar]);

  const handleAddClick = useCallback(() => {
    if (!permissions.create) {
      enqueueSnackbar('You do not have permission to create sites', { 
        variant: 'error' 
      });
      return;
    }
    setSelectedSite(null);
    setDialogOpen(true);
  }, [permissions.create, enqueueSnackbar]);

  const handleEditClick = useCallback((site) => {
    if (!permissions.update) {
      enqueueSnackbar('You do not have permission to edit sites', { 
        variant: 'error' 
      });
      return;
    }
    setSelectedSite(site);
    setDialogOpen(true);
  }, [permissions.update, enqueueSnackbar]);

  const handleDeleteClick = useCallback(async (site) => {
    if (!permissions.delete) {
      enqueueSnackbar('You do not have permission to delete sites', { 
        variant: 'error' 
      });
      return;
    }
    
    try {
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
  }, [permissions.delete, enqueueSnackbar, fetchSites]);

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      if (selectedSite) {
        await productionSiteApi.update(
          selectedSite.companyId,
          selectedSite.productionSiteId,
          { ...formData, version: selectedSite.version || 1 }
        );
      } else {
        await productionSiteApi.create(formData);
      }
      
      enqueueSnackbar(`Site ${selectedSite ? 'updated' : 'created'} successfully`, { variant: 'success' });
      setDialogOpen(false);
      setSelectedSite(null);
      fetchSites();
    } catch (error) {
      console.error('[Production] Submit error:', error);
      enqueueSnackbar(error.message || 'Failed to save site', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, backgroundColor: 'transparent' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        mb: 3,
        borderBottom: '2px solid #1976d2',
        pb: 2
      }}>
        <Typography variant="h5" sx={{ 
          fontWeight: 'bold',
          color: '#1976d2'
        }}>
          Production Sites
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchSites}
            sx={{ mr: 2 }}
            disabled={loading}
          >
            Refresh
          </Button>
          {permissions.create && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddClick}
              disabled={loading}
            >
              Add Site
            </Button>
          )}
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
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: '200px' 
            }}>
              <CircularProgress />
            </Box>
          </Grid>
        ) : sites.length === 0 ? (
          <Grid item xs={12}>
            <Alert severity="info" sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              py: 3
            }}>
              No production sites found.
            </Alert>
          </Grid>
        ) : (
          sites.map((site) => (
            <Grid 
              item 
              xs={12} 
              sm={6} 
              md={4} 
              key={`site_${site.companyId}_${site.productionSiteId}`}
            >
              <ProductionSiteCard 
                site={site}
                onView={() => handleSiteClick(site)}
                onEdit={permissions.update ? () => handleEditClick(site) : null}
                onDelete={permissions.delete ? () => handleDeleteClick(site) : null}
                userRole={user?.role}
                permissions={permissions}
              />
            </Grid>
          ))
        )}
      </Grid>

      <ProductionSiteDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedSite(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedSite}
        loading={loading}
      />
    </Paper>
  );
};

export default Production;

