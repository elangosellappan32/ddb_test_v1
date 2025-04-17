import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Tooltip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  MenuItem,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  AccountBalance as BankingIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  TrendingDown as LapseIcon,
  RemoveRedEye as EyeIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import productionUnitApi from '../../services/productionUnitapi';
import consumptionUnitApi from '../../services/consumptionUnitApi';
import productionSiteApi from '../../services/productionSiteapi';
import consumptionSiteApi from '../../services/consumptionSiteApi';
import bankingApi from '../../services/bankingApi';
import allocationApi from '../../services/allocationApi';

const Allocation = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [productionData, setProductionData] = useState([]);
  const [consumptionData, setConsumptionData] = useState([]);
  const [bankingData, setBankingData] = useState([]);
  const [calculatedAllocations, setCalculatedAllocations] = useState([]);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [percentageThreshold, setPercentageThreshold] = useState({
    c1: 20,
    c2: 20,
    c3: 20,
    c4: 20,
    c5: 20
  });
  const [yearRange] = useState({
    start: 1900,
    end: 2025
  });

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Format month to MMYYYY format for DynamoDB SK
      const [year, month] = selectedMonth.split('-');
      const monthSK = `${month}${year}`;

      // Fetch production sites first
      const prodSitesResp = await productionSiteApi.fetchAll();
      const prodSites = prodSitesResp.data || [];
      
      // Create a map of production sites for easier lookup
      const siteNameMap = prodSites.reduce((map, site) => {
        const pk = `${Number(site.companyId) || 1}_${Number(site.productionSiteId)}`;
        map[pk] = {
          name: site.name,
          banking: Number(site.banking) || 0,
          status: site.status || 'Active',
          productionSiteId: site.productionSiteId,
          type: site.type
        };
        return map;
      }, {});
      
      // Fetch production units for the selected month only
      const productionUnits = await Promise.all(
        prodSites.map(async (site) => {
          try {
            const unitsResp = await productionUnitApi.fetchAll(
              Number(site.companyId) || 1,
              Number(site.productionSiteId)
            );
            const units = unitsResp.data || [];
            
            // Filter units for selected month only
            return units
              .filter(unit => unit.sk === monthSK)
              .map(unit => ({
                ...unit,
                siteName: site.name,
                status: site.status || 'Active',
                banking: Number(site.banking) || 0,
                productionSiteId: site.productionSiteId,
                type: site.type,
                c1: Number(unit.c1) || 0,
                c2: Number(unit.c2) || 0,
                c3: Number(unit.c3) || 0,
                c4: Number(unit.c4) || 0,
                c5: Number(unit.c5) || 0
              }));
          } catch (err) {
            console.error('Error fetching production units:', err);
            return [];
          }
        })
      );

      // Fetch consumption sites
      const consSitesResp = await consumptionSiteApi.fetchAll();
      const consSites = consSitesResp.data || [];

      // Fetch consumption units for selected month
      const consumptionUnits = await Promise.all(
        consSites.map(async (site) => {
          try {
            const unitsResp = await consumptionUnitApi.fetchAll(
              Number(site.companyId) || 1,
              Number(site.consumptionSiteId)
            );
            const units = unitsResp.data || [];
            
            // Filter units for selected month only
            return units
              .filter(unit => unit.sk === monthSK)
              .map(unit => ({
                ...unit,
                siteName: site.name,
                consumptionSiteId: site.consumptionSiteId,
                type: site.type,
                c1: Number(unit.c1) || 0,
                c2: Number(unit.c2) || 0,
                c3: Number(unit.c3) || 0,
                c4: Number(unit.c4) || 0,
                c5: Number(unit.c5) || 0
              }));
          } catch (err) {
            console.error('Error fetching consumption units:', err);
            return [];
          }
        })
      );

      // Fetch banking data for selected month
      const bankingResp = await bankingApi.fetchAll();
      const bankingUnits = (bankingResp.data || [])
        .filter(unit => unit.sk === monthSK) // Only get banking data for selected month
        .map(unit => {
          const siteInfo = siteNameMap[unit.pk] || { name: 'Unknown Site', banking: 0, status: 'Unknown' };
          return {
            ...unit,
            siteName: siteInfo.name,
            banking: 1, // Banking units should always have banking=1
            status: siteInfo.status,
            productionSiteId: siteInfo.productionSiteId,
            type: siteInfo.type,
            c1: Number(unit.c1) || 0,
            c2: Number(unit.c2) || 0,
            c3: Number(unit.c3) || 0,
            c4: Number(unit.c4) || 0,
            c5: Number(unit.c5) || 0
          };
        });

      // Update state with filtered data
      setProductionData(productionUnits.flat());
      setConsumptionData(consumptionUnits.flat());
      setBankingData(bankingUnits);

      // Fetch allocations for the selected month
      const allocationsResp = await allocationApi.fetchAll(selectedMonth);
      setCalculatedAllocations(allocationsResp.data || []);

    } catch (err) {
      console.error('Error fetching allocation data:', err);
      setError(err.message || 'Failed to load allocation data');
      enqueueSnackbar(err.message || 'Failed to load allocation data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, selectedMonth]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, selectedMonth]);

  const handleAutoAllocate = async () => {
    try {
      setLoading(true);
      setError(null);

      // Convert selected month to SK format (MMYYYY)
      const monthSK = selectedMonth.replace(/-/g, '').split('-').reverse().join('');

      // 1. First handle non-banking sites and peak periods (C2, C3)
      const nonBankingProduction = productionData.filter(prod => !prod.banking);
      const peakPeriodConsumption = consumptionData.filter(cons => 
        (Number(cons.c2) > 0 || Number(cons.c3) > 0) && 
        cons.sk === monthSK
      );

      const allocations = [];

      // Handle peak periods first (C2, C3)
      for (const cons of peakPeriodConsumption) {
        ['c2', 'c3'].forEach(period => {
          if (Number(cons[period]) > 0) {
            let remaining = Number(cons[period]);
            
            // Try to allocate from non-banking units first
            for (const prod of nonBankingProduction) {
              if (remaining > 0 && Number(prod[period]) > 0) {
                const allocation = Math.min(remaining, Number(prod[period]));
                remaining -= allocation;
                prod[period] = (Number(prod[period]) - allocation).toString();
                
                allocations.push({
                  productionSiteId: prod.productionSiteId,
                  consumptionSiteId: cons.consumptionSiteId,
                  period: period.toUpperCase(),
                  amount: allocation,
                  month: selectedMonth,
                  status: 'ALLOCATED',
                  isBanking: false
                });
              }
            }
          }
        });
      }

      // 2. Handle non-peak periods (C1, C4, C5) for non-banking sites
      const nonPeakConsumption = consumptionData.filter(cons => 
        (Number(cons.c1) > 0 || Number(cons.c4) > 0 || Number(cons.c5) > 0) && 
        cons.sk === monthSK
      );

      for (const cons of nonPeakConsumption) {
        ['c1', 'c4', 'c5'].forEach(period => {
          if (Number(cons[period]) > 0) {
            let remaining = Number(cons[period]);
            
            // Try to allocate from non-banking units first
            for (const prod of nonBankingProduction) {
              if (remaining > 0 && Number(prod[period]) > 0) {
                const allocation = Math.min(remaining, Number(prod[period]));
                remaining -= allocation;
                prod[period] = (Number(prod[period]) - allocation).toString();
                
                allocations.push({
                  productionSiteId: prod.productionSiteId,
                  consumptionSiteId: cons.consumptionSiteId,
                  period: period.toUpperCase(),
                  amount: allocation,
                  month: selectedMonth,
                  status: 'ALLOCATED',
                  isBanking: false
                });
              }
            }
          }
        });
      }

      // 3. Finally, handle remaining allocations with banking units
      const remainingConsumption = consumptionData.filter(cons => {
        const totalRemaining = ['c1', 'c2', 'c3', 'c4', 'c5'].reduce(
          (sum, period) => sum + Number(cons[period]), 0
        );
        return totalRemaining > 0 && cons.sk === monthSK;
      });

      // Use banking units for any remaining consumption
      for (const cons of remainingConsumption) {
        for (const period of ['c2', 'c3', 'c1', 'c4', 'c5']) {
          if (Number(cons[period]) > 0) {
            let remaining = Number(cons[period]);
            
            // Try to allocate from banking units
            for (const bank of bankingData) {
              if (remaining > 0) {
                // For peak periods, only use matching peak periods from banking
                if (['c2', 'c3'].includes(period)) {
                  if (Number(bank[period]) > 0) {
                    const allocation = Math.min(remaining, Number(bank[period]));
                    remaining -= allocation;
                    bank[period] = (Number(bank[period]) - allocation).toString();
                    
                    allocations.push({
                      productionSiteId: bank.productionSiteId,
                      consumptionSiteId: cons.consumptionSiteId,
                      period: period.toUpperCase(),
                      amount: allocation,
                      month: selectedMonth,
                      status: 'BANKED',
                      isBanking: true
                    });
                  }
                } else {
                  // For non-peak periods, can use any remaining banking capacity
                  ['c1', 'c4', 'c5'].forEach(bankPeriod => {
                    if (remaining > 0 && Number(bank[bankPeriod]) > 0) {
                      const allocation = Math.min(remaining, Number(bank[bankPeriod]));
                      remaining -= allocation;
                      bank[bankPeriod] = (Number(bank[bankPeriod]) - allocation).toString();
                      
                      allocations.push({
                        productionSiteId: bank.productionSiteId,
                        consumptionSiteId: cons.consumptionSiteId,
                        period: period.toUpperCase(),
                        amount: allocation,
                        month: selectedMonth,
                        status: 'BANKED',
                        isBanking: true
                      });
                    }
                  });
                }
              }
            }
          }
        }
      }

      // Save allocations to backend
      if (allocations.length > 0) {
        await allocationApi.createBatch(allocations);
      }

      // Update UI with new allocations
      setCalculatedAllocations(allocations);
      await fetchAllData(); // Refresh the data to show updated status

      enqueueSnackbar('Auto allocation completed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Auto allocation failed:', error);
      setError('Auto allocation failed: ' + error.message);
      enqueueSnackbar('Auto allocation failed', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (row) => {
    if (row.type === 'banking') {
      return Number(row.amount) || 0;
    }
    return ['c1', 'c2', 'c3', 'c4', 'c5'].reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
  };

  const calculateAggregatedBanking = (bankingData, selectedYear) => {
    // Get the year from selected month
    const selectedYearNum = parseInt(selectedMonth.split('-')[0]);
    
    // Filter data for April of current year to March of next year
    const aprilToMarch = bankingData.filter(item => {
      const itemYear = parseInt(item.sk.substring(2));
      const month = parseInt(item.sk.substring(0, 2));
      
      return (
        // April to December of selected year
        (itemYear === selectedYearNum && month >= 4) ||
        // January to March of next year
        (itemYear === selectedYearNum + 1 && month <= 3)
      );
    });
  
    return aprilToMarch.reduce((acc, item) => {
      const existingItem = acc.find(x => x.pk === item.pk);
      if (existingItem) {
        ['c1', 'c2', 'c3', 'c4', 'c5'].forEach(key => {
          existingItem[key] = (Number(existingItem[key]) || 0) + (Number(item[key]) || 0);
        });
        existingItem.totalBanking = calculateTotal(existingItem);
      } else {
        acc.push({
          ...item,
          totalBanking: calculateTotal(item)
        });
      }
      return acc;
    }, []);
  };

  const handleThresholdDialogOpen = (allocation) => {
    setSelectedAllocation(allocation);
    setThresholdDialogOpen(true);
  };
  
  const handleThresholdDialogClose = () => {
    setThresholdDialogOpen(false);
    setSelectedAllocation(null);
  };
  
  const handleThresholdChange = (period, value) => {
    setPercentageThreshold(prev => ({
      ...prev,
      [period]: value
    }));
  };
  
  const handleApplyThreshold = async () => {
    try {
      if (!selectedAllocation) return;
  
      const totalPercentage = Object.values(percentageThreshold).reduce((sum, val) => sum + val, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        enqueueSnackbar('Total percentage must equal 100%', { variant: 'error' });
        return;
      }
  
      const updatedAllocation = {
        ...selectedAllocation,
        c1: (selectedAllocation.totalAmount * (percentageThreshold.c1 / 100)).toFixed(2),
        c2: (selectedAllocation.totalAmount * (percentageThreshold.c2 / 100)).toFixed(2),
        c3: (selectedAllocation.totalAmount * (percentageThreshold.c3 / 100)).toFixed(2),
        c4: (selectedAllocation.totalAmount * (percentageThreshold.c4 / 100)).toFixed(2),
        c5: (selectedAllocation.totalAmount * (percentageThreshold.c5 / 100)).toFixed(2)
      };
  
      await allocationApi.update(updatedAllocation.pk, updatedAllocation.sk, updatedAllocation);
      await fetchAllData();
      handleThresholdDialogClose();
      enqueueSnackbar('Allocation updated successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error updating allocation:', error);
      enqueueSnackbar('Failed to update allocation', { variant: 'error' });
    }
  };

  const handleMonthChange = async (newMonth) => {
    setSelectedMonth(newMonth);
    // Clear existing allocations when month changes
    setCalculatedAllocations([]);
    await fetchAllData();
  };

  // Update the consumption table render function to show percentages
  const renderProductionTable = (data, title) => (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">{title}</Typography>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Site Name</TableCell>
            <TableCell align="right">C1</TableCell>
            <TableCell align="right">C2</TableCell>
            <TableCell align="right">C3</TableCell>
            <TableCell align="right">C4</TableCell>
            <TableCell align="right">C5</TableCell>
            <TableCell align="right">Total</TableCell>
            {title === 'Production Units' && (
              <TableCell align="right">Status</TableCell>
            )}
            {title === 'Consumption Units' && (
              <>
                <TableCell align="right">Allocation %</TableCell>
                <TableCell align="right">Actions</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={title === 'Production Units' ? 8 : 9} align="center">
                No data available currently
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => {
              const total = calculateTotal(row);
              const allocatedAmount = calculatedAllocations
                .filter(a => a.consumptionSiteId === row.consumptionSiteId)
                .reduce((sum, a) => sum + Number(a.amount || 0), 0);
              const allocationPercentage = total ? ((allocatedAmount / total) * 100).toFixed(1) : '0';
              
              return (
                <TableRow key={index}>
                  <TableCell>{row.siteName}</TableCell>
                  <TableCell align="right">{row.c1 || 0}</TableCell>
                  <TableCell align="right">{row.c2 || 0}</TableCell>
                  <TableCell align="right">{row.c3 || 0}</TableCell>
                  <TableCell align="right">{row.c4 || 0}</TableCell>
                  <TableCell align="right">{row.c5 || 0}</TableCell>
                  <TableCell align="right">{total}</TableCell>
                  {title === 'Production Units' && (
                    <TableCell align="right">{row.status || 'Available'}</TableCell>
                  )}
                  {title === 'Consumption Units' && (
                    <>
                      <TableCell align="right" sx={{
                        color: allocationPercentage === '100.0' ? 'success.main' : 'warning.main'
                      }}>
                        {allocationPercentage}%
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Site Allocation Details">
                          <IconButton
                            size="small"
                            onClick={() => handleThresholdDialogOpen(row)}
                          >
                            <EyeIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Update the banking table with period display and aggregation
  const renderBankingTable = (data) => {
    // Calculate March-April aggregation
    const aggregatedData = calculateAggregatedBanking(data);
    
    return (
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Banking Units (April -march  2024)</Typography>
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Site Name</TableCell>
              <TableCell align="right">C1</TableCell>
              <TableCell align="right">C2</TableCell>
              <TableCell align="right">C3</TableCell>
              <TableCell align="right">C4</TableCell>
              <TableCell align="right">C5</TableCell>
              <TableCell align="right">Total C Values</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {aggregatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No banking data available for March-April 2024
                </TableCell>
              </TableRow>
            ) : (
              aggregatedData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.siteName}</TableCell>
                  <TableCell align="right">{row.c1 || 0}</TableCell>
                  <TableCell align="right">{row.c2 || 0}</TableCell>
                  <TableCell align="right">{row.c3 || 0}</TableCell>
                  <TableCell align="right">{row.c4 || 0}</TableCell>
                  <TableCell align="right">{row.c5 || 0}</TableCell>
                  <TableCell align="right">{row.totalBanking}</TableCell>
                </TableRow>
              ))
            )}
            {aggregatedData.length > 0 && (
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>Total</strong></TableCell>
                {['c1', 'c2', 'c3', 'c4', 'c5'].map(period => (
                  <TableCell key={period} align="right">
                    <strong>
                      {aggregatedData.reduce((sum, row) => sum + (Number(row[period]) || 0), 0)}
                    </strong>
                  </TableCell>
                ))}
                <TableCell align="right">
                  <strong>
                    {aggregatedData.reduce((sum, row) => sum + row.totalBanking, 0)}
                  </strong>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        borderBottom: '2px solid #1976d2',
        pb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssignmentIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4">Allocation Management</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAutoAllocate}
            disabled={loading}
            startIcon={<AssignmentIcon />}
          >
            Auto Allocate
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              select
              size="small"
              value={parseInt(selectedMonth.split('-')[1])}
              onChange={(e) => {
                const [year] = selectedMonth.split('-');
                const newMonth = `${year}-${e.target.value.toString().padStart(2, '0')}`;
                handleMonthChange(newMonth);
              }}
              sx={{ width: 120 }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {format(new Date(2000, i), 'MMMM')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              value={selectedMonth.split('-')[0]}
              onChange={(e) => {
                const [, month] = selectedMonth.split('-');
                const newMonth = `${e.target.value}-${month}`;
                handleMonthChange(newMonth);
              }}
              sx={{ width: 100 }}
            >
              {Array.from(
                { length: yearRange.end - yearRange.start + 1 },
                (_, i) => yearRange.end - i
              ).map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchAllData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} icon={<WarningIcon />}>
          {error}
        </Alert>
      )}

      {renderProductionTable(productionData, 'Production Units')}
      {renderBankingTable(bankingData)}
      {renderProductionTable(consumptionData, 'Consumption Units')}

      {/* Allocation Results Section */}
      <Box sx={{ mt: 4, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ 
          borderBottom: '2px solid #1976d2',
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <AssignmentIcon color="primary" />
          Allocation Results
        </Typography>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Consumption Site</TableCell>
                <TableCell>Production Site</TableCell>
                <TableCell align="right">Period</TableCell>
                <TableCell align="right">Allocated Amount</TableCell>
                <TableCell align="right">Source</TableCell>
                <TableCell align="right">Percentage</TableCell>
                <TableCell align="right">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {calculatedAllocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No allocations have been made yet. Click "Auto Allocate" to begin allocation process.
                  </TableCell>
                </TableRow>
              ) : (
                calculatedAllocations.map((allocation, index) => {
                  const consumptionSite = consumptionData.find(
                    site => site.consumptionSiteId === allocation.consumptionSiteId
                  );
                  const total = consumptionSite ? 
                    ['c1', 'c2', 'c3', 'c4', 'c5'].reduce(
                      (sum, period) => sum + (Number(consumptionSite[period]) || 0), 0
                    ) : 0;
                  const percentage = total ? 
                    ((Number(allocation.amount) / total) * 100).toFixed(1) : '0';
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>{allocation.consumptionSiteName}</TableCell>
                      <TableCell>{allocation.productionSiteName}</TableCell>
                      <TableCell align="right">{allocation.period}</TableCell>
                      <TableCell align="right">{allocation.amount}</TableCell>
                      <TableCell align="right">
                        {allocation.isBanking ? (
                          <Tooltip title="Banking Allocation">
                            <BankingIcon color="primary" fontSize="small" />
                          </Tooltip>
                        ) : (
                          <Tooltip title="Direct Allocation">
                            <AssignmentIcon color="success" fontSize="small" />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="right">{percentage}%</TableCell>
                      <TableCell align="right">
                        <Box sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          bgcolor: allocation.status === 'ALLOCATED' ? 'success.light' : 'warning.light',
                          color: allocation.status === 'ALLOCATED' ? 'success.dark' : 'warning.dark',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.875rem'
                        }}>
                          {allocation.status}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      
      {/* Auto-Allocate button below allocation results */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAutoAllocate}
          disabled={loading}
          startIcon={<AssignmentIcon />}
          size="large"
          sx={{ px: 4 }}
        >
          Auto Allocate
        </Button>
      </Box>

      {/* Statistics Cards remain at the bottom */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            color: 'white',
            boxShadow: 3,
            borderRadius: 2
          }}>
            <CheckCircleIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="subtitle2">Total Allocated</Typography>
              <Typography variant="h6">
                {calculatedAllocations.reduce((sum, alloc) => sum + Number(alloc.amount || 0), 0)} units
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            background: 'linear-gradient(45deg, #4CAF50 30%, #81C784 90%)',
            color: 'white',
            boxShadow: 3,
            borderRadius: 2
          }}>
            <BankingIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="subtitle2">Total Banking</Typography>
              <Typography variant="h6">
                {bankingData.reduce((sum, bank) => sum + calculateTotal(bank), 0)} units
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            background: 'linear-gradient(45deg, #FF9800 30%, #FFB74D 90%)',
            color: 'white',
            boxShadow: 3,
            borderRadius: 2
          }}>
            <LapseIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="subtitle2">Total Lapse</Typography>
              <Typography variant="h6">
                {productionData
                  .filter(prod => prod.status === 'Available' && !prod.banking)
                  .reduce((sum, prod) => sum + calculateTotal(prod), 0)} units
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            background: 'linear-gradient(45deg, #F44336 30%, #E57373 90%)',
            color: 'white',
            boxShadow: 3,
            borderRadius: 2
          }}>
            <WarningIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="subtitle2">Total Surge</Typography>
              <Typography variant="h6">
                {consumptionData.reduce((sum, cons) => sum + calculateTotal(cons), 0) - 
                 (calculatedAllocations.reduce((sum, alloc) => sum + Number(alloc.amount || 0), 0) + 
                  bankingData.reduce((sum, bank) => sum + calculateTotal(bank), 0))} units
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Threshold Dialog */}
      <Dialog open={thresholdDialogOpen} onClose={handleThresholdDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Set Allocation Percentages</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            {['c1', 'c2', 'c3', 'c4', 'c5'].map((period) => (
              <Box key={period} sx={{ mb: 2 }}>
                <Typography gutterBottom>
                  {period.toUpperCase()}: {percentageThreshold[period]}%
                </Typography>
                <Slider
                  value={percentageThreshold[period]}
                  onChange={(_, value) => handleThresholdChange(period, value)}
                  min={0}
                  max={100}
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Box>
            ))}
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Total: {Object.values(percentageThreshold).reduce((sum, val) => sum + val, 0)}%
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleThresholdDialogClose}>Cancel</Button>
          <Button onClick={handleApplyThreshold} variant="contained" color="primary">
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Allocation;