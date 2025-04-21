import React, { useMemo } from 'react';
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
    Chip,
    Tooltip,
    CircularProgress
} from '@mui/material';
import { SwapHoriz as SwapIcon } from '@mui/icons-material';
import { getAllocationPeriods } from '../../utils/allocationUtils';

const AllocationDetailsTable = ({ allocations, loading = false, onEdit }) => {
    const getAllocationColor = (type, isDirect) => {
        switch (type?.toLowerCase()) {
            case 'banking':
                return isDirect ? '#81C784' : '#4CAF50';
            case 'lapse':
                return '#FF9800';
            default:
                return '#2196F3';
        }
    };

    const calculateTotal = (allocated) => {
        if (!allocated) return 0;
        return Object.values(allocated).reduce((sum, val) => sum + Number(val || 0), 0);
    };

    const renderPeriodCell = (period, amount) => (
        <TableCell 
            key={period.id} 
            align="right"
            sx={{
                color: period.isPeak ? 'warning.main' : 'inherit',
                fontWeight: period.isPeak ? 'bold' : 'normal'
            }}
        >
            <Tooltip title={`${period.isPeak ? 'Peak' : 'Non-Peak'} Period`}>
                <Box>
                    {Number(amount || 0).toFixed(2)}
                    {period.isPeak && (
                        <Typography variant="caption" display="block" color="text.secondary">
                            Flexible
                        </Typography>
                    )}
                </Box>
            </Tooltip>
        </TableCell>
    );

    const calculatePeriodTotals = (siteAllocations) => {
        return getAllocationPeriods().reduce((totals, period) => {
            totals[period.id] = siteAllocations.reduce((sum, alloc) => 
                sum + Number(alloc.allocated?.[period.id] || 0), 0
            );
            return totals;
        }, {});
    };

    const groupedAllocations = useMemo(() => {
        return allocations.reduce((acc, curr) => {
            if (!curr) return acc;
            const key = curr.type === 'Banking' ? 'Banking' : curr.consumptionSite;
            if (!acc[key]) acc[key] = [];
            acc[key].push(curr);
            return acc;
        }, {});
    }, [allocations]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!allocations?.length) {
        return (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                No allocation data available
            </Box>
        );
    }

    return (
        <TableContainer component={Paper} sx={{ mt: 4 }}>
            <Box sx={{ 
                p: 2, 
                borderBottom: '1px solid rgba(224, 224, 224, 1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between' 
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SwapIcon color="primary" />
                    <Typography variant="h6">
                        Allocation Details
                    </Typography>
                </Box>
            </Box>

            {Object.entries(groupedAllocations).map(([site, siteAllocations]) => (
                <Box key={site} sx={{ mb: 4 }}>
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

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Production Site</TableCell>
                                {getAllocationPeriods().map(period => (
                                    <TableCell 
                                        key={period.id} 
                                        align="right"
                                        sx={{
                                            color: period.isPeak ? 'warning.main' : 'inherit',
                                            fontWeight: period.isPeak ? 'bold' : 'normal'
                                        }}
                                    >
                                        {period.label}
                                        <Typography variant="caption" display="block">
                                            {period.isPeak ? 'Peak' : 'Non-Peak'}
                                        </Typography>
                                    </TableCell>
                                ))}
                                <TableCell align="right">Total</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {siteAllocations.map((allocation, index) => (
                                <TableRow 
                                    key={`${allocation.productionSiteId}-${allocation.consumptionSiteId}-${index}`} 
                                    hover
                                    onClick={() => onEdit?.(allocation)}
                                    sx={{ cursor: onEdit ? 'pointer' : 'default' }}
                                >
                                    <TableCell>
                                        <Tooltip title={allocation.siteType || 'Unknown Type'}>
                                            <Box>
                                                <Typography>{allocation.productionSite}</Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {allocation.siteType || 'Unknown Type'}
                                                </Typography>
                                            </Box>
                                        </Tooltip>
                                    </TableCell>
                                    {getAllocationPeriods().map(period => 
                                        renderPeriodCell(period, allocation.allocated?.[period.id])
                                    )}
                                    <TableCell 
                                        align="right" 
                                        sx={{ 
                                            fontWeight: 'bold', 
                                            color: getAllocationColor(allocation.type, allocation.isDirect) 
                                        }}
                                    >
                                        {calculateTotal(allocation.allocated).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            
                            {site !== 'Banking' && (
                                <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Total Allocated</TableCell>
                                    {getAllocationPeriods().map(period => {
                                        const totals = calculatePeriodTotals(siteAllocations);
                                        return renderPeriodCell(period, totals[period.id]);
                                    })}
                                    <TableCell 
                                        align="right" 
                                        sx={{ 
                                            fontWeight: 'bold',
                                            color: getAllocationColor(siteAllocations[0]?.type, siteAllocations[0]?.isDirect)
                                        }}
                                    >
                                        {siteAllocations
                                            .reduce((sum, alloc) => sum + calculateTotal(alloc.allocated), 0)
                                            .toFixed(2)}
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