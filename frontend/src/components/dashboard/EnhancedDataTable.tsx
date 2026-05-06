import React, { useState, useMemo, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  MoreHorizontal,
  ArrowUpDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export interface TableColumn {
  id: string;
  header: string;
  accessor: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
  type?: 'text' | 'number' | 'date' | 'badge' | 'actions';
}

export interface TableAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive' | 'outline';
  disabled?: (row: any) => boolean;
}

interface EnhancedDataTableProps {
  data: any[];
  columns: TableColumn[];
  actions?: TableAction[];
  searchable?: boolean;
  selectable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
  onSelectionChange?: (selectedRows: any[]) => void;
  className?: string;
}

const EnhancedDataTable: React.FC<EnhancedDataTableProps> = ({
  data,
  columns,
  actions = [],
  searchable = true,
  selectable = false,
  pagination = true,
  pageSize = 10,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  onSelectionChange,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(row =>
        columns.some(column => {
          const value = row[column.accessor];
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([columnId, filterValue]) => {
      if (filterValue) {
        const column = columns.find(col => col.id === columnId);
        if (column) {
          filtered = filtered.filter(row => {
            const value = row[column.accessor];
            return value?.toString().toLowerCase().includes(filterValue.toLowerCase());
          });
        }
      }
    });

    return filtered;
  }, [data, searchTerm, columnFilters, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = useCallback((columnId: string) => {
    setSortConfig(current => {
      if (current?.key === columnId) {
        return {
          key: columnId,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key: columnId, direction: 'asc' };
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allIds = paginatedData.map((_, index) => `${currentPage}-${index}`);
      setSelectedRows(new Set(allIds));
    } else {
      setSelectedRows(new Set());
    }
  }, [paginatedData, currentPage]);

  const handleSelectRow = useCallback((rowId: string, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(rowId);
      } else {
        newSet.delete(rowId);
      }
      return newSet;
    });
  }, []);

  const handleColumnFilter = useCallback((columnId: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnId]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  // Update parent component when selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedData = paginatedData.filter((_, index) => 
        selectedRows.has(`${currentPage}-${index}`)
      );
      onSelectionChange(selectedData);
    }
  }, [selectedRows, paginatedData, currentPage, onSelectionChange]);

  const renderCell = (column: TableColumn, row: any) => {
    const value = row[column.accessor];

    if (column.render) {
      return column.render(value, row);
    }

    switch (column.type) {
      case 'badge':
        return (
          <Badge variant={value === 'active' ? 'default' : 'secondary'}>
            {value}
          </Badge>
        );
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '-';
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      default:
        return value || '-';
    }
  };

  const renderActions = (row: any, rowIndex: number) => {
    if (actions.length === 0) return null;

    if (actions.length === 1) {
      const action = actions[0];
      if (!action) return null; // Guard against undefined action
      
      return (
        <Button
          variant={action.variant || 'outline'}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            action.onClick(row);
          }}
          disabled={action.disabled ? action.disabled(row) : false}
          className="flex items-center gap-2"
        >
          {action.icon}
          {action.label}
        </Button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((action) => {
            if (!action) return null; // Guard against undefined action
            
            return (
              <DropdownMenuItem
                key={action.id}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick(row);
                }}
                disabled={action.disabled ? action.disabled(row) : false}
                className="flex items-center gap-2"
              >
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header with search and filters */}
      {searchable && (
        <div className="mb-4 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-gray-500">
            {sortedData.length} result{sortedData.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead 
                  key={column.id} 
                  className={column.width ? `w-${column.width}` : ''}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleSort(column.accessor)}
                      >
                        {sortConfig?.key === column.accessor ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  {column.filterable && (
                    <Input
                      placeholder={`Filter ${column.header.toLowerCase()}...`}
                      value={columnFilters[column.id] || ''}
                      onChange={(e) => handleColumnFilter(column.id, e.target.value)}
                      className="mt-2 h-8"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </TableHead>
              ))}
              {actions.length > 0 && (
                <TableHead className="w-24">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="text-center py-8 text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => {
                const rowId = `${currentPage}-${index}`;
                return (
                  <TableRow
                    key={rowId}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      selectedRows.has(rowId) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(rowId)}
                          onCheckedChange={(checked) => handleSelectRow(rowId, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.id}>
                        {renderCell(column, row)}
                      </TableCell>
                    ))}
                    {actions.length > 0 && (
                      <TableCell>
                        {renderActions(row, index)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default EnhancedDataTable;