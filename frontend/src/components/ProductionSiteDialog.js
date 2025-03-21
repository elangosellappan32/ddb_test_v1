import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  IconButton,
  Alert,
  FormHelperText,
  Radio,
  RadioGroup,
  FormControlLabel
} from '@mui/material';
import {
  Close as CloseIcon,
  LocationOn as LocationIcon,
  Speed as CapacityIcon,
  ElectricBolt as VoltageIcon,
  AccountBalance as BankingIcon,
  Badge as HtscIcon
} from '@mui/icons-material';

const ProductionSiteDialog = ({ open, onClose, onSubmit, editingData, loading }) => {
  const initialFormState = {
    name: '',
    type: 'Wind',
    location: '',
    capacity_MW: '',
    status: 'Active',
    banking: 0, // Initialize banking to 0
    htscNo: '',
    injectionVoltage_KV: '',
    annualProduction_L: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData(editingData ? {
        ...editingData,
        banking: Number(editingData.banking ?? 0) // Ensure banking is a number
      } : initialFormState);
    } else {
      setFormData(initialFormState);
    }
  }, [open, editingData]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.capacity_MW) newErrors.capacity_MW = 'Capacity is required';
    if (!formData.injectionVoltage_KV) newErrors.injectionVoltage_KV = 'Injection voltage is required';
    // Banking is not required as it defaults to 0
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const dataToSubmit = {
        ...formData,
        banking: Number(formData.banking), // Ensure banking is 0 or 1
        capacity_MW: Number(parseFloat(formData.capacity_MW || 0)),
        injectionVoltage_KV: Number(parseFloat(formData.injectionVoltage_KV || 0)),
        annualProduction_L: Number(parseFloat(formData.annualProduction_L || 0))
      };

      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error('Form submission error:', error);
      // Re-throw to let parent handle the error
      throw error;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          {editingData ? 'Edit Production Site' : 'New Production Site'}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'white' }}
          disabled={loading}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                Basic Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Site Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    error={!!errors.name}
                    helperText={errors.name}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                  >
                    <MenuItem value="Wind">Wind</MenuItem>
                    <MenuItem value="Solar">Solar</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Grid>

            {/* Location and Status */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    error={!!errors.location}
                    helperText={errors.location}
                    required
                    InputProps={{
                      startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                  >
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                    <MenuItem value="Maintenance">Maintenance</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Grid>

            {/* Technical Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                Technical Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Capacity (MW)"
                    name="capacity_MW"
                    value={formData.capacity_MW}
                    onChange={handleChange}
                    error={!!errors.capacity_MW}
                    helperText={errors.capacity_MW}
                    required
                    InputProps={{
                      startAdornment: <CapacityIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Injection Voltage (KV)"
                    name="injectionVoltage_KV"
                    value={formData.injectionVoltage_KV}
                    onChange={handleChange}
                    error={!!errors.injectionVoltage_KV}
                    helperText={errors.injectionVoltage_KV}
                    required
                    InputProps={{
                      startAdornment: <VoltageIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Additional Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                Additional Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="HTSC Number"
                    name="htscNo"
                    value={formData.htscNo}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: <HtscIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Banking Facility</Typography>
                  <FormControl component="fieldset">
                    <RadioGroup
                      row
                      name="banking"
                      value={formData.banking}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          banking: Number(e.target.value) // Convert to number explicitly
                        }));
                      }}
                    >
                      <FormControlLabel 
                        value={1}
                        control={<Radio />}
                        label={
                          <Box sx={{ color: 'success.main', fontWeight: 500 }}>
                            Yes
                          </Box>
                        }
                      />
                      <FormControlLabel 
                        value={0}
                        control={<Radio />}
                        label={
                          <Box sx={{ color: 'error.main', fontWeight: 500 }}>
                            No
                          </Box>
                        }
                      />
                    </RadioGroup>
                    <FormHelperText>
                      Select banking facility availability
                    </FormHelperText>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Annual Production (L)"
                    type="number"
                    value={formData.annualProduction_L}
                    onChange={(e) => setFormData({
                      ...formData,
                      annualProduction_L: e.target.value
                    })}
                    InputProps={{
                      inputProps: { min: 0 }
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          {Object.keys(errors).length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Please fix the errors before submitting
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50' }}>
          <Button
            onClick={onClose}
            disabled={loading}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              px: 4,
              bgcolor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.dark'
              }
            }}
          >
            {loading ? 'Saving...' : editingData ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProductionSiteDialog;