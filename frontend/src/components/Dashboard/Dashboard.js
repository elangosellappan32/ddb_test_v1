import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  CardActionArea
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Factory as FactoryIcon,
  PowerSettingsNew as ConsumptionIcon,
  AssignmentTurnedIn as AllocationIcon,
  Assessment as ReportsIcon,
  WbSunny as SolarIcon,
  Air as WindIcon,
  Power as PowerIcon,
  Speed as EfficiencyIcon
} from '@mui/icons-material';
import productionSiteApi from '../../services/productionSiteapi';

const DashboardCard = ({ icon: Icon, title, content, color, onClick }) => (
  <Card 
    sx={{ 
      height: '100%',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 6,
        bgcolor: (theme) => alpha(theme.palette[color].main, 0.1)
      }
    }}
  >
    <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Icon sx={{ mr: 1, color: `${color}.main` }} />
          <Typography variant="h6">{title}</Typography>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ mt: 2 }}>{content}</Box>
      </CardContent>
    </CardActionArea>
  </Card>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    solar: 0,
    wind: 0,
    totalCapacity: 0,
    solarCapacity: 0,
    windCapacity: 0,
    efficiency: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculateStats = useCallback((response) => {
    try {
      const sites = response?.data || [];
      console.log('[Dashboard] Processing sites:', sites);

      if (!Array.isArray(sites)) {
        throw new Error('Invalid data format received from API');
      }

      const solarSites = sites.filter(site => site.type?.toLowerCase() === 'solar');
      const windSites = sites.filter(site => site.type?.toLowerCase() === 'wind');

      const solarCapacity = solarSites.reduce((sum, site) => sum + (Number(site.capacity_MW) || 0), 0);
      const windCapacity = windSites.reduce((sum, site) => sum + (Number(site.capacity_MW) || 0), 0);
      const totalCapacity = solarCapacity + windCapacity;

      const activeSites = sites.filter(site => site.status?.toLowerCase() === 'active');
      const efficiency = totalCapacity > 0 
        ? (activeSites.reduce((sum, site) => sum + (Number(site.capacity_MW) || 0), 0) / totalCapacity) * 100 
        : 0;

      return {
        total: sites.length,
        solar: solarSites.length,
        wind: windSites.length,
        totalCapacity: totalCapacity.toFixed(2),
        solarCapacity: solarCapacity.toFixed(2),
        windCapacity: windCapacity.toFixed(2),
        efficiency: efficiency.toFixed(1)
      };
    } catch (err) {
      console.error('[Dashboard] Stats calculation error:', err);
      throw err;
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Dashboard] Fetching sites for stats...');
      const response = await productionSiteApi.fetchAll();
      console.log('[Dashboard] API Response:', response);
      const calculatedStats = calculateStats(response);
      console.log('[Dashboard] Calculated stats:', calculatedStats);
      setStats(calculatedStats);
      setError(null);
    } catch (err) {
      console.error('[Dashboard] Error fetching stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
        Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Production Overview Card */}
        <Grid item xs={12} md={6} lg={3}>
          <DashboardCard
            icon={FactoryIcon}
            title="Production Overview"
            color="primary"
            onClick={() => navigate('/production')}
            content={
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Total Sites:</Typography>
                  <Typography>{stats.total}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SolarIcon sx={{ mr: 0.5, color: 'warning.main', fontSize: 'small' }} />
                    <Typography color="textSecondary">Solar:</Typography>
                  </Box>
                  <Typography>{stats.solar} ({stats.solarCapacity} MW)</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WindIcon sx={{ mr: 0.5, color: 'success.main', fontSize: 'small' }} />
                    <Typography color="textSecondary">Wind:</Typography>
                  </Box>
                  <Typography>{stats.wind} ({stats.windCapacity} MW)</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PowerIcon sx={{ mr: 0.5, color: 'primary.main', fontSize: 'small' }} />
                    <Typography color="textSecondary">Total Capacity:</Typography>
                  </Box>
                  <Typography>{stats.totalCapacity} MW</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EfficiencyIcon sx={{ mr: 0.5, color: 'info.main', fontSize: 'small' }} />
                    <Typography color="textSecondary">Efficiency:</Typography>
                  </Box>
                  <Typography>{stats.efficiency}%</Typography>
                </Box>
              </Box>
            }
          />
        </Grid>

        {/* Consumption Card */}
        <Grid item xs={12} md={6} lg={3}>
          <DashboardCard
            icon={ConsumptionIcon}
            title="Consumption"
            color="success"
            onClick={() => navigate('/consumption')}
            content={
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Total Consumption:</Typography>
                  <Typography>450 MW</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Peak Load:</Typography>
                  <Typography>680 MW</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Current Load:</Typography>
                  <Typography>425 MW</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="textSecondary">Load Factor:</Typography>
                  <Typography>85%</Typography>
                </Box>
              </Box>
            }
          />
        </Grid>

        {/* Allocation Card */}
        <Grid item xs={12} md={6} lg={3}>
          <DashboardCard
            icon={AllocationIcon}
            title="Allocation"
            color="warning"
            onClick={() => navigate('/allocation')}
            content={
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Total Allocated:</Typography>
                  <Typography>{stats.totalCapacity} MW</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Units Allocated:</Typography>
                  <Typography>{stats.total}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Pending:</Typography>
                  <Typography>2</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="textSecondary">Allocation Rate:</Typography>
                  <Typography>92%</Typography>
                </Box>
              </Box>
            }
          />
        </Grid>

        {/* Reports Card */}
        <Grid item xs={12} md={6} lg={3}>
          <DashboardCard
            icon={ReportsIcon}
            title="Reports"
            color="info"
            onClick={() => navigate('/reports')}
            content={
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Daily Reports:</Typography>
                  <Typography>24</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Monthly Reports:</Typography>
                  <Typography>4</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Pending Review:</Typography>
                  <Typography>3</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="textSecondary">Compliance Rate:</Typography>
                  <Typography>98%</Typography>
                </Box>
              </Box>
            }
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;