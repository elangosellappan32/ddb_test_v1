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
  Tooltip,
  FormHelperText,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment
} from '@mui/material';
import {
  Info as InfoIcon,
  LocationOn as LocationIcon,
  Speed as CapacityIcon,
  ElectricBolt as VoltageIcon,
  Assessment as ProductionIcon,
  Assignment as HtscIcon,
  AccountBalance as BankIcon,
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
  banking: false,
  annualProduction: ''
};

const ProductionSiteForm = ({ initialData, onSubmit, onCancel, loading, site }) => {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValid, setIsValid] = useState(false);

  // Initialize form with either initialData or site data
  useEffect(() => {
    if (initialData) {
      setFormData({ ...INITIAL_FORM_STATE, ...initialData });
    } else if (site) {
      setFormData({
        ...INITIAL_FORM_STATE,
        name: site.name || '',
        location: site.location || '',
        capacity_MW: site.capacity_MW || '',
        type: site.type || '',
        status: site.status || 'Active',
        injectionVoltage_KV: site.injectionVoltage_KV || '',
        htscNo: site.htscNo || '',
        banking: site.banking || false,
        annualProduction: site.annualProduction || ''
      });
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
      'annualProduction'
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

    if (type === 'number') {
      // Convert empty string to undefined for number fields
      processedValue = value === '' ? undefined : Number(value);
    } else if (type === 'checkbox') {
      processedValue = checked ? 1 : 0;
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Clear error when field is modified
    const fieldError = validateField(name, processedValue);
    setErrors(prev => ({
      ...prev,
      [name]: fieldError
    }));

    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
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
        if (value <= 0) return 'Capacity must be greater than 0';
        if (isNaN(value)) return 'Capacity must be a number';
        return '';

      case 'injectionVoltage_KV':
        if (!value && value !== 0) return 'Injection Voltage is required';
        if (value <= 0) return 'Injection Voltage must be greater than 0';
        if (isNaN(value)) return 'Injection Voltage must be a number';
        return '';

      case 'htscNo':
        if (!value) return 'HTSC No is required';
        if (value.length < 4) return 'HTSC No must be at least 4 characters';
        return '';

      case 'annualProduction':
        if (!value && value !== 0) return 'Annual Production is required';
        if (value <= 0) return 'Annual Production must be greater than 0';
        if (isNaN(value)) return 'Annual Production must be a number';
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
      annualProduction: 'Annual Production (L)'
    };

    const newErrors = {};
    Object.entries(requiredFields).forEach(([field, label]) => {
      const value = formData[field];
      if (value === '' || value === null || value === undefined) {
        newErrors[field] = `${label} is required`;
      } else if (
        ['capacity_MW', 'injectionVoltage_KV', 'annualProduction'].includes(field) &&
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
          annualProduction: Number(formData.annualProduction),
          banking: formData.banking ? 1 : 0
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
                />
              }
              label="Banking Enabled"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              id="annualProduction"
              name="annualProduction"
              label="Annual Production (L)"
              type="number"
              value={formData.annualProduction}
              onChange={handleChange}
              error={touched.annualProduction && !!errors.annualProduction}
              helperText={touched.annualProduction && errors.annualProduction}
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