import React from 'react';
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
  Tooltip,
  Chip
} from '@mui/material';
import {
  AccountBalance as BankingIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';

const BankingUnitsTable = ({ bankingData = [], selectedYear }) => {
  const PEAK_PERIODS = ['c2', 'c3'];
  const NON_PEAK_PERIODS = ['c1', 'c4', 'c5'];
  const ALL_PERIODS = [...PEAK_PERIODS, ...NON_PEAK_PERIODS];

  // Calculate totals for a given row and periods
  const calculatePeriodTotal = (row, periods) => {
    if (!row) return 0;
    return periods.reduce((sum, period) => {
      const value = Math.round(Number(row?.allocated?.[period] || row?.[period] || 0));
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  };

  // Calculate used units (difference between previous and current balance)
  const calculateUsedUnits = (row) => {
    if (!row?.previousBalance) return 0;
    const previousTotal = calculatePeriodTotal(row.previousBalance, ALL_PERIODS);
    const currentTotal = calculatePeriodTotal(row, ALL_PERIODS);
    return Math.max(0, previousTotal - currentTotal);
  };

  const getStatusChip = (row) => {
    const currentBalance = calculatePeriodTotal(row, ALL_PERIODS);
    const previousBalance = calculatePeriodTotal(row.previousBalance, ALL_PERIODS);
    const change = currentBalance - previousBalance;

    if (change > 0) {
      return (
        <Chip
          icon={<TrendingUpIcon />}
          label="Increased"
          size="small"
          color="success"
          sx={{ ml: 1 }}
        />
      );
    } else if (change < 0) {
      return (
        <Chip
          icon={<TrendingDownIcon />}
          label="Decreased"
          size="small"
          color="error"
          sx={{ ml: 1 }}
        />
      );
    }
    return null;
  };

  // Ensure values are properly rounded numbers
  const formatValue = (value) => {
    const num = Math.round(Number(value || 0));
    return isNaN(num) ? 0 : num;
  };

  return (
    <TableContainer component={Paper} sx={{ mb: 4 }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(224, 224, 224, 1)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <BankingIcon color="primary" />
        <Typography variant="h6">Banking Units</Typography>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Site Name</TableCell>
            {ALL_PERIODS.map(period => (
              <TableCell key={period} align="right">
                <Tooltip title={PEAK_PERIODS.includes(period) ? "Peak Period" : "Non-Peak Period"}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {period.toUpperCase()}
                    <InfoIcon sx={{ ml: 0.5, fontSize: '1rem', color: PEAK_PERIODS.includes(period) ? 'warning.main' : 'primary.main' }} />
                  </Box>
                </Tooltip>
              </TableCell>
            ))}
            <TableCell align="right">Previous Balance</TableCell>
            <TableCell align="right">Current Balance</TableCell>
            <TableCell align="right">Used Units</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bankingData.map((row, index) => (
            <TableRow key={`${row.productionSiteId}-${index}`} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {row.siteName}
                  {getStatusChip(row)}
                </Box>
              </TableCell>
              {ALL_PERIODS.map(period => (
                <TableCell key={period} align="right">
                  <Typography sx={{
                    color: PEAK_PERIODS.includes(period) ? 'warning.main' : 'primary.main',
                    fontWeight: PEAK_PERIODS.includes(period) ? 'bold' : 'normal'
                  }}>
                    {formatValue(row?.allocated?.[period] || row?.[period])}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="right" sx={{ color: 'text.secondary' }}>
                {calculatePeriodTotal(row.previousBalance, ALL_PERIODS)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {calculatePeriodTotal(row, ALL_PERIODS)}
              </TableCell>
              <TableCell align="right" sx={{ color: 'warning.main' }}>
                {calculateUsedUnits(row)}
              </TableCell>
            </TableRow>
          ))}
          {bankingData.length > 0 && (
            <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
              {ALL_PERIODS.map(period => (
                <TableCell key={period} align="right" sx={{ 
                  fontWeight: 'bold',
                  color: PEAK_PERIODS.includes(period) ? 'warning.main' : 'primary.main'
                }}>
                  {bankingData.reduce((sum, row) => 
                    sum + formatValue(row?.allocated?.[period] || row?.[period]), 0
                  )}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                {bankingData.reduce((sum, row) => 
                  sum + calculatePeriodTotal(row.previousBalance, ALL_PERIODS), 0
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {bankingData.reduce((sum, row) => 
                  sum + calculatePeriodTotal(row, ALL_PERIODS), 0
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                {bankingData.reduce((sum, row) => sum + calculateUsedUnits(row), 0)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BankingUnitsTable;