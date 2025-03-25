import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Divider,
  Chip
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Power as CapacityIcon,
  ElectricBolt as VoltageIcon,
  Engineering as HtscIcon,  
  AccountBalance as BankIcon,
  WindPower as WindIcon,
  WbSunny as SolarIcon
} from '@mui/icons-material';

const DetailItem = ({ icon: Icon, label, value, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center' }}>
    <Icon sx={{ mr: 1, color: color || 'primary.main' }} />
    <Typography sx={{ mr: 1 }} color="text.secondary">
      {label}:
    </Typography>
    <Typography color={color}>
      {value}
    </Typography>
  </Box>
);

const SiteInfoCard = ({ site }) => {
  const getTypeIcon = () => {
    return site.type?.toLowerCase() === 'wind' ? 
      <WindIcon sx={{ fontSize: 40, color: 'primary.main' }} /> : 
      <SolarIcon sx={{ fontSize: 40, color: 'warning.main' }} />;
  };

  const getBankingStatus = () => {
    return site.banking === '1' ? {
      color: 'success.main',
      text: 'Banking Enabled'
    } : {
      color: 'error.main', 
      text: 'Banking Disabled'
    };
  };

  return (
    <Card elevation={3} sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {getTypeIcon()}
          <Box sx={{ ml: 2 }}>
            <Typography variant="h5" gutterBottom>
              {site.name}
            </Typography>
            <Chip 
              label={site.status}
              color={site.status === 'Active' ? 'success' : 'error'}
              size="small"
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <DetailItem 
                icon={LocationIcon} 
                label="Location" 
                value={site.location} 
              />
              <DetailItem 
                icon={CapacityIcon}
                label="Capacity"
                value={`${site.capacity_MW} MW`}
              />
              <DetailItem
                icon={VoltageIcon}
                label="Injection Voltage" 
                value={`${site.injectionVoltage_KV} KV`}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <DetailItem
                icon={HtscIcon}
                label="HTSC Number"
                value={site.htscNo}
              />
              <DetailItem 
                icon={BankIcon}
                label="Banking Status"
                value={getBankingStatus().text}
                color={getBankingStatus().color}
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default SiteInfoCard;