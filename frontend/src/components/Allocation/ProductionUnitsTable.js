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
  Chip,
  Tooltip,
  Box
} from '@mui/material';
import { CheckCircle, Cancel, Info as InfoIcon } from '@mui/icons-material';

const ProductionUnitsTable = ({ productionData }) => {
  const calculateTotal = (row) => {
    return ['c1', 'c2', 'c3', 'c4', 'c5'].reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
  };

  const calculatePeakTotal = (row) => {
    return ['c2', 'c3'].reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
  };

  const calculateNonPeakTotal = (row) => {
    return ['c1', 'c4', 'c5'].reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
  };

  return (
    <TableContainer component={Paper} sx={{ mb: 4, mt: 2 }}>
      <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
        Production Units
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Site Name</TableCell>
            <TableCell>Banking Status</TableCell>
            <TableCell align="right">
              <Tooltip title="Non-Peak Period">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  C1
                  <InfoIcon sx={{ ml: 0.5, fontSize: '1rem', color: 'primary.main' }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Peak Period">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  C2
                  <InfoIcon sx={{ ml: 0.5, fontSize: '1rem', color: 'warning.main' }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Peak Period">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  C3
                  <InfoIcon sx={{ ml: 0.5, fontSize: '1rem', color: 'warning.main' }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Non-Peak Period">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  C4
                  <InfoIcon sx={{ ml: 0.5, fontSize: '1rem', color: 'primary.main' }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Non-Peak Period">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  C5
                  <InfoIcon sx={{ ml: 0.5, fontSize: '1rem', color: 'primary.main' }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell align="right">Peak Total</TableCell>
            <TableCell align="right">Non-Peak Total</TableCell>
            <TableCell align="right">Total Units</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {productionData.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.siteName}</TableCell>
              <TableCell>
                <Chip
                  icon={row.bankingStatus === 'Available' ? <CheckCircle /> : <Cancel />}
                  label={row.bankingStatus}
                  color={row.bankingStatus === 'Available' ? 'success' : 'error'}
                  variant="outlined"
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ color: 'primary.main' }}>
                  {row.c1}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                  {row.c2}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                  {row.c3}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ color: 'primary.main' }}>
                  {row.c4}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ color: 'primary.main' }}>
                  {row.c5}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                  {calculatePeakTotal(row)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ color: 'primary.main' }}>
                  {calculateNonPeakTotal(row)}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {calculateTotal(row)}
              </TableCell>
            </TableRow>
          ))}
          {productionData.length > 0 && (
            <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
              <TableCell />
              {['c1', 'c2', 'c3', 'c4', 'c5'].map(period => (
                <TableCell key={period} align="right" sx={{ 
                  fontWeight: 'bold',
                  color: period === 'c2' || period === 'c3' ? 'warning.main' : 'primary.main'
                }}>
                  {productionData.reduce((sum, row) => sum + (Number(row[period]) || 0), 0)}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                {productionData.reduce((sum, row) => sum + calculatePeakTotal(row), 0)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {productionData.reduce((sum, row) => sum + calculateNonPeakTotal(row), 0)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {productionData.reduce((sum, row) => sum + calculateTotal(row), 0)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProductionUnitsTable;