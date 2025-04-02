import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Grid,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material';

const ConsumptionSiteDialog = ({ 
  open, 
  onClose, 
  onSubmit, 
  initialData, 
  loading 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'industrial',
    location: '',
    annualConsumption: '',
    htscNo: '',
    injectionVoltage_KV: '',
    status: 'active'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        type: initialData.type || 'industrial',
        location: initialData.location || '',
        annualConsumption: initialData.annualConsumption || '',
        htscNo: initialData.htscNo || '',
        injectionVoltage_KV: initialData.injectionVoltage_KV || '',
        status: initialData.status || 'active'
      });
    } else {
      setFormData({
        name: '',
        type: 'industrial',
        location: '',
        annualConsumption: '',
        htscNo: '',
        injectionVoltage_KV: '',
        status: 'active'
      });
    }
    setErrors({});
  }, [initialData, open]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.annualConsumption) {
      newErrors.annualConsumption = 'Annual consumption is required';
    } else if (isNaN(formData.annualConsumption) || formData.annualConsumption <= 0) {
      newErrors.annualConsumption = 'Annual consumption must be a positive number';
    }
    if (!formData.htscNo) newErrors.htscNo = 'HTSC number is required';
    if (!formData.injectionVoltage_KV) {
      newErrors.injectionVoltage_KV = 'Injection voltage is required';
    } else if (isNaN(formData.injectionVoltage_KV) || formData.injectionVoltage_KV <= 0) {
      newErrors.injectionVoltage_KV = 'Injection voltage must be a positive number';
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : onClose}
      maxWidth="sm" 
      fullWidth
    >
      <DialogTitle>
        {initialData ? 'Edit Consumption Site' : 'Add Consumption Site'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Site Name"
                fullWidth
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                disabled={loading}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="type"
                label="Type"
                select
                fullWidth
                value={formData.type}
                onChange={handleChange}
                disabled={loading}
                required
              >
                <MenuItem value="industrial">Industrial</MenuItem>
                <MenuItem value="textile">Textile</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="location"
                label="Location"
                fullWidth
                value={formData.location}
                onChange={handleChange}
                error={!!errors.location}
                helperText={errors.location}
                disabled={loading}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="annualConsumption"
                label="Annual Consumption (MW)"
                type="number"
                fullWidth
                value={formData.annualConsumption}
                onChange={handleChange}
                error={!!errors.annualConsumption}
                helperText={errors.annualConsumption}
                disabled={loading}
                required
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="htscNo"
                label="HTSC Number"
                fullWidth
                value={formData.htscNo}
                onChange={handleChange}
                error={!!errors.htscNo}
                helperText={errors.htscNo}
                disabled={loading}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="injectionVoltage_KV"
                label="Injection Voltage (KV)"
                type="number"
                fullWidth
                value={formData.injectionVoltage_KV}
                onChange={handleChange}
                error={!!errors.injectionVoltage_KV}
                helperText={errors.injectionVoltage_KV}
                disabled={loading}
                required
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.status === 'active'}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        status: e.target.checked ? 'active' : 'inactive'
                      }));
                    }}
                    disabled={loading}
                  />
                }
                label="Active Status"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={onClose} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            variant="contained" 
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {initialData ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

ConsumptionSiteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  loading: PropTypes.bool
};

export default ConsumptionSiteDialog;