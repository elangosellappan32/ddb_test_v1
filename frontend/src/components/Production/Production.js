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
import useSiteAccess from '../../hooks/useSiteAccess';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const Production = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const authContext = useAuth(); // Get auth context at the top level
  
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingAccess, setUpdatingAccess] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [retryCount, setRetryCount] = useState(0);

  const { updateSiteAccess, updatingAccess: accessUpdating } = useSiteAccess();

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
      
      // Log the raw response for debugging
      console.log('[Production] Raw API response:', response);
      
      // Handle case where response is an array directly
      let sitesData = Array.isArray(response) ? response : response?.data || [];
      
      // If data is nested under 'Items', extract it
      if (sitesData?.Items && Array.isArray(sitesData.Items)) {
        sitesData = sitesData.Items;
      }
      
      // Transform data to ensure consistent format
      const formattedData = sitesData.map(site => ({
        companyId: String(site.companyId || '1'),
        productionSiteId: String(site.productionSiteId || ''),
        name: site.name || 'Unnamed Site',
        type: (site.type || 'unknown').toLowerCase(),
        location: site.location || 'Unknown Location',
        status: (site.status || 'inactive').toLowerCase(),
        capacity_MW: Number(site.capacity_MW || 0),
        injectionVoltage_KV: Number(site.injectionVoltage_KV || 0),
        annualProduction_L: Number(site.annualProduction_L || 0),
        htscNo: site.htscNo || '',
        banking: site.banking || 0,
        version: Number(site.version || 1),
        createdat: site.createdat || new Date().toISOString(),
        updatedat: site.updatedat || new Date().toISOString()
      }));
      
      console.log('[Production] Formatted sites data:', formattedData);
      setSites(formattedData);
      setLoading(false);
      
      if (formattedData.length === 0) {
        enqueueSnackbar('No production sites found', { variant: 'info' });
      } else {
        enqueueSnackbar(`Successfully loaded ${formattedData.length} sites`, { 
          variant: 'success',
          autoHideDuration: 2000
        });
      }

    } catch (err) {
      
      if (retryCount < MAX_RETRIES) {
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
  }, [enqueueSnackbar, retryCount, user]);

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
    setSelectedSite({
      name: '',
      type: '',
      location: '',
      capacity_MW: '',
      injectionVoltage_KV: '',
      htscNo: '',
      status: 'Active',
      banking: 0,
      annualProduction_L: ''
    });
    setIsEditing(false);
    setDialogOpen(true);
  }, [permissions.create, enqueueSnackbar]);

  const handleEditClick = useCallback((site) => {
    if (!permissions.update) {
      enqueueSnackbar('You do not have permission to edit sites', { 
        variant: 'error' 
      });
      return;
    }
    
    // Ensure we have all required fields including companyId
    const siteWithRequiredFields = {
      ...site,
      companyId: site.companyId || (authContext.user?.companyId ? String(authContext.user.companyId) : null)
    };
    
    if (!siteWithRequiredFields.companyId) {
      enqueueSnackbar('Cannot determine company information. Please log out and log back in.', {
        variant: 'error',
        autoHideDuration: 10000
      });
      return;
    }
    
    console.log('Setting selected site for edit:', siteWithRequiredFields);
    setSelectedSite(siteWithRequiredFields);
    setIsEditing(true);
    setDialogOpen(true);
  }, [permissions.update, enqueueSnackbar, authContext.user]);

  const handleDeleteClick = useCallback(async (site) => {
    if (!permissions.delete) {
      enqueueSnackbar('You do not have permission to delete sites', { 
        variant: 'error' 
      });
      return;
    }

    if (!site?.companyId || !site?.productionSiteId) {
      enqueueSnackbar('Invalid site data', { variant: 'error' });
      return;
    }
    
    try {
      const confirmed = await new Promise(resolve => {
        // Show a more detailed confirmation dialog
        const message = `Are you sure you want to delete "${site.name}"?\n\n` +
          'This action will:\n' +
          '- Permanently remove the production site\n' +
          '- Delete all associated production data\n' +
          '- Cannot be undone';
        resolve(window.confirm(message));
      });

      if (!confirmed) {
        enqueueSnackbar('Delete operation cancelled', { variant: 'info' });
        return;
      }

      setLoading(true);
      setError(null);

      await productionSiteApi.delete(site.companyId, site.productionSiteId);
      
      enqueueSnackbar('Site deleted successfully', { 
        variant: 'success',
        autoHideDuration: 3000
      });
      
      // Refresh the sites list
      await fetchSites();
    } catch (error) {
      console.error('[Production] Delete error:', error);
      setError('Failed to delete site. Please try again.');
      setLoading(false);
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

  const handleOpenDialog = (site = null) => {
    setSelectedSite(site);
    // Make sure to pass null for new sites to ensure proper button text
    setDialogOpen(true);
  };

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      console.log('[Production] Starting form submission with data:', formData);
      
      // Check if we have a valid user
      const currentUser = authContext?.user;
      if (!currentUser) {
        const errorMsg = 'Please log in to create or edit production sites.';
        console.error('[Production] No user found in auth context');
        throw new Error(errorMsg);
      }

      // Get company ID - prefer from selected site, then from user context
      const companyId = selectedSite?.companyId || 
                       (currentUser.companyId ? String(currentUser.companyId) : null);
      
      if (!companyId) {
        const errorMsg = 'Company ID is required to manage production sites. Please ensure your account is properly associated with a company.';
        console.error('[Production] No company ID found in user context');
        throw new Error(errorMsg);
      }

      // Transform form data as needed
      const submitData = {
        ...formData,
        capacity_MW: formData.capacity_MW != null ? Number(formData.capacity_MW) : null,
        injectionVoltage_KV: formData.injectionVoltage_KV != null ? Number(formData.injectionVoltage_KV) : null,
        annualProduction_L: formData.annualProduction_L != null ? Number(formData.annualProduction_L) : 0,
        banking: formData.banking ? 1 : 0,
        status: formData.status || 'Active',
        version: selectedSite ? (selectedSite.version || 1) : 1,
      };
      
      console.log('Submitting production site with company ID:', companyId, 'data:', submitData);
      
      let result;
      let isNewSite = false;
      
      if (selectedSite?.productionSiteId) {
        // Update existing site
        console.log('Updating existing site with ID:', selectedSite.productionSiteId);
        
        result = await productionSiteApi.update(
          companyId, 
          selectedSite.productionSiteId, 
          submitData
        );
        
        enqueueSnackbar('Production site updated successfully', { 
          variant: 'success',
          autoHideDuration: 3000
        });
      } else {
        // Create new site
        isNewSite = true;
        console.log('Creating new site for company:', companyId);
        
        // Add companyId to the site data
        const siteData = { ...submitData, companyId };
        
        // Create the site
        result = await productionSiteApi.create(siteData, { user: currentUser });
        
        // Handle both response formats: direct data or response.data
        const responseData = result.data || result;
        
        if (!responseData || (!responseData.productionSiteId && !responseData.data?.productionSiteId)) {
          console.error('Invalid response format from server:', result);
          throw new Error('Failed to create site: Invalid response format from server');
        }
        
        // Extract the created site data
        const createdSite = responseData.data || responseData;
        
        console.log('[Production] Site created successfully:', {
          companyId: createdSite.companyId,
          productionSiteId: createdSite.productionSiteId,
          response: responseData
        });
        
        // Update user's site access
        if (currentUser) {
          try {
            console.log('[Production] Updating user site access for new site:', {
              companyId: createdSite.companyId,
              productionSiteId: createdSite.productionSiteId,
              currentUser
            });
            
            await updateSiteAccess(currentUser, createdSite, 'production');
            console.log('[Production] Successfully updated user site access');
          } catch (accessError) {
            console.error('[Production] Error updating user site access:', accessError);
            // Don't fail the request if access update fails
          }
        }
        
        enqueueSnackbar('Production site created successfully', { 
          variant: 'success',
          autoHideDuration: 3000
        });
        
        // Refresh the site list
        await fetchSites();
        
        // Return the created site data
        return createdSite;
      }
      
      // For new sites, update user's accessible sites
      if (isNewSite && result?.companyId && result?.productionSiteId) {
        try {
          console.log('[Production] Updating user site access for new site:', {
            companyId: result.companyId,
            productionSiteId: result.productionSiteId,
            currentUser: {
              id: currentUser.id || currentUser.userId,
              email: currentUser.email,
              username: currentUser.username
            }
          });
          
          // Prepare site data for access update
          const siteData = {
            companyId: result.companyId,
            productionSiteId: result.productionSiteId,
            name: result.name || formData.name || 'New Production Site',
            type: 'production',
            status: result.status || formData.status || 'Active',
            capacity_MW: result.capacity_MW,
            location: result.location || formData.location,
            ...result
          };
          
          console.log('[Production] Calling updateSiteAccess with:', {
            user: { id: currentUser.id, email: currentUser.email },
            siteData: { ...siteData, productionSiteId: siteData.productionSiteId },
            siteType: 'production'
          });
          
          // Update site access
          const accessUpdated = await updateSiteAccess(currentUser, siteData, 'production');
          
          if (accessUpdated) {
            console.log('[Production] Successfully updated user site access');
            
            // Refresh user data to get updated accessible sites
            if (authContext.refreshUser) {
              try {
                await authContext.refreshUser();
                console.log('[Production] Successfully refreshed user data');
              } catch (refreshError) {
                console.warn('[Production] Warning: Could not refresh user data:', refreshError);
                // Non-critical error, continue
              }
            }
            
            enqueueSnackbar('Site access updated successfully', {
              variant: 'success',
              autoHideDuration: 3000
            });
          }
        } catch (accessError) {
          console.error('[Production] Error updating user site access:', accessError);
          // Don't fail the whole operation if access update fails
          enqueueSnackbar(
            'Site created, but there was an issue updating your access. Please refresh the page to see the new site.',
            { 
              variant: 'warning', 
              autoHideDuration: 6000,
              persist: true
            }
          );
        }
      }
      
      // Common cleanup for both create and update
      setDialogOpen(false);
      setSelectedSite(null);
      
      // Refresh the sites list to show the updated data
      await fetchSites();
      
      return result;
    } catch (error) {
      console.error('Error saving production site:', error);
      
      let errorMessage = 'Failed to save production site';
      let variant = 'error';
      let autoHideDuration = 8000;
      
      if (error.code === 'NO_COMPANY_ASSOCIATION') {
        errorMessage = error.message;
        variant = 'warning';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      enqueueSnackbar(errorMessage, {
        variant,
        autoHideDuration,
        action: (key) => (
          <Button
            color="inherit"
            size="small"
            onClick={() => enqueueSnackbar.close(key)}
          >
            Dismiss
          </Button>
        )
      });
    } finally {
      setLoading(false);
    }
  };

  const renderCardView = () => (
    <Grid container spacing={3} sx={{ mt: 2 }}>
      {sites.map((site) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={`${site.companyId}_${site.productionSiteId}`}>
          <ProductionSiteCard 
            site={site} 
            onEdit={permissions.update ? () => handleSiteClick(site) : null}
            onDelete={permissions.delete ? () => handleDeleteClick(site) : null}
          />
        </Grid>
      ))}
    </Grid>
  );

  const renderTableView = () => (
    <TableContainer component={Paper} sx={{ mt: 3, maxHeight: '70vh', overflow: 'auto' }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Type</TableCell>
            <TableCell align="right">Capacity (MW)</TableCell>
            <TableCell align="right">Production (L)</TableCell>
            <TableCell>HTSC No</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sites.map((site) => {
            const statusColor = site.status === 'active' ? 'success' : 
                              site.status === 'inactive' ? 'error' : 'warning';
                              
            return (
              <TableRow 
                key={`${site.companyId}_${site.productionSiteId}`}
                hover
                sx={{ '&:hover': { cursor: 'pointer' } }}
                onClick={() => handleSiteClick(site)}
              >
                <TableCell>{site.name}</TableCell>
                <TableCell>{site.location}</TableCell>
                <TableCell sx={{ textTransform: 'capitalize' }}>{site.type}</TableCell>
                <TableCell align="right">{site.capacity_MW.toLocaleString()}</TableCell>
                <TableCell align="right">{site.annualProduction_L.toLocaleString()}</TableCell>
                <TableCell>{site.htscNo || '-'}</TableCell>
                <TableCell>
                  <Box
                    component="span"
                    sx={{
                      px: 2,
                      py: 0.5,
                      borderRadius: 1,
                      backgroundColor: `${statusColor}.light`,
                      color: `${statusColor}.dark`,
                      fontWeight: 'medium',
                      display: 'inline-block',
                      minWidth: 80,
                      textAlign: 'center',
                      textTransform: 'capitalize'
                    }}
                  >
                    {site.status}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSiteClick(site);
                      }} 
                      size="small"
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {permissions.delete && (
                      <IconButton 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(site);
                        }} 
                        size="small" 
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
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
        <Alert 
          severity="info" 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            py: 3,
            '& .MuiAlert-message': {
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }
          }}
        >
          <Typography>No production sites found.</Typography>
          {permissions.create && (
            <Button 
              variant="text" 
              color="primary" 
              onClick={handleAddClick}
              size="small"
              sx={{ ml: 2 }}
            >
              Add New Site
            </Button>
          )}
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
          setIsEditing(false);
        }}
        onSubmit={handleSubmit}
        initialData={selectedSite}
        loading={loading}
        permissions={permissions}
        existingSites={sites}
        user={user}
        isEditing={isEditing}
      />
    </Paper>
  );
};

export default Production;

