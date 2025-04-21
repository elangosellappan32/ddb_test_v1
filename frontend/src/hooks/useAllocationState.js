import { useState, useEffect, useCallback } from 'react';
import websocketService from '../services/websocketService';
import { getAllocationTypeColor } from '../utils/allocationUtils';
import { useSnackbar } from 'notistack';

export const useAllocationState = (initialMonth) => {
    const [allocations, setAllocations] = useState({
        allocations: [],
        banking: [],
        lapse: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(initialMonth);
    const { enqueueSnackbar } = useSnackbar();

    const showNotification = useCallback((message, type, entity) => {
        const color = getAllocationTypeColor(entity);
        enqueueSnackbar(message, {
            variant: type,
            anchorOrigin: {
                vertical: 'top',
                horizontal: 'right'
            },
            sx: {
                '& .MuiSnackbarContent-root': {
                    backgroundColor: color,
                    color: '#fff'
                }
            }
        });
    }, [enqueueSnackbar]);

    const fetchAllocations = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/allocations/month/${selectedMonth}`);
            if (!response.ok) throw new Error('Failed to fetch allocations');
            const data = await response.json();
            setAllocations(data);
        } catch (error) {
            console.error('Error fetching allocations:', error);
            showNotification('Failed to load allocations', 'error', 'allocation');
        } finally {
            setIsLoading(false);
        }
    }, [selectedMonth, showNotification]);

    const updateAllocation = useCallback((type, updatedItem) => {
        setAllocations(prev => ({
            ...prev,
            [type]: prev[type].map(item => 
                item.id === updatedItem.id ? updatedItem : item
            )
        }));
    }, []);

    const addAllocation = useCallback((type, newItem) => {
        setAllocations(prev => ({
            ...prev,
            [type]: [...prev[type], newItem]
        }));
    }, []);

    const removeAllocation = useCallback((type, id) => {
        setAllocations(prev => ({
            ...prev,
            [type]: prev[type].filter(item => item.id !== id)
        }));
    }, []);

    // WebSocket event handlers
    useEffect(() => {
        const subscriptions = [
            // Regular allocations
            websocketService.onAllocationCreated(allocation => {
                showNotification('New allocation created', 'success', 'allocation');
                addAllocation('allocations', allocation);
            }),
            websocketService.onAllocationUpdated(allocation => {
                showNotification('Allocation updated', 'info', 'allocation');
                updateAllocation('allocations', allocation);
            }),
            websocketService.onAllocationDeleted(id => {
                showNotification('Allocation deleted', 'warning', 'allocation');
                removeAllocation('allocations', id);
            }),

            // Banking
            websocketService.onBankingCreated(banking => {
                showNotification('New banking record created', 'success', 'banking');
                addAllocation('banking', banking);
            }),
            websocketService.onBankingUpdated(banking => {
                showNotification('Banking record updated', 'info', 'banking');
                updateAllocation('banking', banking);
            }),
            websocketService.onBankingDeleted(id => {
                showNotification('Banking record deleted', 'warning', 'banking');
                removeAllocation('banking', id);
            }),

            // Lapse
            websocketService.onLapseCreated(lapse => {
                showNotification('New lapse record created', 'success', 'lapse');
                addAllocation('lapse', lapse);
            }),
            websocketService.onLapseUpdated(lapse => {
                showNotification('Lapse record updated', 'info', 'lapse');
                updateAllocation('lapse', lapse);
            }),
            websocketService.onLapseDeleted(id => {
                showNotification('Lapse record deleted', 'warning', 'lapse');
                removeAllocation('lapse', id);
            }),

            // System events
            websocketService.onError(error => {
                showNotification(
                    'Connection error: ' + error.message,
                    'error',
                    'allocation'
                );
            }),
            websocketService.onReconnect(() => {
                showNotification(
                    'Reconnected to server',
                    'success',
                    'allocation'
                );
                fetchAllocations();
            })
        ];

        // Connect to WebSocket
        websocketService.connect().catch(error => {
            console.error('Failed to connect to WebSocket:', error);
            showNotification(
                'Failed to establish real-time connection',
                'error',
                'allocation'
            );
        });

        // Initial fetch
        fetchAllocations();

        // Cleanup subscriptions
        return () => {
            subscriptions.forEach(unsubscribe => unsubscribe());
        };
    }, [fetchAllocations, addAllocation, updateAllocation, removeAllocation, showNotification]);

    return {
        allocations,
        isLoading,
        selectedMonth,
        setSelectedMonth,
        fetchAllocations,
        updateAllocation,
        addAllocation,
        removeAllocation
    };
};

export default useAllocationState;