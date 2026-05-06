"use client"

import * as React from "react"
import { Search, Filter, X, Save, FolderOpen } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { MultiSelect, MultiSelectOption } from "./multi-select"
import { DatePicker } from "./date-picker"
import { Badge } from "./badge"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Separator } from "./separator"
import { FilterConfig, SavedFilter } from "../../hooks/useAdvancedSearch"

interface AdvancedSearchProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  filters: Record<string, any>
  onFilterChange: (key: string, value: any) => void
  onClearFilter: (key: string) => void
  onClearAll: () => void
  filterConfigs: FilterConfig[]
  savedFilters: SavedFilter[]
  onSaveFilter: (name: string) => void
  onLoadFilter: (id: string) => void
  onDeleteFilter: (id: string) => void
  hasActiveFilters: boolean
  className?: string
}

export function AdvancedSearch({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilter,
  onClearAll,
  filterConfigs,
  savedFilters,
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
  hasActiveFilters,
  className
}: AdvancedSearchProps) {
  const [showFilters, setShowFilters] = React.useState(false)
  const [saveFilterName, setSaveFilterName] = React.useState('')
  const [showSaveDialog, setShowSaveDialog] = React.useState(false)

  const handleSaveFilter = () => {
    if (saveFilterName.trim()) {
      onSaveFilter(saveFilterName.trim())
      setSaveFilterName('')
      setShowSaveDialog(false)
    }
  }

  const renderFilterInput = (config: FilterConfig) => {
    const value = filters[config.key]

    switch (config.type) {
      case 'text':
        return (
          <Input
            placeholder={config.placeholder || `Filter by ${config.label.toLowerCase()}...`}
            value={value || ''}
            onChange={(e) => onFilterChange(config.key, e.target.value)}
            className="w-full"
          />
        )

      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(newValue) => onFilterChange(config.key, newValue)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={config.placeholder || `Select ${config.label.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        return (
          <MultiSelect
            options={config.options || []}
            selected={value || []}
            onChange={(selected) => onFilterChange(config.key, selected)}
            placeholder={config.placeholder || `Select ${config.label.toLowerCase()}...`}
            className="w-full"
          />
        )

      case 'date':
        return (
          <DatePicker
            date={value ? new Date(value) : undefined}
            setDate={(date) => onFilterChange(config.key, date?.toISOString())}
            className="w-full"
          />
        )

      case 'daterange':
        return (
          <div className="flex gap-2">
            <DatePicker
              date={value?.from ? new Date(value.from) : undefined}
              setDate={(date) => onFilterChange(config.key, { ...value, from: date?.toISOString() })}
              className="flex-1"
            />
            <DatePicker
              date={value?.to ? new Date(value.to) : undefined}
              setDate={(date) => onFilterChange(config.key, { ...value, to: date?.toISOString() })}
              className="flex-1"
            />
          </div>
        )

      case 'number':
        return (
          <Input
            type="number"
            placeholder={config.placeholder || `Enter ${config.label.toLowerCase()}...`}
            value={value || ''}
            onChange={(e) => onFilterChange(config.key, e.target.value ? Number(e.target.value) : undefined)}
            className="w-full"
          />
        )

      default:
        return null
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2",
            hasActiveFilters && "border-blue-500 bg-blue-50 text-blue-700"
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              {Object.keys(filters).filter(key => filters[key]).length}
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={onClearAll} className="text-red-600 hover:text-red-700">
            <X className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{searchTerm}"
              <button
                onClick={() => onSearchChange('')}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {Object.entries(filters).map(([key, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null
            
            const config = filterConfigs.find(c => c.key === key)
            if (!config) return null
            
            let displayValue = value
            if (Array.isArray(value)) {
              displayValue = value.length > 2 ? `${value.length} selected` : value.join(', ')
            } else if (config.type === 'date' && value) {
              displayValue = new Date(value).toLocaleDateString()
            } else if (config.type === 'daterange' && value) {
              const from = value.from ? new Date(value.from).toLocaleDateString() : ''
              const to = value.to ? new Date(value.to).toLocaleDateString() : ''
              displayValue = `${from} - ${to}`
            }
            
            return (
              <Badge key={key} variant="secondary" className="flex items-center gap-1">
                {config.label}: {displayValue}
                <button
                  onClick={() => onClearFilter(key)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Advanced Filters</h3>
            <div className="flex gap-2">
              {/* Saved Filters */}
              {savedFilters.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Saved Filters
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-2">
                      {savedFilters.map((filter) => (
                        <div key={filter.id} className="flex items-center justify-between">
                          <button
                            onClick={() => onLoadFilter(filter.id)}
                            className="text-sm hover:text-blue-600 flex-1 text-left"
                          >
                            {filter.name}
                          </button>
                          <button
                            onClick={() => onDeleteFilter(filter.id)}
                            className="text-red-600 hover:text-red-700 ml-2"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              
              {/* Save Current Filter */}
              {hasActiveFilters && (
                <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save Filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-2">
                      <Input
                        placeholder="Filter name..."
                        value={saveFilterName}
                        onChange={(e) => setSaveFilterName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
                      />
                      <Button onClick={handleSaveFilter} className="w-full" size="sm">
                        Save
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterConfigs.map((config) => (
              <div key={config.key} className="space-y-2">
                <label className="text-sm font-medium">{config.label}</label>
                {renderFilterInput(config)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}