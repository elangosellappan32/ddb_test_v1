import React from 'react';
import {
    Typography,
    Tooltip,
    Box,
    Chip
} from '@mui/material';
import {
    AccountBalance as BankingIcon,
    Warning as WarningIcon,
    SwapHoriz as AllocationIcon
} from '@mui/icons-material';
import { getAllocationPeriods, getAllocationTypeColor, PERIODS } from '../../utils/allocationUtils';

const renderTypeCell = (params) => {
    const Icon = params.row.type === 'Banking' ? BankingIcon :
                 params.row.type === 'Lapse' ? WarningIcon :
                 AllocationIcon;
    
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon sx={{ color: getAllocationTypeColor(params.row.type) }} />
            <Typography>{params.row.type}</Typography>
        </Box>
    );
};

const renderSiteCell = (params) => {
    return (
        <Box>
            <Typography>{params.value}</Typography>
            {params.row.siteType && (
                <Typography variant="caption" color="textSecondary">
                    {params.row.siteType}
                </Typography>
            )}
        </Box>
    );
};

const checkPeriodViolations = (allocation) => {
    // Check for multiple non-peak allocations
    const nonPeakAllocations = PERIODS.NON_PEAK.filter(period => 
        allocation.allocated?.[period] > 0
    );
    if (nonPeakAllocations.length > 1) {
        return {
            hasViolation: true,
            message: 'Multiple non-peak periods allocated'
        };
    }

    // Check for non-peak to peak allocations
    const hasNonPeakToPeak = nonPeakAllocations.length > 0 && 
        PERIODS.PEAK.some(period => allocation.allocated?.[period] > 0);
    if (hasNonPeakToPeak) {
        return {
            hasViolation: true,
            message: 'Non-peak units allocated to peak periods'
        };
    }

    return { hasViolation: false };
};

const getAllocationColumns = () => {
    const baseColumns = [
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: renderTypeCell
        },
        {
            field: 'productionSite',
            headerName: 'Production Site',
            width: 200,
            renderCell: renderSiteCell
        }
    ];

    if (window.location.pathname !== '/banking') {
        baseColumns.push({
            field: 'consumptionSite',
            headerName: 'Consumption Site',
            width: 200,
            renderCell: renderSiteCell
        });
    }

    const periodColumns = getAllocationPeriods().map(period => ({
        field: `allocated.${period.id}`,
        headerName: period.label,
        width: 130,
        renderCell: (params) => {
            const value = params.row.allocated?.[period.id] || 0;
            const { hasViolation, message } = checkPeriodViolations(params.row);
            
            return (
                <Tooltip title={
                    hasViolation ? message :
                    `${period.isPeak ? 'Peak' : 'Non-Peak'} Period${period.isPeak ? ' (Flexible allocation)' : ''}`
                }>
                    <Box>
                        <Typography
                            sx={{
                                color: hasViolation ? 'error.main' :
                                       period.isPeak ? 'warning.main' : 'inherit',
                                fontWeight: period.isPeak ? 'bold' : 'normal'
                            }}
                        >
                            {value.toLocaleString()}
                        </Typography>
                        {period.isPeak && (
                            <Typography variant="caption" color="text.secondary" display="block">
                                Peak
                            </Typography>
                        )}
                        {hasViolation && (
                            <Chip
                                size="small"
                                color="error"
                                label="Invalid"
                                sx={{ mt: 0.5 }}
                            />
                        )}
                    </Box>
                </Tooltip>
            );
        },
        valueGetter: (params) => params.row.allocated?.[period.id] || 0
    }));

    const finalColumns = [
        ...baseColumns,
        ...periodColumns,
        {
            field: 'total',
            headerName: 'Total',
            width: 130,
            renderCell: (params) => {
                const total = getAllocationPeriods()
                    .reduce((sum, period) => sum + (params.row.allocated?.[period.id] || 0), 0);
                
                return (
                    <Typography sx={{ fontWeight: 'bold' }}>
                        {total.toLocaleString()}
                    </Typography>
                );
            },
            valueGetter: (params) => 
                getAllocationPeriods()
                    .reduce((sum, period) => sum + (params.row.allocated?.[period.id] || 0), 0)
        }
    ];

    return finalColumns;
};

export default getAllocationColumns;