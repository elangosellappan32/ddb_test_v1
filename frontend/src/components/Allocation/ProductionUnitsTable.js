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
            <TableCell align="right">Total</TableCell>
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
              <TableCell align="right">{row.c1}</TableCell>
              <TableCell align="right">{row.c2}</TableCell>
              <TableCell align="right">{row.c3}</TableCell>
              <TableCell align="right">{row.c4}</TableCell>
              <TableCell align="right">{row.c5}</TableCell>
              <TableCell align="right">{calculateTotal(row)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProductionUnitsTable;