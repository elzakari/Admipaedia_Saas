import React, { useState, useCallback, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { ShadcnCalendar } from '../ui/shadcn-calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { 
  Filter, 
  X, 
  Calendar as CalendarIcon, 
  Download, 
  Save,
  Search,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'multiSelect' | 'number';
  options?: { value: string; label: string }[];
  value?: any;
  placeholder?: string;
  min?: number;
  max?: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
  isDefault?: boolean;
  createdAt: string;
}

interface EnhancedDashboardFiltersProps {
  filters: DashboardFilter[];
  activeFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  onExport?: (format: 'csv' | 'xlsx' | 'pdf') => void;
  onSavePreset?: (name: string, filters: Record<string, any>) => void;
  presets?: FilterPreset[];
  onLoadPreset?: (preset: FilterPreset) => void;
  onDeletePreset?: (presetId: string) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const EnhancedDashboardFilters: React.FC<EnhancedDashboardFiltersProps> = ({
  filters,
  activeFilters,
  onFiltersChange,
  onExport,
  onSavePreset,
  presets = [],
  onLoadPreset,
  onDeletePreset: _onDeletePreset, // Prefix with underscore to indicate intentionally unused
  isLoading = false,
  onRefresh,
  className = ''
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = useCallback((filterId: string, value: any) => {
    const newFilters = { ...activeFilters };
    
    if (value === '' || value === null || value === undefined || 
        (Array.isArray(value) && value.length === 0)) {
      delete newFilters[filterId];
    } else {
      newFilters[filterId] = value;
    }
    
    onFiltersChange(newFilters);
  }, [activeFilters, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  const activeFilterCount = Object.keys(activeFilters).length;

  // Group filters by type for better organization
  const groupedFilters = useMemo(() => {
    const basic = filters.filter(f => ['text', 'select'].includes(f.type));
    const advanced = filters.filter(f => !['text', 'select'].includes(f.type));
    return { basic, advanced };
  }, [filters]);

  const renderFilterInput = (filter: DashboardFilter) => {
    const value = activeFilters[filter.id];

    switch (filter.type) {
      case 'text':
        return (
          <div key={filter.id} className="space-y-2">
            <label 
              className="text-sm font-medium text-gray-700 dark:text-gray-300" 
              htmlFor={filter.id}
            >
              {filter.name}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id={filter.id}
                placeholder={filter.placeholder || `Search ${filter.name.toLowerCase()}...`}
                value={value || ''}
                onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                className="pl-10"
                aria-describedby={`${filter.id}-description`}
              />
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={filter.id} className="space-y-2">
            <label 
              className="text-sm font-medium text-gray-700 dark:text-gray-300" 
              htmlFor={filter.id}
            >
              {filter.name}
            </label>
            <Select 
              value={value || "all"} 
              onValueChange={(val) => handleFilterChange(filter.id, val === "all" ? "" : val)}
            >
              <SelectTrigger id={filter.id} aria-label={filter.name}>
                <SelectValue placeholder={filter.placeholder || `Select ${filter.name.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.name}</SelectItem>
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'number':
        return (
          <div key={filter.id} className="space-y-2">
            <label 
              className="text-sm font-medium text-gray-700 dark:text-gray-300" 
              htmlFor={filter.id}
            >
              {filter.name}
            </label>
            <Input
              id={filter.id}
              type="number"
              placeholder={filter.placeholder || `Enter ${filter.name.toLowerCase()}`}
              value={value || ''}
              min={filter.min}
              max={filter.max}
              onChange={(e) => handleFilterChange(filter.id, e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        );

      case 'date':
        return (
          <div key={filter.id} className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {filter.name}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  aria-label={`Select ${filter.name}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(new Date(value), 'PPP') : filter.placeholder || 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <ShadcnCalendar
                  mode="single"
                  selected={value ? new Date(value) : undefined}
                  onSelect={(date: Date | undefined) => handleFilterChange(filter.id, date?.toISOString())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      case 'multiSelect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div key={filter.id} className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {filter.name}
            </label>
            <div className="space-y-2">
              {filter.options?.map((option) => (
                <label key={option.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...selectedValues, option.value]
                        : selectedValues.filter(v => v !== option.value);
                      handleFilterChange(filter.id, newValues);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
            aria-expanded={showFilters}
            aria-controls="filter-panel"
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <X className="h-4 w-4" />
              Clear All
            </Button>
          )}

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2"
              aria-label="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset Management */}
          {presets.length > 0 && (
            <Select onValueChange={(presetId) => {
              const preset = presets.find(p => p.id === presetId);
              if (preset && onLoadPreset) {
                onLoadPreset(preset);
              }
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Load preset" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{preset.name}</span>
                      {preset.isDefault && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {onSavePreset && activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPresetDialog(true)}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Preset
            </Button>
          )}

          {/* Export Options */}
          {onExport && (
            <Select onValueChange={(format) => onExport(format as 'csv' | 'xlsx' | 'pdf')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    CSV
                  </div>
                </SelectItem>
                <SelectItem value="xlsx">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Excel
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    PDF
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2" role="region" aria-label="Active filters">
          {Object.entries(activeFilters).map(([filterId, value]) => {
            const filter = filters.find(f => f.id === filterId);
            if (!filter || !value) return null;

            let displayValue = value;
            if (filter.type === 'select' && filter.options) {
              const option = filter.options.find(opt => opt.value === value);
              displayValue = option?.label || value;
            } else if (filter.type === 'date') {
              displayValue = format(new Date(value), 'MMM dd, yyyy');
            } else if (Array.isArray(value)) {
              displayValue = `${value.length} selected`;
            }

            return (
              <Badge key={filterId} variant="secondary" className="flex items-center gap-1">
                <span className="text-xs">{filter.name}:</span>
                <span className="font-medium">{displayValue}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleFilterChange(filterId, null)}
                  aria-label={`Remove ${filter.name} filter`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Filter Inputs */}
      {showFilters && (
        <div id="filter-panel" className="space-y-6 pt-4 border-t">
          {/* Basic Filters */}
          {groupedFilters.basic.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Basic Filters
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedFilters.basic.map(renderFilterInput)}
              </div>
            </div>
          )}

          {/* Advanced Filters */}
          {groupedFilters.advanced.length > 0 && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 mb-3"
              >
                <Settings className="h-4 w-4" />
                Advanced Filters
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              
              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedFilters.advanced.map(renderFilterInput)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Save Preset Dialog */}
      {showPresetDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Save Filter Preset</h3>
            <div className="space-y-4">
              <Input
                placeholder="Enter preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && presetName.trim()) {
                    if (onSavePreset) {
                      onSavePreset(presetName.trim(), activeFilters);
                      setShowPresetDialog(false);
                      setPresetName('');
                    }
                  }
                }}
              />
              <div className="text-sm text-gray-600">
                This will save your current filter configuration for quick access later.
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPresetDialog(false);
                  setPresetName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (presetName.trim() && onSavePreset) {
                    onSavePreset(presetName.trim(), activeFilters);
                    setShowPresetDialog(false);
                    setPresetName('');
                  }
                }}
                disabled={!presetName.trim()}
              >
                Save Preset
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
};

export default EnhancedDashboardFilters;