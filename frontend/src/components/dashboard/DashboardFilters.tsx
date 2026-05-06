"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Search, Filter, X, ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../ui/select'
import { DatePicker } from '../ui/date-picker'
import { useDashboardFilters } from '../../hooks/useDashboardFilters'
import { cn } from '../../lib/utils'
import { subDays, startOfMonth, startOfToday } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

export const DashboardFilters: React.FC = () => {
    const { filters, updateFilters, clearFilters, setDateRange } = useDashboardFilters()
    const [isExpanded, setIsExpanded] = useState(false)
    const filterButtonRef = useRef<HTMLButtonElement>(null)

    // Accessibility: Focus restoration
    const prevExpanded = useRef(isExpanded)
    useEffect(() => {
        if (prevExpanded.current && !isExpanded) {
            filterButtonRef.current?.focus()
        }
        prevExpanded.current = isExpanded
    }, [isExpanded])

    const handleQuickRange = (range: string) => {
        const today = new Date()
        let start: Date | null = null
        const end = today

        switch (range) {
            case 'today':
                start = startOfToday()
                break
            case '7days':
                start = subDays(today, 7)
                break
            case '30days':
                start = subDays(today, 30)
                break
            case 'thisMonth':
                start = startOfMonth(today)
                break
            default:
                start = null
        }

        if (start) {
            setDateRange(start.toISOString(), end.toISOString())
        } else {
            setDateRange(null, null)
        }
    }

    const hasActiveFilters = !!(filters.startDate || filters.endDate || (filters.category && filters.category !== 'all') || filters.searchQuery)

    return (
        <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search Bar */}
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search dashboard data..."
                        value={filters.searchQuery}
                        onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                        className="pl-10 h-10 bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 focus:ring-blue-600"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button
                        ref={filterButtonRef}
                        variant="outline"
                        onClick={() => setIsExpanded(!isExpanded)}
                        aria-expanded={isExpanded}
                        aria-controls="filter-panel"
                        className={cn(
                            "h-10 border-slate-700 hover:bg-slate-800 transition-colors",
                            isExpanded && "bg-slate-800 border-blue-600/50"
                        )}
                    >
                        <Filter className="mr-2 h-4 w-4" />
                        Filters
                        {hasActiveFilters && (
                            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold" aria-label={`${Object.keys(filters).length} filters active`}>
                                !
                            </span>
                        )}
                        <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                    </Button>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            onClick={clearFilters}
                            className="h-10 text-gray-400 hover:text-white hover:bg-red-900/20"
                        >
                            <X className="mr-2 h-4 w-4" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        id="filter-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                        role="region"
                        aria-label="Filter configuration panel"
                    >
                        <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-2 backdrop-blur-sm">
                            {/* Quick Range */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Timeframe</label>
                                <Select onValueChange={handleQuickRange}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700">
                                        <SelectValue placeholder="Quick select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="7days">Last 7 Days</SelectItem>
                                        <SelectItem value="30days">Last 30 Days</SelectItem>
                                        <SelectItem value="thisMonth">This Month</SelectItem>
                                        <SelectItem value="all">All Time</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Date Picker Start */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">From Date</label>
                                <DatePicker
                                    date={filters.startDate ? new Date(filters.startDate) : undefined}
                                    setDate={(date) => updateFilters({ startDate: date?.toISOString() || null })}
                                    className="w-full bg-slate-800 border-slate-700 hover:bg-slate-750"
                                />
                            </div>

                            {/* Date Picker End */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">To Date</label>
                                <DatePicker
                                    date={filters.endDate ? new Date(filters.endDate) : undefined}
                                    setDate={(date) => updateFilters({ endDate: date?.toISOString() || null })}
                                    className="w-full bg-slate-800 border-slate-700 hover:bg-slate-750"
                                />
                            </div>

                            {/* Category */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Category</label>
                                <Select
                                    value={filters.category || 'all'}
                                    onValueChange={(val) => updateFilters({ category: val === 'all' ? null : val })}
                                >
                                    <SelectTrigger className="bg-slate-800 border-slate-700">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all">All Categories</SelectItem>
                                        <SelectItem value="academics">Academics</SelectItem>
                                        <SelectItem value="attendance">Attendance</SelectItem>
                                        <SelectItem value="finance">Finance</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
