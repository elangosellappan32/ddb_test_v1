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
  Box
} from '@mui/material';
import { AccountBalance as BankingIcon } from '@mui/icons-material';

const BankingUnitsTable = ({ bankingData, selectedYear }) => {
  const calculateTotal = (row) => {
    return ['c1', 'c2', 'c3', 'c4', 'c5'].reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
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
            <TableCell align="right">C1</TableCell>
            <TableCell align="right">C2</TableCell>
            <TableCell align="right">C3</TableCell>
            <TableCell align="right">C4</TableCell>
            <TableCell align="right">C5</TableCell>
            <TableCell align="right">Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bankingData.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.siteName}</TableCell>
              <TableCell align="right">{row.c1}</TableCell>
              <TableCell align="right">{row.c2}</TableCell>
              <TableCell align="right">{row.c3}</TableCell>
              <TableCell align="right">{row.c4}</TableCell>
              <TableCell align="right">{row.c5}</TableCell>
              <TableCell align="right">
                <Box sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {calculateTotal(row)}
                </Box>
              </TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
            <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
              {bankingData.reduce((sum, row) => sum + (Number(row.c1) || 0), 0)}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
              {bankingData.reduce((sum, row) => sum + (Number(row.c2) || 0), 0)}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
              {bankingData.reduce((sum, row) => sum + (Number(row.c3) || 0), 0)}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
              {bankingData.reduce((sum, row) => sum + (Number(row.c4) || 0), 0)}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
              {bankingData.reduce((sum, row) => sum + (Number(row.c5) || 0), 0)}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {bankingData.reduce((sum, row) => sum + calculateTotal(row), 0)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BankingUnitsTable;