import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box, Grid, Typography, Alert, Button, CircularProgress, Paper, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Switch, FormControlLabel
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, Edit as EditIcon, Delete as DeleteIcon, ViewModule as ViewModuleIcon, ViewList as ViewListIcon } from '@mui/icons-material';
import productionSiteApi from '../../services/productionSiteapi';
import ProductionSiteCard from './ProductionSiteCard';
import ProductionSiteDialog from './ProductionSiteDialog';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const Production = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [retryCount, setRetryCount] = useState(0);

  // Check permissions
  const permissions = useMemo(() => ({
    create: hasPermission(user, 'production', 'CREATE'),
    read: hasPermission(user, 'production', 'READ'),
    update: hasPermission(user, 'production', 'UPDATE'),
    delete: hasPermission(user, 'production', 'DELETE')
  }), [user]);

  const validateSiteData = (site) => {
    return {
      companyId: Number(site.companyId) || 1,
      productionSiteId: Number(site.productionSiteId),
      name: site.name?.trim() || 'Unnamed Site',
      type: site.type?.trim() || 'Unknown',
      location: site.location?.trim() || 'Unknown Location',
      capacity_MW: Number(parseFloat(site.capacity_MW || 0).toFixed(2)),
      injectionVoltage_KV: Number(site.injectionVoltage_KV || 0),
      annualProduction_L: Number(site.annualProduction_L || 0),
      htscNo: site.htscNo || '',
      banking: Number(site.banking || 0),
      status: ['Active', 'Inactive', 'Maintenance'].includes(site.status) ? site.status : 'Unknown',
      version: Number(site.version) || 1,
      createdat: site.createdat || new Date().toISOString(),
      updatedat: site.updatedat || new Date().toISOString()
    };
  };

  // Fetch sites data
  const fetchSites = useCallback(async (retry = false) => {
    try {
      if (!retry) {
        setError(null);
        setLoading(true);
        setRetryCount(0);
      }

      console.log('[Production] Fetching sites, attempt:', retryCount + 1);
      const response = await productionSiteApi.fetchAll();
      
      if (!response?.data) {
        throw new Error('Invalid response format');
      }

      // Transform and validate each site
      const formattedData = response.data
        .map(validateSiteData)
        .filter(site => site.productionSiteId && site.name); // Filter out invalid entries

      console.log('[Production] Formatted Sites Data:', formattedData);
      setSites(formattedData);
      setLoading(false);
      
      if (formattedData.length === 0) {
        enqueueSnackbar('No production sites found', { variant: 'info' });
      } else {
        enqueueSnackbar(`Successfully loaded ${formattedData.length} sites`, { variant: 'success' });
      }

    } catch (err) {
      console.error('[Production] Fetch error:', err);
      
      if (retryCount < MAX_RETRIES) {
        console.log(`[Production] Retrying... Attempt ${retryCount + 1} of ${MAX_RETRIES}`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchSites(true), RETRY_DELAY);
        return;
      }

      setError('Failed to load production sites. Please try again.');
      setLoading(false);
      enqueueSnackbar('Failed to load sites', { 
        variant: 'error',
        action: (key) => (
          <Button color="inherit" size="small" onClick={() => {
            fetchSites();
            enqueueSnackbar.close(key);
          }}>
            Retry
          </Button>
        )
      });
    }
  }, [enqueueSnackbar, retryCount]);

  useEffect(() => {
    if (permissions.read) {
      fetchSites();
    } else {
      setError('You do not have permission to view production sites');
    }
  }, [fetchSites, permissions.read]);

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

  const renderTableView = () => (
    <TableContainer component={Paper} sx={{ mt: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Type</TableCell>
            <TableCell align="right">Capacity (MW)</TableCell>
            <TableCell align="right">Production (L)</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sites.map((site) => (
            <TableRow key={`${site.companyId}_${site.productionSiteId}`}>
              <TableCell>{site.name}</TableCell>
              <TableCell>{site.location}</TableCell>
              <TableCell>{site.type}</TableCell>
              <TableCell align="right">{site.capacity_MW}</TableCell>
              <TableCell align="right">{site.annualProduction_L}</TableCell>
              <TableCell>
                <Box
                  component="span"
                  sx={{
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: site.status === 'Active' ? 'success.light' : 'warning.light',
                    color: site.status === 'Active' ? 'success.dark' : 'warning.dark',
                  }}
                >
                  {site.status}
                </Box>
              </TableCell>
              <TableCell>
                <IconButton onClick={() => handleSiteClick(site)} size="small">
                  <EditIcon />
                </IconButton>
                {permissions.delete && (
                  <IconButton onClick={() => handleDeleteClick(site)} size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Paper elevation={0} sx={{ p: 3, backgroundColor: 'transparent' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        mb: 3,
        borderBottom: '2px solid #1976d2',
        pb: 2
      }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          Production Sites
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => setViewMode(prev => prev === 'card' ? 'table' : 'card')}>
            {viewMode === 'card' ? <ViewListIcon /> : <ViewModuleIcon />}
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchSites}
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

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : sites.length === 0 ? (
        <Alert severity="info" sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          No production sites found.
        </Alert>
      ) : viewMode === 'table' ? (
        renderTableView()
      ) : (
        <Grid container spacing={3}>
          {sites.map((site) => (
            <Grid item xs={12} sm={6} md={4} key={`site_${site.companyId}_${site.productionSiteId}`}>
              <ProductionSiteCard 
                site={site}
                onView={() => handleSiteClick(site)}
                onEdit={permissions.update ? () => handleEditClick(site) : null}
                onDelete={permissions.delete ? () => handleDeleteClick(site) : null}
                userRole={user?.role}
                permissions={permissions}
              />
            </Grid>
          ))}
        </Grid>
      )}

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

