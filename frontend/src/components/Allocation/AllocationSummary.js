import React from 'react';
import { Box, Paper, Typography, Grid } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

const AllocationSummary = ({ allocations = [], bankingAllocations = [], lapseAllocations = [] }) => {
  // Calculate totals based on the new data structure
  const totalAllocated = allocations.reduce((sum, item) => 
    sum + Number(item.unitsAllocated || 0), 0);
    
  const totalBanking = bankingAllocations.reduce((sum, item) => 
    sum + Number(item.unitsBanked || 0), 0);
    
  const totalLapse = lapseAllocations.reduce((sum, item) => 
    sum + Number(item.unitsLapsed || 0), 0);

  const summaryItems = [
    {
      title: 'Total Allocated',
      value: totalAllocated.toFixed(2),
      icon: <SwapHorizIcon />,
      color: 'primary.main',
      bgcolor: 'primary.lighter'
    },
    {
      title: 'Total Banking',
      value: totalBanking.toFixed(2),
      icon: <AccountBalanceIcon />,
      color: 'info.main',
      bgcolor: 'info.lighter'
    },
    {
      title: 'Total Lapse',
      value: totalLapse.toFixed(2),
      icon: <ErrorOutlineIcon />,
      color: 'warning.main',
      bgcolor: 'warning.lighter'
    }
  ];

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        Allocation Summary
      </Typography>
      <Grid container spacing={3}>
        {summaryItems.map((item, index) => (
          <Grid item xs={12} sm={4} key={index}>
            <Paper 
              sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center',
                bgcolor: item.bgcolor,
                border: 1,
                borderColor: item.color
              }}
              elevation={1}
            >
              <Box 
                sx={{ 
                  mr: 2,
                  display: 'flex',
                  p: 1,
                  borderRadius: 1,
                  bgcolor: item.color,
                  color: 'white'
                }}
              >
                {item.icon}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {item.title}
                </Typography>
                <Typography variant="h6" sx={{ color: item.color, fontWeight: 'medium' }}>
                  {item.value}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AllocationSummary;