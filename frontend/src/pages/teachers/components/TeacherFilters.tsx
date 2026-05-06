import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { X, Filter, RotateCcw } from 'lucide-react';

export interface TeacherFilters {
  search?: string;
  status?: string;
  specialization?: string;
}

interface TeacherFiltersProps {
  filters: TeacherFilters;
  onFiltersChange: (filters: TeacherFilters) => void;
  onClearFilters: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SPECIALIZATIONS = [
  'Mathematics',
  'Science',
  'English',
  'History',
  'Geography',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Physical Education',
  'Art',
  'Music'
];

export function TeacherFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  isCollapsed = false,
  onToggleCollapse 
}: TeacherFiltersProps) {
  const updateFilter = (key: keyof TeacherFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value === 'all' ? undefined : (value || undefined) });
  };

  const removeFilter = (key: keyof TeacherFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  if (isCollapsed) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onToggleCollapse}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        
        {/* Active filters preview */}
        <div className="flex flex-wrap gap-1">
          {Object.entries(filters).map(([key, value]) => 
            value ? (
              <Badge key={key} variant="outline" className="text-xs">
                {key}: {value}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => removeFilter(key as keyof TeacherFilters)}
                />
              </Badge>
            ) : null
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">
                {activeFiltersCount} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearFilters}
              disabled={activeFiltersCount === 0}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear All
            </Button>
            {onToggleCollapse && (
              <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Name, email, or employee ID"
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={filters.status || 'all'} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="specialization">Specialization</Label>
            <Select value={filters.specialization || 'all'} onValueChange={(value) => updateFilter('specialization', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All specializations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All specializations</SelectItem>
                {SPECIALIZATIONS.map(spec => (
                  <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
