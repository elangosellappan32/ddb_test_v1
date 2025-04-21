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
  IconButton
} from '@mui/material';
import { 
  AccountBalance as BankingIcon,
  Info as InfoIcon 
} from '@mui/icons-material';

const BankingUnitsTable = ({ bankingData, selectedYear }) => {
  const calculateTotal = (row, key = 'allocated') => {
    return ['c1', 'c2', 'c3', 'c4', 'c5'].reduce((sum, period) => 
      sum + Math.round(Number(row[key]?.[period] || row[period] || 0)), 0
    );
  };

  const calculateUsedUnits = (row) => {
    if (!row.previousBalance) return 0;
    const previousTotal = calculateTotal(row, 'previousBalance');
    const currentTotal = calculateTotal(row);
    return Math.max(0, previousTotal - currentTotal);
  };

  return (
    <TableContainer component={Paper} sx={{ mb: 4 }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(224, 224, 224, 1)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <BankingIcon color="primary" />
        <Typography variant="h6">
          Banking Units Summary (FY {selectedYear}-{selectedYear + 1})
        </Typography>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Site Name</TableCell>
            <TableCell align="right">
              <Tooltip title="Non-Peak Period">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  C1
                  <InfoIcon sx={{ ml: 0.5, fontSize: '1rem' }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Peak Period">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  C2
                  <InfoIcon sx={{ ml: 0.5, fontSize: '1rem' }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Peak Period">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  C3
                  <InfoIcon sx={{ ml: 0.5, fontSize: '1rem' }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Non-Peak Period">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  C4
                  <InfoIcon sx={{ ml: 0.5, fontSize: '1rem' }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Non-Peak Period">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  C5
                  <InfoIcon sx={{ ml: 0.5, fontSize: '1rem' }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              Previous Balance
            </TableCell>
            <TableCell align="right">
              Current Balance
            </TableCell>
            <TableCell align="right">
              Used Units
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bankingData.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.siteName}</TableCell>
              {['c1', 'c2', 'c3', 'c4', 'c5'].map(period => (
                <TableCell key={period} align="right">
                  <Tooltip title={row.previousBalance ? `Previous: ${Math.round(row.previousBalance[period] || 0)}` : 'No previous balance'}>
                    <Typography>
                      {Math.round(row.allocated?.[period] || row[period] || 0)}
                    </Typography>
                  </Tooltip>
                </TableCell>
              ))}
              <TableCell align="right" sx={{ color: 'text.secondary' }}>
                {calculateTotal(row, 'previousBalance')}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {calculateTotal(row)}
              </TableCell>
              <TableCell align="right" sx={{ color: 'warning.main' }}>
                {calculateUsedUnits(row)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
            <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
            {['c1', 'c2', 'c3', 'c4', 'c5'].map(period => (
              <TableCell key={period} align="right" sx={{ fontWeight: 'bold' }}>
                {bankingData.reduce((sum, row) => 
                  sum + Math.round(Number(row.allocated?.[period] || row[period] || 0)), 0
                )}
              </TableCell>
            ))}
            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
              {bankingData.reduce((sum, row) => sum + calculateTotal(row, 'previousBalance'), 0)}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {bankingData.reduce((sum, row) => sum + calculateTotal(row), 0)}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
              {bankingData.reduce((sum, row) => sum + calculateUsedUnits(row), 0)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BankingUnitsTable;