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
import AllocationSummary from './AllocationSummary';
import { validatePeriodRules, formatAllocationMonth } from '../../utils/allocationUtils';
import { calculateAllocations } from '../../utils/allocationCalculator';

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
  const [allocations, setAllocations] = useState([]);
  const [bankingAllocations, setBankingAllocations] = useState([]);
  const [lapseAllocations, setLapseAllocations] = useState([]);
  const [yearRange] = useState({
    start: new Date().getFullYear() - 2,
    end: new Date().getFullYear() + 2
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showAllocations, setShowAllocations] = useState(false);

  // Alias productionUnits for backwards compatibility
  const productionUnits = productionData;

  const updateAllocationData = useCallback(async () => {
    try {
      const formattedMonth = `${selectedMonth.toString().padStart(2, '0')}${selectedYear}`;
      const response = await allocationApi.fetchAll(formattedMonth);
      // Separate allocation, banking, and lapse into their own states
      setAllocations(response.allocations || []);
      setBankingAllocations(response.banking || []);
      setLapseAllocations(response.lapse || []);
    } catch (error) {
      console.error('Error updating allocation data:', error);
      enqueueSnackbar(error.message || 'Failed to update allocation data', { 
        variant: 'error',
        autoHideDuration: 5000 
      });
    }
  }, [selectedMonth, selectedYear, enqueueSnackbar]);

  useEffect(() => {
    updateAllocationData();
  }, [updateAllocationData]);

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
            
            const formattedMonth = `${selectedMonth.toString().padStart(2, '0')}${selectedYear}`; // mmyyyy format
            return (unitsResp.data || [])
              .filter(unit => unit.sk === formattedMonth)
              .map(unit => {
                const companyId = Number(site.companyId) || 1;
                return {
                  ...unit,
                  siteName: site.name,
                  consumptionSiteId: site.consumptionSiteId,
                  type: site.type,
                  // Generate pk for allocation (productionSiteId_consumptionSiteId)
                  pk: `${unit.productionSiteId}_${site.consumptionSiteId}`,
                  // Generate sk in mmyyyy format
                  sk: formattedMonth,
                  c1: Number(unit.c1) || 0,
                  c2: Number(unit.c2) || 0,
                  c3: Number(unit.c3) || 0,
                  c4: Number(unit.c4) || 0,
                  c5: Number(unit.c5) || 0
                };
              });
          } catch (err) {
            console.error('Error fetching consumption units:', err);
            return [];
          }
        })
      )).flat();

      // Update production units with proper pk and sk for banking/lapse
      const updatedProductionUnits = productionUnits.map(unit => {
        const companyId = localStorage.getItem('companyId') || '1';
        const formattedMonth = `${selectedMonth.toString().padStart(2, '0')}${selectedYear}`; // mmyyyy format
        return {
          ...unit,
          // Generate pk for banking/lapse (companyId_productionSiteId)
          pk: `${companyId}_${unit.productionSiteId}`,
          // Generate sk in mmyyyy format
          sk: formattedMonth
        };
      });

      setProductionData(updatedProductionUnits);
      setConsumptionData(consumptionUnits);
      setBankingData(allBankingData);
      setAggregatedBankingData(Object.values(aggregatedBanking));

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
      enqueueSnackbar(err.message || 'Failed to load data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Update allocation calculation and table state
  const runAllocationCalculation = () => {
    const { allocations, bankingAllocations, lapseAllocations } = calculateAllocations({
      productionUnits: productionData,
      consumptionUnits: consumptionData,
      bankingUnits: bankingData,
    });
    setAllocations(allocations);
    setBankingAllocations(bankingAllocations);
    setLapseAllocations(lapseAllocations);
  };

  useEffect(() => {
    runAllocationCalculation();
    // eslint-disable-next-line
  }, [productionData, consumptionData, bankingData]);

  useEffect(() => {
    runAllocationCalculation();
  }, [selectedMonth, selectedYear]);

  const handleMonthChange = (event) => {
    setSelectedMonth(Number(event.target.value));
  };

  const handleYearChange = (year) => {
    setSelectedYear(Number(year));
  };

  const prepareAllocationPayload = (allocation, type, selectedMonth, selectedYear) => {
    const companyId = localStorage.getItem('companyId') || '1';
    const monthYear = allocation.month && allocation.month.length === 6 ? allocation.month : formatAllocationMonth(selectedMonth, selectedYear);
    let payload = { ...allocation };
    payload.companyId = companyId;
    payload.type = (type || allocation.type || 'ALLOCATION').toUpperCase();
    payload.month = monthYear;
    if (!payload.allocated || typeof payload.allocated !== 'object') payload.allocated = {};
    Object.keys(payload.allocated).forEach(k => {
      payload.allocated[k] = Math.max(0, Math.round(Number(payload.allocated[k]) || 0));
    });

    // Set keys and required fields based on type
    if (payload.type === 'ALLOCATION') {
      payload.pk = `${payload.productionSiteId}_${payload.consumptionSiteId}`;
      payload.sk = monthYear;
      payload.productionSite = payload.productionSite || payload.siteName || '';
      payload.consumptionSite = payload.consumptionSite || payload.siteName || '';
    } else if (payload.type === 'BANKING') {
      payload.pk = `${companyId}_${payload.productionSiteId}`;
      payload.sk = monthYear;
      payload.bankingEnabled = true;
      payload.siteName = payload.siteName || payload.productionSite || '';
      payload.productionSite = payload.productionSite || payload.siteName || '';
    } else if (payload.type === 'LAPSE') {
      payload.pk = `${companyId}_${payload.productionSiteId}`;
      payload.sk = monthYear;
      payload.siteName = payload.siteName || payload.productionSite || '';
      payload.productionSite = payload.productionSite || payload.siteName || '';
    }
    Object.keys(payload).forEach(
      key => (payload[key] === undefined || payload[key] === null) && delete payload[key]
    );
    return payload;
  };

  const validateAllocationPayload = (payload, type) => {
    // Required fields for each type
    const requiredFields = {
      ALLOCATION: ['companyId', 'productionSiteId', 'consumptionSiteId', 'pk', 'sk', 'month', 'allocated'],
      BANKING: ['companyId', 'productionSiteId', 'pk', 'sk', 'month', 'productionSite'],
      LAPSE: ['companyId', 'productionSiteId', 'pk', 'sk', 'month', 'productionSite']
    };
    const missing = (requiredFields[type] || []).filter(f => payload[f] === undefined || payload[f] === null || payload[f] === '');
    if (missing.length) {
      return `Missing required fields: ${missing.join(', ')}`;
    }
    return null;
  };

  const handleAutoAllocate = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Compute allocations and update state
      runAllocationCalculation();
      setShowAllocations(true);
      enqueueSnackbar('Allocations computed successfully.', { 
        variant: 'success',
        autoHideDuration: 6000
      });
    } catch (err) {
      console.error('[Allocation] Error during auto allocation:', err);
      setError(err.message || 'Error during auto allocation');
      enqueueSnackbar(err.message || 'Error during auto allocation', { 
        variant: 'error',
        autoHideDuration: 6000
      });
    } finally {
      setIsSaving(false);
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
      setAllocations(prevData => 
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

  // Save handler: send each type to its respective API and log payloads
  const handleSaveAllocation = async () => {
    setIsSaving(true);
    try {
      // 1. Save allocations
      if (allocations.length) {
        const allocPayloads = allocations.map(a => prepareAllocationPayload(a, 'ALLOCATION', selectedMonth, selectedYear));
        console.log('[AllocationApi] Payload to allocation table:', allocPayloads);
        for (const payload of allocPayloads) {
          await allocationApi.createAllocation(payload);
        }
      }
      // 2. Save banking allocations
      if (bankingAllocations.length) {
        const bankPayloads = bankingAllocations.map(b => prepareAllocationPayload(b, 'BANKING', selectedMonth, selectedYear));
        console.log('[BankingApi] Payload to banking table:', bankPayloads);
        for (const payload of bankPayloads) {
          await allocationApi.createBanking(payload);
        }
      }
      // 3. Save lapse allocations
      if (lapseAllocations.length) {
        const lapsePayloads = lapseAllocations.map(l => prepareAllocationPayload(l, 'LAPSE', selectedMonth, selectedYear));
        console.log('[LapseApi] Payload to lapse table:', lapsePayloads);
        for (const payload of lapsePayloads) {
          await allocationApi.createLapse(payload);
        }
      }
      enqueueSnackbar('Allocations saved successfully!', { variant: 'success' });
      updateAllocationData();
    } catch (error) {
      enqueueSnackbar(error.message || 'Failed to save allocations', { variant: 'error' });
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
          {typeof error === 'string' ? error : (
            <Box>
              {error.allocation?.length > 0 && (
                <Typography>Allocation Errors: {error.allocation.join(', ')}</Typography>
              )}
              {error.banking?.length > 0 && (
                <Typography>Banking Errors: {error.banking.join(', ')}</Typography>
              )}
              {error.lapse?.length > 0 && (
                <Typography>Lapse Errors: {error.lapse.join(', ')}</Typography>
              )}
            </Box>
          )}
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

      {showAllocations && (
        <>
          <AllocationDetailsTable 
            allocations={allocations}
            bankingAllocations={bankingAllocations}
            oldBankingAllocations={aggregatedBankingData}
            lapseAllocations={lapseAllocations}
            loading={loading || isSaving}
            onEdit={handleEditAllocation}
            onSave={handleSaveAllocation}
          />
          <Box sx={{ mt: 3 }}>
            <AllocationSummary
              productionData={productionData}
              consumptionData={consumptionData}
              allocations={allocations}
              bankingAllocations={bankingAllocations}
              oldBankingAllocations={aggregatedBankingData}
              lapseAllocations={lapseAllocations}
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default Allocation;