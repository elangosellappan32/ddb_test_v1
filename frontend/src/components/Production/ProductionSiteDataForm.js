import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  CircularProgress
} from '@mui/material';
import { DesktopDatePicker } from '@mui/x-date-pickers';
import { format, parse } from 'date-fns';

const ProductionSiteDataForm = ({ 
  type = 'unit', 
  initialData, 
  onSubmit, 
  onCancel, 
  loading = false 
}) => {
  // Function to generate SK in MMYYYY format
  const generateSK = (date) => {
    return format(date, 'MMyyyy');
  };

  // Function to parse SK to Date object
  const parseSKToDate = (sk) => {
    if (!sk) return new Date();
    try {
      // Parse SK from MMYYYY format to Date
      return parse(sk, 'MMyyyy', new Date());
    } catch (error) {
      console.error('Error parsing SK:', error);
      return new Date();
    }
  };

  // Generate initial values based on type
  function generateInitialValues(type, data) {
    if (type === 'unit') {
      return {
        c1: data?.c1?.toString() || '0',
        c2: data?.c2?.toString() || '0',
        c3: data?.c3?.toString() || '0',
        c4: data?.c4?.toString() || '0',
        c5: data?.c5?.toString() || '0'
      };
    }
    
    return Array.from({ length: 10 }, (_, i) => {
      const key = `c${String(i + 1).padStart(3, '0')}`;
      return { [key]: data?.[key]?.toString() || '0' };
    }).reduce((acc, curr) => ({ ...acc, ...curr }), {});
  }

  // Initialize form data with proper date handling
  const [formData, setFormData] = useState({
    date: initialData?.date ? new Date(initialData.date) : new Date(),
    version: initialData?.version || 1,
    ...generateInitialValues(type, initialData)
  });

  const [errors, setErrors] = useState({});

  const getFields = () => {
    if (type === 'unit') {
      return [
        { id: 'c1', label: 'C1 Value' },
        { id: 'c2', label: 'C2 Value' },
        { id: 'c3', label: 'C3 Value' },
        { id: 'c4', label: 'C4 Value' },
        { id: 'c5', label: 'C5 Value' }
      ];
    }

    return Array.from({ length: 10 }, (_, i) => ({
      id: `c${String(i + 1).padStart(3, '0')}`,
      label: `C${String(i + 1).padStart(3, '0')} Value`
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.date || isNaN(formData.date.getTime())) {
      newErrors.date = 'Valid date is required';
    }
  
    getFields().forEach(field => {
      const value = parseFloat(formData[field.id]);
      if (isNaN(value)) {
        newErrors[field.id] = 'Must be a valid number';
      }
      if (value < 0) {
        newErrors[field.id] = 'Must be non-negative';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDateChange = (newDate) => {
    if (!newDate || isNaN(newDate.getTime())) {
      setErrors(prev => ({ ...prev, date: 'Please select a valid date' }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      date: newDate
    }));
    setErrors(prev => ({ ...prev, date: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const sk = generateSK(formData.date);
    
    const submitData = {
      ...formData,
      sk,
      date: format(formData.date, 'yyyy-MM-dd'),
      type: type.toUpperCase(),
      // Convert charge values to numbers
      ...getFields().reduce((acc, field) => ({
        ...acc,
        [field.id]: parseFloat(formData[field.id]) || 0
      }), {}),
      version: parseInt(formData.version) || 1
    };

    console.log('Submitting data:', submitData);
    onSubmit(submitData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when field is changed
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6">
            {type === 'unit' ? 'Production Unit Data' : 'Production Charge Data'}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <DesktopDatePicker
            label="Period"
            inputFormat="MM/yyyy"
            views={['year', 'month']}
            value={formData.date}
            onChange={handleDateChange}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                required
                error={!!errors.date}
                helperText={errors.date}
              />
            )}
          />
        </Grid>

        {getFields().map(field => (
          <Grid item xs={12} sm={6} key={field.id}>
            <TextField
              fullWidth
              label={field.label}
              name={field.id}
              value={formData[field.id]}
              onChange={(e) => handleChange(field.id, e.target.value)}
              type="number"
              required
              inputProps={{ 
                step: "0.01",
                min: "0"
              }}
              error={!!errors[field.id]}
              helperText={errors[field.id]}
            />
          </Grid>
        ))}

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={onCancel}
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
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProductionSiteDataForm;