import React from 'react';
import {
    Grid,
    Paper,
    Typography,
    Box,
    Tooltip
} from '@mui/material';
import {
    SwapHoriz as SwapIcon,
    AccountBalance as BankIcon,
    Warning as LapseIcon,
    Timeline as TotalIcon
} from '@mui/icons-material';
import {
    getAllocationTypeColor,
    calculateTotalAllocation
} from '../../utils/allocationUtils';

const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Paper
        elevation={2}
        sx={{
            p: 2,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: `${color}10`
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box 
                sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    bgcolor: `${color}20`,
                    color: color,
                    mr: 2
                }}
            >
                {icon}
            </Box>
            <Typography variant="h6" color={color}>
                {title}
            </Typography>
        </Box>
        <Typography variant="h4" sx={{ mb: 1, color: color }}>
            {value.toLocaleString()}
        </Typography>
        {subtitle && (
            <Typography variant="body2" color="text.secondary">
                {subtitle}
            </Typography>
        )}
    </Paper>
);

const AllocationStats = ({
    allocations,
    selectedMonth
}) => {
    const stats = {
        total: 0,
        regular: 0,
        banking: 0,
        lapse: 0,
        regularCount: 0,
        bankingCount: 0,
        lapseCount: 0
    };

    // Calculate totals for each type
    Object.entries(allocations).forEach(([type, items]) => {
        items.forEach(allocation => {
            const total = calculateTotalAllocation(allocation);
            stats.total += total;

            switch (type) {
                case 'allocations':
                    stats.regular += total;
                    stats.regularCount++;
                    break;
                case 'banking':
                    stats.banking += total;
                    stats.bankingCount++;
                    break;
                case 'lapse':
                    stats.lapse += total;
                    stats.lapseCount++;
                    break;
            }
        });
    });

    const monthDisplay = new Date(selectedMonth).toLocaleDateString('default', {
        year: 'numeric',
        month: 'long'
    });

    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
                Allocation Summary - {monthDisplay}
            </Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Allocated"
                        value={stats.total}
                        icon={<TotalIcon />}
                        color="#1976d2"
                        subtitle="Total units across all types"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Regular Allocations"
                        value={stats.regular}
                        icon={<SwapIcon />}
                        color={getAllocationTypeColor('allocation')}
                        subtitle={`${stats.regularCount} active allocations`}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Banked Units"
                        value={stats.banking}
                        icon={<BankIcon />}
                        color={getAllocationTypeColor('banking')}
                        subtitle={`${stats.bankingCount} banking records`}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Lapsed Units"
                        value={stats.lapse}
                        icon={<LapseIcon />}
                        color={getAllocationTypeColor('lapse')}
                        subtitle={`${stats.lapseCount} lapse records`}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default AllocationStats;