import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Grid,
    FormControl,
    InputLabel,
    Select,
    FormHelperText,
    Box,
    Typography,
    Alert
} from '@mui/material';
import {
    SwapHoriz as SwapIcon,
    AccountBalance as BankIcon,
    Warning as LapseIcon
} from '@mui/icons-material';
import { validatePeriodRules, getAllocationPeriods, PERIODS } from '../../utils/allocationUtils';

const AllocationModal = ({
    open,
    onClose,
    onSubmit,
    initialData,
    productionSites,
    consumptionSites,
    mode = 'create'
}) => {
    const [formData, setFormData] = useState({
        type: 'Allocation',
        productionSiteId: '',
        productionSite: '',
        consumptionSiteId: '',
        consumptionSite: '',
        month: '',
        allocated: {
            c1: 0,
            c2: 0,
            c3: 0,
            c4: 0,
            c5: 0
        },
        bankingEnabled: false,
        version: 0
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData
            }));
        }
    }, [initialData]);

    const handleChange = (field) => (event) => {
        const value = event.target.value;
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when field is updated
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleAllocationChange = (period) => (event) => {
        const value = parseFloat(event.target.value) || 0;
        const isPeak = PERIODS.PEAK.includes(period);
        const newAllocated = { ...formData.allocated };

        // Clear validation error when field is updated
        if (errors.allocated) {
            setErrors(prev => ({ ...prev, allocated: null }));
        }

        if (value < 0) {
            return; // Don't allow negative values
        }

        // Update the current period
        newAllocated[period] = value;

        // Check if trying to mix peak and non-peak allocations
        if (value > 0) {
            if (isPeak) {
                // If adding peak allocation, check for existing non-peak allocations
                const hasNonPeakAllocations = PERIODS.NON_PEAK.some(p => newAllocated[p] > 0);
                if (hasNonPeakAllocations) {
                    setErrors(prev => ({
                        ...prev,
                        allocated: 'Cannot mix peak and non-peak allocations. Clear non-peak allocations first.'
                    }));
                    return;
                }
            } else {
                // If adding non-peak allocation, check for existing peak allocations
                const hasPeakAllocations = PERIODS.PEAK.some(p => newAllocated[p] > 0);
                if (hasPeakAllocations) {
                    setErrors(prev => ({
                        ...prev,
                        allocated: 'Cannot mix peak and non-peak allocations. Clear peak allocations first.'
                    }));
                    return;
                }

                // Check for other non-peak allocations
                const otherNonPeakAllocations = PERIODS.NON_PEAK
                    .filter(p => p !== period)
                    .filter(p => newAllocated[p] > 0);

                if (otherNonPeakAllocations.length > 0) {
                    setErrors(prev => ({
                        ...prev,
                        allocated: 'Can only allocate to one non-peak period at a time.'
                    }));
                    return;
                }
            }
        }

        setFormData(prev => ({
            ...prev,
            allocated: newAllocated
        }));
    };

    const handleProductionSiteChange = (event) => {
        const siteId = event.target.value;
        const site = productionSites.find(s => s.productionSiteId === siteId);
        setFormData(prev => ({
            ...prev,
            productionSiteId: siteId,
            productionSite: site?.name || '',
            bankingEnabled: site?.bankingEnabled || false
        }));
    };

    const handleConsumptionSiteChange = (event) => {
        const siteId = event.target.value;
        const site = consumptionSites.find(s => s.consumptionSiteId === siteId);
        setFormData(prev => ({
            ...prev,
            consumptionSiteId: siteId,
            consumptionSite: site?.name || ''
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.productionSiteId) {
            newErrors.productionSiteId = 'Production site is required';
        }

        if (formData.type === 'Allocation' && !formData.consumptionSiteId) {
            newErrors.consumptionSiteId = 'Consumption site is required';
        }

        if (!formData.month) {
            newErrors.month = 'Month is required';
        }

        if (formData.type === 'Banking' && !formData.bankingEnabled) {
            newErrors.type = 'Banking is not enabled for this production site';
        }

        // Validate period rules
        const periodValidation = validatePeriodRules(formData);
        if (!periodValidation.isValid) {
            newErrors.allocated = periodValidation.errors.join('. ');
        }

        // Check for any allocation
        const totalAllocated = Object.values(formData.allocated)
            .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

        if (totalAllocated <= 0) {
            newErrors.allocated = 'At least one period must have an allocation';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            onSubmit(formData);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {formData.type === 'Banking' ? <BankIcon /> :
                     formData.type === 'Lapse' ? <LapseIcon /> :
                     <SwapIcon />}
                    {mode === 'create' ? 'Create' : 'Edit'} {formData.type}
                </Box>
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <FormControl fullWidth error={!!errors.type}>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={formData.type}
                                onChange={handleChange('type')}
                                disabled={mode === 'edit'}
                            >
                                <MenuItem value="Allocation">Regular Allocation</MenuItem>
                                <MenuItem value="Banking">Banking</MenuItem>
                                <MenuItem value="Lapse">Lapse</MenuItem>
                            </Select>
                            {errors.type && (
                                <FormHelperText>{errors.type}</FormHelperText>
                            )}
                        </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                        <FormControl fullWidth error={!!errors.productionSiteId}>
                            <InputLabel>Production Site</InputLabel>
                            <Select
                                value={formData.productionSiteId}
                                onChange={handleProductionSiteChange}
                            >
                                {productionSites.map(site => (
                                    <MenuItem 
                                        key={site.productionSiteId} 
                                        value={site.productionSiteId}
                                    >
                                        {site.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.productionSiteId && (
                                <FormHelperText>{errors.productionSiteId}</FormHelperText>
                            )}
                        </FormControl>
                    </Grid>

                    {formData.type === 'Allocation' && (
                        <Grid item xs={12}>
                            <FormControl fullWidth error={!!errors.consumptionSiteId}>
                                <InputLabel>Consumption Site</InputLabel>
                                <Select
                                    value={formData.consumptionSiteId}
                                    onChange={handleConsumptionSiteChange}
                                >
                                    {consumptionSites.map(site => (
                                        <MenuItem 
                                            key={site.consumptionSiteId} 
                                            value={site.consumptionSiteId}
                                        >
                                            {site.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.consumptionSiteId && (
                                    <FormHelperText>{errors.consumptionSiteId}</FormHelperText>
                                )}
                            </FormControl>
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Month"
                            type="month"
                            value={formData.month}
                            onChange={handleChange('month')}
                            error={!!errors.month}
                            helperText={errors.month}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>
                            Allocation Amounts
                        </Typography>
                        <Grid container spacing={2}>
                            {getAllocationPeriods().map(period => (
                                <Grid item xs={12} sm={4} key={period.id}>
                                    <TextField
                                        fullWidth
                                        label={`${period.label} (${period.isPeak ? 'Peak' : 'Non-Peak'})`}
                                        type="number"
                                        value={formData.allocated[period.id]}
                                        onChange={handleAllocationChange(period.id)}
                                        InputProps={{ 
                                            inputProps: { min: 0 },
                                            sx: period.isPeak ? {
                                                '& input': {
                                                    color: 'warning.main',
                                                    fontWeight: 'bold'
                                                }
                                            } : {}
                                        }}
                                        helperText={period.isPeak ? 
                                            'Peak period units can be used anywhere' : 
                                            'Non-peak period units have restrictions'
                                        }
                                    />
                                </Grid>
                            ))}
                        </Grid>
                        {errors.allocated && (
                            <FormHelperText error sx={{ mt: 1 }}>{errors.allocated}</FormHelperText>
                        )}
                    </Grid>

                    {formData.type === 'Banking' && !formData.bankingEnabled && (
                        <Grid item xs={12}>
                            <Alert severity="warning">
                                Banking is not enabled for the selected production site
                            </Alert>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button 
                    onClick={handleSubmit}
                    variant="contained" 
                    color="primary"
                    disabled={Object.keys(errors).length > 0}
                >
                    {mode === 'create' ? 'Create' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AllocationModal;