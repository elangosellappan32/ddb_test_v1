import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Box,
  Divider
} from '@mui/material';
import {
  LocationOn,
  Business,
  Info,
  Engineering,
  Factory
} from '@mui/icons-material';

const SiteInfoCard = ({ site }) => {
  if (!site) return null;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'maintenance': return 'warning';
      default: return 'default';
    }
  };

  const renderInfoItem = (Icon, label, value, iconColor = 'primary') => (
    <Box display="flex" alignItems="center" gap={2} sx={{ py: 0.5 }}>
      <Icon color={iconColor} />
      <Box>
        <Typography variant="subtitle2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1">
          {value || 'Not Available'}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" component="h2" color="primary.main">
                {site.name || site.siteName}
              </Typography>
              <Chip
                icon={<Info />}
                label={site.status || 'Unknown'}
                color={getStatusColor(site.status)}
                variant="outlined"
                size="small"
              />
            </Box>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12} md={4}>
            {renderInfoItem(Factory, 'Site Type', site.type || site.siteType)}
          </Grid>

          <Grid item xs={12} md={4}>
            {renderInfoItem(LocationOn, 'Location', site.location)}
          </Grid>

          <Grid item xs={12} md={4}>
            {renderInfoItem(Engineering, 'Site ID', site.siteId)}
          </Grid>

          {site.description && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {site.description}
              </Typography>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default SiteInfoCard;