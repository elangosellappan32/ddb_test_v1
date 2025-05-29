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
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Speed as CapacityIcon,
  ElectricBolt as VoltageIcon,
  Assignment as HtscIcon,
  Factory as TypeIcon,
  Assessment as AnnualProductionIcon
} from '@mui/icons-material';

const SITE_TYPES = ['Wind', 'Solar'];
const SITE_STATUS = ['Active', 'Inactive', 'Maintenance'];

const INITIAL_FORM_STATE = {
  name: '',
  location: '',
  capacity_MW: '',
  injectionVoltage_KV: '',
  htscNo: '',
  type: '',
  status: 'Active',
  banking: 0,
  annualProduction_L: ''  // Changed from annualProduction
};

const ProductionSiteForm = ({ initialData, onSubmit, onCancel, loading, site }) => {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValid, setIsValid] = useState(false);

  // Initialize form with existing data
  useEffect(() => {
    const data = initialData || site;
    if (data) {
      setFormData({
        name: data.name || '',
        type: data.type || '',
        location: data.location || '',
        capacity_MW: data.capacity_MW || '',
        injectionVoltage_KV: data.injectionVoltage_KV || '',
        htscNo: data.htscNo || '',
        status: data.status || 'Active',
        banking: Number(data.banking || 0),
        annualProduction_L: data.annualProduction_L || data.annualProduction || '',
        version: Number(data.version || 1)
      });
      
      // Clear any existing errors when initializing
      setErrors({});
      // Reset touched state
      setTouched({});
      
      console.log('Form initialized with data:', data);
    }
  }, [initialData, site]);

  // Update the useEffect for form validation
  useEffect(() => {
    // Check for required fields
    const requiredFields = [
      'name',
      'type',
      'location',
      'capacity_MW',
      'injectionVoltage_KV',
      'htscNo',
      'annualProduction_L'
    ];

    const allFieldsFilled = requiredFields.every(field => {
      const value = formData[field];
      // Check for empty strings, null, undefined, and 0 values
      return value !== '' && value !== null && value !== undefined && value !== 0;
    });

    // Check for validation errors
    const hasErrors = Object.values(errors).some(error => error !== '');

    // Set form validity
    setIsValid(allFieldsFilled && !hasErrors);
  }, [formData, errors]);

  // Update handleChange to handle number fields properly
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let processedValue = value;

    // Special handling for number fields
    if (type === 'number') {
      processedValue = value === '' ? '' : Number(value);
    }
    // Handle checkbox/switch fields
    else if (type === 'checkbox') {
      processedValue = checked ? 1 : 0;
    }

    // Update form data
    let updates = { [name]: processedValue };

    // Special handling for status changes
    if (name === 'status' && (value === 'Inactive' || value === 'Maintenance')) {
      updates.banking = 0; // Disable banking for inactive/maintenance status
    }

    setFormData(prev => ({
      ...prev,
      ...updates
    }));

    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validate the field
    const fieldError = validateField(name, processedValue);
    setErrors(prev => ({
      ...prev,
      [name]: fieldError
    }));
  };

  // Update validateField function to be more precise
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value) return 'Site Name is required';
        if (value.length < 3) return 'Site Name must be at least 3 characters';
        return '';

      case 'type':
        if (!value) return 'Site Type is required';
        if (!SITE_TYPES.includes(value)) return 'Invalid Site Type';
        return '';

      case 'location':
        if (!value) return 'Location is required';
        if (value.length < 2) return 'Location must be at least 2 characters';
        return '';

      case 'capacity_MW':
        if (!value && value !== 0) return 'Capacity is required';
        const capacityValue = Number(value);
        if (isNaN(capacityValue) || capacityValue <= 0) return 'Capacity must be greater than 0';
        return '';

      case 'injectionVoltage_KV':
        if (!value && value !== 0) return 'Injection Voltage is required';
        const voltageValue = Number(value);
        if (isNaN(voltageValue) || voltageValue <= 0) return 'Injection Voltage must be greater than 0';
        return '';

      case 'htscNo':
        if (!value) return 'HTSC No is required';
        if (value.length < 4) return 'HTSC No must be at least 4 characters';
        return '';

      case 'annualProduction_L':
        if (!value && value !== 0) return 'Annual Production is required';
        const productionValue = Number(value);
        if (isNaN(productionValue) || productionValue <= 0) return 'Annual Production must be greater than 0';
        return '';

      case 'status':
        if (!value) return 'Status is required';
        if (!SITE_STATUS.includes(value)) return 'Invalid Status';
        return '';

      default:
        return '';
    }
  };

  const validateForm = () => {
    const requiredFields = {
      name: 'Site Name',
      type: 'Site Type',
      location: 'Location',
      capacity_MW: 'Capacity (MW)',
      injectionVoltage_KV: 'Injection Voltage (KV)',
      htscNo: 'HTSC No',
      annualProduction_L: 'Annual Production (L)'
    };

    const newErrors = {};
    Object.entries(requiredFields).forEach(([field, label]) => {
      const value = formData[field];
      if (value === '' || value === null || value === undefined) {
        newErrors[field] = `${label} is required`;
      } else if (
        ['capacity_MW', 'injectionVoltage_KV', 'annualProduction_L'].includes(field) &&
        (isNaN(value) || Number(value) <= 0)
      ) {
        newErrors[field] = `${label} must be a positive number`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => ({
      ...acc,
      [key]: true
    }), {});
    setTouched(allTouched);

    if (validateForm()) {
      try {
        // Transform data before submission
        const submitData = {
          ...formData,
          // Ensure all numeric fields are numbers
          capacity_MW: Number(formData.capacity_MW),
          injectionVoltage_KV: Number(formData.injectionVoltage_KV),
          annualProduction_L: Number(formData.annualProduction_L), // Use correct field name
          htscNo: formData.htscNo,
          banking: formData.status === 'Inactive' || formData.status === 'Maintenance' ? 0 : Number(formData.banking)
        };

        await onSubmit(submitData);
      } catch (error) {
        console.error('Form submission error:', error);
        setErrors(prev => ({
          ...prev,
          submit: error.message
        }));
      }
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
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <DialogTitle>
        {site ? 'Edit Production Site' : 'Add Production Site'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="name"
              name="name"
              label="Site Name"
              value={formData.name}
              onChange={handleChange}
              error={touched.name && !!errors.name}
              helperText={touched.name && errors.name}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <TypeIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                name="type"
                value={formData.type || ''}
                onChange={handleChange}
                label="Type"
              >
                {SITE_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="location"
              name="location"
              label="Location"
              value={formData.location}
              onChange={handleChange}
              error={touched.location && !!errors.location}
              helperText={touched.location && errors.location}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="capacity_MW"
              name="capacity_MW"
              label="Capacity (MW)"
              type="number"
              value={formData.capacity_MW}
              onChange={handleChange}
              error={touched.capacity_MW && !!errors.capacity_MW}
              helperText={touched.capacity_MW && errors.capacity_MW}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CapacityIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">MW</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="injectionVoltage_KV"
              name="injectionVoltage_KV"
              label="Injection Voltage (KV)"
              type="number"
              value={formData.injectionVoltage_KV}
              onChange={handleChange}
              error={touched.injectionVoltage_KV && !!errors.injectionVoltage_KV}
              helperText={touched.injectionVoltage_KV && errors.injectionVoltage_KV}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <VoltageIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">KV</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="htscNo"
              name="htscNo"
              label="HTSC No"
              value={formData.htscNo}
              onChange={handleChange}
              error={touched.htscNo && !!errors.htscNo}
              helperText={touched.htscNo && errors.htscNo}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <HtscIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                label="Status"
              >
                {SITE_STATUS.map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  name="banking"
                  checked={Boolean(formData.banking)}
                  onChange={(e) => handleChange({
                    target: {
                      name: 'banking',
                      value: e.target.checked ? 1 : 0
                    }
                  })}
                  disabled={formData.status === 'Inactive' || formData.status === 'Maintenance'}
                />
              }
              label="Banking Enabled"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              id="annualProduction_L"
              name="annualProduction_L"
              label="Annual Production (L)"
              type="number"
              value={formData.annualProduction_L}
              onChange={handleChange}
              error={touched.annualProduction_L && !!errors.annualProduction_L}
              helperText={touched.annualProduction_L && errors.annualProduction_L}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AnnualProductionIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">L</InputAdornment>,
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button 
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading || !isValid}
        >
          {site ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Box>
  );
};

ProductionSiteForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  site: PropTypes.object
};

export default ProductionSiteForm;