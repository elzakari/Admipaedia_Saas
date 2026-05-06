import { useState, useMemo, useCallback, useEffect } from 'react'

export interface FilterConfig {
  key: string
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number'
  label: string
  options?: { label: string; value: string }[]
  placeholder?: string
}

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export interface SavedFilter {
  id: string
  name: string
  filters: Record<string, any>
  searchTerm: string
}

export interface UseAdvancedSearchProps<T> {
  data: T[]
  searchFields: (keyof T)[]
  filterConfigs: FilterConfig[]
  defaultSort?: SortConfig
  enableFuzzySearch?: boolean
  debounceMs?: number
}

// Simple debounce function to avoid lodash dependency
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function useAdvancedSearch<T extends Record<string, any>>({
  data,
  searchFields,
  filterConfigs,
  defaultSort,
  enableFuzzySearch = true,
  debounceMs = 300
}: UseAdvancedSearchProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(defaultSort)
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Debounced search term
  const debouncedSetSearchTerm = useCallback(
    debounce((term: string) => {
      setDebouncedSearchTerm(term)
      setCurrentPage(1) // Reset to first page on search
    }, debounceMs),
    [debounceMs]
  )

  useEffect(() => {
    debouncedSetSearchTerm(searchTerm)
  }, [searchTerm, debouncedSetSearchTerm])

  // Fuzzy search function
  const fuzzySearch = useCallback((item: T, term: string): number => {
    if (!term) return 1
    
    let maxScore = 0
    const lowerTerm = term.toLowerCase()
    
    searchFields.forEach(field => {
      const fieldValue = String(item[field] || '').toLowerCase()
      
      // Exact match gets highest score
      if (fieldValue === lowerTerm) {
        maxScore = Math.max(maxScore, 1)
        return
      }
      
      // Contains match
      if (fieldValue.includes(lowerTerm)) {
        const score = lowerTerm.length / fieldValue.length
        maxScore = Math.max(maxScore, score * 0.8)
        return
      }
      
      // Fuzzy matching (simple implementation)
      let score = 0
      let termIndex = 0
      
      for (let i = 0; i < fieldValue.length && termIndex < lowerTerm.length; i++) {
        if (fieldValue[i] === lowerTerm[termIndex]) {
          score++
          termIndex++
        }
      }
      
      if (termIndex === lowerTerm.length) {
        const fuzzyScore = (score / fieldValue.length) * 0.6
        maxScore = Math.max(maxScore, fuzzyScore)
      }
    })
    
    return maxScore
  }, [searchFields])

  // Apply filters
  const applyFilters = useCallback((item: T): boolean => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return true
      
      const filterConfig = filterConfigs.find(config => config.key === key)
      if (!filterConfig) return true
      
      const itemValue = item[key as keyof T]
      
      switch (filterConfig.type) {
        case 'text':
          return String(itemValue || '').toLowerCase().includes(String(value).toLowerCase())
        
        case 'select':
          return itemValue === value
        
        case 'multiselect':
          return Array.isArray(value) ? value.includes(itemValue) : itemValue === value
        
        case 'date':
          if (!value || !itemValue) return true
          const itemDate = new Date(itemValue as string)
          const filterDate = new Date(value)
          return itemDate.toDateString() === filterDate.toDateString()
        
        case 'daterange':
          if (!value?.from || !itemValue) return true
          const itemDateRange = new Date(itemValue as string)
          const fromDate = new Date(value.from)
          const toDate = value.to ? new Date(value.to) : new Date()
          return itemDateRange >= fromDate && itemDateRange <= toDate
        
        case 'number':
          const numValue = Number(itemValue)
          const filterNum = Number(value)
          return !isNaN(numValue) && !isNaN(filterNum) && numValue === filterNum
        
        default:
          return true
      }
    })
  }, [filters, filterConfigs])

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let result = data.filter(applyFilters)
    
    // Apply search
    if (debouncedSearchTerm && enableFuzzySearch) {
      result = result
        .map(item => ({ item, score: fuzzySearch(item, debouncedSearchTerm) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item)
    } else if (debouncedSearchTerm) {
      result = result.filter(item => 
        searchFields.some(field => 
          String(item[field] || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
      )
    }
    
    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof T]
        const bValue = b[sortConfig.key as keyof T]
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    
    return result
  }, [data, debouncedSearchTerm, filters, sortConfig, applyFilters, fuzzySearch, searchFields, enableFuzzySearch])

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return processedData.slice(startIndex, endIndex)
  }, [processedData, currentPage, pageSize])

  // Pagination info
  const totalPages = Math.ceil(processedData.length / pageSize)
  const totalItems = processedData.length

  // Filter management
  const updateFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }, [])

  const clearFilter = useCallback((key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
    setCurrentPage(1)
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters({})
    setSearchTerm('')
    setCurrentPage(1)
  }, [])

  // Saved filters management
  const saveCurrentFilter = useCallback((name: string) => {
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filters,
      searchTerm
    }
    setSavedFilters(prev => [...prev, newFilter])
  }, [filters, searchTerm])

  const loadSavedFilter = useCallback((filterId: string) => {
    const savedFilter = savedFilters.find(f => f.id === filterId)
    if (savedFilter) {
      setFilters(savedFilter.filters)
      setSearchTerm(savedFilter.searchTerm)
      setCurrentPage(1)
    }
  }, [savedFilters])

  const deleteSavedFilter = useCallback((filterId: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId))
  }, [])

  return {
    // Data
    data: paginatedData,
    totalItems,
    totalPages,
    
    // Search
    searchTerm,
    setSearchTerm,
    
    // Filters
    filters,
    updateFilter,
    clearFilter,
    clearAllFilters,
    
    // Sorting
    sortConfig,
    setSortConfig,
    
    // Pagination
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    
    // Saved filters
    savedFilters,
    saveCurrentFilter,
    loadSavedFilter,
    deleteSavedFilter,
    
    // Utilities
    hasActiveFilters: Object.keys(filters).length > 0 || searchTerm.length > 0,
    isLoading: false // Can be extended for async operations
  }
}