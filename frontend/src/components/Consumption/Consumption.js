import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Grid, 
  Typography,
  Alert,
  Button,
  CircularProgress,
  Paper
} from '@mui/material'; // Fixed import
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import consumptionSiteApi from '../../services/consumptionSiteApi';
import ConsumptionSiteCard from './ConsumptionSiteCard';
import ConsumptionSiteDialog from './ConsumptionSiteDialog';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, isAdmin } from '../../utils/permissions';

const Consumption = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);

  const permissions = useMemo(() => ({
    create: hasPermission(user, 'consumption', 'CREATE'),
    read: hasPermission(user, 'consumption', 'READ'),
    update: hasPermission(user, 'consumption', 'UPDATE'),
    delete: hasPermission(user, 'consumption', 'DELETE')
  }), [user]);

  const adminUser = useMemo(() => isAdmin(user), [user]);
  const totalSites = useMemo(() => sites.length, [sites]);

  // Fetch sites data
  const fetchSites = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await consumptionSiteApi.fetchAll();
      
      // Get accessible sites from user metadata
      const accessibleSites = user?.accessibleSites?.consumptionSites?.L || [];
      const accessibleSiteIds = new Set(accessibleSites.map(site => site.S));
      
      // Filter and transform data
      const formattedData = response?.data
        ?.filter(site => {
          const siteId = `${site.companyId}_${site.consumptionSiteId}`;
          return accessibleSiteIds.has(siteId);
        })
        ?.map(site => ({
          companyId: String(site.companyId) || '1',
          consumptionSiteId: String(site.consumptionSiteId),
          name: site.name || 'Unnamed Site',
          type: (site.type || 'unknown').toLowerCase(),
          location: site.location || 'Unknown Location',
          status: (site.status || 'inactive').toLowerCase(),
          version: Number(site.version || 1),
          timetolive: Number(site.timetolive || 0),
          annualConsumption: Number(site.annualConsumption || 0)
        })) || [];

      setSites(formattedData);
    } catch (error) {
      console.error('[Consumption] Error fetching sites:', error);
      setError(error.message || 'Failed to fetch sites');
      enqueueSnackbar(error.message || 'Failed to fetch sites', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, user]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const handleSiteClick = useCallback((site) => {
    if (!site?.companyId || !site?.consumptionSiteId) {
      enqueueSnackbar('Invalid site data', { variant: 'error' });
      return;
    }
    navigate(`/consumption/${site.companyId}/${site.consumptionSiteId}`);
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

    if (!site?.companyId || !site?.consumptionSiteId) {
      enqueueSnackbar('Invalid site data', { variant: 'error' });
      return;
    }
    
    try {
      const confirmed = await new Promise(resolve => {
        // Show a more detailed confirmation dialog
        const message = `Are you sure you want to delete "${site.name}"?\n\n` +
          'This action will:\n' +
          '- Permanently remove the consumption site\n' +
          '- Delete all associated consumption data\n' +
          '- Cannot be undone';
        resolve(window.confirm(message));
      });

      if (!confirmed) {
        enqueueSnackbar('Delete operation cancelled', { variant: 'info' });
        return;
      }

      setLoading(true);
      setError(null);

      await consumptionSiteApi.delete(site.companyId, site.consumptionSiteId);
      
      enqueueSnackbar('Site deleted successfully', { 
        variant: 'success',
        autoHideDuration: 3000
      });
      
      // Refresh the sites list
      await fetchSites();
    } catch (error) {
      console.error('[Consumption] Delete error:', error);
      setError('Failed to delete site. Please try again.');
      enqueueSnackbar(error.message || 'Failed to delete site', { 
        variant: 'error',
        autoHideDuration: 5000,
        action: (key) => (
          <Button color="inherit" size="small" onClick={() => {
            enqueueSnackbar.close(key);
          }}>
            Dismiss
          </Button>
        )
      });
    } finally {
      setLoading(false);
    }
  }, [permissions.delete, enqueueSnackbar, fetchSites]);

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      if (selectedSite) {
        // Ensure we have all required data for update
        await consumptionSiteApi.update(
          selectedSite.companyId || '1',
          selectedSite.consumptionSiteId,
          {
            ...formData,
            version: selectedSite.version || 1
          }
        );
        enqueueSnackbar('Site updated successfully', { variant: 'success' });
      } else {
        await consumptionSiteApi.create(formData);
        enqueueSnackbar('Site created successfully', { variant: 'success' });
      }
      
      setDialogOpen(false);
      setSelectedSite(null);
      fetchSites();
    } catch (error) {
      console.error('[Consumption] Submit error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save site';
      enqueueSnackbar(errorMessage, { variant: 'error' });
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
          Consumption Sites
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
              No consumption sites found.
            </Alert>
          </Grid>
        ) : (
          sites.map((site) => (
            <Grid 
              item 
              xs={12} 
              sm={6} 
              md={4} 
              key={`site_${site.companyId}_${site.consumptionSiteId}`}
            >
              <ConsumptionSiteCard 
                site={site}
                onView={() => handleSiteClick(site)}
                onEdit={permissions.update ? () => handleEditClick(site) : null}
                onDelete={permissions.delete ? () => handleDeleteClick(site) : null}
                userRole={user?.role}
                permissions={permissions}
                isAdmin={adminUser}
              />
            </Grid>
          ))
        )}
      </Grid>

      {dialogOpen && (
        <ConsumptionSiteDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedSite(null);
          }}
          onSubmit={handleSubmit}
          initialData={selectedSite}
          loading={loading}
          permissions={permissions}
          totalSites={totalSites} // Pass total sites count
        />
      )}
    </Paper>
  );
};

export default Consumption;
