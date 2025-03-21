import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProductionSites, calculateStats } from "../../services/productionSiteapi";
import {
  Box,
  Grid,
  Typography,
  Alert,
  Container,
  Card,
  CardActionArea,
  CircularProgress
} from "@mui/material";
import {
  Factory as FactoryIcon,
  PowerSettingsNew as ConsumptionIcon,
  AssignmentTurnedIn as AllocationIcon,
  Assessment as ReportsIcon,
  TrendingUp as TrendIcon,
  Speed as MeterIcon,
  Assignment as UnitIcon,  // Add this import
  DateRange as DateIcon,
  PowerOutlined as PowerIcon,
  WbSunny as SolarIcon,
  Air as WindIcon,
  ElectricBolt as VoltageIcon
} from '@mui/icons-material';
import DashboardCard from './DashboardCard'; // Make sure this component exists

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    windSites: 0,
    solarSites: 0,
    totalCapacity: 0,
    avgInjectionVoltage: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const sites = await fetchProductionSites();
        if (Array.isArray(sites)) {
          const calculatedStats = calculateStats(sites);
          setStats(calculatedStats);
          setError(null);
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching stats:', error);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      icon: <FactoryIcon />,
      title: "Production Sites",
      color: "#2E7D32",
      path: "/production",
      loading: loading,
      items: [
        {
          icon: <WindIcon />,
          label: "Wind Sites",
          value: `${stats.windSites} Sites`,
          color: "#1976D2"
        },
        {
          icon: <SolarIcon />,
          label: "Solar Sites",
          value: `${stats.solarSites} Sites`,
          color: "#FFC107"
        },
        {
          icon: <VoltageIcon />,
          label: "Avg. Injection",
          value: `${stats.avgInjectionVoltage.toFixed(1)} KV`
        },
        {
          icon: <PowerIcon />,
          label: "Total Capacity",
          value: `${stats.totalCapacity.toFixed(1)} MW`
        }
      ]
    },
    // Hardcoded Consumption Card
    {
      icon: <ConsumptionIcon />,
      title: "Consumption",
      color: "#1976D2",
      path: "/consumption",
      loading: false,
      items: [
        {
          icon: <MeterIcon />,
          label: "Total Units",
          value: "125,000 kWh"
        },
        {
          icon: <TrendIcon />,
          label: "Peak Demand",
          value: "850 kW"
        },
        {
          icon: <DateIcon />,
          label: "Last Updated",
          value: "Mar 2024"
        }
      ]
    },
    // Hardcoded Allocation Card
    {
      icon: <AllocationIcon />,
      title: "Allocation",
      color: "#ED6C02",
      path: "/allocation",
      loading: false,
      items: [
        {
          icon: <UnitIcon />,
          label: "Allocated Units",
          value: "75,000 kWh"
        },
        {
          icon: <TrendIcon />,
          label: "Utilization",
          value: "60%"
        },
        {
          icon: <DateIcon />,
          label: "Current Period",
          value: "Q1 2024"
        }
      ]
    },
    // Hardcoded Reports Card
    {
      icon: <ReportsIcon />,
      title: "Reports",
      color: "#9C27B0",
      path: "/reports",
      loading: false,
      items: [
        {
          icon: <UnitIcon />,
          label: "Total Reports",
          value: "24"
        },
        {
          icon: <TrendIcon />,
          label: "Compliance",
          value: "98%"
        },
        {
          icon: <DateIcon />,
          label: "Next Due",
          value: "Mar 31, 2024"
        }
      ]
    }
  ];

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <DashboardCard {...card} onClick={() => navigate(card.path)} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Dashboard;