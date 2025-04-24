import React, { useState } from 'react';
import {
    Box,
    Button,
    Tooltip,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    FormControl,
    InputLabel,
    Select,
    Grid
} from '@mui/material';
import {
    Add as AddIcon,
    SwapHoriz as SwapIcon,
    AccountBalance as BankIcon,
    Warning as LapseIcon,
    AutoAwesome as AutoIcon,
    MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { ALLOCATION_TYPES, UNIT_TYPES, ENERGY_SOURCES } from '../../utils/allocationUtils';

const AllocationToolbar = ({
    onCreateAllocation,
    onAutoAllocate,
    productionSites,
    consumptionSites,
    bankingSites,
    selectedMonth
}) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [autoAllocateOpen, setAutoAllocateOpen] = useState(false);
    const [autoAllocateData, setAutoAllocateData] = useState({
        productionSites: [],
        consumptionSites: []
    });
    const [allocationType, setAllocationType] = useState(UNIT_TYPES.NON_PEAK);

    const handleCreateClick = (type) => {
        setAnchorEl(null);
        onCreateAllocation(type);
    };

    const calculateSourceAllocation = (consumption, production, banking) => {
        // Implement allocation logic here
        return [];
    };

    const calculateAllocation = (production, consumption, banking) => {
        // Sort production sites - solar first
        const sortedProduction = [...production].sort((a, b) => {
            if (a.source === ENERGY_SOURCES.SOLAR) return -1;
            if (b.source === ENERGY_SOURCES.SOLAR) return 1;
            return 0;
        });

        // Filter eligible banking sites
        const eligibleBanking = banking.filter(site => 
            site.source !== ENERGY_SOURCES.SOLAR && 
            site.source !== ENERGY_SOURCES.WIND
        );

        return {
            allocations: consumption.map(cons => ({
                consumptionSiteId: cons.id,
                percentage: cons.allocationPercentage,
                sources: calculateSourceAllocation(cons, sortedProduction, eligibleBanking)
            }))
        };
    };

    const handleAutoAllocateSubmit = () => {
        const allocationResult = calculateAllocation(
            autoAllocateData.productionSites.map(id => 
                productionSites.find(s => s.productionSiteId === id)
            ),
            autoAllocateData.consumptionSites.map(id =>
                consumptionSites.find(s => s.consumptionSiteId === id)
            ),
            bankingSites
        );
        
        onAutoAllocate(allocationResult, selectedMonth);
        setAutoAllocateOpen(false);
    };

    return (
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={(e) => setAnchorEl(e.currentTarget)}
            >
                Create Allocation
            </Button>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
            >
                <MenuItem onClick={() => handleCreateClick(ALLOCATION_TYPES.ALLOCATION)}>
                    <ListItemIcon>
                        <SwapIcon />
                    </ListItemIcon>
                    <ListItemText>Regular Allocation</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleCreateClick(ALLOCATION_TYPES.BANKING)}>
                    <ListItemIcon>
                        <BankIcon />
                    </ListItemIcon>
                    <ListItemText>Banking</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleCreateClick(ALLOCATION_TYPES.LAPSE)}>
                    <ListItemIcon>
                        <LapseIcon />
                    </ListItemIcon>
                    <ListItemText>Lapse</ListItemText>
                </MenuItem>
            </Menu>

            <Button
                variant="outlined"
                startIcon={<AutoIcon />}
                onClick={() => setAutoAllocateOpen(true)}
            >
                Auto Allocate
            </Button>

            <Dialog
                open={autoAllocateOpen}
                onClose={() => setAutoAllocateOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AutoIcon />
                        Auto Allocate
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Production Sites</InputLabel>
                                <Select
                                    multiple
                                    value={autoAllocateData.productionSites}
                                    onChange={(e) => setAutoAllocateData(prev => ({
                                        ...prev,
                                        productionSites: e.target.value
                                    }))}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map(value => {
                                                const site = productionSites.find(
                                                    s => s.productionSiteId === value
                                                );
                                                return site?.name || value;
                                            }).join(', ')}
                                        </Box>
                                    )}
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
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Consumption Sites</InputLabel>
                                <Select
                                    multiple
                                    value={autoAllocateData.consumptionSites}
                                    onChange={(e) => setAutoAllocateData(prev => ({
                                        ...prev,
                                        consumptionSites: e.target.value
                                    }))}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map(value => {
                                                const site = consumptionSites.find(
                                                    s => s.consumptionSiteId === value
                                                );
                                                return site?.name || value;
                                            }).join(', ')}
                                        </Box>
                                    )}
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
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Allocation Period Type</InputLabel>
                                <Select
                                    value={allocationType}
                                    onChange={(e) => setAllocationType(e.target.value)}
                                >
                                    <MenuItem value={UNIT_TYPES.PEAK}>Peak Period</MenuItem>
                                    <MenuItem value={UNIT_TYPES.NON_PEAK}>Non-Peak Period</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="body2" color="textSecondary">
                                Auto-allocation will create optimal allocations for the selected sites
                                based on their requirements and availability for {
                                    new Date(selectedMonth).toLocaleDateString('default', {
                                        year: 'numeric',
                                        month: 'long'
                                    })
                                }.
                            </Typography>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAutoAllocateOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAutoAllocateSubmit}
                        variant="contained"
                        color="primary"
                        disabled={
                            !autoAllocateData.productionSites.length ||
                            !autoAllocateData.consumptionSites.length
                        }
                    >
                        Auto Allocate
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AllocationToolbar;