import React, { useEffect, useState } from 'react';
import { Snackbar, Alert, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import websocketService from '../../services/websocketService';

const AllocationNotifications = ({ onAllocationUpdate }) => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const cleanup = websocketService.subscribeToAllocationEvents({
            onCreate: (allocation) => {
                addNotification({
                    severity: 'success',
                    message: `New ${allocation.type.toLowerCase()} created for ${allocation.productionSite}`,
                    allocation
                });
                onAllocationUpdate();
            },
            onUpdate: ({ allocation, changes }) => {
                addNotification({
                    severity: 'info',
                    message: `${allocation.type} updated for ${allocation.productionSite}`,
                    allocation
                });
                onAllocationUpdate();
            },
            onDelete: (allocation) => {
                addNotification({
                    severity: 'warning',
                    message: `${allocation.type} deleted for ${allocation.productionSite}`,
                    allocation
                });
                onAllocationUpdate();
            },
            onBankingLimit: (data) => {
                addNotification({
                    severity: 'warning',
                    message: `Banking limit reached for ${data.productionSite.name}`,
                    data
                });
            },
            onLapse: (data) => {
                addNotification({
                    severity: 'warning',
                    message: `Units lapsed for ${data.productionSite.name}`,
                    data
                });
            },
            onAutoComplete: ({ summary }) => {
                const message = `Auto-allocation complete: ${summary.total} allocations created`;
                addNotification({
                    severity: 'success',
                    message,
                    summary
                });
                onAllocationUpdate();
            }
        });

        return () => cleanup();
    }, [onAllocationUpdate]);

    const addNotification = (notification) => {
        setNotifications(prev => [
            ...prev,
            { ...notification, id: Date.now() }
        ]);
    };

    const handleClose = (id) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
    };

    return (
        <>
            {notifications.map(notification => (
                <Snackbar
                    key={notification.id}
                    open={true}
                    autoHideDuration={6000}
                    onClose={() => handleClose(notification.id)}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Alert
                        severity={notification.severity}
                        action={
                            <IconButton
                                size="small"
                                color="inherit"
                                onClick={() => handleClose(notification.id)}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        }
                    >
                        {notification.message}
                    </Alert>
                </Snackbar>
            ))}
        </>
    );
};

export default AllocationNotifications;