import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Grid,
  Chip
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { fetchProductionSiteDetails } from '../services/productionSiteapi';

const ProductionSiteDetails = () => {
  const { companyId, productionSiteId } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSiteDetails = async () => {
      try {
        setLoading(true);
        const response = await fetchProductionSiteDetails(
          parseInt(companyId),
          parseInt(productionSiteId)
        );
        setSite(response.data);
      } catch (err) {
        console.error('Error fetching site details:', err);
        setError(err.message || 'Failed to fetch site details');
      } finally {
        setLoading(false);
      }
    };

    if (companyId && productionSiteId) {
      fetchSiteDetails();
    }
  }, [companyId, productionSiteId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/production')}
          sx={{ mt: 2 }}
        >
          Back to Sites
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/production')}
        sx={{ mb: 3 }}
      >
        Back to Sites
      </Button>

      {site && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            {site.name}
          </Typography>
          
          <Grid container spacing={3}>
            {/* Site details */}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default ProductionSiteDetails;