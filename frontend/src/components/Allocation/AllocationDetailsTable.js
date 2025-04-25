import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Box,
    Typography,
    CircularProgress,
    Button,
    Paper
} from '@mui/material';
import { getAllocationPeriods, getAllocationTypeColor } from '../../utils/allocationUtils';

// Accepts three arrays: allocations, bankingAllocations, lapseAllocations
const AllocationDetailsTable = ({ allocations = [], bankingAllocations = [], oldBankingAllocations = [], lapseAllocations = [], loading = false, onSave, error = null }) => {
    // Combine direct (oldBankingAllocations) and indirect (bankingAllocations) into one array
    const combinedBanking = [
        ...oldBankingAllocations.map(item => ({ ...item, bankingType: 'Direct Banking' })),
        ...bankingAllocations.map(item => ({ ...item, bankingType: 'Indirect Banking' })),
    ];

    const calculateTotal = (row) => {
        // Sum nested allocated or flat c1-c5 fields
        if (row.allocated && Object.keys(row.allocated).length) {
            return Object.values(row.allocated).reduce((sum, val) => sum + Number(val || 0), 0);
        }
        return ['c1','c2','c3','c4','c5']
            .reduce((sum, key) => sum + Number(row[key] || 0), 0);
    };

    // Render a generic table for any allocation type
    const renderSection = (title, data, type, bgColor) => {
        if (!data?.length) return null;
        // Dedupe banking entries by pk-sk
        let rows = data;
        if (type === 'banking') {
            const map = new Map();
            data.forEach(item => {
                const key = `${item.pk}-${item.sk}`;
                if (!map.has(key)) map.set(key, item);
            });
            rows = Array.from(map.values());
        }
        return (
            <Paper variant="outlined" sx={{ mb: 3 }}>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1, color: bgColor, fontWeight: 'bold' }}>{title}</Typography>
                    <Table size="small" sx={{ mt: 1 }}>
                        <TableHead>
                            <TableRow sx={{ background: bgColor }}>
                                <TableCell>Production Site</TableCell>
                                {type === 'banking' && <TableCell>Type</TableCell>}
                                {type === 'allocation' && <TableCell>Consumption Site</TableCell>}
                                {getAllocationPeriods().map(period => (
                                    <TableCell key={period.id} align="right">{period.label}</TableCell>
                                ))}
                                <TableCell align="right">Total</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((allocation, idx) => (
                                <TableRow key={allocation.productionSiteId + '-' + (allocation.consumptionSiteId || type) + '-' + idx} hover sx={{ '&:nth-of-type(even)': { backgroundColor: 'action.hover' } }}>
                                    <TableCell>
                                        <Box>
                                            <Typography>{allocation.productionSite}</Typography>
                                            <Typography variant="caption" color="textSecondary">{allocation.siteType}</Typography>
                                        </Box>
                                    </TableCell>
                                    {type === 'banking' && (
                                        <TableCell>{allocation.bankingType}</TableCell>
                                    )}
                                    {type === 'allocation' && (
                                        <TableCell>{allocation.consumptionSite}</TableCell>
                                    )}
                                    {getAllocationPeriods().map(period => {
                                        // Support nested allocated or flat c fields
                                        const val = allocation.allocated?.[period.id] ?? allocation[period.id] ?? 0;
                                        return (
                                            <TableCell key={period.id} align="right" sx={{ color: period.isPeak ? 'warning.main' : 'inherit', fontWeight: period.isPeak ? 'bold' : 'normal' }}>
                                                {Number(val).toFixed(2)}
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: getAllocationTypeColor(type) }}>
                                        {calculateTotal(allocation).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            </Paper>
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
    if (!allocations.length && !combinedBanking.length && !lapseAllocations.length) {
        return (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                No allocation data available
            </Box>
        );
    }

    return (
        <Box>
            {renderSection('Allocations', allocations, 'allocation', '#3F51B5')}
            {renderSection('Banking', combinedBanking, 'banking', '#4CAF50')}
            {renderSection('Lapse', lapseAllocations, 'lapse', '#FF9800')}
            {onSave && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" color="primary" onClick={onSave} disabled={loading}>
                        Save Allocation Changes
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default AllocationDetailsTable;