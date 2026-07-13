// Top-level imports
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '../../hooks/useDebounce';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Plus, Search, Filter, Download, Upload, Users, UserCheck, Link2, Phone, AlertCircle, Loader2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import ParentList from '../../components/parents/ParentList';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import ParentFormModal from '../../components/parents/ParentFormModal';
import ParentDetailsModal from '../../components/parents/ParentDetailsModal';
import { useParents, useCreateParent, useUpdateParent, useDeleteParent } from '../../hooks/useParents';
import type { Parent } from '../../services/parentService';
import { toast } from 'react-hot-toast';

type StatusFilter = 'all' | 'active' | 'inactive';

function ParentManagementPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [viewingParent, setViewingParent] = useState<Parent | null>(null);

  // Debounce search term to prevent excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Build query params safely (no undefined, no duplicates)
  const queryParams = useMemo(() => {
    const params: {
      page: number;
      per_page: number;
      search?: string;
      status?: 'active' | 'inactive';
    } = {
      page: currentPage,
      per_page: perPage,
    };
    
    const trimmedSearch = debouncedSearchTerm.trim();
    if (trimmedSearch.length > 0) {
      params.search = trimmedSearch;
    }
    
    if (statusFilter !== 'all') {
      params.status = statusFilter as 'active' | 'inactive';
    }
    
    return params;
  }, [debouncedSearchTerm, statusFilter, currentPage, perPage]);

  // Fetch parents list and expose loading/error/refetch
  const { data: parentsResponse, isLoading, error, refetch } = useParents(queryParams);

  // Memoize parents and pagination data to prevent downstream re-renders
  const { parents, totalParents } = useMemo(() => ({
    parents: parentsResponse?.data?.parents ?? [],
    totalParents: parentsResponse?.data?.pagination?.total ?? 0
  }), [parentsResponse]);

  // Memoize summary stats
  const stats = useMemo(() => {
    const active = parents.filter((p: Parent) => p.status === 'active').length;
    const linkedStudents = parents.reduce((count, parent) => count + (parent.children?.length || 0), 0);
    const contactReady = parents.filter((parent) => Boolean(parent.email || parent.phone)).length;
    
    const now = new Date();
    const newThisMonth = parents.filter((p: Parent) => {
      if (!p.createdAt) return false;
      const created = new Date(p.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    return { active, linkedStudents, contactReady, newThisMonth };
  }, [parents]);

  // Ensure mutations are defined
  const createParentMutation = useCreateParent();
  const updateParentMutation = useUpdateParent();
  const deleteParentMutation = useDeleteParent();

  // Map service Parent -> ParentFormModal's expected shape
  // Memoize this mapper function
  const toModalParentData = useCallback((p: Parent | null) => {
    if (!p) return undefined;
    return {
      id: String(p.id),
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      email: p.email || '',
      phone: p.phone || '',
      address: p.address || '',
      status: p.status || 'active',
    };
  }, []);

  const modalParent = useMemo(() => toModalParentData(editingParent), [editingParent, toModalParentData]);

  const handleCreateParent = useCallback(async (parentData: any) => {
    try {
      await createParentMutation.mutateAsync(parentData);
      toast.success(t('admin_parents.toast.create_success', 'Parent created successfully'));
      setShowCreateModal(false);
      refetch();
    } catch (err) {
      toast.error(t('admin_parents.toast.create_failed', 'Failed to create parent'));
      console.error('Create parent error:', err);
    }
  }, [createParentMutation, refetch, t]);

  const handleUpdateParent = useCallback(async (parentData: any) => {
    if (!editingParent) return;
    try {
      await updateParentMutation.mutateAsync({ id: editingParent.id, data: parentData });
      toast.success(t('admin_parents.toast.update_success', 'Parent updated successfully'));
      setEditingParent(null);
      refetch();
    } catch (err) {
      toast.error(t('admin_parents.toast.update_failed', 'Failed to update parent'));
      console.error('Update parent error:', err);
    }
  }, [editingParent, updateParentMutation, refetch, t]);

  const handleDeleteParent = useCallback(async (parent: Parent) => {
    if (!confirm(`${t('admin_parents.toast.delete_confirm', 'Are you sure you want to delete')} ${parent.firstName} ${parent.lastName}?`)) return;
    try {
      await deleteParentMutation.mutateAsync(parent.id);
      toast.success(t('admin_parents.toast.delete_success', 'Parent deleted successfully'));
      refetch();
    } catch (err) {
      toast.error(t('admin_parents.toast.delete_failed', 'Failed to delete parent'));
      console.error('Delete parent error:', err);
    }
  }, [deleteParentMutation, refetch, t]);

  const handleEditParent = useCallback((parent: Parent) => {
    setEditingParent(parent);
  }, []);

  const handleExport = useCallback(() => {
    if (parents.length === 0) {
      toast.error(t('admin_parents.toast.no_export_data', 'No data to export'));
      return;
    }

    const headers = [
      t('common.id', 'ID'),
      t('common.first_name', 'First Name'),
      t('common.last_name', 'Last Name'),
      t('auth.email', 'Email'),
      t('common.phone', 'Phone'),
      t('common.status', 'Status'),
      t('admin_parents.children_count', 'Children Count')
    ];
    const csvData = parents.map(p => [
      p.id,
      p.firstName,
      p.lastName,
      p.email,
      p.phone || '',
      p.status,
      p.children?.length || 0
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `parents_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('admin_parents.toast.export_success', 'Parents exported successfully'));
  }, [parents, t]);

  const handleImport = useCallback(() => {
    toast(t('admin_parents.toast.import_soon', 'Import functionality coming soon'));
  }, [t]);

  const handleMoreFilters = useCallback(() => {
    toast(t('admin_parents.toast.filters_soon', 'Advanced filters coming soon'));
  }, [t]);

  // Frontend filtering as a fallback if backend filter is partially applied or for instant UI updates
  const filteredParents = useMemo(() => {
    return parents.filter((parent: Parent) => {
      const matchesSearch =
        debouncedSearchTerm === '' ||
        `${parent.firstName} ${parent.lastName}`.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        parent.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || parent.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [parents, debouncedSearchTerm, statusFilter]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{t('admin_parents.error_loading', 'Error Loading Parents')}</h1>
        <p className="text-gray-600 mb-4">{t('admin_parents.failed_to_load', 'Failed to load parent data. Please try again.')}</p>
        <Button onClick={() => refetch()}>{t('admin_parents.retry', 'Retry')}</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin_parents.title', 'Parent Management')}</h1>
          <p className="text-gray-600 mt-1">{t('admin_parents.subtitle', 'Manage parent accounts and relationships')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="w-4 h-4 mr-2" />
            {t('admin_parents.import', 'Import')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            {t('admin_parents.export', 'Export')}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('admin_parents.add_parent', 'Add Parent')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('admin_parents.total_parents', 'Total Parents')}</p>
                <p className="text-2xl font-bold text-gray-900">{totalParents}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('admin_parents.active_parents', 'Active Parents')}</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('admin_parents.linked_students', 'Linked Students')}</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.linkedStudents}</p>
              </div>
              <Link2 className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('admin_parents.contact_ready', 'Contact Ready')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.contactReady}
                </p>
              </div>
              <Phone className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {t('admin_parents.workflow_title', 'Parent Workflow Overview')}
              </h2>
              <p className="text-sm text-slate-600">
                {t('admin_parents.workflow_desc', 'Use this page to keep parent identity, contact readiness, and student links clean across the school admin workflow.')}
              </p>
            </div>
            <Badge variant="secondary">
              {stats.newThisMonth} {t('admin_parents.new_this_month', 'new this month')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('admin_parents.search_placeholder', 'Search parents by name or email...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('admin_parents.status_all', 'All Status')}</option>
                <option value="active">{t('admin_parents.status_active', 'Active')}</option>
                <option value="inactive">{t('admin_parents.status_inactive', 'Inactive')}</option>
              </select>
              <Button variant="outline" size="sm" onClick={handleMoreFilters}>
                <Filter className="w-4 h-4 mr-2" />
                {t('admin_parents.more_filters', 'More Filters')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('admin_parents.list_title', 'Parents')} ({filteredParents.length})</span>
            <Badge variant="secondary">{filteredParents.length} {t('admin_parents.of', 'of')} {totalParents}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorBoundary
            fallback={
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">{t('admin_parents.list_error_title', 'List Display Error')}</h3>
                <p className="text-gray-600 max-w-xs mx-auto mt-2">
                  {t('admin_parents.list_error_desc', 'There was a problem displaying the parent list. Please try refreshing the page.')}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  {t('admin_parents.retry_loading', 'Retry Loading')}
                </Button>
              </div>
            }
          >
            {isLoading && parents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">{t('admin_parents.fetching_records', 'Fetching parent records...')}</p>
              </div>
            ) : (
              <ParentList
                parents={filteredParents}
                onEdit={handleEditParent}
                onDelete={handleDeleteParent}
                onView={(parent) => setViewingParent(parent)}
                isLoading={isLoading}
              />
            )}
          </ErrorBoundary>

          {/* Pagination Controls */}
          {!isLoading && totalParents > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 border-t pt-4">
              <div className="text-sm text-gray-500">
                {t('admin_parents.showing', 'Showing')}{' '}
                <span className="font-medium">{Math.min((currentPage - 1) * perPage + 1, totalParents)}</span>{' '}
                {t('admin_parents.to', 'to')}{' '}
                <span className="font-medium">{Math.min(currentPage * perPage, totalParents)}</span>{' '}
                {t('admin_parents.of', 'of')}{' '}
                <span className="font-medium">{totalParents}</span>{' '}
                {t('admin_parents.list_title', 'Parents').toLowerCase()}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t('admin_parents.previous', 'Previous')}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(totalParents / perPage)) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={isLoading}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {Math.ceil(totalParents / perPage) > 5 && <span className="px-2 text-gray-400">...</span>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalParents / perPage)))}
                  disabled={currentPage === Math.ceil(totalParents / perPage) || isLoading}
                >
                  {t('admin_parents.next', 'Next')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Parent Modal */}
      <ParentDetailsModal
        isOpen={!!viewingParent}
        onClose={() => setViewingParent(null)}
        parent={viewingParent}
      />

      {/* Create/Edit Parent Modal */}
      <ParentFormModal
        isOpen={showCreateModal || !!editingParent}
        onClose={() => {
          setShowCreateModal(false);
          setEditingParent(null);
        }}
        onSubmit={editingParent ? handleUpdateParent : handleCreateParent}
        {...(modalParent ? { parent: modalParent } : {})}
      />
    </div>
  );
};

export default ParentManagementPage;
