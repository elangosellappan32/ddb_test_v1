import React, { useEffect, useState, useMemo } from 'react';
import { Button, Box, Typography, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack } from '@mui/material';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import allocationApi from '../../services/allocationApi';
import productionSiteApi from '../../services/productionSiteapi';
import consumptionSiteApi from '../../services/consumptionSiteApi';

const PERIODS = [
  { id: 'c1', label: 'C1 (Non-Peak)' },
  { id: 'c2', label: 'C2 (Peak)' },
  { id: 'c3', label: 'C3 (Peak)' },
  { id: 'c4', label: 'C4 (Non-Peak)' },
  { id: 'c5', label: 'C5 (Non-Peak)' },
];

const getTotal = (row) => PERIODS.reduce((sum, p) => sum + (Number(row[p.id]) || 0), 0);
const getPeakTotal = (row) => ['c2', 'c3'].reduce((sum, p) => sum + (Number(row[p]) || 0), 0);
const getNonPeakTotal = (row) => ['c1', 'c4', 'c5'].reduce((sum, p) => sum + (Number(row[p]) || 0), 0);

const AllocationReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productionSites, setProductionSites] = useState([]);
  const [consumptionSites, setConsumptionSites] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const allData = await allocationApi.fetchAllAllocations();
        setData(allData);
      } catch (err) {
        setError('Failed to load allocation data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const [prodResp, consResp] = await Promise.all([
          productionSiteApi.fetchAll(),
          consumptionSiteApi.fetchAll()
        ]);
        setProductionSites(prodResp.data || []);
        setConsumptionSites(consResp.data || []);
      } catch (err) {
        // Ignore site fetch errors for now
      }
    };
    fetchSites();
  }, []);

  // Build lookup maps for site names
  const prodSiteNameMap = useMemo(() => {
    const map = {};
    productionSites.forEach(site => {
      map[String(site.productionSiteId)] = site.name;
    });
    return map;
  }, [productionSites]);
  const consSiteNameMap = useMemo(() => {
    const map = {};
    consumptionSites.forEach(site => {
      map[String(site.consumptionSiteId)] = site.name;
    });
    return map;
  }, [consumptionSites]);

  // Prepare table data with all columns, using composite key for period-based adjustments
  const tableData = useMemo(() => data.map(row => {
    // Extract IDs from pk (format: companyid_productionsiteid_consumptionsiteid)
    let companyId = '', prodId = '', consId = '';
    if (row.pk) {
      const parts = row.pk.split('_');
      if (parts.length === 3) {
        companyId = parts[0];
        prodId = parts[1];
        consId = parts[2];
      }
    }
    // Fallback to fields if pk is not present or not in expected format
    prodId = prodId || String(row.productionSiteId || row.productionSite || '');
    consId = consId || String(row.consumptionSiteId || row.consumptionSite || '');
    companyId = companyId || String(row.companyId || row.company || '');

    // For each period, build a composite key for allocation adjustment
    const periodKeys = {};
    PERIODS.forEach(period => {
      // prodperiod and consperiod can be the same as period.id, or you can adjust as needed
      const prodPeriod = period.id;
      const consPeriod = period.id;
      const compositeKey = `${companyId}_${prodId}_${consId}_${prodPeriod}_${consPeriod}`;
      periodKeys[period.id] = compositeKey;
    });

    return {
      ...row,
      ...(row.allocated || {}),
      productionSiteDisplay: prodSiteNameMap[prodId] || prodId || 'Unknown',
      consumptionSiteDisplay: consSiteNameMap[consId] || consId || 'Unknown',
      // Add composite keys for each period for adjustment reference
      periodCompositeKeys: periodKeys,
      total: getTotal(row.allocated || row),
      peakTotal: getPeakTotal(row.allocated || row),
      nonPeakTotal: getNonPeakTotal(row.allocated || row)
    };
  }), [data, prodSiteNameMap, consSiteNameMap]);

  // Columns for the report
  const columns = [
    { id: 'productionSiteDisplay', label: 'Production Site' },
    { id: 'consumptionSiteDisplay', label: 'Consumption Site' },
    ...PERIODS,
    { id: 'peakTotal', label: 'Peak Total' },
    { id: 'nonPeakTotal', label: 'Non-Peak Total' },
    { id: 'total', label: 'Total Units' },
    { id: 'type', label: 'Type' },
    { id: 'month', label: 'Month' },
  ];

  const handleDownloadExcel = () => {
    if (!tableData.length) return;
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Allocations');
    XLSX.writeFile(workbook, 'allocation_report.xlsx');
  };

  const handleDownloadCSV = () => {
    if (!tableData.length) return;
    const csv = Papa.unparse(tableData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'allocation_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight={700} color="primary.main">Allocation Report</Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>All allocations with unit breakdowns and totals</Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleDownloadExcel}>
          Download Excel
        </Button>
        <Button variant="outlined" color="secondary" onClick={handleDownloadCSV}>
          Download CSV
        </Button>
      </Stack>
      <Paper sx={{ overflow: 'auto', maxHeight: 600, borderRadius: 2, boxShadow: 2 }}>
        <TableContainer>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map(col => (
                  <TableCell key={col.id} sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>{col.label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row, idx) => (
                <TableRow key={idx} hover>
                  {columns.map(col => (
                    <TableCell key={col.id} align={typeof row[col.id] === 'number' ? 'right' : 'left'}>
                      {row[col.id] !== undefined ? row[col.id] : ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default AllocationReport;
