import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon
} from '@mui/icons-material';

import SiteInfoCard from './SiteInfoCard';
import ProductionDataTable from './ProductionDataTable';
import ProductionSiteDataForm from './ProductionSiteDataForm';
import { productionSiteApi, productionUnitApi, productionChargeApi } from '../../services/api';
import { format } from 'date-fns';
import { formatSK, formatDisplayDate } from '../../utils/dateUtils';

const ProductionSiteDetails = () => {
  const { companyId, productionSiteId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState(null);
  const [unitData, setUnitData] = useState([]);
  const [chargeData, setChargeData] = useState([]);
  const [error, setError] = useState(null);
  
  const [dialog, setDialog] = useState({
    open: false,
    type: null,
    mode: 'create',
    data: null
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [siteRes, unitRes, chargeRes] = await Promise.all([
        productionSiteApi.fetchOne(companyId, productionSiteId),
        productionUnitApi.fetchAll(companyId, productionSiteId),
        productionChargeApi.fetchAll(companyId, productionSiteId)
      ]);

      setSite(siteRes);
      setUnitData(unitRes.data || []);
      setChargeData(chargeRes.data || []);
    } catch (err) {
      setError(err.message);
      enqueueSnackbar(err.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, productionSiteId]);

  // Memoized map of existing dates
  const existingDates = useMemo(() => {
    const dates = new Map();
    
    unitData.forEach(item => {
      dates.set(item.sk, {
        type: 'unit',
        data: item
      });
    });
    
    chargeData.forEach(item => {
      dates.set(item.sk, {
        type: 'charge',
        data: item
      });
    });
    
    return dates;
  }, [unitData, chargeData]);

  const checkExistingDate = (date) => {
    const sk = formatSK(date);
    return existingDates.get(sk);
  };

  const handleSubmit = async (formData) => {
    try {
      const api = dialog.type === 'unit' ? productionUnitApi : productionChargeApi;
      
      // For create, check if date already exists
      if (dialog.mode === 'create') {
        const existing = checkExistingDate(formData.date);
        if (existing) {
          const displayDate = formatDisplayDate(formatSK(formData.date));
          const message = `Data already exists for ${displayDate} (${existing.type}). Please choose a different month.`;
          enqueueSnackbar(message, { variant: 'warning' });
          return;
        }

        await api.create(companyId, productionSiteId, formData);
        enqueueSnackbar('Record created successfully', { variant: 'success' });
      } else {
        // For updates, use existing SK
        await api.update(companyId, productionSiteId, dialog.data.sk, {
          ...formData,
          version: dialog.data.version
        });
        enqueueSnackbar('Record updated successfully', { variant: 'success' });
      }

      await fetchData();
      setDialog({ open: false, type: null, mode: 'create', data: null });
    } catch (err) {
      console.error('Form submission error:', err);
      enqueueSnackbar(err.message || 'Failed to save record', { variant: 'error' });
    }
  };

  const handleDelete = async (data, type) => {
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      const api = type === 'unit' ? productionUnitApi : productionChargeApi;
      await api.delete(companyId, productionSiteId, data.sk);
      await fetchData();
      enqueueSnackbar('Record deleted successfully', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.message, { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  // Update the table sections to show loading states
  const renderDataTable = (type, data) => (
    <Paper sx={{ p: 3, mb: type === 'unit' ? 3 : 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Production {type === 'unit' ? 'Units' : 'Charges'}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setDialog({
            open: true,
            type,
            mode: 'create',
            data: null
          })}
        >
          Add {type === 'unit' ? 'Unit' : 'Charge'} Data
        </Button>
      </Box>
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : data.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No {type === 'unit' ? 'unit' : 'charge'} data available
        </Alert>
      ) : (
        <ProductionDataTable
          data={data}
          type={type}
          onEdit={(data) => setDialog({
            open: true,
            type,
            mode: 'edit',
            data
          })}
          onDelete={(data) => handleDelete(data, type)}
        />
      )}
    </Paper>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/production')}
        sx={{ mb: 3 }}
      >
        Back to Sites
      </Button>

      <SiteInfoCard site={site} />

      {renderDataTable('unit', unitData)}
      {renderDataTable('charge', chargeData)}

      {/* Form Dialog */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, type: null, mode: 'create', data: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialog.mode === 'create' ? 'Add' : 'Edit'} {dialog.type === 'unit' ? 'Unit' : 'Charge'} Data
        </DialogTitle>
        <DialogContent>
          <ProductionSiteDataForm
            type={dialog.type}
            initialData={dialog.data}
            onSubmit={handleSubmit}
            onCancel={() => setDialog({ open: false, type: null, mode: 'create', data: null })}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ProductionSiteDetails;