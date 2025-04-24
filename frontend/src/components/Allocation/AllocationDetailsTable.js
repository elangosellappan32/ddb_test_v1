import React, { useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Box,
    Typography,
    CircularProgress,
    Button
} from '@mui/material';
import { getAllocationPeriods, getAllocationTypeColor } from '../../utils/allocationUtils';

const AllocationDetailsTable = ({ allocations = [], balances = {}, loading = false, onEdit, onSave, error = null }) => {
    const calculateTotal = (allocated) => {
        if (!allocated) return 0;
        return Object.values(allocated).reduce((sum, val) => sum + Number(val || 0), 0);
    };

    const calculateUnusedUnits = (allocation, balances) => {
        const total = calculateTotal(allocation.allocated);
        // Check if we have period-specific balance
        const used = balances[allocation.productionSiteId]?.periodUsed || 
                    balances[allocation.productionSiteId]?.used || 0;
        return Math.max(0, total - used);
    };

    const distributeUnusedUnits = (allocation, unusedUnits, periodKey = null) => {
        const total = calculateTotal(allocation.allocated);
        if (total === 0) return allocation.allocated;
        
        // If period specific, only distribute to that period
        if (periodKey) {
            return {
                ...allocation.allocated,
                [periodKey]: (allocation.allocated[periodKey] || 0) * (unusedUnits / total)
            };
        }
        
        // Otherwise distribute across all periods
        const ratio = unusedUnits / total;
        return Object.keys(allocation.allocated).reduce((obj, key) => ({
            ...obj,
            [key]: (allocation.allocated[key] || 0) * ratio
        }), {});
    };

    const sections = useMemo(() => {
        return allocations.reduce((acc, curr) => {
            if (!curr) return acc;
            if (curr.type?.toLowerCase() === 'banking') {
                const unusedUnits = calculateUnusedUnits(curr, balances);
                const total = calculateTotal(curr.allocated);
                
                const bankingSection = curr.isDirect ? 'directBanking' : 'indirectBanking';
                if (!acc[bankingSection]) {
                    acc[bankingSection] = { used: [], unused: [] };
                }

                if (unusedUnits > 0) {
                    // Create period-specific unused allocation
                    const unusedAllocation = {
                        ...curr,
                        unusedUnits,
                        periodUnused: true,
                        allocated: distributeUnusedUnits(curr, unusedUnits, curr.selectedPeriod)
                    };
                    acc[bankingSection].unused.push(unusedAllocation);

                    if (unusedUnits < total) {
                        const usedAllocation = {
                            ...curr,
                            allocated: distributeUnusedUnits(curr, total - unusedUnits, curr.selectedPeriod)
                        };
                        acc[bankingSection].used.push(usedAllocation);
                    }
                } else {
                    acc[bankingSection].used.push({
                        ...curr,
                        allocated: distributeUnusedUnits(curr, total, curr.selectedPeriod)
                    });
                }
            } else if (curr.type?.toLowerCase() === 'lapse') {
                if (!acc.lapse) acc.lapse = [];
                acc.lapse.push(curr);
            } else {
                if (!acc.allocation) acc.allocation = [];
                acc.allocation.push(curr);
            }
            return acc;
        }, {});
    }, [allocations, balances]);

    const renderBankingSection = (title, data, type, bgColor) => {
        if (!data) return null;
        
        const renderSubSection = (items, subtitle) => {
            if (!items?.length) return null;
            const totalUnits = items.reduce((sum, alloc) => {
                const total = calculateTotal(alloc.allocated);
                return sum + (alloc.periodUnused ? alloc.unusedUnits : total);
            }, 0);

            return (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ 
                        display: 'block',
                        color: subtitle.includes('Unused') ? 'warning.main' : 'inherit',
                        ml: 2,
                        fontWeight: subtitle.includes('Unused') ? 'bold' : 'normal'
                    }}>
                        {subtitle} - Total: {totalUnits.toFixed(2)}
                        {subtitle.includes('Unused') && ' (Available for Banking)'}
                    </Typography>
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
                                    </TableCell>
                                ))}
                                <TableCell align="right">Total</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((allocation) => (
                                <TableRow 
                                    key={`${allocation.productionSiteId}-${allocation.consumptionSiteId || 'direct'}`} 
                                    hover
                                    onClick={() => onEdit?.(allocation)}
                                >
                                    <TableCell>
                                        <Box>
                                            <Typography>{allocation.productionSite}</Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {allocation.siteType}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{allocation.consumptionSite}</TableCell>
                                    {getAllocationPeriods().map(period => (
                                        <TableCell 
                                            key={period.id} 
                                            align="right"
                                            sx={{
                                                color: period.isPeak ? 'warning.main' : 'inherit',
                                                fontWeight: period.isPeak ? 'bold' : 'normal'
                                            }}
                                        >
                                            {Number(allocation.allocated?.[period.id] || 0).toFixed(2)}
                                        </TableCell>
                                    ))}
                                    <TableCell 
                                        align="right" 
                                        sx={{ 
                                            fontWeight: 'bold',
                                            color: getAllocationTypeColor(type)
                                        }}
                                    >
                                        {calculateTotal(allocation.allocated).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            );
        };

        return (
            <Box sx={{ mb: 4 }}>
                <Box sx={{
                    p: 2,
                    bgcolor: bgColor,
                    color: 'white',
                }}>
                    <Typography variant="subtitle1">{title}</Typography>
                </Box>
                {renderSubSection(data.used, 'Used Units')}
                {renderSubSection(data.unused, 'Unused Units')}
            </Box>
        );
    };

    const renderSection = (title, data, type, bgColor) => {
        if (!data?.length) return null;
        
        const totalUnits = data.reduce((sum, alloc) => sum + calculateTotal(alloc.allocated), 0);

        return (
            <Box sx={{ mb: 4 }}>
                <Box sx={{
                    p: 2,
                    bgcolor: bgColor,
                    color: 'white',
                }}>
                    <Typography variant="subtitle1">{title}</Typography>
                    <Typography variant="caption" sx={{ display: 'block' }}>
                        Total Units: {totalUnits.toFixed(2)}
                    </Typography>
                </Box>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Production Site</TableCell>
                            {type !== 'lapse' && <TableCell>Consumption Site</TableCell>}
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
                                </TableCell>
                            ))}
                            <TableCell align="right">Total</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((allocation) => (
                            <TableRow 
                                key={`${allocation.productionSiteId}-${allocation.consumptionSiteId || 'direct'}`} 
                                hover
                                onClick={() => onEdit?.(allocation)}
                            >
                                <TableCell>
                                    <Box>
                                        <Typography>{allocation.productionSite}</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {allocation.siteType}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                {type !== 'lapse' && (
                                    <TableCell>{allocation.consumptionSite}</TableCell>
                                )}
                                {getAllocationPeriods().map(period => (
                                    <TableCell 
                                        key={period.id} 
                                        align="right"
                                        sx={{
                                            color: period.isPeak ? 'warning.main' : 'inherit',
                                            fontWeight: period.isPeak ? 'bold' : 'normal'
                                        }}
                                    >
                                        {Number(allocation.allocated?.[period.id] || 0).toFixed(2)}
                                    </TableCell>
                                ))}
                                <TableCell 
                                    align="right" 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        color: getAllocationTypeColor(type)
                                    }}
                                >
                                    {calculateTotal(allocation.allocated).toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>
        );
    };

    if (error) {
        return (
            <Box sx={{ p: 2, textAlign: 'center', color: 'error.main' }}>
                Error loading allocation data: {error.message}
            </Box>
        );
    }

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
        <Box>
            {renderBankingSection('Direct Banking Units', sections.directBanking, 'banking', '#4CAF50')}
            {renderBankingSection('Indirect Banking Units', sections.indirectBanking, 'banking', '#2196F3')}
            {renderSection('Allocations', sections.allocation, 'allocation', '#3F51B5')}
            {renderSection('Lapse Units', sections.lapse, 'lapse', '#FF9800')}

            {onSave && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={onSave}
                        disabled={loading}
                    >
                        Save Allocation Changes
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default AllocationDetailsTable;