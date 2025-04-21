import React, { useState } from 'react';
import {
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography
} from '@mui/material';
import {
    MoreVert as MoreVertIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    SwapHoriz as SwapIcon,
    AccountBalance as BankIcon,
    Warning as LapseIcon
} from '@mui/icons-material';

const AllocationActions = ({
    allocation,
    onEdit,
    onDelete
}) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleEditClick = () => {
        handleClose();
        onEdit(allocation);
    };

    const handleDeleteClick = () => {
        handleClose();
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        setDeleteDialogOpen(false);
        onDelete(allocation);
    };

    const getTypeIcon = () => {
        switch (allocation.type?.toLowerCase()) {
            case 'banking':
                return <BankIcon fontSize="small" />;
            case 'lapse':
                return <LapseIcon fontSize="small" />;
            default:
                return <SwapIcon fontSize="small" />;
        }
    };

    const getTypeColor = () => {
        switch (allocation.type?.toLowerCase()) {
            case 'banking':
                return '#4CAF50';
            case 'lapse':
                return '#FF9800';
            default:
                return '#2196F3';
        }
    };

    return (
        <>
            <Tooltip title="Actions">
                <IconButton
                    size="small"
                    onClick={handleClick}
                    sx={{ color: getTypeColor() }}
                >
                    <MoreVertIcon />
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >
                <MenuItem onClick={handleEditClick}>
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDeleteClick}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>
                    <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getTypeIcon()}
                        Delete {allocation.type}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this {allocation.type.toLowerCase()}?
                        {allocation.type === 'Banking' && (
                            <Typography color="error" sx={{ mt: 1 }}>
                                Warning: This will permanently remove these units from banking.
                            </Typography>
                        )}
                        {allocation.type === 'Lapse' && (
                            <Typography color="error" sx={{ mt: 1 }}>
                                Warning: This will restore these units to their original state.
                            </Typography>
                        )}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AllocationActions;