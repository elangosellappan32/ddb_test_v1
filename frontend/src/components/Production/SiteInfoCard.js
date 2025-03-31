import React from 'react';
import { Paper, Typography, Grid, Box } from '@mui/material';
import { 
  Factory as FactoryIcon, 
  LocationOn as LocationIcon,
  Power as PowerIcon,
  BatteryChargingFull as VoltageIcon
} from '@mui/icons-material';

const SiteInfoCard = ({ site }) => {
  if (!site) return null;

  const siteInfo = {
    name: site.name || '',
    location: site.location || '',
    capacity: site.capacity_MW || 0,
    voltage: site.injectionVoltage_KV || 0,
    type: site.type || '',
    htscNo: site.htscNo || ''
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Site Information
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FactoryIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography>
              <strong>Name:</strong> {siteInfo.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <LocationIcon sx={{ mr: 1, color: 'error.main' }} />
            <Typography>
              <strong>Location:</strong> {siteInfo.location}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PowerIcon sx={{ mr: 1, color: 'success.main' }} />
            <Typography>
              <strong>Capacity:</strong> {siteInfo.capacity} MW
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <VoltageIcon sx={{ mr: 1, color: 'warning.main' }} />
            <Typography>
              <strong>Injection Voltage:</strong> {siteInfo.voltage} KV
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default SiteInfoCard;