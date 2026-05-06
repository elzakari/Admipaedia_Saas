import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface DashboardFiltersState {
    startDate: string | null;
    endDate: string | null;
    category: string | null;
    searchQuery: string;
}

export const useDashboardFilters = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [filters, setFilters] = useState<DashboardFiltersState>({
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
        category: searchParams.get('category'),
        searchQuery: searchParams.get('q') || '',
    });

    // Sync state to URL params
    useEffect(() => {
        const params: Record<string, string> = {};
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        if (filters.category) params.category = filters.category;
        if (filters.searchQuery) params.q = filters.searchQuery;

        setSearchParams(params, { replace: true });
    }, [filters, setSearchParams]);

    const updateFilters = useCallback((updates: Partial<DashboardFiltersState>) => {
        setFilters(prev => ({ ...prev, ...updates }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({
            startDate: null,
            endDate: null,
            category: null,
            searchQuery: '',
        });
    }, []);

    const setDateRange = useCallback((start: string | null, end: string | null) => {
        setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
    }, []);

    return {
        filters,
        updateFilters,
        clearFilters,
        setDateRange,
    };
};
