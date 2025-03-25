import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Grid
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Speed as CapacityIcon,
  ElectricBolt as VoltageIcon,
  Assignment as HtscIcon,
  AccountBalance as BankingIcon
} from '@mui/icons-material';

const SiteInfoCard = ({ site }) => {
  // Helper function to format banking status
  const getBankingStatus = (banking) => {
    return banking === true || banking === "true" || banking === 1;
  };

  return (
    <Card elevation={3} sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          {site?.name || 'Site Name Not Available'}
        </Typography>
        
        <Grid container spacing={3}>
          {/* Location */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationIcon color="primary" />
              <Typography variant="body1">
                <strong>Location:</strong> {site?.location || 'Not specified'}
              </Typography>
            </Box>
          </Grid>

          {/* Capacity */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CapacityIcon color="secondary" />
              <Typography variant="body1">
                <strong>Capacity:</strong> {site?.capacity_MW || '0'} MW
              </Typography>
            </Box>
          </Grid>

          {/* Injection Voltage */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VoltageIcon color="warning" />
              <Typography variant="body1">
                <strong>Injection Voltage:</strong> {site?.injectionVoltage_KV || '0'} KV
              </Typography>
            </Box>
          </Grid>

          {/* HTSC Number */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HtscIcon color="info" />
              <Typography variant="body1">
                <strong>HTSC Number:</strong> {site?.htscNo || 'Not specified'}
              </Typography>
            </Box>
          </Grid>

          {/* Banking Status */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BankingIcon color={getBankingStatus(site?.banking) ? "success" : "error"} />
              <Chip
                label={getBankingStatus(site?.banking) ? "Banking Enabled" : "Banking Disabled"}
                color={getBankingStatus(site?.banking) ? "success" : "error"}
                variant="outlined"
                size="small"
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default SiteInfoCard;