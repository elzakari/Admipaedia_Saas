import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '../ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog';
import {
  Search,
  Filter,
  X,
  Save,
  BookmarkPlus,
  SortAsc,
  SortDesc,
  MoreHorizontal
} from 'lucide-react';
import { DatePicker } from '../ui/date-picker';
import { MultiSelect } from '../ui/multi-select';

interface AdvancedSearchProps<T> {
  searchState: any;
  searchResult: any;
  config: any;
  savedFilters: any[];
  actions: any;
  className?: string;
}

export function AdvancedSearch<T extends Record<string, any>>({
  searchState,
  searchResult,
  config,
  savedFilters,
  actions,
  className
}: AdvancedSearchProps<T>) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');

  const activeFiltersCount = Object.keys(searchState.filters).filter(
    key => searchState.filters[key] !== undefined && 
           searchState.filters[key] !== null && 
           searchState.filters[key] !== ''
  ).length;

  const handleSaveFilter = () => {
    if (saveFilterName.trim()) {
      actions.saveFilter(saveFilterName.trim());
      setSaveFilterName('');
      setIsSaveDialogOpen(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search across ${config.searchFields.join(', ')}...`}
            value={searchState.searchTerm}
            onChange={(e) => actions.setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Filter Toggle */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Advanced Filters</CardTitle>
                  <div className="flex items-center gap-2">
                    <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Save className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Save Filter</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="Filter name"
                            value={saveFilterName}
                            onChange={(e) => setSaveFilterName(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleSaveFilter}>
                              Save
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={actions.clearAllFilters}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dynamic Filter Fields */}
                {config.filterFields && Object.entries(config.filterFields).map(([key, fieldConfig]: [string, any]) => (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-medium capitalize">
                      {key.replace(/_/g, ' ')}
                    </label>
                    
                    {fieldConfig.type === 'select' && (
                      <Select
                        value={searchState.filters[key] || 'all'}
                        onValueChange={(value) => actions.setFilter(key, value === 'all' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={fieldConfig.placeholder || `Select ${key}`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {fieldConfig.options?.map((option: any) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {fieldConfig.type === 'multiselect' && (
                      <MultiSelect
                        options={fieldConfig.options || []}
                        selected={searchState.filters[key] || []}
                        onChange={(value) => actions.setFilter(key, value)}
                        placeholder={fieldConfig.placeholder || `Select ${key}`}
                      />
                    )}
                    
                    {fieldConfig.type === 'date' && (
                      <DatePicker
                        date={searchState.filters[key]}
                        setDate={(date) => actions.setFilter(key, date)}
                      />
                    )}
                    
                    {fieldConfig.type === 'daterange' && (
                      <div className="grid grid-cols-2 gap-2">
                        <DatePicker
                          date={searchState.filters[key]?.[0]}
                          setDate={(date: Date | undefined) => {
                            const current = searchState.filters[key] || [null, null];
                            actions.setFilter(key, [date, current[1]]);
                          }}
                        />
                        <DatePicker
                          date={searchState.filters[key]?.[1]}
                          setDate={(date: Date | undefined) => {
                            const current = searchState.filters[key] || [null, null];
                            actions.setFilter(key, [current[0], date]);
                          }}
                        />
                      </div>
                    )}
                    
                    {fieldConfig.type === 'number' && (
                      <Input
                        type="number"
                        value={searchState.filters[key] || ''}
                        onChange={(e) => actions.setFilter(key, e.target.value)}
                        placeholder={fieldConfig.placeholder || `Enter ${key}`}
                      />
                    )}
                  </div>
                ))}
                
                {/* Saved Filters */}
                {savedFilters.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Saved Filters</label>
                    <div className="space-y-1">
                      {savedFilters.map((filter) => (
                        <Button
                          key={filter.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => actions.loadFilter(filter.id)}
                        >
                          <BookmarkPlus className="h-4 w-4 mr-2" />
                          {filter.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
        
        {/* Sorting */}
        {config.sortFields && (
          <Select
            value={searchState.sortBy ? `${searchState.sortBy}-${searchState.sortOrder}` : ''}
            onValueChange={(value) => {
              if (value) {
                const [field, order] = value.split('-');
                actions.setSorting(field, order as 'asc' | 'desc');
              }
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              {config.sortFields.map((field: string) => [
                <SelectItem key={`${field}-asc`} value={`${field}-asc`}>
                  <div className="flex items-center">
                    <SortAsc className="h-4 w-4 mr-2" />
                    {field.replace(/_/g, ' ')} (A-Z)
                  </div>
                </SelectItem>,
                <SelectItem key={`${field}-desc`} value={`${field}-desc`}>
                  <div className="flex items-center">
                    <SortDesc className="h-4 w-4 mr-2" />
                    {field.replace(/_/g, ' ')} (Z-A)
                  </div>
                </SelectItem>
              ])}
            </SelectContent>
          </Select>
        )}
      </div>
      
      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(searchState.filters)
            .filter(([_, value]) => value !== undefined && value !== null && value !== '')
            .map(([key, value]) => (
              <Badge key={key} variant="secondary" className="flex items-center gap-1">
                {key.replace(/_/g, ' ')}: {Array.isArray(value) ? value.join(', ') : String(value)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => actions.clearFilter(key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))
          }
        </div>
      )}
      
      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {searchResult.data.length} of {searchResult.filteredCount} results
          {searchResult.filteredCount !== searchResult.totalCount && (
            <span> (filtered from {searchResult.totalCount} total)</span>
          )}
        </span>
        
        {searchResult.hasMore && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => actions.setPage(searchState.page + 1)}
          >
            Load More
          </Button>
        )}
      </div>
    </div>
  );
}