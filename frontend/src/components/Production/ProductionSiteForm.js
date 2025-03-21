import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';

const ProductionSiteForm = ({ open, site, onClose, onSubmit }) => {
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      name: site?.name || '',
      type: site?.type || 'Wind',
      location: site?.location || '',
      capacity_MW: site?.capacity_MW || '',
      htscNo: site?.htscNo || '',
      injectionVoltage_KV: site?.injectionVoltage_KV || '',
      banking: site?.banking || false
    }
  });

  React.useEffect(() => {
    reset(site || {});
  }, [site, reset]);

  const handleFormSubmit = (data) => {
    onSubmit({
      ...data,
      capacity_MW: parseFloat(data.capacity_MW),
      injectionVoltage_KV: parseFloat(data.injectionVoltage_KV),
      banking: Boolean(data.banking)
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {site ? 'Edit Production Site' : 'Add Production Site'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Name is required' }}
                render={({ field, fieldState: { error } }) => (
                  <TextField
                    {...field}
                    label="Site Name"
                    fullWidth
                    error={!!error}
                    helperText={error?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select {...field} label="Type">
                      <MenuItem value="Wind">Wind</MenuItem>
                      <MenuItem value="Solar">Solar</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="location"
                control={control}
                rules={{ required: 'Location is required' }}
                render={({ field, fieldState: { error } }) => (
                  <TextField
                    {...field}
                    label="Location"
                    fullWidth
                    error={!!error}
                    helperText={error?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="capacity_MW"
                control={control}
                rules={{ 
                  required: 'Capacity is required',
                  min: { value: 0, message: 'Must be positive' }
                }}
                render={({ field, fieldState: { error } }) => (
                  <TextField
                    {...field}
                    label="Capacity (MW)"
                    type="number"
                    fullWidth
                    error={!!error}
                    helperText={error?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="htscNo"
                control={control}
                rules={{ required: 'HTSC No. is required' }}
                render={({ field, fieldState: { error } }) => (
                  <TextField
                    {...field}
                    label="HTSC No."
                    fullWidth
                    error={!!error}
                    helperText={error?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="injectionVoltage_KV"
                control={control}
                rules={{ 
                  required: 'Injection Voltage is required',
                  min: { value: 0, message: 'Must be positive' }
                }}
                render={({ field, fieldState: { error } }) => (
                  <TextField
                    {...field}
                    label="Injection Voltage (KV)"
                    type="number"
                    fullWidth
                    error={!!error}
                    helperText={error?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="banking"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Enable Banking"
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {site ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProductionSiteForm;
