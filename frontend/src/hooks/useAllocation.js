import { useState, useEffect, useCallback } from 'react';
import allocationApi from '../services/allocationApi';
import websocketService from '../services/websocketService';

const useAllocation = (initialMonth) => {
    const [allocations, setAllocations] = useState({
        allocations: [],
        banking: [],
        lapse: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedType, setSelectedType] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState(initialMonth);

    const fetchAllocations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const results = await allocationApi.fetchAll(selectedMonth);
            
            // Group allocations by type
            const grouped = results.data.reduce((acc, alloc) => {
                switch (alloc.type?.toLowerCase()) {
                    case 'banking':
                        acc.banking.push(alloc);
                        break;
                    case 'lapse':
                        acc.lapse.push(alloc);
                        break;
                    default:
                        acc.allocations.push(alloc);
                }
                return acc;
            }, {
                allocations: [],
                banking: [],
                lapse: []
            });

            setAllocations(grouped);
        } catch (error) {
            setError(error.message || 'Failed to fetch allocations');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    useEffect(() => {
        fetchAllocations();
    }, [fetchAllocations]);

    useEffect(() => {
        const cleanup = websocketService.subscribeToAllocationEvents({
            onCreate: () => fetchAllocations(),
            onUpdate: () => fetchAllocations(),
            onDelete: () => fetchAllocations(),
            onAutoComplete: () => fetchAllocations()
        });

        return () => cleanup();
    }, [fetchAllocations]);

    const handleTypeChange = (type) => {
        setSelectedType(type);
    };

    const handleMonthChange = (month) => {
        setSelectedMonth(month);
    };

    const getFilteredAllocations = () => {
        switch (selectedType) {
            case 'banking':
                return { ...allocations, allocations: [], lapse: [] };
            case 'lapse':
                return { ...allocations, allocations: [], banking: [] };
            case 'allocation':
                return { ...allocations, banking: [], lapse: [] };
            default:
                return allocations;
        }
    };

    const createAllocation = async (data) => {
        try {
            setError(null);
            const result = await allocationApi.create(data);
            await fetchAllocations();
            return result;
        } catch (error) {
            setError(error.message || 'Failed to create allocation');
            throw error;
        }
    };

    const updateAllocation = async (type, pk, sk, data) => {
        try {
            setError(null);
            const result = await allocationApi.update(type, pk, sk, data);
            await fetchAllocations();
            return result;
        } catch (error) {
            setError(error.message || 'Failed to update allocation');
            throw error;
        }
    };

    const deleteAllocation = async (type, pk, sk) => {
        try {
            setError(null);
            await allocationApi.delete(type, pk, sk);
            await fetchAllocations();
        } catch (error) {
            setError(error.message || 'Failed to delete allocation');
            throw error;
        }
    };

    const autoAllocate = async (productionSites, consumptionSites, month) => {
        try {
            setError(null);
            const result = await allocationApi.autoAllocate(
                productionSites,
                consumptionSites,
                month
            );
            await fetchAllocations();
            return result;
        } catch (error) {
            setError(error.message || 'Failed to auto allocate');
            throw error;
        }
    };

    return {
        allocations: getFilteredAllocations(),
        loading,
        error,
        selectedType,
        selectedMonth,
        handleTypeChange,
        handleMonthChange,
        createAllocation,
        updateAllocation,
        deleteAllocation,
        autoAllocate,
        refreshAllocations: fetchAllocations
    };
};

export default useAllocation;