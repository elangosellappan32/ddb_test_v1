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
  Alert,
  Tooltip
} from "@mui/material";
import { TrendingDown, Edit as EditIcon, Autorenew as AutorenewIcon, Info as InfoIcon } from "@mui/icons-material";
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
  const [isLoading, setIsLoading] = useState(false);

  const PEAK_PERIODS = ['c2', 'c3'];
  const NON_PEAK_PERIODS = ['c1', 'c4', 'c5'];

  const calculateTotal = (row, periods) => {
    return periods.reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
  };

  const handleAllocationClick = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.GET_ALL);
      const sites = response.data?.data || [];
      setConsumptionSites(sites);
      
      // Load saved allocations
      const savedAllocations = localStorage.getItem('allocationPercentages');
      if (savedAllocations) {
        const allocations = JSON.parse(savedAllocations);
        if (allocations.length === sites.length) {
          setSplitPercentages(allocations.map(a => a.percentage));
        } else {
          const split = (totalUnits / sites.length).toFixed(2);
          setSplitPercentages(Array(sites.length).fill(Number(split)));
        }
      } else {
        const split = (totalUnits / sites.length).toFixed(2);
        setSplitPercentages(Array(sites.length).fill(Number(split)));
      }

      setAllocationDialog(true);
      setError("");
    } catch (error) {
      console.error("Failed to fetch consumption sites:", error);
      setError("Failed to fetch consumption sites");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAllocationClose = () => {
    setAllocationDialog(false);
    setError("");
  };

  const handleSliderChange = (value, index) => {
    const newSplits = [...splitPercentages];
    newSplits[index] = value;
    setSplitPercentages(newSplits);
  };

  const handleSaveAllocation = () => {
    const total = splitPercentages.reduce((sum, value) => sum + value, 0);
    if (total !== 100) {
      setError("Total allocation must equal 100%");
      return;
    }
    
    // Create allocation data structure with site details
    const allocationData = consumptionSites.map((site, index) => ({
      siteName: site.name,
      siteId: site.id,
      percentage: splitPercentages[index],
      peakTotal: calculateTotal(site, PEAK_PERIODS),
      nonPeakTotal: calculateTotal(site, NON_PEAK_PERIODS)
    }));
    
    // Save to local storage
    localStorage.setItem('allocationPercentages', JSON.stringify(allocationData));
    
    setAllocationDialog(false);
    setError("");
  };

  const handleAutoAllocate = () => {
    const count = consumptionSites.length;
    if (count === 0) return;

    // Group sites by period usage
    const peakSites = consumptionSites.filter(site => calculateTotal(site, PEAK_PERIODS) > 0);
    const nonPeakSites = consumptionSites.filter(site => calculateTotal(site, NON_PEAK_PERIODS) > 0);
    
    // Calculate initial split based on period usage
    const newSplitPercentages = new Array(consumptionSites.length).fill(0);
    
    const totalPeakUnits = peakSites.reduce((sum, site) => sum + calculateTotal(site, PEAK_PERIODS), 0);
    const totalNonPeakUnits = nonPeakSites.reduce((sum, site) => sum + calculateTotal(site, NON_PEAK_PERIODS), 0);

    // Allocate peak period sites (50%)
    if (totalPeakUnits > 0) {
      peakSites.forEach(site => {
        const index = consumptionSites.findIndex(s => s.id === site.id);
        if (index !== -1) {
          const siteTotal = calculateTotal(site, PEAK_PERIODS);
          newSplitPercentages[index] = Math.round((siteTotal / totalPeakUnits) * 50);
        }
      });
    }

    // Allocate non-peak period sites (50%)
    if (totalNonPeakUnits > 0) {
      nonPeakSites.forEach(site => {
        const index = consumptionSites.findIndex(s => s.id === site.id);
        if (index !== -1) {
          const siteTotal = calculateTotal(site, NON_PEAK_PERIODS);
          newSplitPercentages[index] += Math.round((siteTotal / totalNonPeakUnits) * 50);
        }
      });
    }

    // Adjust to ensure total is 100%
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
    if (savedAllocations && consumptionSites.length > 0) {
      const allocations = JSON.parse(savedAllocations);
      if (allocations.length === consumptionSites.length) {
        setSplitPercentages(allocations.map(a => a.percentage));
      }
    }
  }, [consumptionSites]);

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
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(224, 224, 224, 1)', display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingDown color="primary" />
          <Typography variant="h6">Consumption Units</Typography>
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell>Site Name</TableCell>
              <TableCell align="right">
                <Tooltip title="Non-Peak Period">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    C1
                    <InfoIcon sx={{ ml: 0.5, fontSize: '1rem', color: 'primary.main' }} />
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Peak Period">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    C2
                    <InfoIcon sx={{ ml: 0.5, fontSize: '1rem', color: 'primary.main' }} />
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Peak Period">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    C3
                    <InfoIcon sx={{ ml: 0.5, fontSize: '1rem', color: 'primary.main' }} />
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Non-Peak Period">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    C4
                    <InfoIcon sx={{ ml: 0.5, fontSize: '1rem', color: 'primary.main' }} />
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Non-Peak Period">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    C5
                    <InfoIcon sx={{ ml: 0.5, fontSize: '1rem', color: 'primary.main' }} />
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">
                <Tooltip title="Percentage of units to be allocated from available production units">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    Allocation %
                    <InfoIcon sx={{ ml: 0.5, fontSize: '1rem', color: 'primary.main' }} />
                  </Box>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(consumptionData.reduce((acc, row) => {
              const month = row.sk || "";
              if (!acc[month]) acc[month] = [];
              acc[month].push(row);
              return acc;
            }, {})).sort(([a], [b]) => {
              const monthA = parseInt(a.substring(0, 2));
              const monthB = parseInt(b.substring(0, 2));
              const yearA = parseInt(a.substring(2));
              const yearB = parseInt(b.substring(2));
              if (yearA !== yearB) return yearA - yearB;
              return monthA - monthB;
            }).map(([month, rows]) => (
              rows.map((row, index) => (
                <TableRow key={`${month}-${index}`}>
                  {index === 0 && (
                    <TableCell rowSpan={rows.length}>{formatMonth(month)}</TableCell>
                  )}
                  <TableCell>{row.siteName}</TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 'bold', color: 'blue' }}>
                      {row.c1}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 'bold', color: 'orange' }}>
                      {row.c2}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 'bold', color: 'orange' }}>
                      {row.c3}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 'bold', color: 'blue' }}>
                      {row.c4}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 'bold', color: 'blue' }}>
                      {row.c5}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {calculateTotal(row, [...PEAK_PERIODS, ...NON_PEAK_PERIODS])}
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
            {consumptionSites.map((site, index) => (
              <Box key={site.id} sx={{ p: 2, my: 2, border: 1, borderRadius: 1, borderColor: 'grey.300', backgroundColor: 'grey.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">{site.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Peak: {calculateTotal(site, PEAK_PERIODS)} | Non-Peak: {calculateTotal(site, NON_PEAK_PERIODS)}
                  </Typography>
                </Box>
                <Slider
                  value={splitPercentages[index] || 0}
                  max={100}
                  step={1}
                  onChange={(_, value) => handleSliderChange(value, index)}
                  valueLabelDisplay="auto"
                  valueLabelFormat={value => `${value}%`}
                />
                <Typography variant="body2" color="text.secondary">Allocation: {splitPercentages[index] || 0}%</Typography>
              </Box>
            ))}
            {splitPercentages.length > 0 && (
              <Box sx={{ mt: 6 }}>
                <Typography variant="subtitle1" gutterBottom>Split Visualization</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={consumptionSites.map((site, index) => ({
                    name: site.name,
                    split: splitPercentages[index],
                    peak: calculateTotal(site, PEAK_PERIODS),
                    nonPeak: calculateTotal(site, NON_PEAK_PERIODS)
                  }))}>
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} unit="%" />
                    <RechartsTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Box sx={{ bgcolor: 'background.paper', p: 1, border: 1, borderColor: 'grey.300' }}>
                              <Typography variant="body2">{data.name}</Typography>
                              <Typography variant="body2">Allocation: {data.split}%</Typography>
                              <Typography variant="body2">Peak Units: {data.peak}</Typography>
                              <Typography variant="body2">Non-Peak Units: {data.nonPeak}</Typography>
                            </Box>
                          );
                        }
                        return null;
                      }}
                    />
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
