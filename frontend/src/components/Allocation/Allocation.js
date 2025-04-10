import React, { useState, useEffect, useCallback } from 'react';
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
  Grid
} from '@mui/material';
import { useSnackbar } from 'notistack';
import productionUnitApi from '../../services/productionUnitapi';
import consumptionUnitApi from '../../services/consumptionUnitApi';
import productionSiteApi from '../../services/productionSiteapi';
import consumptionSiteApi from '../../services/consumptionSiteApi';
import bankingApi from '../../services/bankingApi';

const Allocation = () => {
  const [productionData, setProductionData] = useState([]);
  const [consumptionData, setConsumptionData] = useState([]);
  const [bankingData, setBankingData] = useState([]);
  const [allProduction, setAllProduction] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch production sites and their units
      const prodSitesResp = await productionSiteApi.fetchAll();
      const prodSites = prodSitesResp.data || [];
      
      // Create a map of production sites for banking data
      const siteNameMap = prodSites.reduce((map, site) => {
        const pk = `${Number(site.companyId) || 1}_${Number(site.productionSiteId)}`;
        map[pk] = {
          name: site.name,
          banking: Number(site.banking) || 0,
          status: site.status || 'Active'
        };
        return map;
      }, {});
      
      // Fetch all production units for each site
      const productionUnits = await Promise.all(
        prodSites.map(async (site) => {
          try {
            const unitsResp = await productionUnitApi.fetchAll(
              Number(site.companyId) || 1,
              Number(site.productionSiteId)
            );
            const units = unitsResp.data || [];
            return units.map(unit => ({
              ...unit,
              siteName: site.name,
              status: 'Available',
              banking: Number(site.banking) || 0
            }));
          } catch (err) {
            console.error('Error fetching production units:', err);
            return [];
          }
        })
      );

      // Fetch consumption sites and their units
      const consSitesResp = await consumptionSiteApi.fetchAll();
      const consSites = consSitesResp.data || [];

      // Fetch all consumption units for each site
      const consumptionUnits = await Promise.all(
        consSites.map(async (site) => {
          try {
            const unitsResp = await consumptionUnitApi.fetchAll(
              Number(site.companyId) || 1,
              Number(site.consumptionSiteId)
            );
            const units = unitsResp.data || [];
            return units.map(unit => ({
              ...unit,
              siteName: site.name
            }));
          } catch (err) {
            console.error('Error fetching consumption units:', err);
            return [];
          }
        })
      );

      // Fetch banking data and merge with site information
      const bankingResp = await bankingApi.fetchAll();
      const bankingUnits = (bankingResp.data || []).map(unit => {
        const siteInfo = siteNameMap[unit.pk] || { name: 'Unknown Site', banking: 0, status: 'Unknown' };
        return {
          ...unit,
          siteName: siteInfo.name,
          banking: siteInfo.banking,
          status: siteInfo.status
        };
      }).filter(unit => unit.banking === 1); // Only include sites with banking enabled

      setProductionData(productionUnits.flat());
      setConsumptionData(consumptionUnits.flat());
      setBankingData(bankingUnits);
    } catch (err) {
      console.error('Error fetching allocation data:', err);
      setError(err.message || 'Failed to load allocation data');
      enqueueSnackbar(err.message || 'Failed to load allocation data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleAutoAllocate = async () => {
    try {
      setLoading(true);
      
      // First, handle non-banking production units
      const nonBankingAllocation = productionData.map(prod => ({
        ...prod,
        remainingC1: prod.c1,
        remainingC2: prod.c2,
        remainingC3: prod.c3,
        remainingC4: prod.c4,
        remainingC5: prod.c5,
        allocations: []
      }));

      // Then add banking units
      const newAllProduction = [
        ...nonBankingAllocation,
        ...bankingData.map(bank => ({
          ...bank,
          remainingC1: bank.c1,
          remainingC2: bank.c2,
          remainingC3: bank.c3,
          remainingC4: bank.c4,
          remainingC5: bank.c5,
          allocations: []
        }))
      ];

      // Process each consumption unit
      consumptionData.forEach(cons => {
        // Handle peak periods (C2, C3) first
        ['c2', 'c3'].forEach(period => {
          if (cons[period] > 0) {
            let remaining = cons[period];
            // Try to allocate from production units
            newAllProduction.forEach(prod => {
              if (prod[`remaining${period.toUpperCase()}`] > 0) {
                const allocation = Math.min(remaining, prod[`remaining${period.toUpperCase()}`]);
                remaining -= allocation;
                prod[`remaining${period.toUpperCase()}`] -= allocation;
                prod.allocations.push({
                  consumptionSite: cons.siteName,
                  period: period.toUpperCase(),
                  amount: allocation
                });
              }
            });
          }
        });

        // Handle non-peak periods (C1, C4, C5)
        ['c1', 'c4', 'c5'].forEach(period => {
          if (cons[period] > 0) {
            let remaining = cons[period];
            newAllProduction.forEach(prod => {
              // Can use both peak and non-peak periods for non-peak consumption
              ['c1', 'c2', 'c3', 'c4', 'c5'].forEach(prodPeriod => {
                if (remaining > 0 && prod[`remaining${prodPeriod.toUpperCase()}`] > 0) {
                  const allocation = Math.min(remaining, prod[`remaining${prodPeriod.toUpperCase()}`]);
                  remaining -= allocation;
                  prod[`remaining${prodPeriod.toUpperCase()}`] -= allocation;
                  prod.allocations.push({
                    consumptionSite: cons.siteName,
                    period: period.toUpperCase(),
                    amount: allocation
                  });
                }
              });
            });
          }
        });
      });

      // Update production data with allocation status
      const updatedProductionData = productionData.map(prod => {
        const allocated = newAllProduction.find(p => p.siteName === prod.siteName);
        return {
          ...prod,
          status: allocated?.allocations.length > 0 ? 'Allocated' : 'Available'
        };
      });

      setAllProduction(newAllProduction);
      setProductionData(updatedProductionData);
      enqueueSnackbar('Auto allocation completed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Auto allocation failed:', error);
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Allocation Management</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Total Allocated</Typography>
            <Typography variant="h6">
              {productionData.reduce((sum, prod) => 
                sum + (prod.status === 'Allocated' ? calculateTotal(prod) : 0), 0
              )} units
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Total Banking</Typography>
            <Typography variant="h6">
              {bankingData.reduce((sum, bank) => sum + calculateTotal(bank), 0)} units
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Total Lapse</Typography>
            <Typography variant="h6">
              {productionData.reduce((sum, prod) => 
                sum + (prod.status === 'Available' ? calculateTotal(prod) : 0), 0
              )} units
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Total Surge</Typography>
            <Typography variant="h6">
              {consumptionData.reduce((sum, cons) => sum + calculateTotal(cons), 0) - 
               productionData.reduce((sum, prod) => sum + calculateTotal(prod), 0)} units
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {renderProductionTable(productionData, 'Production Units')}
      {renderBankingTable(bankingData)}
      {renderProductionTable(consumptionData, 'Consumption Units')}
    </Box>
  );
};

export default Allocation;