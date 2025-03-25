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

const ProductionSiteDialog = ({ open, onClose, onSubmit, initialData, loading }) => {
  const [formData, setFormData] = useState(null);

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

  const handleSubmit = (data) => {
    console.log('[ProductionSiteDialog] Submitting form data:', data);
    onSubmit(data);
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
  loading: PropTypes.bool
};

export default ProductionSiteDialog;