import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Grid,
  Paper,
  Alert,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  LocationOn as LocationIcon,
  Speed as CapacityIcon,
  ElectricBolt as VoltageIcon
} from '@mui/icons-material';
import ProductionSiteForm from './ProductionSiteForm';
import { useSnackbar } from 'notistack';
import { updateUserSiteAccess } from '../../utils/siteAccessUtils';

const ProductionSiteDialog = ({ 
  open, 
  onClose, 
  onSubmit, 
  initialData, 
  loading: externalLoading,
  permissions,
  existingSites = [],
  user
}) => {
  const [formData, setFormData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (initialData && open) {
      setShowForm(true);
      setFormData(initialData);
    } else {
      setFormData(null);
      setShowForm(false);
    }
  }, [initialData, open]);

  const handleClose = (event, reason) => {
    if (loading || externalLoading) return;
    if (reason !== 'backdropClick') {
      setFormData(null);
      setShowForm(false);
      onClose();
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const response = await onSubmit(values);
      
      // Update user's accessible sites
      await updateUserSiteAccess(user, response.id, 'production');
      
      setLoading(false);
      onClose();
    } catch (error) {
      setLoading(false);
      if (error.message.includes('Version conflict')) {
        enqueueSnackbar('Site data was updated elsewhere. Please try again.', {
          variant: 'warning'
        });
        enqueueSnackbar('Please try your changes again.', {
          variant: 'info'
        });
      } else {
        setError('Error: ' + error.message);
        console.error('Error:', error);
      }
    }
  };

  const handleStartCreation = () => {
    setShowForm(true);
    setFormData(null);
  };

  const handleBackToList = () => {
    setShowForm(false);
    setFormData(null);
  };

  const handleEditSite = (site) => {
    setFormData(site);
    setShowForm(true);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={loading || externalLoading}
    >
      <DialogTitle
        sx={{
          borderBottom: '2px solid #1976d2',
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2
        }}
      >
        <Typography variant="h6">
          {initialData ? 'Edit Production Site' : 
           (showForm ? 'Add Production Site' : 'Production Sites')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {!showForm && permissions?.create && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleStartCreation}
            >
              Add New
            </Button>
          )}
          {!(loading || externalLoading) && (
            <IconButton
              onClick={handleClose}
              size="small"
              aria-label="close dialog"
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ p: 2 }}>
          {loading || externalLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : !showForm ? (
            <>
              {existingSites.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No production sites exist yet. Create your first one!
                </Alert>
              ) : (
                <Paper variant="outlined" sx={{ mb: 2 }}>
                  <List>
                    {existingSites.map((site, index) => (
                      <React.Fragment key={`${site.companyId}_${site.productionSiteId}`}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1">
                                {site.name}
                              </Typography>
                            }
                            secondary={
                              <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={12} sm={4}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LocationIcon fontSize="small" color="action" />
                                    <Typography variant="body2">{site.location}</Typography>
                                  </Box>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CapacityIcon fontSize="small" color="action" />
                                    <Typography variant="body2">{site.capacity_MW} MW</Typography>
                                  </Box>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <VoltageIcon fontSize="small" color="action" />
                                    <Typography variant="body2">{site.injectionVoltage_KV} kV</Typography>
                                  </Box>
                                </Grid>
                              </Grid>
                            }
                          />
                          <ListItemSecondaryAction>
                            {permissions?.update && (
                              <Tooltip title="Edit">
                                <IconButton edge="end" onClick={() => handleEditSite(site)}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < existingSites.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>
              )}
            </>
          ) : (
            <ProductionSiteForm
              initialData={formData}
              onSubmit={handleSubmit}
              onCancel={handleBackToList}
              loading={loading || externalLoading}
              readOnly={!permissions?.update && !permissions?.create}
            />
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

ProductionSiteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  loading: PropTypes.bool,
  permissions: PropTypes.shape({
    create: PropTypes.bool,
    update: PropTypes.bool,
    delete: PropTypes.bool
  }),
  existingSites: PropTypes.array,
  user: PropTypes.object.isRequired
};

export default ProductionSiteDialog;