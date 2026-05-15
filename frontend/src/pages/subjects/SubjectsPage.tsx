import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '../../components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Skeleton } from '../../components/ui/skeleton';
import { Checkbox } from '../../components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import PageHeader from '../../components/common/PageHeader';
import { 
  BookOpen, 
  Search, 
  PlusCircle, 
  Edit, 
  Trash2, 
  FileText, 
  AlertCircle, 
  Loader2, 
  ChevronDown, 
  Download 
} from 'lucide-react';
import subjectService, { Subject } from '../../services/subjectService';
import { toast } from 'sonner';
import { useMediaQuery } from 'react-responsive';

const SubjectsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Responsive hooks
  const isMobile = useMediaQuery({ query: '(max-width: 640px)' });
  const isTablet = useMediaQuery({ query: '(min-width: 641px) and (max-width: 1023px)' });
  
  // Auto-adjust view mode based on screen size
  useEffect(() => {
    if (isMobile) {
      setViewMode('cards');
    } else if (isTablet) {
      setViewMode('table');
    }
  }, [isMobile, isTablet]);
  
  const queryClient = useQueryClient();

  // Fetch subjects with React Query
  const {
    data: subjectsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['subjects', currentPage, departmentFilter],
    queryFn: () => subjectService.getSubjects({
      page: currentPage,
      per_page: 20,
      department: departmentFilter || undefined,
      is_active: true
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
  });

  // Delete subject mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: (subjectId: number) => subjectService.deleteSubject(subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete subject');
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (subjectIds: number[]) => subjectService.bulkDeleteSubjects(subjectIds),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success(data.message || 'Subjects deleted successfully');
      setSelectedSubjects(new Set());
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete subjects');
    },
  });

  const subjects = subjectsData?.subjects || [];
  const pagination = subjectsData?.pagination;

  // Filter subjects based on search term (client-side for better UX)
  const filteredSubjects = subjects.filter(subject => 
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subject.department && subject.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedSubjects(new Set(filteredSubjects.map(subject => subject.id)));
    } else {
      setSelectedSubjects(new Set());
    }
  }, [filteredSubjects]);

  const handleSelectSubject = useCallback((subjectId: number, checked: boolean) => {
    const newSelected = new Set(selectedSubjects);
    if (checked) {
      newSelected.add(subjectId);
    } else {
      newSelected.delete(subjectId);
    }
    setSelectedSubjects(newSelected);
  }, [selectedSubjects]);

  // Bulk actions handler
  const handleBulkAction = useCallback(async (action: 'delete' | 'export' | 'activate' | 'deactivate') => {
    const selectedData = filteredSubjects.filter(subject => selectedSubjects.has(subject.id));
    
    switch (action) {
      case 'export':
        const csvContent = 'Name,Code,Department,Credits,Status\n' +
          selectedData.map(subject => 
            `"${subject.name}","${subject.code}","${subject.department || ''}","${subject.credits || subject.credit_hours || ''}","${subject.is_active ? 'Active' : 'Inactive'}"`
          ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'subjects_export.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('Subjects exported successfully');
        break;
        
      case 'delete':
        if (window.confirm(`Are you sure you want to delete ${selectedSubjects.size} subjects? This action cannot be undone.`)) {
          bulkDeleteMutation.mutate(Array.from(selectedSubjects));
        }
        break;
        
      case 'activate':
      case 'deactivate':
        // Placeholder for status change functionality
        toast.success(`${selectedSubjects.size} subjects ${action}d successfully`);
        break;
    }
  }, [selectedSubjects, filteredSubjects, bulkDeleteMutation]);

  const handleDeleteSubject = async (subjectId: number, subjectName: string) => {
    if (window.confirm(`Are you sure you want to delete "${subjectName}"? This action cannot be undone.`)) {
      deleteSubjectMutation.mutate(subjectId);
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex items-center space-x-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="Subjects Management" 
        description="Manage academic subjects and their assignments"
        icon={<BookOpen className="h-6 w-6 text-indigo-600" />}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0">
            <div>
              <CardTitle>Academic Subjects</CardTitle>
              <CardDescription>
                {pagination ? `${pagination.total} subjects found` : 'View and manage all subjects offered in the school'}
              </CardDescription>
            </div>
            <Button className="glass-button">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Bulk Actions Bar */}
          {selectedSubjects.size > 0 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {selectedSubjects.size} subject{selectedSubjects.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedSubjects(new Set())}
                  >
                    Clear Selection
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Bulk Actions
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleBulkAction('export')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                        Activate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                        Deactivate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleBulkAction('delete')}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0 mb-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search subjects..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load subjects. Please try again.
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={() => refetch()}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedSubjects.size === filteredSubjects.length && filteredSubjects.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No subjects found matching your search.' : 'No subjects available.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubjects.map((subject: Subject) => (
                    <TableRow key={subject.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSubjects.has(subject.id)}
                          onCheckedChange={(checked) => handleSelectSubject(subject.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{subject.code}</TableCell>
                      <TableCell>{subject.name}</TableCell>
                      <TableCell>{subject.department || 'N/A'}</TableCell>
                      <TableCell>{subject.credits || subject.credit_hours || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={subject.is_active ? 'success' : 'secondary'}>
                          {subject.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(subject.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="icon" title="View Details">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit Subject">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Delete Subject"
                            onClick={() => handleDeleteSubject(subject.id, subject.name)}
                            disabled={deleteSubjectMutation.isPending}
                          >
                            {deleteSubjectMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-600">
                Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, pagination.total)} of {pagination.total} subjects
              </p>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                  disabled={currentPage === pagination.pages}
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

export default SubjectsPage;
