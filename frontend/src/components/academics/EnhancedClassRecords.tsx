import React from 'react';
import { useAdvancedSearch, FilterConfig } from '../../hooks/useAdvancedSearch';
import { AdvancedSearch } from '../common/AdvancedSearch';
import { useClasses } from '../../hooks/useClasses';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Eye, Users, Plus } from 'lucide-react';

interface Class {
  id: number;
  name: string;
  grade_level: string;
  section?: string;
  academic_year: string;
  capacity: number;
  current_enrollment: number;
  class_teacher?: string;
  room_number?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

const filterConfigs: FilterConfig[] = [
  {
    key: 'status',
    type: 'select',
    label: 'Status',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' }
    ]
  },
  {
    key: 'grade_level',
    type: 'multiselect',
    label: 'Grade Level',
    options: [
      { label: 'Grade 1', value: 'Grade 1' },
      { label: 'Grade 2', value: 'Grade 2' },
      { label: 'Grade 3', value: 'Grade 3' },
      { label: 'Grade 4', value: 'Grade 4' },
      { label: 'Grade 5', value: 'Grade 5' },
      { label: 'Grade 6', value: 'Grade 6' }
    ]
  },
  {
    key: 'academic_year',
    type: 'select',
    label: 'Academic Year',
    options: [
      { label: '2023-2024', value: '2023-2024' },
      { label: '2024-2025', value: '2024-2025' }
    ]
  },
  {
    key: 'class_teacher',
    type: 'text',
    label: 'Class Teacher',
    placeholder: 'Search by teacher name...'
  },
  {
    key: 'current_enrollment',
    type: 'number',
    label: 'Min Enrollment'
  },
  {
    key: 'created_at',
    type: 'daterange',
    label: 'Created Date Range'
  }
];

const EnhancedClassRecords: React.FC = () => {
  const { data: classesData, isLoading } = useClasses();
  const classes = classesData?.classes || [];
  
  const searchConfig = useAdvancedSearch<Class>({
    data: classes,
    searchFields: ['name', 'grade_level', 'section', 'class_teacher', 'room_number'],
    filterConfigs,
    defaultSort: { key: 'name', direction: 'asc' },
    enableFuzzySearch: true,
    debounceMs: 300
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  // Create search state and actions for AdvancedSearch component
  const searchState = {
    searchTerm: searchConfig.searchTerm,
    filters: searchConfig.filters,
    sortBy: searchConfig.sortConfig?.key,
    sortOrder: searchConfig.sortConfig?.direction,
    page: searchConfig.currentPage
  };

  const searchResult = {
    data: searchConfig.data,
    filteredCount: searchConfig.totalItems,
    totalCount: classes.length,
    hasMore: searchConfig.currentPage < searchConfig.totalPages
  };

  const actions = {
    setSearchTerm: searchConfig.setSearchTerm,
    setFilter: searchConfig.updateFilter,
    clearFilter: searchConfig.clearFilter,
    clearAllFilters: searchConfig.clearAllFilters,
    setSorting: (field: string, direction: 'asc' | 'desc') => {
      searchConfig.setSortConfig({ key: field, direction });
    },
    setPage: searchConfig.setCurrentPage,
    saveFilter: searchConfig.saveCurrentFilter,
    loadFilter: searchConfig.loadSavedFilter
  };

  const config = {
    searchFields: ['name', 'grade_level', 'section', 'class_teacher', 'room_number'],
    filterFields: filterConfigs.reduce((acc, config) => {
      acc[config.key] = {
        type: config.type,
        options: config.options,
        placeholder: config.placeholder
      };
      return acc;
    }, {} as Record<string, any>),
    sortFields: ['name', 'grade_level', 'current_enrollment', 'created_at']
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Class Records</h1>
          <p className="text-muted-foreground">Manage classes and academic records</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Class
        </Button>
      </div>

      <AdvancedSearch
        searchState={searchState}
        searchResult={searchResult}
        config={config}
        savedFilters={searchConfig.savedFilters}
        actions={actions}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Classes ({searchConfig.totalItems})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {searchConfig.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No classes found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Grade Level</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Enrollment</TableHead>
                    <TableHead>Class Teacher</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchConfig.data.map((cls: Class) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.grade_level}</TableCell>
                      <TableCell>{cls.section || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{cls.current_enrollment}/{cls.capacity}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min((cls.current_enrollment / cls.capacity) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{cls.class_teacher || '-'}</TableCell>
                      <TableCell>{cls.room_number || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={cls.status === 'active' ? 'default' : 'secondary'}>
                          {cls.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {searchConfig.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((searchConfig.currentPage - 1) * searchConfig.pageSize) + 1} to {Math.min(searchConfig.currentPage * searchConfig.pageSize, searchConfig.totalItems)} of {searchConfig.totalItems} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => searchConfig.setCurrentPage(searchConfig.currentPage - 1)}
                  disabled={searchConfig.currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => searchConfig.setCurrentPage(searchConfig.currentPage + 1)}
                  disabled={searchConfig.currentPage === searchConfig.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedClassRecords;