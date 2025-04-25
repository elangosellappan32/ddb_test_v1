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
    Button
} from '@mui/material';
import { getAllocationPeriods, getAllocationTypeColor } from '../../utils/allocationUtils';

// Accepts three arrays: allocations, bankingAllocations, lapseAllocations
const AllocationDetailsTable = ({ allocations = [], bankingAllocations = [], lapseAllocations = [], loading = false, onSave, error = null }) => {
    const calculateTotal = (allocated) => {
        if (!allocated) return 0;
        return Object.values(allocated).reduce((sum, val) => sum + Number(val || 0), 0);
    };

    // Render a generic table for any allocation type
    const renderSection = (title, data, type, bgColor) => {
        if (!data?.length) return null;
        return (
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, color: bgColor, fontWeight: 'bold' }}>{title}</Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ background: bgColor }}>
                            <TableCell>Production Site</TableCell>
                            {type === 'allocation' && <TableCell>Consumption Site</TableCell>}
                            {getAllocationPeriods().map(period => (
                                <TableCell key={period.id} align="right">{period.label}</TableCell>
                            ))}
                            <TableCell align="right">Total</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((allocation, idx) => (
                            <TableRow key={allocation.productionSiteId + '-' + (allocation.consumptionSiteId || type) + '-' + idx} hover>
                                <TableCell>
                                    <Box>
                                        <Typography>{allocation.productionSite}</Typography>
                                        <Typography variant="caption" color="textSecondary">{allocation.siteType}</Typography>
                                    </Box>
                                </TableCell>
                                {type === 'allocation' && (
                                    <TableCell>{allocation.consumptionSite}</TableCell>
                                )}
                                {getAllocationPeriods().map(period => (
                                    <TableCell key={period.id} align="right" sx={{ color: period.isPeak ? 'warning.main' : 'inherit', fontWeight: period.isPeak ? 'bold' : 'normal' }}>
                                        {Number(allocation.allocated?.[period.id] || 0).toFixed(2)}
                                    </TableCell>
                                ))}
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: getAllocationTypeColor(type) }}>
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
    if (!allocations.length && !bankingAllocations.length && !lapseAllocations.length) {
        return (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                No allocation data available
            </Box>
        );
    }

    return (
        <Box>
            {renderSection('Allocations', allocations, 'allocation', '#3F51B5')}
            {renderSection('Banking', bankingAllocations, 'banking', '#4CAF50')}
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