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
  TextField
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  AccountBalance as BankingIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  TrendingDown as LapseIcon
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
  const [allProduction, setAllProduction] = useState([]);
  const [calculatedAllocations, setCalculatedAllocations] = useState([]);

  const handleError = useCallback((error, context) => {
    const errorMessage = error?.response?.data?.message || error.message || 'An error occurred';
    console.error(`${context}:`, error);
    setError(errorMessage);
    enqueueSnackbar(errorMessage, { 
      variant: 'error',
      autoHideDuration: 5000,
      preventDuplicate: true
    });
  }, [enqueueSnackbar]);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Convert selected month to proper format for filtering (MMYYYY)
      const monthKey = selectedMonth.split('-')[1] + selectedMonth.split('-')[0].substring(2);

      // Fetch production sites and their units for the selected month
      const prodSitesResp = await productionSiteApi.fetchAll();
      const prodSites = prodSitesResp.data || [];
      
      // Create a map of production sites for banking data
      const siteNameMap = prodSites.reduce((map, site) => {
        const pk = `${Number(site.companyId) || 1}_${Number(site.productionSiteId)}`;
        map[pk] = {
          name: site.name,
          banking: Number(site.banking) || 0,
          status: site.status || 'Active',
          productionSiteId: site.productionSiteId
        };
        return map;
      }, {});
      
      // Fetch production units with proper date handling
      const productionUnits = await Promise.all(
        prodSites.map(async (site) => {
          try {
            const unitsResp = await productionUnitApi.fetchAll(
              Number(site.companyId) || 1,
              Number(site.productionSiteId)
            );
            const units = unitsResp.data || [];
            
            return units
              .filter(unit => unit.sk === monthKey)
              .map(unit => ({
                ...unit,
                siteName: site.name,
                status: 'Available',
                banking: Number(site.banking) || 0,
                productionSiteId: site.productionSiteId,
                c1: Number(unit.c1 || 0),
                c2: Number(unit.c2 || 0),
                c3: Number(unit.c3 || 0),
                c4: Number(unit.c4 || 0),
                c5: Number(unit.c5 || 0)
              }));
          } catch (err) {
            console.error('Error fetching production units:', err);
            return [];
          }
        })
      );

      // Fetch consumption sites and their units with proper date handling
      const consSitesResp = await consumptionSiteApi.fetchAll();
      const consSites = consSitesResp.data || [];

      const consumptionUnits = await Promise.all(
        consSites.map(async (site) => {
          try {
            const unitsResp = await consumptionUnitApi.fetchAll(
              Number(site.companyId) || 1,
              Number(site.consumptionSiteId)
            );
            const units = unitsResp.data || [];
            
            return units
              .filter(unit => unit.sk === monthKey)
              .map(unit => ({
                ...unit,
                siteName: site.name,
                consumptionSiteId: site.consumptionSiteId,
                c1: Number(unit.c1 || 0),
                c2: Number(unit.c2 || 0),
                c3: Number(unit.c3 || 0),
                c4: Number(unit.c4 || 0),
                c5: Number(unit.c5 || 0)
              }));
          } catch (err) {
            console.error('Error fetching consumption units:', err);
            return [];
          }
        })
      );

      // Fetch and process banking data
      const bankingResp = await bankingApi.fetchAll();
      const bankingUnits = (bankingResp.data || [])
        .filter(unit => unit.sk === monthKey)
        .map(unit => {
          const siteInfo = siteNameMap[unit.pk] || { name: 'Unknown Site', banking: 0, status: 'Unknown' };
          return {
            ...unit,
            siteName: siteInfo.name,
            banking: siteInfo.banking,
            status: siteInfo.status,
            productionSiteId: siteInfo.productionSiteId,
            c1: Number(unit.c1 || 0),
            c2: Number(unit.c2 || 0),
            c3: Number(unit.c3 || 0),
            c4: Number(unit.c4 || 0),
            c5: Number(unit.c5 || 0)
          };
        })
        .filter(unit => unit.banking === 1);

      // Fetch existing allocations for the selected month
      const allocationsResp = await allocationApi.fetchAll(selectedMonth);
      const monthlyAllocations = allocationsResp.data || [];

      setProductionData(productionUnits.flat());
      setConsumptionData(consumptionUnits.flat());
      setBankingData(bankingUnits);
      setCalculatedAllocations(monthlyAllocations);

    } catch (err) {
      handleError(err, 'Error fetching allocation data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, handleError]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, selectedMonth]);

  const handleAutoAllocate = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Filter data for selected month
      const monthlyProduction = productionData.filter(prod => prod.sk === selectedMonth);
      const monthlyConsumption = consumptionData.filter(cons => cons.sk === selectedMonth);
      const monthlyBanking = bankingData.filter(bank => bank.sk === selectedMonth);

      // First, handle non-banking production units for the selected month
      const nonBankingAllocation = monthlyProduction
        .filter(prod => !prod.banking)
        .map(prod => ({
          ...prod,
          remainingC1: prod.c1,
          remainingC2: prod.c2,
          remainingC3: prod.c3,
          remainingC4: prod.c4,
          remainingC5: prod.c5,
          allocations: []
        }));

      // Then add banking units for the selected month
      const newAllProduction = [
        ...nonBankingAllocation,
        ...monthlyBanking.map(bank => ({
          ...bank,
          remainingC1: bank.c1,
          remainingC2: bank.c2,
          remainingC3: bank.c3,
          remainingC4: bank.c4,
          remainingC5: bank.c5,
          allocations: []
        }))
      ];

      const allocations = [];

      // Process each consumption unit
      monthlyConsumption.forEach(cons => {
        // Handle peak periods (C2, C3) first
        ['c2', 'c3'].forEach(period => {
          if (cons[period] > 0) {
            let remaining = cons[period];
            // First try to allocate from non-banking units
            nonBankingAllocation.forEach(prod => {
              if (remaining > 0 && prod[`remaining${period.toUpperCase()}`] > 0) {
                const allocation = Math.min(remaining, prod[`remaining${period.toUpperCase()}`]);
                remaining -= allocation;
                prod[`remaining${period.toUpperCase()}`] -= allocation;
                
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
            });

            // If there's still remaining demand, try banking units
            if (remaining > 0) {
              monthlyBanking.forEach(bank => {
                if (remaining > 0 && bank[`remaining${period.toUpperCase()}`] > 0) {
                  const allocation = Math.min(remaining, bank[`remaining${period.toUpperCase()}`]);
                  remaining -= allocation;
                  bank[`remaining${period.toUpperCase()}`] -= allocation;
                  
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
        });

        // Handle non-peak periods (C1, C4, C5)
        ['c1', 'c4', 'c5'].forEach(period => {
          if (cons[period] > 0) {
            let remaining = cons[period];
            
            // First try non-banking units with exact period match
            nonBankingAllocation.forEach(prod => {
              if (remaining > 0 && prod[`remaining${period.toUpperCase()}`] > 0) {
                const allocation = Math.min(remaining, prod[`remaining${period.toUpperCase()}`]);
                remaining -= allocation;
                prod[`remaining${period.toUpperCase()}`] -= allocation;
                
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
            });

            // If there's still remaining demand, try banking units with any period
            if (remaining > 0) {
              monthlyBanking.forEach(bank => {
                ['c1', 'c2', 'c3', 'c4', 'c5'].forEach(bankPeriod => {
                  if (remaining > 0 && bank[`remaining${bankPeriod.toUpperCase()}`] > 0) {
                    const allocation = Math.min(remaining, bank[`remaining${bankPeriod.toUpperCase()}`]);
                    remaining -= allocation;
                    bank[`remaining${bankPeriod.toUpperCase()}`] -= allocation;
                    
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
              });
            }
          }
        });
      });

      // Save allocations to backend
      if (allocations.length > 0) {
        await allocationApi.createBatch(allocations);
      }

      // Update production data with allocation status
      const updatedProductionData = productionData.map(prod => {
        if (prod.sk !== selectedMonth.replace(/-/g, '')) return prod;
        const hasAllocations = allocations.some(a => a.productionSiteId === prod.productionSiteId);
        return {
          ...prod,
          status: hasAllocations ? 'Allocated' : 'Available'
        };
      });

      setAllProduction(newAllProduction);
      setProductionData(updatedProductionData);
      setCalculatedAllocations(allocations);
      enqueueSnackbar('Auto allocation completed successfully', { variant: 'success' });
    } catch (err) {
      handleError(err, 'Auto allocation failed');
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
            {title === 'Production Units' && <TableCell align="right">Status</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={title === 'Production Units' ? 8 : 7} align="center">
                No data available currently
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.siteName}</TableCell>
                <TableCell align="right">{row.c1 || 0}</TableCell>
                <TableCell align="right">{row.c2 || 0}</TableCell>
                <TableCell align="right">{row.c3 || 0}</TableCell>
                <TableCell align="right">{row.c4 || 0}</TableCell>
                <TableCell align="right">{row.c5 || 0}</TableCell>
                <TableCell align="right">{calculateTotal(row)}</TableCell>
                {title === 'Production Units' && (
                  <TableCell align="right">{row.status || 'Available'}</TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {title === 'Consumption Units' && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAutoAllocate}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Auto Allocate'}
            </Button>
          </Box>
          
          {/* Allocation Details */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>Allocation Details</Typography>
            {data.map((cons, index) => {
              const allocations = allProduction?.filter(prod => 
                prod.allocations?.some(alloc => alloc.consumptionSite === cons.siteName)
              );

              if (!allocations?.length) return null;

              return (
                <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {cons.siteName} - Consumption Site
                  </Typography>
                  {allocations.map((prod, pidx) => {
                    const siteAllocations = prod.allocations.filter(
                      alloc => alloc.consumptionSite === cons.siteName
                    );
                    
                    if (!siteAllocations.length) return null;

                    const total = siteAllocations.reduce(
                      (sum, alloc) => sum + alloc.amount, 0
                    );

                    return (
                      <Box key={pidx} sx={{ ml: 2, mb: 1 }}>
                        <Typography variant="body2">
                          Production Site: {prod.siteName}
                        </Typography>
                        {siteAllocations.map((alloc, aidx) => (
                          <Typography key={aidx} variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                            Period {alloc.period}: {alloc.amount} units
                          </Typography>
                        ))}
                        <Typography variant="body2" color="primary" sx={{ ml: 2 }}>
                          Total Allocated: {total} units
                        </Typography>
                      </Box>
                    );
                  })}
                </Paper>
              );
            })}
          </Box>
        </>
      )}
    </TableContainer>
  );

  const renderBankingTable = (data) => (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">Banking Units</Typography>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Site Name</TableCell>
            <TableCell>Period</TableCell>
            <TableCell align="right">C1</TableCell>
            <TableCell align="right">C2</TableCell>
            <TableCell align="right">C3</TableCell>
            <TableCell align="right">C4</TableCell>
            <TableCell align="right">C5</TableCell>
            <TableCell align="right">Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center">
                No banking data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.siteName}</TableCell>
                <TableCell>{row.sk}</TableCell>
                <TableCell align="right">{row.c1 || 0}</TableCell>
                <TableCell align="right">{row.c2 || 0}</TableCell>
                <TableCell align="right">{row.c3 || 0}</TableCell>
                <TableCell align="right">{row.c4 || 0}</TableCell>
                <TableCell align="right">{row.c5 || 0}</TableCell>
                <TableCell align="right">{row.totalBanking || calculateTotal(row)}</TableCell>
                <TableCell align="right">{row.status || 'Active'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

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
          <TextField
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            label="Select Month"
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />
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

      {/* Statistics Cards below allocation details */}
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
    </Box>
  );
};

export default Allocation;