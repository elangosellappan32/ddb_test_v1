import React, { useState, useCallback } from 'react';
import { Snackbar, Alert, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const AllocationNotifications = ({ onNotification }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((notification) => {
        const newNotification = {
            ...notification,
            id: Date.now()
        };
        setNotifications(prev => [...prev, newNotification]);

        if (onNotification) {
            onNotification(newNotification);
        }
    }, [onNotification]);

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