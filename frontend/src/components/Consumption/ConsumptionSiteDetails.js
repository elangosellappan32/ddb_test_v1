import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  CircularProgress, 
  Dialog, 
  DialogTitle, 
  DialogContent,
  Alert,
  IconButton
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Add as AddIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import consumptionSiteApi from '../../services/consumptionSiteApi';
import consumptionUnitApi from '../../services/consumptionUnitApi';
import SiteInfoCard from './SiteInfoCard';
import ConsumptionDataTable from './ConsumptionDataTable';
import ConsumptionSiteDataForm from './ConsumptionSiteDataForm';
import { formatSK, formatDisplayDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';

const ConsumptionSiteDetails = () => {
  const { companyId, consumptionSiteId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  
  // State declarations
  const [siteData, setSiteData] = useState({
    site: null,
    units: [],
    isLoaded: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState({
    open: false,
    type: 'unit',
    mode: 'create',
    data: null
  });

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const [siteResponse, unitsResponse] = await Promise.all([
        consumptionSiteApi.fetchOne(companyId, consumptionSiteId),
        consumptionUnitApi.fetchAll(companyId, consumptionSiteId)
      ]);

      const site = siteResponse?.data;
      const units = unitsResponse?.data || [];

      setSiteData({
        site,
        units,
        isLoaded: true
      });
    } catch (error) {
      console.error('[ConsumptionSiteDetails] Fetch error:', error);
      setError(error.message);
      enqueueSnackbar(error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [companyId, consumptionSiteId, enqueueSnackbar]);

  // Permissions
  const permissions = useMemo(() => ({
    units: {
      create: hasPermission(user, 'consumption-units', 'CREATE'),
      read: hasPermission(user, 'consumption-units', 'READ'),
      update: hasPermission(user, 'consumption-units', 'UPDATE'),
      delete: hasPermission(user, 'consumption-units', 'DELETE')
    }
  }), [user]);

  // Handlers
  const handleAddClick = useCallback(() => {
    if (!permissions.units.create) {
      enqueueSnackbar('You do not have permission to add new records', { 
        variant: 'error' 
      });
      return;
    }

    setDialog({ open: true, type: 'unit', mode: 'create', data: null });
  }, [permissions.units.create, enqueueSnackbar]);

  const handleEditClick = useCallback((data) => {
    if (!permissions.units.update) {
      enqueueSnackbar('You do not have permission to edit records', { 
        variant: 'error' 
      });
      return;
    }

    setDialog({ open: true, type: 'unit', mode: 'edit', data });
  }, [permissions.units.update, enqueueSnackbar]);

  const handleDeleteClick = useCallback(async (data) => {
    if (!permissions.units.delete) {
      enqueueSnackbar('You do not have permission to delete records', { 
        variant: 'error' 
      });
      return;
    }

    if (!window.confirm('Are you sure you want to delete this consumption unit?')) {
      return;
    }

    try {
      await consumptionUnitApi.delete(companyId, consumptionSiteId, data.sk);
      await fetchData();
      enqueueSnackbar('Consumption unit deleted successfully', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.message, { variant: 'error' });
    }
  }, [permissions.units.delete, companyId, consumptionSiteId, enqueueSnackbar, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle form submission
  const handleSubmit = async (formData) => {
    try {
      const sk = formatSK(formData.date);
      
      if (dialog.mode === 'create') {
        const existingCheck = siteData.units.find(unit => unit.sk === sk);
        
        if (existingCheck) {
          const displayDate = formatDisplayDate(formData.date);
          const confirmUpdate = await new Promise(resolve => {
            const message = `Consumption unit data already exists for ${displayDate}. Would you like to update the existing record?`;
            resolve(window.confirm(message));
          });

          if (confirmUpdate) {
            // Merge existing data with new form data
            const updatedData = {
              ...existingCheck,
              ...formData,
              version: (existingCheck.version || 0) + 1,
              type: 'UNIT'
            };
            await consumptionUnitApi.update(companyId, consumptionSiteId, sk, updatedData);
            enqueueSnackbar('Unit updated successfully', { variant: 'success' });
          } else {
            enqueueSnackbar('Operation cancelled', { variant: 'info' });
            return;
          }
        } else {
          await consumptionUnitApi.create(companyId, consumptionSiteId, {
            ...formData,
            sk,
            type: 'UNIT'
          });
          enqueueSnackbar('Unit created successfully', { variant: 'success' });
        }
      } else {
        // For edit mode, merge existing data with new form data
        const updatedData = {
          ...dialog.data,
          ...formData,
          version: (dialog.data.version || 0) + 1,
          type: 'UNIT'
        };
        await consumptionUnitApi.update(companyId, consumptionSiteId, dialog.data.sk, updatedData);
        enqueueSnackbar('Unit updated successfully', { variant: 'success' });
      }

      await fetchData();
      setDialog({ open: false, type: 'unit', mode: 'create', data: null });
    } catch (err) {
      console.error('Form submission error:', err);
      enqueueSnackbar(err.message || 'Failed to save unit', { 
        variant: 'error',
        autoHideDuration: 5000 
      });
    }
  };

  // Render data table
  const renderDataTable = useCallback(() => {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Consumption Units</Typography>
          {permissions.units.create && (
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              color="primary"
              onClick={handleAddClick}
            >
              Add Consumption Unit
            </Button>
          )}
        </Box>
        
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : !siteData.units.length ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No consumption unit data available.
            {user?.role?.toUpperCase() === 'ADMIN' && ' Click the Add button to create new data.'}
          </Alert>
        ) : (
          <ConsumptionDataTable
            data={siteData.units}
            onEdit={permissions.units.update ? handleEditClick : undefined}
            onDelete={permissions.units.delete ? handleDeleteClick : undefined}
            permissions={permissions.units}
          />
        )}
      </Paper>
    );
  }, [loading, error, siteData.units, permissions.units, handleAddClick, handleEditClick, handleDeleteClick, user]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/consumption')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">Consumption Site Details</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <SiteInfoCard site={siteData.site} />
          {renderDataTable()}

          <Dialog
            open={dialog.open}
            onClose={() => setDialog({ open: false, type: 'unit', mode: 'create', data: null })}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {dialog.mode === 'create' ? 'Add' : 'Edit'} Consumption Unit
            </DialogTitle>
            <DialogContent>
              <ConsumptionSiteDataForm
                type="unit"
                initialData={dialog.data}
                onSubmit={handleSubmit}
                onCancel={() => setDialog({ open: false, type: 'unit', mode: 'create', data: null })}
                companyId={companyId}
                consumptionSiteId={consumptionSiteId}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default ConsumptionSiteDetails;