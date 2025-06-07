import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import ProductionSiteForm from './ProductionSiteForm';
import { useSnackbar } from 'notistack';
import { updateUserSiteAccess } from '../../utils/siteAccessUtils';

const ProductionSiteDialog = ({ 
  open, 
  onClose, 
  onSubmit, 
  initialData, 
  loading: externalLoading,
  permissions,
  existingSites = [],
  user,
  isEditing = false
}) => {
  const [formData, setFormData] = useState({
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (open) {
      if (isEditing && initialData) {
        // When editing, use the initialData and ensure all fields are properly set
        const siteData = {
          name: initialData.name || '',
          type: initialData.type || '',
          location: initialData.location || '',
          capacity_MW: initialData.capacity_MW != null ? initialData.capacity_MW : '',
          injectionVoltage_KV: initialData.injectionVoltage_KV != null ? initialData.injectionVoltage_KV : '',
          htscNo: initialData.htscNo || '',
          annualProduction_L: initialData.annualProduction_L != null ? initialData.annualProduction_L : '',
          status: initialData.status || 'Active',
          banking: initialData.banking || 0,
        };
        console.log('Setting form data for edit:', siteData);
        setFormData(siteData);
      } else {
        // For new site, use default empty values
        const defaultData = {
          name: '',
          type: '',
          location: '',
          capacity_MW: '',
          injectionVoltage_KV: '',
          htscNo: '',
          status: 'Active',
          banking: 0,
          annualProduction_L: ''
        };
        console.log('Setting default form data:', defaultData);
        setFormData(defaultData);
      }
    }
  }, [open, initialData, isEditing]);

  const handleClose = (event, reason) => {
    if (loading || externalLoading) return;
    if (reason !== 'backdropClick') {
      onClose();
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const response = await onSubmit(values);
      
      // Update user's accessible sites
      await updateUserSiteAccess(user, response.id, 'production');
      
      setLoading(false);
      onClose();
    } catch (error) {
      setLoading(false);
      if (error.message.includes('Version conflict')) {
        enqueueSnackbar('Site data was updated elsewhere. Please try again.', {
          variant: 'warning'
        });
        enqueueSnackbar('Please try your changes again.', {
          variant: 'info'
        });
      } else {
        setError('Error: ' + error.message);
        console.error('Error:', error);
      }
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={loading || externalLoading}
    >
      <DialogTitle
        component="div"
        sx={{
          borderBottom: '2px solid #1976d2',
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2
        }}
      >
        <Typography variant="h6" component="span">
          {isEditing ? 'Edit Production Site' : 'Add Production Site'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {!(loading || externalLoading) && (
            <IconButton
              onClick={handleClose}
              size="small"
              aria-label="close dialog"
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ p: 2 }}>
          {loading || externalLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <ProductionSiteForm
              key={formData.name || 'new'} // Force re-render when formData changes
              site={formData}
              initialData={formData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              loading={loading || externalLoading}
              readOnly={!permissions?.update && !permissions?.create}
            />
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

ProductionSiteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  loading: PropTypes.bool,
  permissions: PropTypes.shape({
    create: PropTypes.bool,
    update: PropTypes.bool,
    delete: PropTypes.bool
  }),

  user: PropTypes.object.isRequired,
  isEditing: PropTypes.bool
};

export default ProductionSiteDialog;