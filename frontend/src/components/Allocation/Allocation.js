import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  AccountBalance as BankingIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  TrendingDown as LapseIcon,
  Autorenew as AutorenewIcon,
  SwapHoriz as SwapHorizIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import productionUnitApi from '../../services/productionUnitapi';
import consumptionUnitApi from '../../services/consumptionUnitApi';
import productionSiteApi from '../../services/productionSiteapi';
import consumptionSiteApi from '../../services/consumptionSiteApi';
import bankingApi from '../../services/bankingApi';
import allocationApi from '../../services/allocationApi';
import ProductionUnitsTable from './ProductionUnitsTable';
import BankingUnitsTable from './BankingUnitsTable';
import ConsumptionUnitsTable from './ConsumptionUnitsTable';
import AllocationDetailsTable from './AllocationDetailsTable';
import { validatePeriodRules, formatAllocationMonth } from '../../utils/allocationUtils';

const calculateTotal = (row) => {
  return ['c1', 'c2', 'c3', 'c4', 'c5'].reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
};

const Allocation = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [productionData, setProductionData] = useState([]);
  const [consumptionData, setConsumptionData] = useState([]);
  const [bankingData, setBankingData] = useState([]);
  const [aggregatedBankingData, setAggregatedBankingData] = useState([]);
  const [allocationData, setAllocationData] = useState([]);
  const [yearRange] = useState({
    start: new Date().getFullYear() - 2,
    end: new Date().getFullYear() + 2
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateAllocationData = useCallback(async () => {
    try {
      const formattedMonth = `${selectedMonth.toString().padStart(2, '0')}${selectedYear}`;
      const response = await allocationApi.fetchAll(formattedMonth);
      setAllocationData(response.allocations || []);
    } catch (error) {
      console.error('Error updating allocation data:', error);
      enqueueSnackbar(error.message || 'Failed to update allocation data', { 
        variant: 'error',
        autoHideDuration: 5000 
      });
    }
  }, [selectedMonth, selectedYear, enqueueSnackbar]);

  const getFinancialYear = (month, year) => {
    return month >= 4 ? year : year - 1;
  };

  const getFinancialYearMonths = (year) => {
    const months = [];
    // April to December of selected year
    for (let month = 4; month <= 12; month++) {
      months.push(`${month.toString().padStart(2, '0')}${year}`);
    }
    // January to March of next year
    for (let month = 1; month <= 3; month++) {
      months.push(`${month.toString().padStart(2, '0')}${year + 1}`);
    }
    return months;
  };

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const financialYear = getFinancialYear(selectedMonth, selectedYear);
      const financialYearMonths = getFinancialYearMonths(financialYear);

      const [prodSitesResp, consSitesResp, bankingResp] = await Promise.all([
        productionSiteApi.fetchAll(),
        consumptionSiteApi.fetchAll(),
        bankingApi.fetchAll()
      ]);

      const prodSites = prodSitesResp.data || [];
      const consSites = consSitesResp.data || [];
      
      // Create a map of sites for easier lookup
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

      // Process banking data for the entire financial year
      const allBankingData = (bankingResp.data || [])
        .filter(unit => financialYearMonths.includes(unit.sk))
        .map(unit => {
          const siteInfo = siteNameMap[unit.pk] || { name: 'Unknown Site', banking: 0, status: 'Unknown' };
          return {
            ...unit,
            siteName: siteInfo.name,
            banking: siteInfo.banking,
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

      // Aggregate banking data by site for the entire financial year
      const aggregatedBanking = allBankingData.reduce((acc, curr) => {
        const key = curr.pk;
        if (!acc[key]) {
          acc[key] = {
            ...curr,
            c1: 0,
            c2: 0,
            c3: 0,
            c4: 0,
            c5: 0,
            financialYear: `${financialYear}-${financialYear + 1}`
          };
        }
        acc[key].c1 += Number(curr.c1) || 0;
        acc[key].c2 += Number(curr.c2) || 0;
        acc[key].c3 += Number(curr.c3) || 0;
        acc[key].c4 += Number(curr.c4) || 0;
        acc[key].c5 += Number(curr.c5) || 0;
        return acc;
      }, {});

      // Fetch production units for specific month
      const productionUnits = (await Promise.all(
        prodSites.map(async (site) => {
          try {
            const unitsResp = await productionUnitApi.fetchAll(
              Number(site.companyId) || 1,
              Number(site.productionSiteId)
            );
            
            const sk = `${selectedMonth.toString().padStart(2, '0')}${selectedYear}`;
            return (unitsResp.data || [])
              .filter(unit => unit.sk === sk)
              .map(unit => ({
                ...unit,
                siteName: site.name,
                status: site.status || 'Active',
                bankingStatus: allBankingData.some(
                  banking => banking.productionSiteId === site.productionSiteId && 
                            banking.banking === 1
                ) ? 'Available' : 'Not Available',
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
      )).flat();

      // Fetch consumption units for specific month
      const consumptionUnits = (await Promise.all(
        consSites.map(async (site) => {
          try {
            const unitsResp = await consumptionUnitApi.fetchAll(
              Number(site.companyId) || 1,
              Number(site.consumptionSiteId)
            );
            
            const sk = `${selectedMonth.toString().padStart(2, '0')}${selectedYear}`;
            return (unitsResp.data || [])
              .filter(unit => unit.sk === sk)
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
      )).flat();

      setProductionData(productionUnits);
      setConsumptionData(consumptionUnits);
      setBankingData(allBankingData);
      setAggregatedBankingData(Object.values(aggregatedBanking));

      // Fetch latest allocation data
      await updateAllocationData();

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
      enqueueSnackbar(err.message || 'Failed to load data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, selectedMonth, selectedYear, updateAllocationData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Fetch fresh allocation data when month/year changes
  useEffect(() => {
    const loadAllocationData = async () => {
      try {
        setLoading(true);
        setError(null);
        const formattedMonth = `${selectedMonth.toString().padStart(2, '0')}${selectedYear}`;
        const response = await allocationApi.fetchAll(formattedMonth);
        setAllocationData(response.allocations || []);
      } catch (error) {
        console.error('Error loading allocation data:', error);
        setError(error.message || 'Failed to load allocation data');
        enqueueSnackbar(error.message || 'Failed to load allocation data', { 
          variant: 'error',
          autoHideDuration: 5000 
        });
      } finally {
        setLoading(false);
      }
    };

    loadAllocationData();
  }, [selectedMonth, selectedYear, enqueueSnackbar]);

  const handleMonthChange = (event) => {
    setSelectedMonth(Number(event.target.value));
  };

  const handleYearChange = (year) => {
    setSelectedYear(Number(year));
  };

  const handleAutoAllocate = async () => {
    try {
      setLoading(true);
      const productionDataClone = JSON.parse(JSON.stringify(productionData));
      
      // Group sites by type
      const solarSites = productionDataClone.filter(site => 
        site.type?.toLowerCase() === 'solar'
      );
      const windSites = productionDataClone.filter(site => 
        site.type?.toLowerCase() === 'wind'
      );

      const newAllocations = [];

      // Helper function to calculate available units by period type
      const getAvailableUnits = (site) => {
        return {
          c1: Math.round(Number(site.c1 || 0)),
          c2: Math.round(Number(site.c2 || 0)),
          c3: Math.round(Number(site.c3 || 0)),
          c4: Math.round(Number(site.c4 || 0)),
          c5: Math.round(Number(site.c5 || 0))
        };
      };

      // Process solar sites first (they can't bank)
      for (const solarSite of solarSites) {
        const availableUnits = getAvailableUnits(solarSite);
        const total = Object.values(availableUnits).reduce((sum, val) => sum + val, 0);

        if (total > 0) {
          // Try to allocate to consumption sites
          for (const consumptionSite of consumptionData) {
            const allocation = {
              productionSiteId: solarSite.productionSiteId,
              productionSite: solarSite.siteName,
              siteName: solarSite.siteName,
              consumptionSiteId: consumptionSite.consumptionSiteId,
              consumptionSite: consumptionSite.siteName,
              type: 'Allocation',
              allocated: {},
              month: formatAllocationMonth(selectedMonth)
            };

            // Allocate peak periods (c2, c3)
            ['c2', 'c3'].forEach(period => {
              const available = Math.round(availableUnits[period]);
              const required = Math.round(Number(consumptionSite[period] || 0));
              if (available > 0 && required > 0) {
                const allocated = Math.round(Math.min(available, required));
                if (allocated > 0) {
                  allocation.allocated[period] = allocated;
                  availableUnits[period] -= allocated;
                }
              }
            });

            // Then allocate non-peak periods (c1, c4, c5)
            ['c1', 'c4', 'c5'].forEach(period => {
              const available = Math.round(availableUnits[period]);
              const required = Math.round(Number(consumptionSite[period] || 0));
              if (available > 0 && required > 0) {
                const allocated = Math.round(Math.min(available, required));
                if (allocated > 0) {
                  allocation.allocated[period] = allocated;
                  availableUnits[period] -= allocated;
                }
              }
            });

            // Only add allocation if any units were allocated
            if (Object.values(allocation.allocated).some(v => Math.round(v) > 0)) {
              newAllocations.push(allocation);
            }
          }

          // Create lapse record for remaining units
          const remainingTotal = Object.values(availableUnits).reduce((sum, val) => sum + val, 0);
          if (remainingTotal > 0) {
            newAllocations.push({
              productionSiteId: solarSite.productionSiteId,
              productionSite: solarSite.siteName,
              siteName: solarSite.siteName,
              type: 'Lapse',
              month: formatAllocationMonth(selectedMonth),
              allocated: availableUnits
            });
          }
        }
      }

      // Process wind sites
      for (const windSite of windSites) {
        const availableUnits = getAvailableUnits(windSite);
        const total = Object.values(availableUnits).reduce((sum, val) => sum + val, 0);

        if (total > 0) {
          const canBank = windSite.banking === 1;

          if (canBank) {
            // Create banking record
            newAllocations.push({
              productionSiteId: windSite.productionSiteId,
              productionSite: windSite.siteName,
              siteName: windSite.siteName,
              type: 'Banking',
              month: formatAllocationMonth(selectedMonth),
              bankingEnabled: true,
              allocated: availableUnits
            });
          } else {
            // Create lapse record
            newAllocations.push({
              productionSiteId: windSite.productionSiteId,
              productionSite: windSite.siteName,
              siteName: windSite.siteName,
              type: 'Lapse',
              month: formatAllocationMonth(selectedMonth),
              allocated: availableUnits
            });
          }
        }
      }

      // Update allocation state
      setAllocationData(newAllocations);

      // Create allocations in backend
      for (const allocation of newAllocations) {
        try {
          await allocationApi.create(allocation, allocation.type);
        } catch (error) {
          console.error('Failed to create allocation:', allocation, error);
          enqueueSnackbar(`Failed to create ${allocation.type.toLowerCase()} for ${allocation.productionSite}: ${error.message}`, { 
            variant: 'error',
            autoHideDuration: 5000
          });
        }
      }

      enqueueSnackbar('Auto allocation completed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error in auto allocation:', error);
      enqueueSnackbar(`Failed to auto allocate units: ${error.message}`, { 
        variant: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAllocation = (allocation) => {
    try {
      // Find the consumption unit data corresponding to this allocation
      const consumptionUnit = consumptionData.find(unit => 
        unit.consumptionSiteId === allocation.consumptionSiteId
      );

      if (!consumptionUnit) {
        enqueueSnackbar('Could not find corresponding consumption unit', { variant: 'error' });
        return;
      }

      // Create the updated allocation
      const updatedAllocation = {
        ...allocation,
        allocated: {
          c1: consumptionUnit.c1,
          c2: consumptionUnit.c2,
          c3: consumptionUnit.c3,
          c4: consumptionUnit.c4,
          c5: consumptionUnit.c5
        }
      };

      // Validate period rules
      const periodValidation = validatePeriodRules(updatedAllocation);
      if (!periodValidation.isValid) {
        enqueueSnackbar(periodValidation.errors.join(' '), { variant: 'error' });
        return;
      }

      // Update allocation data state
      setAllocationData(prevData => 
        prevData.map(a => 
          a.consumptionSiteId === allocation.consumptionSiteId ? updatedAllocation : a
        )
      );

      enqueueSnackbar('Allocation updated successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error editing allocation:', error);
      enqueueSnackbar('Failed to edit allocation', { variant: 'error' });
    }
  };

  const handleSaveAllocation = async () => {
    try {
      setIsSaving(true);
      
      // Calculate unused units
      const unusedUnitsByPeriod = {};
      ['c1', 'c2', 'c3', 'c4', 'c5'].forEach(period => {
        const totalAvailable = productionData.reduce((sum, site) => sum + (Number(site[period]) || 0), 0);
        const totalAllocated = allocationData
          .filter(a => a.type === 'Allocation')
          .reduce((sum, alloc) => sum + (Number(alloc.allocated[period]) || 0), 0);
        unusedUnitsByPeriod[period] = Math.max(0, totalAvailable - totalAllocated);
      });

      // Save allocations to database
      await Promise.all(allocationData.map(allocation => 
        allocationApi.create(allocation, allocation.type)
      ));

      // Update banking data with unused units
      setBankingData(prev => ([
        ...prev,
        {
          type: 'Banking',
          allocated: unusedUnitsByPeriod,
          isDirect: true,
          productionSite: 'Unused Units',
          siteName: 'Unused Units'
        }
      ]));

      enqueueSnackbar('Allocations saved successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error saving allocations:', error);
      enqueueSnackbar('Failed to save allocations: ' + error.message, { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  const financialYear = getFinancialYear(selectedMonth, selectedYear);

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
          <Typography variant="subtitle1" sx={{ mr: 1 }}>
            Financial Year: {financialYear}-{financialYear + 1}
          </Typography>
          <TextField
            select
            size="small"
            label="Month"
            value={selectedMonth}
            onChange={handleMonthChange}
            sx={{ width: 120, mr: 2 }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <MenuItem key={month} value={month}>
                {format(new Date(2000, month - 1), 'MMMM')}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            sx={{ width: 120 }}
          >
            {Array.from(
              { length: yearRange.end - yearRange.start + 1 },
              (_, i) => yearRange.start + i
            ).map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAllData}
            size="small"
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <ProductionUnitsTable productionData={productionData} />
      
      <BankingUnitsTable 
        bankingData={aggregatedBankingData}
        selectedYear={financialYear}
      />

      <ConsumptionUnitsTable 
        consumptionData={consumptionData}
        selectedYear={financialYear}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4, mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AutorenewIcon />}
          onClick={handleAutoAllocate}
        >
          Auto Allocate
        </Button>
      </Box>

      <AllocationDetailsTable 
        allocations={allocationData}
        loading={loading || isSaving}
        onEdit={handleEditAllocation}
        onSave={handleSaveAllocation}
      />

      <Grid container spacing={3} sx={{ mt: 4 }}>
        <Grid item xs={12} md={2.4}>
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
              <Typography variant="subtitle2">Total Production</Typography>
              <Typography variant="h6">
                {productionData.reduce((sum, prod) => sum + calculateTotal(prod), 0)} units
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Paper sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            background: 'linear-gradient(45deg, #81C784 30%, #A5D6A7 90%)',
            color: 'white',
            boxShadow: 3,
            borderRadius: 2
          }}>
            <BankingIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="subtitle2">Direct Banking</Typography>
              <Typography variant="h6">
                {allocationData
                  .filter(a => a.type === 'Banking' && a.isDirect)
                  .reduce((sum, bank) => sum + calculateTotal(bank.allocated), 0)} units
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Paper sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            background: 'linear-gradient(45deg, #4CAF50 30%, #66BB6A 90%)',
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

        <Grid item xs={12} md={2.4}>
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
                {allocationData
                  .filter(a => a.type === 'Lapse')
                  .reduce((sum, lapse) => sum + calculateTotal(lapse.allocated), 0)} units
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Paper sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            background: 'linear-gradient(45deg, #9C27B0 30%, #BA68C8 90%)',
            color: 'white',
            boxShadow: 3,
            borderRadius: 2
          }}>
            <SwapHorizIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="subtitle2">Total Allocated</Typography>
              <Typography variant="h6">
                {allocationData
                  .filter(a => a.type === 'Allocation')
                  .reduce((sum, alloc) => sum + calculateTotal(alloc.allocated), 0)} units
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Allocation;