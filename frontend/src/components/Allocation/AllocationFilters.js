import React from 'react';
import {
    Box,
    ToggleButton,
    ToggleButtonGroup,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Tooltip
} from '@mui/material';
import {
    SwapHoriz as SwapIcon,
    AccountBalance as BankIcon,
    Warning as LapseIcon,
    List as ListIcon
} from '@mui/icons-material';
import { ALLOCATION_TYPES } from '../../utils/allocationUtils';

const AllocationFilters = ({
    selectedType,
    onTypeChange,
    selectedMonth,
    onMonthChange,
    selectedSite,
    onSiteChange,
    sites,
    siteType = 'production',
    disabled = false
}) => {
    const getAllocationTypeIcon = (type) => {
        switch (type) {
            case ALLOCATION_TYPES.BANKING.toLowerCase():
                return <BankIcon />;
            case ALLOCATION_TYPES.LAPSE.toLowerCase():
                return <LapseIcon />;
            case ALLOCATION_TYPES.ALLOCATION.toLowerCase():
                return <SwapIcon />;
            default:
                return <ListIcon />;
        }
    };

    const handleTypeChange = (event, newType) => {
        onTypeChange(newType || 'all');
    };

    const renderSiteMenuItem = (site) => {
        const siteId = siteType === 'production' ? 'productionSiteId' : 'consumptionSiteId';
        const siteName = site.name || site[siteType === 'production' ? 'productionSiteName' : 'consumptionSiteName'];
        
        return (
            <MenuItem key={site[siteId]} value={site[siteId]}>
                {siteName}
            </MenuItem>
        );
    };

    return (
        <Box sx={{ mb: 3, p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
            <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={4}>
                    <ToggleButtonGroup
                        value={selectedType}
                        exclusive
                        onChange={handleTypeChange}
                        aria-label="allocation type"
                        fullWidth
                        disabled={disabled}
                    >
                        {[
                            { value: 'all', label: 'All' },
                            { value: ALLOCATION_TYPES.ALLOCATION.toLowerCase(), label: 'Regular' },
                            { value: ALLOCATION_TYPES.BANKING.toLowerCase(), label: 'Banking' },
                            { value: ALLOCATION_TYPES.LAPSE.toLowerCase(), label: 'Lapse' }
                        ].map((type) => (
                            <Tooltip key={type.value} title={type.label}>
                                <ToggleButton 
                                    value={type.value}
                                    aria-label={type.label.toLowerCase()}
                                >
                                    {getAllocationTypeIcon(type.value)}
                                </ToggleButton>
                            </Tooltip>
                        ))}
                    </ToggleButtonGroup>
                </Grid>

                <Grid item xs={12} md={4}>
                    <TextField
                        fullWidth
                        label="Month"
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => onMonthChange(e.target.value)}
                        disabled={disabled}
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>

                <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                        <InputLabel>
                            {siteType === 'production' ? 'Production Site' : 'Consumption Site'}
                        </InputLabel>
                        <Select
                            value={selectedSite}
                            onChange={(e) => onSiteChange(e.target.value)}
                            label={siteType === 'production' ? 'Production Site' : 'Consumption Site'}
                            disabled={disabled}
                        >
                            <MenuItem value="all">All Sites</MenuItem>
                            {sites?.map(renderSiteMenuItem)}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AllocationFilters;