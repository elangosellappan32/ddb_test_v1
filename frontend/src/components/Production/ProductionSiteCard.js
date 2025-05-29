import React from 'react';
import PropTypes from 'prop-types';
import { alpha } from '@mui/material/styles';
import {
    Box,
    Card,
    CardActionArea,
    CardActions,
    Typography,
    Grid,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    LocationOn,
    Speed,
    ElectricBolt,
    Engineering,
    Delete as DeleteIcon,
    Edit as EditIcon,
    AccountBalance as BankIcon,
    WindPower as WindIcon,
    WbSunny as SolarIcon,
    FiberManualRecord as StatusDotIcon
} from '@mui/icons-material';

const ProductionSiteCard = ({ site, onView, onEdit, onDelete, permissions }) => {
    // Data validation with proper formatting for real data
    const safeData = {
        productionSiteId: site?.productionSiteId || '',
        companyId: site?.companyId || '',
        // Replace underscores with spaces in names
        name: (site?.name || 'Unnamed Site').replace(/_/g, ' '),
        // Convert type to lowercase for consistent display
        type: (site?.type || 'Unknown').toLowerCase(),
        status: site?.status || 'Active',
        location: site?.location?.trim() || 'Location not specified',
        // Convert capacity to proper format (e.g. 0.60 for 600KW)
        capacity_MW: site?.capacity_MW ? 
            (Number(site?.capacity_MW) / 1000).toFixed(2) : '1.00',
        // Use actual HTSC number
        htscNo: site?.htscNo || '69534460069',
        // Standard injection voltage
        injectionVoltage_KV: Number(site?.injectionVoltage_KV || 22),
        banking: Number(site?.banking || 0),
        version: Number(site?.version || 1)
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'success';
            case 'maintenance': return 'warning';
            case 'inactive': return 'error';
            default: return 'default';
        }
    };

    const getTypeIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'wind':
                return <WindIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />;
            case 'solar':
                return <SolarIcon sx={{ mr: 1, fontSize: 20, color: 'warning.main' }} />;
            default:
                return null;
        }
    };

    const getBankingStatus = (bankingValue) => {
        return Number(bankingValue) === 1 ? {
            color: 'success.main',
            text: 'Available',
            icon: <BankIcon sx={{ fontSize: 20, color: 'success.main' }} />
        } : {
            color: 'error.main',
            text: 'Not Available',
            icon: <BankIcon sx={{ fontSize: 20, color: 'error.main' }} />
        };
    };

    const bankingStatus = getBankingStatus(safeData.banking);

    return (
        <Card
            sx={{
                height: '100%',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                border: 1,
                borderColor: 'transparent',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                    bgcolor: (theme) => alpha(
                        theme.palette[safeData.type.toLowerCase() === 'wind' ? 'primary' : 'warning'].main, 
                        0.08
                    )
                }
            }}
        >
            <CardActionArea onClick={onView} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                        {safeData.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusDotIcon 
                            sx={{ 
                                fontSize: 12, 
                                color: `${getStatusColor(safeData.status)}.main`
                            }} 
                        />
                        <Typography variant="caption" color={`${getStatusColor(safeData.status)}.main`}>
                            {safeData.status}
                        </Typography>
                    </Box>
                </Box>

                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            {getTypeIcon(safeData.type)}
                            <Typography variant="body2" color="text.secondary">Type</Typography>
                        </Box>
                        <Typography variant="body1" color={safeData.type.toLowerCase() === 'wind' ? 'primary.main' : 'warning.main'}>
                            {safeData.type}
                        </Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Speed sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                            <Typography variant="body2" color="text.secondary">Capacity</Typography>
                        </Box>                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {safeData.capacity_MW} MW
                        </Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <LocationOn sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                            <Typography variant="body2" color="text.secondary">Location</Typography>
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>
                            {safeData.location}
                        </Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <ElectricBolt sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                            <Typography variant="body2" color="text.secondary">Injection</Typography>
                        </Box>                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {safeData.injectionVoltage_KV} KV
                        </Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            {bankingStatus.icon}
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>Banking Status</Typography>
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }} color={bankingStatus.color}>
                            {bankingStatus.text}
                        </Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Engineering sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                            <Typography variant="body2" color="text.secondary">HTSC No.</Typography>
                        </Box>                        <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                            {safeData.htscNo}
                        </Typography>
                    </Grid>
                </Grid>

                {/* Version indicator */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                        Version: {safeData.version}
                    </Typography>
                </Box>
            </CardActionArea>

            {(permissions?.update || permissions?.delete) && (
                <CardActions sx={{ justifyContent: 'flex-end', p: 1.5 }}>
                    {permissions?.update && onEdit && (
                        <Tooltip title="Edit Site">
                            <IconButton 
                                size="small" 
                                color="info" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit();
                                }}
                            >
                                <EditIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                    {permissions?.delete && onDelete && (
                        <Tooltip title="Delete Site">
                            <IconButton 
                                size="small" 
                                color="error" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </CardActions>
            )}
        </Card>
    );
};

ProductionSiteCard.propTypes = {
    site: PropTypes.object.isRequired,
    onView: PropTypes.func.isRequired,
    onEdit: PropTypes.func,  // Make optional
    onDelete: PropTypes.func, // Make optional
    permissions: PropTypes.object.isRequired
};

export default ProductionSiteCard;