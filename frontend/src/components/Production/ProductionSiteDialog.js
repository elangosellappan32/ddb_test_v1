import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import ProductionSiteForm from './ProductionSiteForm';
import { useSnackbar } from 'notistack';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  name: Yup.string()
    .required('Name is required')
    .min(3, 'Name must be at least 3 characters'),
  type: Yup.string()
    .required('Type is required')
    .oneOf(['wind', 'solar'], 'Invalid type'),
  location: Yup.string().required('Location is required'),
  capacity_MW: Yup.number()
    .required('Capacity is required')
    .min(0, 'Must be positive')
    .typeError('Must be a number'),
  injectionVoltage_KV: Yup.number()
    .required('Injection voltage is required')
    .min(0, 'Must be positive')
    .typeError('Must be a number'),
  annualProduction_L: Yup.number()
    .required('Annual Production is required')
    .min(0, 'Must be positive')
    .typeError('Must be a number'),
  htscNo: Yup.string().required('HTSC No is required'),
  banking: Yup.number()
    .required('Banking status is required')
    .oneOf([0, 1], 'Invalid banking value')
});

const initialValues = {
  name: '',
  type: 'wind',
  location: '',
  capacity_MW: '',
  injectionVoltage_KV: '',
  annualProduction_L: '',
  htscNo: '',
  banking: 0,
  status: 'active'
};

const ProductionSiteDialog = ({ open, onClose, onSubmit, initialData, loading, permissions }) => {
  const [formData, setFormData] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (initialData && open) {
      console.log('[ProductionSiteDialog] Initializing form with data:', initialData);
      setFormData(initialData);
    } else {
      setFormData(null);
    }
  }, [initialData, open]);

  const handleClose = (event, reason) => {
    if (loading) return;
    if (reason !== 'backdropClick') {
      setFormData(null);
      onClose();
    }
  };

  const handleSubmit = async (values) => {
    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      if (error.message.includes('Version conflict')) {
        // Automatically refresh data and retry
        enqueueSnackbar('Please try your changes again.', {
          variant: 'info'
        });
      } else {
        throw error;
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 3,
          py: 2
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          {formData ? `Edit Production Site - ${formData.name}` : 'Create Production Site'}
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ color: 'white' }}
          disabled={loading}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <ProductionSiteForm
              initialData={formData}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              loading={loading}
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
  permissions: PropTypes.object
};

export default ProductionSiteDialog;