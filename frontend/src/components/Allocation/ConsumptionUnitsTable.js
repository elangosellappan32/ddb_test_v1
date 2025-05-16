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
import { TrendingDown, Edit as EditIcon, Autorenew as AutorenewIcon, Info as InfoIcon, Save as SaveIcon } from "@mui/icons-material";
import { format } from "date-fns";
import api from '../../services/apiUtils';
import { API_CONFIG } from '../../config/api.config';
import { useSnackbar } from 'notistack';

const ConsumptionUnitsTable = ({ consumptionData, selectedYear, onAllocationSaved, shareholdings = [] }) => {
  const [allocationDialog, setAllocationDialog] = useState(false);
  const [splitPercentages, setSplitPercentages] = useState([]);
  const [totalUnits] = useState(100);
  const [consumptionSites, setConsumptionSites] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const PEAK_PERIODS = ['c2', 'c3'];
  const NON_PEAK_PERIODS = ['c1', 'c4', 'c5'];
  const ALL_PERIODS = ['c1', 'c2', 'c3', 'c4', 'c5'];  // Ordered from c1 to c5
  
  // Get unique shareholder companies from shareholdings
  const shareholderCompanies = [...new Set(
    shareholdings.map(sh => sh.shareholderCompanyId || sh.shareholderCompanyName)
  )];
  
  // Calculate total shareholding percentage for normalization
  const totalPercentage = shareholdings.reduce(
    (sum, sh) => sum + (Number(sh.shareholdingPercentage) || 0), 0
  );
  
  // Normalize shareholding percentages to ensure they sum to 100%
  const normalizedShareholdings = shareholdings.map(sh => ({
    ...sh,
    normalizedPercentage: totalPercentage > 0 
      ? (Number(sh.shareholdingPercentage) || 0) / totalPercentage * 100 
      : 0
  }));
  
  // Function to get shareholding percentage for a company
  const getShareholdingPercentage = (companyId) => {
    const shareholding = normalizedShareholdings.find(
      sh => (sh.shareholderCompanyId || sh.shareholderCompanyName) === companyId
    );
    return shareholding ? shareholding.normalizedPercentage : 0;
  };

  const calculateTotal = (row, periods = ALL_PERIODS) => {
    return periods.reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
  };
  
  // Calculate allocated units based on shareholding percentage
  const calculateAllocatedUnits = (totalUnits, companyId) => {
    const percentage = getShareholdingPercentage(companyId);
    return (totalUnits * percentage / 100).toFixed(2);
  };

  const calculatePeakTotal = (row) => calculateTotal(row, PEAK_PERIODS);
  const calculateNonPeakTotal = (row) => calculateTotal(row, NON_PEAK_PERIODS);

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
          initializeEqualSplitPercentages(sites.length);
        }
      } else {
        initializeEqualSplitPercentages(sites.length);
      }

      setAllocationDialog(true);
      setError("");
    } catch (error) {
      console.error("Failed to fetch consumption sites:", error);
      setError("Failed to fetch consumption sites");
      enqueueSnackbar("Failed to fetch consumption sites", { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const initializeEqualSplitPercentages = (siteCount) => {
    if (siteCount === 0) return;
    const split = Math.floor(totalUnits / siteCount);
    const remainder = totalUnits % siteCount;
    const percentages = Array(siteCount).fill(split);
    if (remainder > 0) {
      percentages[0] += remainder;
    }
    setSplitPercentages(percentages);
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

  const handleAutoAllocate = () => {
    if (consumptionSites.length === 0) return;

    const peakSites = consumptionSites.filter(site => calculatePeakTotal(site) > 0);
    const nonPeakSites = consumptionSites.filter(site => calculateNonPeakTotal(site) > 0);
    
    const newSplitPercentages = new Array(consumptionSites.length).fill(0);
    
    const totalPeakUnits = peakSites.reduce((sum, site) => sum + calculatePeakTotal(site), 0);
    const totalNonPeakUnits = nonPeakSites.reduce((sum, site) => sum + calculateNonPeakTotal(site), 0);

    // Distribute percentages based on peak and non-peak usage
    if (totalPeakUnits > 0) {
      peakSites.forEach(site => {
        const index = consumptionSites.findIndex(s => s.consumptionSiteId === site.consumptionSiteId);
        if (index !== -1) {
          const siteTotal = calculatePeakTotal(site);
          newSplitPercentages[index] = Math.round((siteTotal / totalPeakUnits) * 50);
        }
      });
    }

    if (totalNonPeakUnits > 0) {
      nonPeakSites.forEach(site => {
        const index = consumptionSites.findIndex(s => s.consumptionSiteId === site.consumptionSiteId);
        if (index !== -1) {
          const siteTotal = calculateNonPeakTotal(site);
          newSplitPercentages[index] += Math.round((siteTotal / totalNonPeakUnits) * 50);
        }
      });
    }

    // Ensure total is 100%
    const totalPercentage = newSplitPercentages.reduce((sum, value) => sum + value, 0);
    if (totalPercentage !== 100) {
      const scale = 100 / totalPercentage;
      newSplitPercentages.forEach((value, index) => {
        newSplitPercentages[index] = Math.round(value * scale);
      });
    }

    setSplitPercentages(newSplitPercentages);
  };

  // Function to format month for API
  const formatMonth = (sk) => {
    if (!sk) return "";
    // Extract month and year from sk 
    const month = parseInt(sk.substring(0, 2));
    const year = parseInt(sk.substring(2));
    // Format as "MMYYYY" for API call
    const apiMonth = `${month.toString().padStart(2, '0')}${year}`;
    return {
      display: format(new Date(year, month - 1), "MMMM yyyy"),
      api: apiMonth
    };
  };

  // Function to handle saving allocations
  const handleSaveAllocation = async () => {
    const total = splitPercentages.reduce((sum, value) => sum + value, 0);
    if (Math.abs(total - 100) > 0.01) {
      setError("Total allocation must equal 100%");
      return;
    }
    
    try {
      const allocationPercentages = consumptionSites.map((site, index) => ({
        siteName: site.name,
        consumptionSiteId: site.consumptionSiteId,
        percentage: splitPercentages[index],
      }));

      localStorage.setItem('allocationPercentages', JSON.stringify(allocationPercentages));
      setAllocationDialog(false);
      setError("");
      enqueueSnackbar('Allocation percentages saved', { variant: 'success' });
      if (onAllocationSaved) {
        onAllocationSaved(allocationPercentages);
      }
    } catch (error) {
      console.error('Error saving allocations:', error);
      setError('Failed to save allocation percentages');
      enqueueSnackbar('Failed to save allocation percentages', { variant: 'error' });
    }
  };

  const getAllocationPercentage = (siteName) => {
    try {
      const savedAllocations = localStorage.getItem('allocationPercentages');
      if (savedAllocations) {
        const allocations = JSON.parse(savedAllocations);
        const siteAllocation = allocations.find(a => a.siteName === siteName);
        return siteAllocation ? siteAllocation.percentage : 0;
      }
    } catch (error) {
      console.error('Error getting allocation percentage:', error);
    }
    return 0;
  };

  // Load saved allocations on mount
  useEffect(() => {
    const loadSavedAllocations = async () => {
      try {
        const response = await api.get(API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.GET_ALL);
        const sites = response.data?.data || [];
        setConsumptionSites(sites);
        
        const savedAllocations = localStorage.getItem('allocationPercentages');
        if (savedAllocations) {
          const allocations = JSON.parse(savedAllocations);
          if (allocations.length === sites.length) {
            setSplitPercentages(allocations.map(a => a.percentage));
          }
        }
      } catch (error) {
        console.error('Error loading saved allocations:', error);
      }
    };

    loadSavedAllocations();
  }, []);

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6">Consumption Units Allocation</Typography>
          <Typography variant="body2" color="textSecondary">
            {shareholderCompanies.length > 0
              ? `Allocated based on shareholding percentages`
              : 'No shareholding data available for allocation'}
          </Typography>
        </Box>
        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAllocationClick}
            startIcon={<TrendingDown />}
            disabled={isLoading || shareholderCompanies.length === 0}
          >
            Allocate Units
          </Button>
        </Box>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell rowSpan={2} align="center">Site Name</TableCell>
              <TableCell colSpan={5} align="center">Time Slots</TableCell>
              <TableCell rowSpan={2} align="center">Total Units</TableCell>
              {shareholderCompanies.length > 0 && (
                <>
                  <TableCell colSpan={shareholderCompanies.length} align="center">
                    Allocated Units by Shareholder (kWh)
                  </TableCell>
                  <TableCell rowSpan={2} align="center">Total Allocated</TableCell>
                </>
              )}
            </TableRow>
            <TableRow>
              <TableCell align="center">C1<br/>(Off-Peak)</TableCell>
              <TableCell align="center">C2<br/>(Peak)</TableCell>
              <TableCell align="center">C3<br/>(Peak)</TableCell>
              <TableCell align="center">C4<br/>(Off-Peak)</TableCell>
              <TableCell align="center">C5<br/>(Off-Peak)</TableCell>
              {shareholderCompanies.map(companyId => (
                <TableCell key={companyId} align="center">
                  {companyId}
                  <br/>
                  <small>({getShareholdingPercentage(companyId).toFixed(2)}%)</small>
                </TableCell>
              ))}
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
                    <TableCell rowSpan={rows.length}>{formatMonth(month).display}</TableCell>
                  )}
                  <TableCell>{row.siteName}</TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: 'primary.main' }}>
                      {Math.round(Number(row.c1) || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                      {Math.round(Number(row.c2) || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                      {Math.round(Number(row.c3) || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: 'primary.main' }}>
                      {Math.round(Number(row.c4) || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: 'primary.main' }}>
                      {Math.round(Number(row.c5) || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                      {calculatePeakTotal(row)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: 'primary.main' }}>
                      {calculateNonPeakTotal(row)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {calculateTotal(row)}
                  </TableCell>
                  <TableCell align="right">
                    <Typography color="secondary.main">
                      {getAllocationPercentage(row.siteName)}%
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ))}
            {consumptionData.length > 0 && (
              <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
                <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total</TableCell>
                {['c1', 'c2', 'c3', 'c4', 'c5'].map(period => (
                  <TableCell key={period} align="right" sx={{ 
                    fontWeight: 'bold',
                    color: period === 'c2' || period === 'c3' ? 'warning.main' : 'primary.main'
                  }}>
                    {consumptionData.reduce((sum, row) => sum + (Number(row[period]) || 0), 0)}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                  {consumptionData.reduce((sum, row) => sum + calculatePeakTotal(row), 0)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {consumptionData.reduce((sum, row) => sum + calculateNonPeakTotal(row), 0)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {consumptionData.reduce((sum, row) => sum + calculateTotal(row), 0)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                  100%
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={allocationDialog} onClose={handleAllocationClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Split Units Across Sites
          <Button
            variant="outlined"
            startIcon={<AutorenewIcon />}
            onClick={handleAutoAllocate}
            size="small"
          >
            Auto Split
          </Button>
        </DialogTitle>
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
              <Box key={site.consumptionSiteId || site.id} sx={{ p: 2, my: 2, border: 1, borderRadius: 1, borderColor: 'grey.300', backgroundColor: 'grey.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">{site.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Peak: {calculatePeakTotal(site)} | Non-Peak: {calculateNonPeakTotal(site)}
                  </Typography>
                </Box>
                <Slider
                  value={splitPercentages[index] || 0}
                  onChange={(_, value) => handleSliderChange(value, index)}
                  valueLabelDisplay="auto"
                  valueLabelFormat={value => `${value}%`}
                  max={100}
                  step={1}
                />
                <Typography variant="body2" color="text.secondary">
                  Allocation: {splitPercentages[index] || 0}%
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAllocationClose}>Cancel</Button>
          <Button onClick={handleSaveAllocation} variant="contained" color="primary">
            Save Allocation
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ConsumptionUnitsTable;
