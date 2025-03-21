import React from 'react';
import {
    Box,
    Card,
    CardActionArea,
    CardActions,
    Button,
    Typography,
    Chip,
    Grid
} from '@mui/material';
import {
    LocationOn,
    Power,
    Speed,
    ElectricBolt,
    Engineering,
    Edit as EditIcon,
    Visibility as ViewIcon
} from '@mui/icons-material';

const ProductionSiteCard = ({ site, onView, onEdit }) => {
    // Simple data validation for raw data
    const safeData = {
        productionSiteId: site?.productionSiteId || '',
        name: site?.name || 'Unnamed Site',
        type: site?.type || 'Unknown',
        status: site?.status || 'Unknown',
        location: site?.location || 'Location not specified',
        capacity_MW: site?.capacity_MW || 0,
        htscNo: site?.htscNo || 'N/A',
        injectionVoltage_KV: site?.injectionVoltage_KV || 0,
        annualProduction_L: site?.annualProduction_L || 0,
        banking: site?.banking || 0
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'success';
            case 'inactive':
                return 'error';
            default:
                return 'default';
        }
    };

    return (
        <Card
            sx={{
                height: '100%',
                borderRadius: 2,
                transition: 'transform 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                }
            }}
        >
            <CardActionArea onClick={onView} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                        {safeData.name}
                    </Typography>
                    <Chip
                        label={safeData.status}
                        color={getStatusColor(safeData.status)}
                        size="small"
                    />
                </Box>

                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Power sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                            <Typography variant="body2" color="text.secondary">Type</Typography>
                        </Box>
                        <Typography variant="body1">{safeData.type}</Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Speed sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                            <Typography variant="body2" color="text.secondary">Capacity</Typography>
                        </Box>
                        <Typography variant="body1">{safeData.capacity_MW} MW</Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <LocationOn sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                            <Typography variant="body2" color="text.secondary">Location</Typography>
                        </Box>
                        <Typography variant="body1" noWrap>{safeData.location}</Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <ElectricBolt sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                            <Typography variant="body2" color="text.secondary">Injection</Typography>
                        </Box>
                        <Typography variant="body1">{safeData.injectionVoltage_KV} KV</Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Engineering sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                            <Typography variant="body2" color="text.secondary">HTSC No.</Typography>
                        </Box>
                        <Typography variant="body1">{safeData.htscNo}</Typography>
                    </Grid>
                </Grid>
            </CardActionArea>
            <CardActions sx={{ justifyContent: 'flex-end', p: 1.5 }}>
                <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={onView}
                >
                    View
                </Button>
                <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={onEdit}
                >
                    Edit
                </Button>
            </CardActions>
        </Card>
    );
};

export default ProductionSiteCard;