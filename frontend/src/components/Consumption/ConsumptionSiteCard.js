import React from 'react';
import PropTypes from 'prop-types';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Card,
  CardActionArea,
  CardActions,
  Typography,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  LocationOn,
  Speed as ConsumptionIcon,
  Business as IndustryIcon,
  Engineering,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FiberManualRecord as StatusDotIcon
} from '@mui/icons-material';

const ConsumptionSiteCard = ({ site, onView, onEdit, onDelete, permissions }) => {
  const safeData = {
    consumptionSiteId: site?.consumptionSiteId || '',
    companyId: site?.companyId || '',
    name: site?.name || 'Unnamed Site',
    type: site?.type || 'Unknown',
    status: site?.status || 'Unknown',
    location: site?.location || 'Location not specified',
    annualConsumption: Number(site?.annualConsumption || 0),
    version: Number(site?.version || 1),
    timetolive: Number(site?.timetolive || 0),
    createdat: site?.createdat,
    updatedat: site?.updatedat
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      default: return 'warning';
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'industrial':
        return <IndustryIcon sx={{ mr: 1, fontSize: 20, color: 'warning.main' }} />;
      case 'textile':
        return <IndustryIcon sx={{ mr: 1, fontSize: 20, color: 'info.main' }} />;
      default:
        return <IndustryIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />;
    }
  };

  const handleClick = () => {
    if (onView) {
      onView(`/consumption/${site.companyId}/${site.consumptionSiteId}`);
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 2,
        transition: 'all 0.3s ease',
        border: 1,
        borderColor: 'transparent',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08)
        }
      }}
    >
      <CardActionArea onClick={handleClick} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
            {safeData.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatusDotIcon 
              sx={{ 
                fontSize: 12, 
                color: `${getStatusColor(safeData.status)}.main`
              }} 
            />
            <Typography variant="caption" color={`${getStatusColor(safeData.status)}.main`}>
              {safeData.status}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {getTypeIcon(safeData.type)}
              <Typography variant="body2" color="text.secondary">Type</Typography>
            </Box>
            <Typography variant="body1" color="primary.main">
              {safeData.type}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationOn sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
              <Typography variant="body2" color="text.secondary">Location</Typography>
            </Box>
            <Typography variant="body1" noWrap>{safeData.location}</Typography>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ConsumptionIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
              <Typography variant="body2" color="text.secondary">Annual Consumption</Typography>
            </Box>
            <Typography variant="body1">{safeData.annualConsumption} MW</Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Version: {safeData.version}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Last Updated: {new Date(safeData.updatedat).toLocaleDateString()}
          </Typography>
        </Box>
      </CardActionArea>

      {(permissions?.update || permissions?.delete) && (
        <CardActions sx={{ justifyContent: 'flex-end', p: 1.5 }}>
          {permissions?.update && onEdit && (
            <Tooltip title="Edit Site">
              <IconButton 
                size="small" 
                color="info" 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
          {permissions?.delete && onDelete && (
            <Tooltip title="Delete Site">
              <IconButton 
                size="small" 
                color="error" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </CardActions>
      )}
    </Card>
  );
};

ConsumptionSiteCard.propTypes = {
  site: PropTypes.object.isRequired,
  onView: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  permissions: PropTypes.shape({
    create: PropTypes.bool,
    update: PropTypes.bool,
    delete: PropTypes.bool
  }).isRequired
};

export default ConsumptionSiteCard;