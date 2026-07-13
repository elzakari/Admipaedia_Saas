import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  const updateFilter = (key: keyof TeacherFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value === 'all' ? undefined : (value || undefined) });
  };

  const removeFilter = (key: keyof TeacherFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  // Translate filter label keys
  const getFilterLabel = (key: string) => {
    switch(key) {
      case 'search': return t('common.search', 'Search');
      case 'status': return t('teachers_page.filters.status', 'Status');
      case 'specialization': return t('teachers_page.filters.specialization', 'Specialization');
      default: return key;
    }
  };

  // Translate status value
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t('common.status.active', 'Active');
      case 'inactive': return t('common.status.inactive', 'Inactive');
      case 'on_leave': return t('common.status.on_leave', 'On Leave');
      default: return status;
    }
  };

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
          {t('teachers_page.filters.title', 'Filters')}
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
                {getFilterLabel(key)}: {key === 'status' ? getStatusLabel(value) : (key === 'specialization' ? t(`teachers_page.specializations.${value.toLowerCase().replace(' ', '_')}`, value) : value)}
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
            {t('teachers_page.filters.advanced_title', 'Advanced Filters')}
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">
                {activeFiltersCount} {t('teachers_page.filters.active_count', 'active')}
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
              {t('teachers_page.filters.clear_all', 'Clear All')}
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
            <Label htmlFor="search">{t('common.search', 'Search')}</Label>
            <Input
              id="search"
              placeholder={t('teachers_page.filters.search_placeholder', 'Name, email, or employee ID')}
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">{t('teachers_page.filters.status', 'Status')}</Label>
            <Select value={filters.status || 'all'} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('teachers_page.filters.all_statuses', 'All statuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('teachers_page.filters.all_statuses', 'All statuses')}</SelectItem>
                <SelectItem value="active">{t('common.status.active', 'Active')}</SelectItem>
                <SelectItem value="inactive">{t('common.status.inactive', 'Inactive')}</SelectItem>
                <SelectItem value="on_leave">{t('common.status.on_leave', 'On Leave')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="specialization">{t('teachers_page.filters.specialization', 'Specialization')}</Label>
            <Select value={filters.specialization || 'all'} onValueChange={(value) => updateFilter('specialization', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('teachers_page.filters.all_specializations', 'All specializations')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('teachers_page.filters.all_specializations', 'All specializations')}</SelectItem>
                {SPECIALIZATIONS.map(spec => (
                  <SelectItem key={spec} value={spec}>
                    {t(`teachers_page.specializations.${spec.toLowerCase().replace(' ', '_')}`, spec)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
