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
  Power as PowerIcon
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
    totalCapacity: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculateStats = useCallback((sites) => {
    if (!Array.isArray(sites)) return stats;

    return {
      total: sites.length,
      solar: sites.filter(site => site.type?.toLowerCase() === 'solar').length,
      wind: sites.filter(site => site.type?.toLowerCase() === 'wind').length,
      totalCapacity: sites.reduce((sum, site) => sum + Number(site.capacity_MW || 0), 0)
    };
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Dashboard] Fetching sites for stats...');
      const sites = await productionSiteApi.fetchAll();
      console.log('[Dashboard] Calculating stats from sites:', sites);
      const calculatedStats = calculateStats(sites);
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        {/* Production Card */}
        <Grid item xs={12} md={6} lg={3}>
          <DashboardCard
            icon={FactoryIcon}
            title="Production"
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
                    <Typography color="textSecondary">Solar Sites:</Typography>
                  </Box>
                  <Typography>{stats.solar}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WindIcon sx={{ mr: 0.5, color: 'success.main', fontSize: 'small' }} />
                    <Typography color="textSecondary">Wind Sites:</Typography>
                  </Box>
                  <Typography>{stats.wind}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PowerIcon sx={{ mr: 0.5, color: 'primary.main', fontSize: 'small' }} />
                    <Typography color="textSecondary">Total Capacity:</Typography>
                  </Box>
                  <Typography>{stats.totalCapacity} MW</Typography>
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
            color="error"
            onClick={() => navigate('/consumption')}
            content={
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Total Units:</Typography>
                  <Typography>125,000 kWh</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Peak Load:</Typography>
                  <Typography>15.2 MW</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="textSecondary">Daily Avg:</Typography>
                  <Typography>4,167 kWh</Typography>
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
            color="success"
            onClick={() => navigate('/allocation')}
            content={
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Total Allocated:</Typography>
                  <Typography>95,000 kWh</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Available:</Typography>
                  <Typography>30,000 kWh</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="textSecondary">Efficiency:</Typography>
                  <Typography>76%</Typography>
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
                  <Typography color="textSecondary">Monthly Reports:</Typography>
                  <Typography>12</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="textSecondary">Last Updated:</Typography>
                  <Typography>Today</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="textSecondary">Compliance:</Typography>
                  <Typography>100%</Typography>
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