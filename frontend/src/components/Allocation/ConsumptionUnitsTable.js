import React, { useState, useEffect } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
  Alert
} from "@mui/material";
import { TrendingDown, Edit as EditIcon, Autorenew as AutorenewIcon } from "@mui/icons-material";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { API_CONFIG } from '../../config/api.config';
import api from '../../services/apiUtils';

const ConsumptionUnitsTable = ({ consumptionData, selectedYear, onEdit }) => {
  const [allocationDialog, setAllocationDialog] = useState(false);
  const [splitPercentages, setSplitPercentages] = useState([]);
  const [totalUnits] = useState(100);
  const [consumptionSites, setConsumptionSites] = useState([]);
  const [error, setError] = useState("");

  const calculateTotal = (row) => {
    return ["c1", "c2", "c3", "c4", "c5"].reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
  };

  const handleAllocationClick = async () => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.GET_ALL);
      const sites = response.data?.data || [];
      setConsumptionSites(sites);
      const count = sites.length;
      if (count > 0) {
        const split = (totalUnits / count).toFixed(2);
        setSplitPercentages(Array(count).fill(Number(split)));
      }
      setAllocationDialog(true);
      setError("");
    } catch (error) {
      console.error("Failed to fetch consumption sites:", error);
      setError("Failed to fetch consumption sites");
    }
  };

  const handleAllocationClose = () => {
    setAllocationDialog(false);
    setError("");
  };

  const handleSliderChange = (value, index) => {
    const newSplits = [...splitPercentages];
    newSplits[index] = value[0];
    setSplitPercentages(newSplits);
  };

  const handleSaveAllocation = () => {
    const total = splitPercentages.reduce((sum, value) => sum + value, 0);
    if (total !== 100) {
      setError("Total allocation must equal 100%");
      return;
    }
    
    // Create allocation data structure
    const allocationData = consumptionSites.map((site, index) => ({
      siteName: site.name,
      percentage: splitPercentages[index]
    }));
    
    // Save to local storage
    localStorage.setItem('allocationPercentages', JSON.stringify(allocationData));
    
    setAllocationDialog(false);
    setError("");
  };

  const handleAutoAllocate = () => {
    const count = consumptionSites.length;
    if (count === 0) return;

    // Group sites by peak and non-peak periods
    const peakPeriodSites = consumptionSites.filter(site => 
      (Number(site.c2) > 0 || Number(site.c3) > 0)  // Peak periods
    );
    
    const nonPeakPeriodSites = consumptionSites.filter(site => 
      (Number(site.c1) > 0 || Number(site.c4) > 0 || Number(site.c5) > 0)  // Non-peak periods
    );

    // Calculate splits based on site type and period
    const newSplitPercentages = new Array(consumptionSites.length).fill(0);
    
    // First allocate peak period sites (C2, C3)
    const totalPeakUnits = peakPeriodSites.reduce((sum, site) => 
      sum + Number(site.c2 || 0) + Number(site.c3 || 0), 0);
      
    peakPeriodSites.forEach(site => {
      const index = consumptionSites.findIndex(s => s.id === site.id);
      if (index !== -1 && totalPeakUnits > 0) {
        const siteTotal = Number(site.c2 || 0) + Number(site.c3 || 0);
        newSplitPercentages[index] = Math.round((siteTotal / totalPeakUnits) * 50); // 50% for peak
      }
    });

    // Then allocate non-peak period sites (C1, C4, C5)
    const totalNonPeakUnits = nonPeakPeriodSites.reduce((sum, site) => 
      sum + Number(site.c1 || 0) + Number(site.c4 || 0) + Number(site.c5 || 0), 0);
      
    nonPeakPeriodSites.forEach(site => {
      const index = consumptionSites.findIndex(s => s.id === site.id);
      if (index !== -1 && totalNonPeakUnits > 0) {
        const siteTotal = Number(site.c1 || 0) + Number(site.c4 || 0) + Number(site.c5 || 0);
        newSplitPercentages[index] = Math.round((siteTotal / totalNonPeakUnits) * 50); // 50% for non-peak
      }
    });

    // Adjust percentages to ensure total is 100%
    const totalPercentage = newSplitPercentages.reduce((sum, value) => sum + value, 0);
    if (totalPercentage !== 100) {
      const scale = 100 / totalPercentage;
      newSplitPercentages.forEach((value, index) => {
        newSplitPercentages[index] = Math.round(value * scale);
      });
    }

    setSplitPercentages(newSplitPercentages);
    setError("");
  };

  const formatMonth = (sk) => {
    if (!sk) return "";
    const month = parseInt(sk.substring(0, 2));
    const year = parseInt(sk.substring(2));
    return format(new Date(year, month - 1), "MMMM yyyy");
  };

  // Load saved allocations
  useEffect(() => {
    const savedAllocations = localStorage.getItem('allocationPercentages');
    if (savedAllocations) {
      const allocations = JSON.parse(savedAllocations);
      if (allocations.length === consumptionSites.length) {
        setSplitPercentages(allocations.map(a => a.percentage));
      }
    }
  }, [consumptionSites]);

  const groupedData = consumptionData.reduce((acc, row) => {
    const month = row.sk || "";
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(row);
    return acc;
  }, {});

  const sortedMonths = Object.keys(groupedData).sort((a, b) => {
    const monthA = parseInt(a.substring(0, 2));
    const monthB = parseInt(b.substring(0, 2));
    const yearA = parseInt(a.substring(2));
    const yearB = parseInt(b.substring(2));
    if (yearA !== yearB) return yearA - yearB;
    const adjustedMonthA = monthA < 4 ? monthA + 12 : monthA;
    const adjustedMonthB = monthB < 4 ? monthB + 12 : monthB;
    return adjustedMonthA - adjustedMonthB;
  });

  // Get saved allocation percentage for a site
  const getAllocationPercentage = (siteName) => {
    const savedAllocations = localStorage.getItem('allocationPercentages');
    if (savedAllocations) {
      const allocations = JSON.parse(savedAllocations);
      const siteAllocation = allocations.find(a => a.siteName === siteName);
      return siteAllocation ? siteAllocation.percentage : 0;
    }
    return 0;
  };

  return (
    <>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(224, 224, 224, 1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingDown color="primary" />
            <Typography variant="h6">Consumption Units</Typography>
          </Box>
          <IconButton onClick={handleAllocationClick} sx={{ color: 'primary.main' }}>
            <EditIcon />
          </IconButton>
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell>Site Name</TableCell>
              <TableCell align="right">C1 (Non-Peak)</TableCell>
              <TableCell align="right">C2 (Non-Peak)</TableCell>
              <TableCell align="right">C3 (Peak)</TableCell>
              <TableCell align="right">C4 (Peak)</TableCell>
              <TableCell align="right">C5 (Non-Peak)</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Allocation %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedMonths.map((month) => (
              groupedData[month].map((row, index) => (
                <TableRow key={`${month}-${index}`}>
                  {index === 0 && (
                    <TableCell rowSpan={groupedData[month].length}>{formatMonth(month)}</TableCell>
                  )}
                  <TableCell>{row.siteName}</TableCell>
                  <TableCell align="right">{row.c1}</TableCell>
                  <TableCell align="right">{row.c2}</TableCell>
                  <TableCell align="right">{row.c3}</TableCell>
                  <TableCell align="right">{row.c4}</TableCell>
                  <TableCell align="right">{row.c5}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ fontWeight: 'bold', color: 'primary.main' }}>{calculateTotal(row)}</Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography color="secondary.main">
                      {getAllocationPercentage(row.siteName)}%
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AutorenewIcon />}
          onClick={handleAutoAllocate}
        >
          Auto Allocate Units
        </Button>
      </Box>

      <Dialog open={allocationDialog} onClose={handleAllocationClose} maxWidth="md" fullWidth>
        <DialogTitle>Split Units Across Sites</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Total Units: {splitPercentages.reduce((sum, value) => sum + value, 0)}% / {totalUnits}%
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {consumptionSites.map((site) => (
              <Box key={`${site.id || site.consumptionSiteId || site.siteName}`} sx={{ p: 2, my: 2, border: 1, borderRadius: 1, borderColor: 'grey.300', backgroundColor: 'grey.50' }}>
                <Typography variant="subtitle1" gutterBottom>{site.name}</Typography>
                <Slider
                  value={[splitPercentages[consumptionSites.indexOf(site)] || 0]}
                  max={100}
                  step={1}
                  onChange={(_, value) => handleSliderChange(value, consumptionSites.indexOf(site))}
                />
                <Typography variant="body2" color="text.secondary">Split: {splitPercentages[consumptionSites.indexOf(site)] || 0}%</Typography>
              </Box>
            ))}
            {splitPercentages.length > 0 && (
              <Box sx={{ mt: 6 }}>
                <Typography variant="subtitle1" gutterBottom>Split Visualization</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={consumptionSites.map((site, index) => ({
                    name: site.name,
                    split: splitPercentages[index]
                  }))}>
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} unit="%" />
                    <RechartsTooltip />
                    <Bar dataKey="split" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleAllocationClose} variant="outlined">Cancel</Button>
          <Button onClick={handleAutoAllocate} startIcon={<AutorenewIcon />}>Auto Split</Button>
          <Button onClick={handleSaveAllocation} variant="contained" color="primary">
            Save Allocation
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConsumptionUnitsTable;
