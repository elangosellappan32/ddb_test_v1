import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Switch,
  FormControlLabel,
  Typography,
  Tooltip
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';

const SITE_TYPES = ['Wind', 'Solar'];
const SITE_STATUS = ['Active', 'Inactive', 'Maintenance'];

const ProductionSiteForm = ({ initialData, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    type: 'Solar',
    status: 'Active',
    capacity_MW: '',
    injectionVoltage_KV: '',
    htscNo: '',
    annualProduction_L: '',
    banking: false,
    version: 1
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        location: initialData.location || '',
        type: initialData.type || 'Solar',
        status: initialData.status || 'Active',
        capacity_MW: initialData.capacity_MW?.toString() || '',
        injectionVoltage_KV: initialData.injectionVoltage_KV?.toString() || '',
        htscNo: initialData.htscNo?.toString() || '',
        annualProduction_L: initialData.annualProduction_L?.toString() || '',
        banking: Boolean(parseInt(initialData.banking, 10)),
        version: initialData.version || 1
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'banking' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submissionData = {
      ...formData,
      capacity_MW: parseFloat(formData.capacity_MW),
      injectionVoltage_KV: parseFloat(formData.injectionVoltage_KV),
      htscNo: parseInt(formData.htscNo, 10),
      annualProduction_L: parseFloat(formData.annualProduction_L),
      banking: formData.banking ? 1 : 0
    };
    onSubmit(submissionData);
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'capacity_MW':
        return value > 0 ? '' : 'Capacity must be greater than 0';
      case 'injectionVoltage_KV':
        return value > 0 ? '' : 'Injection voltage must be greater than 0';
      case 'htscNo':
        return value.length >= 4 ? '' : 'HTSC number must be at least 4 digits';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        {/* Name Field */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={loading}
            error={formData.name.length < 3}
            helperText={formData.name.length < 3 ? 'Name must be at least 3 characters' : ''}
          />
        </Grid>

        {/* Location Field */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </Grid>

        {/* Type Select */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Type</InputLabel>
            <Select
              name="type"
              value={formData.type}
              onChange={handleChange}
              label="Type"
              disabled={loading}
            >
              {SITE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Status Select */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Status</InputLabel>
            <Select
              name="status"
              value={formData.status}
              onChange={handleChange}
              label="Status"
              disabled={loading}
            >
              {SITE_STATUS.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Capacity Field */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Capacity (MW)"
            name="capacity_MW"
            type="number"
            value={formData.capacity_MW}
            onChange={handleChange}
            required
            disabled={loading}
            error={!!validateField('capacity_MW', formData.capacity_MW)}
            helperText={validateField('capacity_MW', formData.capacity_MW)}
          />
        </Grid>

        {/* Injection Voltage Field */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Injection Voltage (KV)"
            name="injectionVoltage_KV"
            type="number"
            value={formData.injectionVoltage_KV}
            onChange={handleChange}
            required
            disabled={loading}
            error={!!validateField('injectionVoltage_KV', formData.injectionVoltage_KV)}
            helperText={validateField('injectionVoltage_KV', formData.injectionVoltage_KV)}
          />
        </Grid>

        {/* HTSC Number Field */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="HTSC Number"
            name="htscNo"
            value={formData.htscNo}
            onChange={handleChange}
            required
            disabled={loading}
            error={!!validateField('htscNo', formData.htscNo)}
            helperText={validateField('htscNo', formData.htscNo)}
          />
        </Grid>

        {/* Annual Production Field */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Annual Production (L)"
            name="annualProduction_L"
            type="number"
            value={formData.annualProduction_L}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </Grid>

        {/* Banking Toggle */}
        <Grid item xs={12}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            bgcolor: 'background.paper',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.banking}
                  onChange={handleChange}
                  name="banking"
                  color="primary"
                  disabled={loading}
                />
              }
              label="Banking Enabled"
            />
            <Tooltip title="Enable banking for this production site">
              <InfoIcon sx={{ ml: 1, color: 'action.active' }} />
            </Tooltip>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              {formData.banking ? 'Banking is enabled for this site' : 'Banking is disabled for this site'}
            </Typography>
          </Box>
        </Grid>

        {/* Form Actions */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button 
              onClick={onCancel} 
              variant="outlined" 
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={loading || !formData.name || !formData.location}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : initialData ? 'Update' : 'Create'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

ProductionSiteForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  loading: PropTypes.bool
};

export default ProductionSiteForm;