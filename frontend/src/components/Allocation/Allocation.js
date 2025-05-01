import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  Autorenew as AutorenewIcon,
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
import { formatAllocationMonth, ALL_PERIODS } from '../../utils/allocationUtils';
import { calculateAllocations } from '../../utils/allocationCalculator';

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
  const [showAllocations, setShowAllocations] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState({ allocation: null, type: '' });

  // Update allocation calculation and table state
  const [manualAllocations, setManualAllocations] = useState({});

  const handleManualAllocationChange = (prodId, consId, period, value) => {
    const key = `${prodId}_${consId}_${period}`;
    const newValue = Math.max(0, Number(value) || 0);

    // Find the relevant production and consumption units
    const prodUnit = productionData.find(row => row.productionSiteId === prodId);
    const consUnit = consumptionData.find(row => row.consumptionSiteId === consId);
    if (!prodUnit || !consUnit) return;

    // Calculate the maximum allowed allocation for this period
    const maxAlloc = Math.min(
      Number(prodUnit[period] || 0) + (manualAllocations[key] || 0), // add back previous manual allocation for this cell
      Number(consUnit[period] || 0)
    );
    const finalValue = Math.min(newValue, maxAlloc);

    // Update manualAllocations state
    setManualAllocations(prev => ({ ...prev, [key]: finalValue }));

    // Update productionData's allocated and remaining for this period
    setProductionData(prev => prev.map(row => {
      if (row.productionSiteId === prodId) {
        // Calculate total manual allocations for this prodId and period
        let totalManual = 0;
        Object.keys(manualAllocations).forEach(k => {
          const [pId, , per] = k.split('_');
          if (pId === String(prodId) && per === period) {
            totalManual += Number(manualAllocations[k] || 0);
          }
        });
        // Add the new value for this cell
        totalManual = totalManual - (manualAllocations[key] || 0) + finalValue;
        const orig = Number(row[period] || 0);
        const remaining = { ...row.remaining };
        remaining[period] = Math.max(0, orig - totalManual);
        return {
          ...row,
          remaining,
        };
      }
      return row;
    }));

    // Recalculate allocations with updated manualAllocations
    const updatedManualAllocations = { ...manualAllocations, [key]: finalValue };
    let newAllocations = calculateAllocations({
      productionUnits: productionData,
      consumptionUnits: consumptionData,
      bankingUnits: bankingData,
      manualAllocations: updatedManualAllocations
    });

    // Validation: at least one period in allocated must be > 0, else set all to zero
    const fixZeroAllocations = (arr) => arr.map(a => {
      const allocated = a.allocated || {};
      const hasNonZero = Object.values(allocated).some(v => Number(v) > 0);
      if (!hasNonZero) {
        return {
          ...a,
          allocated: Object.fromEntries(Object.keys(allocated).map(p => [p, 0]))
        };
      }
      return a;
    });

    setAllocations(fixZeroAllocations(newAllocations.allocations));
    setBankingAllocations(fixZeroAllocations(newAllocations.bankingAllocations).map(b => {
      const prod = productionData.find(p => p.productionSiteId === b.productionSiteId);
      return {
        ...b,
        siteName: prod ? (prod.siteName || prod.productionSite || '') : '',
        productionSite: prod ? (prod.productionSite || prod.siteName || '') : '',
      };
    }));
    setLapseAllocations(fixZeroAllocations(newAllocations.lapseAllocations).map(l => {
      const prod = productionData.find(p => p.productionSiteId === l.productionSiteId);
      return {
        ...l,
        siteName: prod ? (prod.siteName || prod.productionSite || '') : '',
        productionSite: prod ? (prod.productionSite || prod.siteName || '') : '',
      };
    }));
  };

  const runAllocationCalculation = useCallback(() => {
    if (!productionData.length || !consumptionData.length) return;

    const { allocations, bankingAllocations, lapseAllocations } = calculateAllocations({
      productionUnits: productionData,
      consumptionUnits: consumptionData,
      bankingUnits: bankingData,
      manualAllocations
    });
    
    setAllocations(allocations);
    setBankingAllocations(bankingAllocations);
    setLapseAllocations(lapseAllocations);
    setShowAllocations(true);

    enqueueSnackbar('Allocation data updated', { 
      variant: 'success',
      autoHideDuration: 2000 
    });
  }, [productionData, consumptionData, bankingData, manualAllocations, enqueueSnackbar]);

  const updateAllocationData = useCallback(() => {
    if (!showAllocations) return;
    
    // Recalculate allocations
    runAllocationCalculation();
  }, [showAllocations, runAllocationCalculation]);

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
    } else if (payload.type === 'BANKING') {
      payload.pk = `${companyId}_${payload.productionSiteId}`;
      payload.sk = monthYear;
      payload.bankingEnabled = true;
    } else if (payload.type === 'LAPSE') {
      payload.pk = `${companyId}_${payload.productionSiteId}`;
      payload.sk = monthYear;
    }
    // Add metadata stub for versioning and TTL
    const ts = new Date().toISOString();
    if (!payload.version) payload.version = 1;
    payload.ttl = 0;
    if (!payload.createdAt) payload.createdAt = ts;
    payload.updatedAt = ts;
    Object.keys(payload).forEach(
      key => (payload[key] === undefined || payload[key] === null) && delete payload[key]
    );
    return payload;
  };

  // Fix edit dialog selection: match by productionSiteId and consumptionSiteId (if present)
  const handleEditAllocation = useCallback((allocation, type) => {
    setDialogData({ allocation, type });
    setConfirmDialogOpen(true);
  }, []);

  // Local UI edit: update allocations/bankingAllocations/lapseAllocations only; persistence on 'Save Changes'
  const handleEditAllocationConfirmed = useCallback(() => {
    const { allocation, type } = dialogData;
    setConfirmDialogOpen(false);

    if (type === 'allocation') {
      setAllocations(prevAllocs => prevAllocs.map(a =>
        a.productionSiteId === allocation.productionSiteId &&
        a.consumptionSiteId === allocation.consumptionSiteId
          ? { ...a, allocated: allocation.allocated, version: (a.version || 0) + 1, updatedAt: new Date().toISOString() }
          : a
      ));
      // Handle banking/lapse adjustments
      if (allocation.bankingAdjustments) {
        setBankingAllocations(prev => {
          let found = false;
          const updated = prev.map(b => {
            if (b.productionSiteId === allocation.productionSiteId) {
              found = true;
              const newAllocated = { ...b.allocated };
              Object.entries(allocation.bankingAdjustments).forEach(([period, diff]) => {
                newAllocated[period] = Math.round((Number(newAllocated[period]) || 0) + diff);
              });
              // Remove if all periods are zero
              const allZero = ALL_PERIODS.every(p => !newAllocated[p]);
              return allZero ? null : { ...b, allocated: newAllocated, updatedAt: new Date().toISOString() };
            }
            return b;
          }).filter(Boolean);
          // If not found and any adjustment is nonzero, add new row
          if (!found && Object.values(allocation.bankingAdjustments).some(v => v !== 0)) {
            const newAllocated = {};
            ALL_PERIODS.forEach(p => { newAllocated[p] = Math.round(allocation.bankingAdjustments[p] || 0); });
            if (Object.values(newAllocated).some(v => v !== 0)) {
              updated.push({
                productionSiteId: allocation.productionSiteId,
                siteName: allocation.siteName,
                allocated: newAllocated,
                type: 'BANKING',
                updatedAt: new Date().toISOString(),
              });
            }
          }
          return updated;
        });
      }
      if (allocation.lapseAdjustments) {
        setLapseAllocations(prev => {
          let found = false;
          const updated = prev.map(l => {
            if (l.productionSiteId === allocation.productionSiteId) {
              found = true;
              const newAllocated = { ...l.allocated };
              Object.entries(allocation.lapseAdjustments).forEach(([period, diff]) => {
                newAllocated[period] = Math.round((Number(newAllocated[period]) || 0) + diff);
              });
              // Remove if all periods are zero
              const allZero = ALL_PERIODS.every(p => !newAllocated[p]);
              return allZero ? null : { ...l, allocated: newAllocated, updatedAt: new Date().toISOString() };
            }
            return l;
          }).filter(Boolean);
          // If not found and any adjustment is nonzero, add new row
          if (!found && Object.values(allocation.lapseAdjustments).some(v => v !== 0)) {
            const newAllocated = {};
            ALL_PERIODS.forEach(p => { newAllocated[p] = Math.round(allocation.lapseAdjustments[p] || 0); });
            if (Object.values(newAllocated).some(v => v !== 0)) {
              updated.push({
                productionSiteId: allocation.productionSiteId,
                siteName: allocation.siteName,
                allocated: newAllocated,
                type: 'LAPSE',
                updatedAt: new Date().toISOString(),
              });
            }
          }
          return updated;
        });
      }
    } else if (type === 'banking') {
      setBankingAllocations(prev => prev.map(a =>
        a.productionSiteId === allocation.productionSiteId ? allocation : a
      ));
    }

    enqueueSnackbar('Allocation updated in UI. Click Save Changes to persist.', {
      variant: 'success',
      autoHideDuration: 3000
    });
  }, [dialogData, enqueueSnackbar]);

  // When fetch completes or month/year changes, update data
  useEffect(() => {
    if (showAllocations && productionData.length && consumptionData.length) {
      runAllocationCalculation();
    }
  }, [productionData, consumptionData, showAllocations, runAllocationCalculation]);

  const handleAutoAllocate = async () => {
    try {
      setLoading(true);
      setError(null);

      // Run allocation calculation
      runAllocationCalculation();
      
      enqueueSnackbar('Allocations computed successfully', { 
        variant: 'success',
        autoHideDuration: 3000 
      });
    } catch (err) {
      console.error('[Allocation] Auto allocation error:', err);
      setError(err.message || 'Failed to compute allocations');
      enqueueSnackbar(err.message || 'Failed to compute allocations', { 
        variant: 'error',
        autoHideDuration: 5000 
      });
    } finally {
      setLoading(false);
    }
  };

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

      const formattedMonth = `${selectedMonth.toString().padStart(2, '0')}${selectedYear}`;
      const financialYear = getFinancialYear(selectedMonth, selectedYear);
      const financialYearMonths = getFinancialYearMonths(financialYear);

      const [prodSitesResp, consSitesResp, bankingResp] = await Promise.all([
        productionSiteApi.fetchAll(),
        consumptionSiteApi.fetchAll(),
        bankingApi.fetchAll(formattedMonth)  // Use formattedMonth here
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
                  pk: `${companyId}_${unit.productionSiteId}_${site.consumptionSiteId}`,
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
      setError({
        message: err.message || 'Failed to load data',
        details: err.details || []
      });
      enqueueSnackbar(err.message || 'Failed to load data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleMonthChange = (event) => {
    setSelectedMonth(Number(event.target.value));
  };

  const handleYearChange = (year) => {
    setSelectedYear(Number(year));
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
          try {
            await allocationApi.createAllocation(payload);
          } catch (error) {
            const msg = error.message || '';
            if (msg.includes('already exists')) {
              // Duplicate: ask to update existing record
              if (window.confirm(`${msg}. Do you want to update it instead?`)) {
                await allocationApi.update(payload.pk, payload.sk, payload, 'ALLOCATION');
              } else {
                throw error;
              }
            } else {
              throw error;
            }
          }
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

      <ProductionUnitsTable 
        data={productionData}
        onManualAllocationChange={handleManualAllocationChange}
      />
      
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
          disabled={loading || !productionData.length || !consumptionData.length}
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
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Update</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to update this {dialogData.type?.toLowerCase()}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditAllocationConfirmed} color="primary">OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Allocation;