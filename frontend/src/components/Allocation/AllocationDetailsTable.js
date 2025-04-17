import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Chip
} from '@mui/material';
import { SwapHoriz as SwapIcon } from '@mui/icons-material';

const AllocationDetailsTable = ({ allocations }) => {
  const getAllocationColor = (type, isDirect) => {
    switch (type?.toLowerCase()) {
      case 'banking': 
        return isDirect ? '#81C784' : '#4CAF50';  // Lighter green for direct banking
      case 'lapse': 
        return '#FF9800';
      default: 
        return '#2196F3';
    }
  };

  const calculateTotal = (allocated) => {
    return Object.values(allocated || {}).reduce((sum, val) => sum + Number(val), 0);
  };

  // Group allocations by site and type
  const groupedAllocations = allocations.reduce((acc, curr) => {
    const key = curr.type === 'Banking' ? 'Banking' : curr.consumptionSite;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);
    return acc;
  }, {});

  return (
    <TableContainer component={Paper} sx={{ mt: 4 }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(224, 224, 224, 1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapIcon color="primary" />
          <Typography variant="h6">
            Allocation Details
          </Typography>
        </Box>
      </Box>
      {Object.entries(groupedAllocations).map(([site, siteAllocations]) => (
        <Box key={site} sx={{ mb: 3 }}>
          <Box sx={{ 
            p: 2, 
            bgcolor: getAllocationColor(siteAllocations[0]?.type, siteAllocations[0]?.isDirect), 
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="subtitle1">
              {site} {siteAllocations[0]?.type === 'Banking' && siteAllocations[0]?.isDirect && '(Direct Banking)'}
            </Typography>
            <Chip 
              label={siteAllocations[0]?.type || 'Allocation'} 
              size="small" 
              sx={{ 
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                '& .MuiChip-label': { fontWeight: 'bold' }
              }}
            />
          </Box>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Production Site</TableCell>
                <TableCell align="right">C1 (Non-Peak)</TableCell>
                <TableCell align="right">C2 (Non-Peak)</TableCell>
                <TableCell align="right">C3 (Peak)</TableCell>
                <TableCell align="right">C4 (Peak)</TableCell>
                <TableCell align="right">C5 (Non-Peak)</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {siteAllocations.map((allocation, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box>
                      <Typography>{allocation.productionSite}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {allocation.siteType || 'Unknown Type'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{Number(allocation.allocated?.c1 || 0).toFixed(2)}</TableCell>
                  <TableCell align="right">{Number(allocation.allocated?.c2 || 0).toFixed(2)}</TableCell>
                  <TableCell align="right">{Number(allocation.allocated?.c3 || 0).toFixed(2)}</TableCell>
                  <TableCell align="right">{Number(allocation.allocated?.c4 || 0).toFixed(2)}</TableCell>
                  <TableCell align="right">{Number(allocation.allocated?.c5 || 0).toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: getAllocationColor(allocation.type, allocation.isDirect) }}>
                    {calculateTotal(allocation.allocated).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              {site !== 'Banking' && (
                <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Total Allocated</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {siteAllocations.reduce((sum, alloc) => sum + Number(alloc.allocated?.c1 || 0), 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {siteAllocations.reduce((sum, alloc) => sum + Number(alloc.allocated?.c2 || 0), 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {siteAllocations.reduce((sum, alloc) => sum + Number(alloc.allocated?.c3 || 0), 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {siteAllocations.reduce((sum, alloc) => sum + Number(alloc.allocated?.c4 || 0), 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {siteAllocations.reduce((sum, alloc) => sum + Number(alloc.allocated?.c5 || 0), 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: getAllocationColor(siteAllocations[0]?.type, siteAllocations[0]?.isDirect) }}>
                    {siteAllocations.reduce((sum, alloc) => sum + calculateTotal(alloc.allocated), 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      ))}
    </TableContainer>
  );
};

export default AllocationDetailsTable;