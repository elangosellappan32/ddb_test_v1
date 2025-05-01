import React, { useState, useEffect } from 'react';
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
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Tooltip,
    Alert,
    Grid
} from '@mui/material';
import { Edit as EditIcon, SaveOutlined } from '@mui/icons-material';
import { getAllocationPeriods, getAllocationTypeColor, ALL_PERIODS } from '../../utils/allocationUtils';

const AllocationDetailsTable = ({ allocations = [], bankingAllocations = [], oldBankingAllocations = [], lapseAllocations = [], oldLapseAllocations = [], loading = false, onEdit, onSave, error = null }) => {
    const [editDialog, setEditDialog] = useState(false);
    const [editingAllocation, setEditingAllocation] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [validationError, setValidationError] = useState(null);

    // Reset edit values when allocations change
    useEffect(() => {
        if (editingAllocation) {
            const updatedAllocation = [...allocations, ...bankingAllocations, ...lapseAllocations]
                .find(a => a.productionSiteId === editingAllocation.productionSiteId 
                    && (!a.consumptionSiteId || a.consumptionSiteId === editingAllocation.consumptionSiteId));
            
            if (updatedAllocation) {
                setEditValues(updatedAllocation.allocated || {});
            }
        }
    }, [allocations, bankingAllocations, lapseAllocations, editingAllocation]);

    const handleEdit = (row, type) => {
        setEditingAllocation({ ...row, type });
        setEditValues(row.allocated || {
            c1: row.c1 || 0,
            c2: row.c2 || 0,
            c3: row.c3 || 0,
            c4: row.c4 || 0,
            c5: row.c5 || 0
        });
        setEditDialog(true);
    };

    const handleEditClose = () => {
        setEditDialog(false);
        setEditingAllocation(null);
        setEditValues({});
        setValidationError(null);
    };

    const handleEditSave = () => {
        // Allow all values to be zero (remove validation)
        // Round all values to integers
        const roundedEditValues = {};
        ALL_PERIODS.forEach(period => {
            roundedEditValues[period] = Math.round(Number(editValues[period] || 0));
        });

        // Get the original values before edit
        const originalValues = editingAllocation.allocated || {};
        const isBankingEnabled = editingAllocation.bankingEnabled;

        // Calculate differences for each period (new - old)
        const differences = {};
        ALL_PERIODS.forEach(period => {
            const oldValue = Math.round(Number(originalValues[period] || 0));
            const newValue = roundedEditValues[period];
            differences[period] = newValue - oldValue;
        });

        // Prepare banking/lapse adjustments (net change only, single row)
        let bankingAdjustments = undefined;
        let lapseAdjustments = undefined;
        if (isBankingEnabled) {
            bankingAdjustments = {};
            ALL_PERIODS.forEach(period => {
                if (differences[period] !== 0) {
                    bankingAdjustments[period] = -differences[period]; // If allocation decreases, banking increases
                }
            });
            // Remove zero entries
            Object.keys(bankingAdjustments).forEach(period => {
                if (bankingAdjustments[period] === 0) delete bankingAdjustments[period];
            });
            if (Object.keys(bankingAdjustments).length === 0) bankingAdjustments = undefined;
        } else {
            lapseAdjustments = {};
            ALL_PERIODS.forEach(period => {
                if (differences[period] < 0) {
                    lapseAdjustments[period] = -differences[period]; // Only when allocation decreases
                }
            });
            // Remove zero entries
            Object.keys(lapseAdjustments).forEach(period => {
                if (lapseAdjustments[period] === 0) delete lapseAdjustments[period];
            });
            if (Object.keys(lapseAdjustments).length === 0) lapseAdjustments = undefined;
        }

        if (onEdit) {
            const updatedAllocation = {
                ...editingAllocation,
                allocated: roundedEditValues,
                version: (editingAllocation.version || 0) + 1,
                updatedAt: new Date().toISOString(),
                bankingAdjustments,
                lapseAdjustments
            };
            onEdit(updatedAllocation, editingAllocation.type);
        }
        handleEditClose();
    };

    const calculateTotal = (row) => {
        if (row.allocated && Object.keys(row.allocated).length) {
            return Object.values(row.allocated).reduce((sum, val) => sum + Math.round(Number(val || 0)), 0);
        }
        return ['c1','c2','c3','c4','c5']
            .reduce((sum, key) => sum + Math.round(Number(row[key] || 0)), 0);
    };

    // Helper to group and sum allocations by productionSiteId and consumptionSiteId
    const getIntegratedAllocations = (data) => {
        const grouped = {};
        data.forEach(a => {
            const key = `${a.productionSiteId}_${a.consumptionSiteId}`;
            if (!grouped[key]) {
                grouped[key] = {
                    ...a,
                    allocated: { ...a.allocated }
                };
            } else {
                // Sum each period
                Object.keys(a.allocated || {}).forEach(period => {
                    grouped[key].allocated[period] = (grouped[key].allocated[period] || 0) + (a.allocated[period] || 0);
                });
            }
        });
        return Object.values(grouped);
    };

    // Helper to merge new and old data for fallback display (always show all original data, overwrite with adjusted if present)
    const mergeWithFallback = (primary, fallback, keyField = 'productionSiteId') => {
        const map = new Map();
        (fallback || []).forEach(item => map.set(item[keyField], { ...item })); // Start with original
        (primary || []).forEach(item => map.set(item[keyField], { ...item }));  // Overwrite with adjusted if present
        return Array.from(map.values());
    };

    const renderSection = (title, data, type, bgColor) => {
        let uniqueData = (type === 'allocation') ? getIntegratedAllocations(data) : data;
        // For banking/lapse, always merge new and old data for fallback display
        if (type === 'banking') {
            uniqueData = mergeWithFallback(uniqueData, oldBankingAllocations);
        }
        if (type === 'lapse') {
            uniqueData = mergeWithFallback(uniqueData, oldLapseAllocations);
        }
        return (
            <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1, color: bgColor, fontWeight: 'bold' }}>{title}</Typography>
                    <Table size="small" sx={{ mt: 1 }}>
                        <TableHead>
                            <TableRow sx={{ background: bgColor }}>
                                <TableCell>Production Site</TableCell>
                                {type === 'allocation' && <TableCell>Consumption Site</TableCell>}
                                {getAllocationPeriods().map(period => (
                                    <TableCell key={period.id} align="right">{period.label}</TableCell>
                                ))}
                                <TableCell align="right">Total</TableCell>
                                {type === 'allocation' && <TableCell align="right">Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {uniqueData.length > 0 ? uniqueData.map((allocation, idx) => (
                                <TableRow 
                                    key={`${allocation.productionSiteId}-${allocation.consumptionSiteId || type}-${idx}`} 
                                    hover 
                                    sx={{ 
                                        '&:nth-of-type(even)': { backgroundColor: 'action.hover' },
                                        '&:hover .edit-button': { opacity: 1 }
                                    }}
                                >
                                    <TableCell>
                                        <Box>
                                            <Typography>{allocation.productionSite || allocation.siteName}</Typography>
                                            <Typography variant="caption" color="textSecondary">{allocation.siteType}</Typography>
                                        </Box>
                                    </TableCell>
                                    {type === 'allocation' && (
                                        <TableCell>{allocation.consumptionSite}</TableCell>
                                    )}
                                    {getAllocationPeriods().map(period => {
                                        const val = allocation.allocated?.[period.id] ?? allocation[period.id] ?? 0;
                                        return (
                                            <TableCell key={period.id} align="right" 
                                                sx={{ 
                                                    color: period.isPeak ? 'warning.main' : 'inherit',
                                                    fontWeight: period.isPeak ? 'bold' : 'normal' 
                                                }}
                                            >
                                                {Math.round(Number(val))}
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: getAllocationTypeColor(type) }}>
                                        {calculateTotal(allocation)}
                                    </TableCell>
                                    {type === 'allocation' && (
                                        <TableCell align="right">
                                            <Tooltip title="Edit Allocation">
                                                <IconButton 
                                                    className="edit-button"
                                                    size="small" 
                                                    onClick={() => handleEdit(allocation, type)}
                                                    sx={{ 
                                                        color: bgColor,
                                                        opacity: 0.3,
                                                        transition: 'opacity 0.2s',
                                                        '&:hover': {
                                                            opacity: 1,
                                                            backgroundColor: `${bgColor}15`
                                                        }
                                                    }}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={type === 'allocation' ? getAllocationPeriods().length + 3 : getAllocationPeriods().length + 2} align="center">
                                        <Typography color="textSecondary">No {title.toLowerCase()} data available</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Box>
            </Paper>
        );
    };

    return (
        <Box>
            {renderSection('Allocations', allocations, 'allocation', '#3F51B5')}
            {renderSection('Banking', bankingAllocations, 'banking', '#4CAF50')}
            {renderSection('Lapse', lapseAllocations, 'lapse', '#FF9800')}
            
            {onSave && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={onSave} 
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <SaveOutlined />}
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </Box>
            )}

            <Dialog 
                open={editDialog} 
                onClose={handleEditClose} 
                maxWidth="sm" 
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 2 }
                }}
            >
                <DialogTitle sx={{ 
                    backgroundColor: getAllocationTypeColor(editingAllocation?.type),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}>
                    <EditIcon /> 
                    Edit {editingAllocation?.type || 'Allocation'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        {validationError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {validationError}
                            </Alert>
                        )}
                        <Grid container spacing={2}>
                            {getAllocationPeriods().map(period => (
                                <Grid item xs={12} sm={6} key={period.id}>
                                    <TextField
                                        fullWidth
                                        label={`Period ${period.label}`}
                                        type="number"
                                        value={editValues[period.id] || 0}
                                        onChange={(e) => {
                                            setValidationError(null);
                                            setEditValues(prev => ({
                                                ...prev,
                                                [period.id]: Number(e.target.value) || 0
                                            }));
                                        }}
                                        InputProps={{
                                            sx: { 
                                                '& input': { textAlign: 'right' },
                                                ...(period.isPeak && {
                                                    '& input': {
                                                        fontWeight: 'bold',
                                                        color: 'warning.main'
                                                    }
                                                })
                                            }
                                        }}
                                    />
                                </Grid>
                            ))}
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" align="right" sx={{ mt: 2 }}>
                                    Total: <strong>{Object.values(editValues).reduce((sum, val) => sum + Math.round(Number(val || 0)), 0)}</strong>
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={handleEditClose} variant="outlined">
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleEditSave} 
                        variant="contained" 
                        color="primary"
                        startIcon={<SaveOutlined />}
                        disabled={!!validationError}
                    >
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AllocationDetailsTable;