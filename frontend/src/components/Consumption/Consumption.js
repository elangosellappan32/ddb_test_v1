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

  // Format consumption for display
  const formatConsumption = useCallback((value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }, []);

  // Process site data
  const processSiteData = useCallback((site) => {
    // Handle annual consumption - ensure it's a valid number
    let annualConsumption = 0;
    const rawValue = site.annualConsumption ?? site.annualConsumption_L;
    
    if (rawValue !== undefined && rawValue !== null) {
      if (typeof rawValue === 'number') {
        annualConsumption = Math.round(rawValue);
      } else if (typeof rawValue === 'string') {
        const cleanValue = rawValue.trim() === '' ? '0' : rawValue.replace(/[^0-9.]/g, '');
        const num = parseFloat(cleanValue);
        annualConsumption = isNaN(num) ? 0 : Math.round(num);
      } else if (typeof rawValue === 'object' && rawValue.N) {
        const num = parseFloat(rawValue.N);
        annualConsumption = isNaN(num) ? 0 : Math.round(num);
      }
    }
    
    return {
      ...site,
      companyId: String(site.companyId || '1'),
      consumptionSiteId: String(site.consumptionSiteId || ''),
      name: site.name || 'Unnamed Site',
      type: (site.type || 'industrial').toLowerCase().trim(),
      location: site.location || 'Unknown Location',
      status: (site.status || 'inactive').toLowerCase().trim(),
      version: Number(site.version || 1),
      timetolive: Number(site.timetolive || 0),
      annualConsumption,
      formattedConsumption: formatConsumption(annualConsumption),
      createdAt: site.createdAt || site.createdat || new Date().toISOString(),
      updatedAt: site.updatedAt || site.updatedat || new Date().toISOString()
    };
  }, [formatConsumption]);

  // Fetch sites data
  const fetchSites = useCallback(async () => {
    console.group('🔍 [Consumption] fetchSites()');
    try {
      console.log('🔄 Setting loading state and clearing errors');
      setError(null);
      setLoading(true);
      
      console.log('📡 Making API call to fetch all consumption sites...');
      const response = await consumptionSiteApi.fetchAll();
      console.log('✅ API Response:', {
        status: response?.status,
        dataCount: response?.data?.length,
        rawData: response?.data
      });
      
      // Get accessible sites from user metadata
      const accessibleSites = user?.accessibleSites?.consumptionSites?.L || [];
      const accessibleSiteIds = new Set(accessibleSites.map(site => site.S));
      
      // Filter and process data
      const formattedData = (response?.data || [])
        .filter(site => {
          const siteId = `${site.companyId}_${site.consumptionSiteId}`;
          return accessibleSiteIds.has(siteId);
        })
        .map(processSiteData);

      console.log(`📊 Setting sites state with ${formattedData.length} sites`);
      setSites(formattedData);
      
    } catch (error) {
      console.error('❌ [Consumption] Error fetching sites:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch sites';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      console.log('🏁 Fetch completed, resetting loading state');
      setLoading(false);
      console.groupEnd();
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
        // Update existing site
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
        // Create new site - pass auth context to get company ID
        await consumptionSiteApi.create(formData, {
          user: {
            ...user,
            companyId: user?.companyId,
            metadata: user?.metadata,
            accessibleSites: user?.accessibleSites
          }
        });
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
            Consumption Sites
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {totalSites} {totalSites === 1 ? 'site' : 'sites'} • 
            Total Consumption: {formatConsumption(sites.reduce((sum, site) => sum + (site.annualConsumption || 0), 0))} MWh/year
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : sites.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2, bgcolor: 'background.paper' }}>
          <Box sx={{ maxWidth: 400, mx: 'auto' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No consumption sites found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Get started by adding your first consumption site to track energy usage.
            </Typography>
            {permissions.create && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddClick}
                size="large"
              >
                Create your first site
              </Button>
            )}
          </Box>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {sites.map((site) => (
            <Grid item key={`${site.companyId}_${site.consumptionSiteId}`} xs={12} sm={6} lg={4} xl={3}>
              <ConsumptionSiteCard
                site={site}
                onView={() => handleSiteClick(site)}
                onEdit={permissions.update ? () => handleEditClick(site) : null}
                onDelete={permissions.delete ? () => handleDeleteClick(site) : null}
                onRefresh={fetchSites}
                permissions={permissions}
                lastUpdated={site.updatedAt}
              />
            </Grid>
          ))}
        </Grid>
      )}

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
          totalSites={totalSites}
          existingSites={sites}
          user={user}
        />
      )}
    </Box>
  );
};

export default Consumption;
