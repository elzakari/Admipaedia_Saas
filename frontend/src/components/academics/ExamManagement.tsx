import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "../ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { 
  PlusCircle, 
  Search, 
  Edit, 
  Trash2, 
  Calendar, 
  FileText,
  Download,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader,
  Filter,
  MoreHorizontal,
  Copy,
  Archive,
  RefreshCw,
  BarChart3,
  Users,
  BookOpen,
  Target
} from 'lucide-react';
import { useExams, useGradingScheme } from '../../hooks/useExams';
import { useClasses } from '../../hooks/useClasses';
import { useSubjects } from '../../hooks/useSubjects';
import { useAuth } from '../../contexts/AuthContext';
import { addDays, format, isAfter, isBefore, parseISO } from 'date-fns';
import examService from '../../services/examService';
import { ExamCreate, ExamUpdate, Exam } from '../../types/academics.types';
import { toast } from 'react-hot-toast';
import GradeEntry from './GradeEntry';
import ExamStatistics from './ExamStatistics';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

// Enhanced interfaces
interface ExamFilters {
  status?: string;
  classId?: number;
  subjectId?: number;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}

interface BulkAction {
  type: 'delete' | 'archive' | 'duplicate' | 'export';
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'destructive';
}

const ExamManagement: React.FC = () => {
  const { t } = useTranslation();

  // State management
  const [activeTab, setActiveTab] = useState('exams');
  const [filters, setFilters] = useState<ExamFilters>({});
  const [selectedExams, setSelectedExams] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForceDelete, setIsForceDelete] = useState(false);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [currentBulkAction, setCurrentBulkAction] = useState<BulkAction | null>(null);
  const [formData, setFormData] = useState<ExamCreate>({
    title: '',
    description: '',
    exam_date: '',
    duration: 60,
    total_marks: 100,
    passing_marks: 40,
    class_id: 0,
    subject_id: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'class' | 'subject'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const { user } = useAuth();
  const classesQuery = useClasses();
  const subjectsQuery = useSubjects();
  const statusOverride = useMemo(() => {
    if (activeTab === 'upcoming') return 'scheduled';
    if (activeTab === 'ongoing') return 'ongoing';
    if (activeTab === 'completed') return 'completed';
    return undefined;
  }, [activeTab]);

  const effectiveFilters = useMemo(() => ({
    ...filters,
    status: statusOverride ?? filters.status
  }), [filters, statusOverride]);

  const { exams, isLoading, isError, mutate } = useExams(effectiveFilters);
  const { gradingScheme } = useGradingScheme();

  // Extract data from query results with proper null checks
  const classes = classesQuery.data?.data || [];
  const subjects = subjectsQuery.data?.subjects || [];

  // Bulk actions configuration
  const bulkActions: BulkAction[] = useMemo(() => [
    {
      type: 'duplicate',
      label: t('admin_exams.bulk_duplicate', 'Duplicate Exams'),
      icon: <Copy className="h-4 w-4" />
    },
    {
      type: 'archive',
      label: t('admin_exams.bulk_archive', 'Archive Exams'),
      icon: <Archive className="h-4 w-4" />
    },
    {
      type: 'export',
      label: t('admin_exams.bulk_export', 'Export Data'),
      icon: <Download className="h-4 w-4" />
    },
    {
      type: 'delete',
      label: t('admin_exams.bulk_delete', 'Delete Exams'),
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive'
    }
  ], [t]);

  // Enhanced filtering and sorting
  const filteredAndSortedExams = useMemo(() => {
    let filtered = exams.filter(exam => {
      const matchesSearch = !filters.searchTerm || 
        exam.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        exam.subject?.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        exam.class_?.name.toLowerCase().includes(filters.searchTerm.toLowerCase());
      
      const matchesClass = !filters.classId || exam.class_id === filters.classId;
      const matchesSubject = !filters.subjectId || exam.subject_id === filters.subjectId;
      const matchesStatus = !effectiveFilters.status || exam.status === effectiveFilters.status;
      
      let matchesDateRange = true;
      if (filters.dateFrom || filters.dateTo) {
        const examDate = parseISO(exam.exam_date);
        if (filters.dateFrom && isBefore(examDate, parseISO(filters.dateFrom))) {
          matchesDateRange = false;
        }
        if (filters.dateTo && isAfter(examDate, parseISO(filters.dateTo))) {
          matchesDateRange = false;
        }
      }
      
      return matchesSearch && matchesClass && matchesSubject && matchesStatus && matchesDateRange;
    });

    // Sort exams
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'class':
          comparison = (a.class_?.name || '').localeCompare(b.class_?.name || '');
          break;
        case 'subject':
          comparison = (a.subject?.name || '').localeCompare(b.subject?.name || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [exams, filters.searchTerm, filters.classId, filters.subjectId, filters.dateFrom, filters.dateTo, effectiveFilters.status, sortBy, sortOrder]);

  // Enhanced form handling
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleFilterChange = useCallback((key: keyof ExamFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Bulk selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedExams(new Set(filteredAndSortedExams.map(exam => exam.id)));
    } else {
      setSelectedExams(new Set());
    }
  }, [filteredAndSortedExams]);

  const handleSelectExam = useCallback((examId: number, checked: boolean) => {
    setSelectedExams(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(examId);
      } else {
        newSet.delete(examId);
      }
      return newSet;
    });
  }, []);

  // Enhanced conflict checking
  const checkExamConflicts = async (examData: ExamCreate | ExamUpdate, examId?: number) => {
    try {
      const classId = 'class_id' in examData ? examData.class_id : currentExam?.class_id;
      const examDate = 'exam_date' in examData ? examData.exam_date : currentExam?.exam_date;
      
      if (!classId || !examDate) {
        return null;
      }
      
      const examsResponse = await examService.getExams({
        class_id: classId,
        date_from: examDate.split('T')[0],
        date_to: examDate.split('T')[0]
      });
      
      const examsForDay = examsResponse.data || [];
      const otherExams = examId ? examsForDay.filter(exam => exam.id !== examId) : examsForDay;
      
      const examDateTime = new Date(examDate);
      const examEndTime = new Date(examDateTime.getTime() + (examData.duration || 60) * 60000);
      
      const conflicts = otherExams.filter(exam => {
        const existingDateTime = new Date(exam.exam_date);
        const existingEndTime = new Date(existingDateTime.getTime() + exam.duration * 60000);
        
        return (examDateTime < existingEndTime && examEndTime > existingDateTime);
      });
      
      return conflicts.length > 0 ? conflicts : null;
    } catch (error) {
      console.error('Error checking exam conflicts:', error);
      return null;
    }
  };

  // Enhanced CRUD operations
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate form data
      if (!formData.title || !formData.exam_date || !formData.class_id || !formData.subject_id) {
        toast.error(t('admin_exams.error_fill_required', 'Please fill in all required fields'));
        return;
      }
      
      // Check for conflicts
      const conflicts = await checkExamConflicts(formData);
      if (conflicts && conflicts.length > 0) {
        toast.error(t('admin_exams.error_conflicts', 'Exam conflicts with {{count}} existing exam(s). Please choose a different time.', { count: conflicts.length }));
        return;
      }
      
      await examService.createExam(formData);
      toast.success(t('admin_exams.success_create', 'Exam created successfully'));
      setIsCreateDialogOpen(false);
      resetForm();
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('admin_exams.failed_create', 'Failed to create exam'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExam) return;
    
    setIsSubmitting(true);
    try {
      const updateData: ExamUpdate = {
        title: formData.title,
        description: formData.description,
        exam_date: formData.exam_date,
        duration: formData.duration,
        total_marks: formData.total_marks,
        passing_marks: formData.passing_marks,
        status: formData.status as 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
      };
      
      // Check for conflicts when updating
      const conflicts = await checkExamConflicts(updateData, currentExam.id);
      if (conflicts && conflicts.length > 0) {
        toast.error(t('admin_exams.error_conflicts', 'Exam conflicts with {{count}} existing exam(s). Please choose a different time.', { count: conflicts.length }));
        return;
      }
      
      await examService.updateExam(currentExam.id, updateData);
      toast.success(t('admin_exams.success_update', 'Exam updated successfully'));
      setIsEditDialogOpen(false);
      resetForm();
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('admin_exams.failed_update', 'Failed to update exam'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk operations
  const handleBulkAction = async (action: BulkAction) => {
    if (selectedExams.size === 0) {
      toast.error(t('admin_exams.error_select_exams', 'Please select exams to perform bulk action'));
      return;
    }
    
    setCurrentBulkAction(action);
    setIsBulkActionDialogOpen(true);
  };

  const executeBulkAction = async () => {
    if (!currentBulkAction || selectedExams.size === 0) return;
    
    setIsSubmitting(true);
    try {
      const examIds = Array.from(selectedExams);
      
      switch (currentBulkAction.type) {
        case 'delete':
          await Promise.all(examIds.map(id => examService.deleteExam(id)));
          toast.success(t('admin_exams.success_bulk_delete', '{{count}} exams deleted successfully', { count: examIds.length }));
          break;
        case 'duplicate':
          {
            const originals = exams.filter(e => examIds.includes(e.id));
            const results = await Promise.allSettled(originals.map(async (e) => {
              const nextDate = addDays(new Date(e.exam_date), 7).toISOString();
              return examService.createExam({
                title: t('admin_exams.duplicate_suffix', '{{title}} (Copy)', { title: e.title }),
                description: e.description || '',
                exam_date: nextDate,
                duration: e.duration,
                total_marks: e.total_marks,
                passing_marks: e.passing_marks,
                class_id: e.class_id,
                subject_id: e.subject_id,
                status: 'scheduled'
              });
            }));

            const ok = results.filter(r => r.status === 'fulfilled').length;
            const fail = results.length - ok;
            if (ok) toast.success(t('admin_exams.success_bulk_duplicate', '{{count}} exams duplicated successfully', { count: ok }));
            if (fail) toast.error(t('admin_exams.failed_bulk_duplicate', '{{count}} exams failed to duplicate', { count: fail }));
          }
          break;
        case 'archive':
          await Promise.all(examIds.map(id => examService.updateExam(id, { status: 'cancelled' })));
          toast.success(t('admin_exams.success_bulk_archive', '{{count}} exams archived successfully', { count: examIds.length }));
          break;
        case 'export':
          {
            const selected = exams.filter(e => examIds.includes(e.id));
            const lines = ['id,title,class,subject,exam_date,duration,total_marks,passing_marks,status'];
            selected.forEach((e) => {
              const cls = (e.class_?.name || '').replace(/"/g, '""');
              const sub = (e.subject?.name || '').replace(/"/g, '""');
              const title = (e.title || '').replace(/"/g, '""');
              lines.push(`${e.id},"${title}","${cls}","${sub}",${e.exam_date},${e.duration},${e.total_marks},${e.passing_marks},${e.status}`);
            });
            const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `exams_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success(t('admin_exams.success_bulk_export', 'Exam data exported successfully'));
          }
          break;
      }
      
      setSelectedExams(new Set());
      setIsBulkActionDialogOpen(false);
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('admin_exams.failed_bulk_action', 'Failed to perform bulk action'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      exam_date: '',
      duration: 60,
      total_marks: 100,
      passing_marks: 40,
      class_id: 0,
      subject_id: 0,
    });
    setCurrentExam(null);
  };

  const openEditDialog = (exam: Exam) => {
    setCurrentExam(exam);
    setFormData({
      title: exam.title,
      description: exam.description || '',
      exam_date: exam.exam_date,
      duration: exam.duration,
      total_marks: exam.total_marks,
      passing_marks: exam.passing_marks,
      class_id: exam.class_id,
      subject_id: exam.subject_id,
      status: exam.status
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { label: t('admin_exams.status_scheduled', 'Scheduled'), className: 'bg-blue-50 text-blue-700 border-blue-200' },
      ongoing: { label: t('admin_exams.status_ongoing', 'Ongoing'), className: 'bg-green-50 text-green-700 border-green-200' },
      completed: { label: t('admin_exams.status_completed', 'Completed'), className: 'bg-gray-50 text-gray-700 border-gray-200' },
      cancelled: { label: t('admin_exams.status_cancelled', 'Cancelled'), className: 'bg-red-50 text-red-700 border-red-200' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: '' };
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  // Loading and error states
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 font-sans">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">{t('admin_exams.loading_exams', 'Loading exams...')}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md font-sans">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <p>{t('admin_exams.error_load_exams', 'Failed to load exams. Please try again later.')}</p>
        </div>
        <Button onClick={() => mutate()} className="mt-2" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.retry', 'Retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="exams" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>{t('admin_exams.tab_all_exams', 'All Exams')}</span>
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            <Clock className="h-4 w-4 mr-2" />
            {t('admin_exams.tab_upcoming', 'Upcoming')}
          </TabsTrigger>
          <TabsTrigger value="ongoing">
            <CheckCircle className="h-4 w-4 mr-2" />
            {t('admin_exams.tab_ongoing', 'Ongoing')}
          </TabsTrigger>
          <TabsTrigger value="completed">
            <Archive className="h-4 w-4 mr-2" />
            {t('admin_exams.tab_completed', 'Completed')}
          </TabsTrigger>
          <TabsTrigger value="grades">
            <Target className="h-4 w-4 mr-2" />
            {t('admin_exams.tab_grade_entry', 'Grade Entry')}
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('admin_exams.tab_statistics', 'Statistics')}
          </TabsTrigger>
        </TabsList>
        
        {/* Enhanced Exams Tab */}
        <TabsContent value={activeTab === 'grades' || activeTab === 'statistics' ? 'exams' : activeTab} className="space-y-4">
          {/* Enhanced Controls */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder={t('admin_exams.search_placeholder', 'Search exams...')}
                  className="pl-8"
                  value={filters.searchTerm || ''}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                />
              </div>
              
              {/* Filter Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>{t('common.filters', 'Filters')}</span>
                {Object.keys(filters).filter(key => filters[key as keyof ExamFilters]).length > 1 && (
                  <Badge variant="secondary" className="ml-1">
                    {Object.keys(filters).filter(key => filters[key as keyof ExamFilters]).length - 1}
                  </Badge>
                )}
              </Button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Bulk Actions */}
              {selectedExams.size > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      {t('admin_exams.bulk_actions', 'Bulk Actions ({{count}})', { count: selectedExams.size })}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {bulkActions.map((action) => (
                      <DropdownMenuItem
                        key={action.type}
                        onClick={() => handleBulkAction(action)}
                        className={action.variant === 'destructive' ? 'text-red-600' : ''}
                      >
                        {action.icon}
                        <span className="ml-2">{action.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Create Exam */}
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="glass-button">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('admin_exams.add_exam_btn', 'Add Exam')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] font-sans">
                  <DialogHeader>
                    <DialogTitle>{t('admin_exams.create_exam_title', 'Create New Exam')}</DialogTitle>
                    <DialogDescription>
                      {t('admin_exams.create_exam_desc', 'Set up a new examination with schedule and grading details.')}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateExam}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="title" className="text-right text-sm font-medium">
                          {t('admin_exams.title_label', 'Exam Title *')}
                        </label>
                        <Input 
                          id="title" 
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          className="col-span-3" 
                          placeholder={t('admin_exams.title_placeholder', 'e.g. First Term Mathematics Exam')} 
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="class_id" className="text-right text-sm font-medium">
                          {t('admin_exams.class_label', 'Class *')}
                        </label>
                        <Select value={formData.class_id.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, class_id: parseInt(value) }))}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder={t('admin_exams.select_class', 'Select class')} />
                          </SelectTrigger>
                          <SelectContent>
                            {classes?.map((cls) => (
                              cls.id != null ? (
                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                  {cls.name}
                                </SelectItem>
                              ) : null
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="subject_id" className="text-right text-sm font-medium">
                          {t('admin_exams.subject_label', 'Subject *')}
                        </label>
                        <Select value={formData.subject_id.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, subject_id: parseInt(value) }))}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder={t('admin_exams.select_subject', 'Select subject')} />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects?.map((subject) => (
                              subject.id != null ? (
                                <SelectItem key={subject.id} value={subject.id.toString()}>
                                  {subject.name}
                                </SelectItem>
                              ) : null
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="exam_date" className="text-right text-sm font-medium">
                          {t('admin_exams.datetime_label', 'Date & Time *')}
                        </label>
                        <Input 
                          id="exam_date" 
                          name="exam_date"
                          type="datetime-local"
                          value={formData.exam_date}
                          onChange={handleInputChange}
                          className="col-span-3" 
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <label htmlFor="duration" className="text-right text-sm font-medium">
                            {t('admin_exams.duration_label', 'Duration (min)')}
                          </label>
                          <Input 
                            id="duration" 
                            name="duration"
                            type="number"
                            value={formData.duration}
                            onChange={handleInputChange}
                            className="col-span-3" 
                            min={5}
                            required
                          />
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                          <label htmlFor="total_marks" className="text-right text-sm font-medium">
                            {t('admin_exams.total_marks_label', 'Total Marks')}
                          </label>
                          <Input 
                            id="total_marks" 
                            name="total_marks"
                            type="number"
                            value={formData.total_marks}
                            onChange={handleInputChange}
                            className="col-span-3"
                            min={0}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="passing_marks" className="text-right text-sm font-medium">
                          {t('admin_exams.passing_marks_label', 'Passing Marks')}
                        </label>
                        <Input 
                          id="passing_marks" 
                          name="passing_marks"
                          type="number"
                          value={formData.passing_marks}
                          onChange={handleInputChange}
                          className="col-span-3"
                          min={0}
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="description" className="text-right text-sm font-medium">
                          {t('admin_exams.description_label', 'Description')}
                        </label>
                        <textarea 
                          id="description" 
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          className="col-span-3 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm" 
                          placeholder={t('admin_exams.description_placeholder', 'Additional exam details (optional)')}
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        {t('common.cancel', 'Cancel')}
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                            {t('common.creating', 'Creating...')}
                          </>
                        ) : (
                          t('admin_exams.create_exam_btn', 'Create Exam')
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Edit Exam Dialog */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px] font-sans">
                  <DialogHeader>
                    <DialogTitle>{t('admin_exams.edit_exam_title', 'Edit Exam')}</DialogTitle>
                    <DialogDescription>
                      {t('admin_exams.edit_exam_desc', 'Update the examination schedule and grading details.')}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateExam}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="edit_title" className="text-right text-sm font-medium">
                          {t('admin_exams.title_label', 'Exam Title *')}
                        </label>
                        <Input 
                          id="edit_title" 
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          className="col-span-3" 
                          placeholder={t('admin_exams.title_placeholder', 'e.g. First Term Mathematics Exam')} 
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="edit_class_id" className="text-right text-sm font-medium">
                          {t('admin_exams.class_label', 'Class *')}
                        </label>
                        <Select 
                          value={formData.class_id.toString()} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, class_id: parseInt(value) }))}
                          disabled={true}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder={t('admin_exams.select_class', 'Select class')} />
                          </SelectTrigger>
                          <SelectContent>
                            {classes?.map((cls) => (
                              cls.id != null ? (
                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                  {cls.name}
                                </SelectItem>
                              ) : null
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="edit_subject_id" className="text-right text-sm font-medium">
                          {t('admin_exams.subject_label', 'Subject *')}
                        </label>
                        <Select 
                          value={formData.subject_id.toString()} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, subject_id: parseInt(value) }))}
                          disabled={true}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder={t('admin_exams.select_subject', 'Select subject')} />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects?.map((subject) => (
                              subject.id != null ? (
                                <SelectItem key={subject.id} value={subject.id.toString()}>
                                  {subject.name}
                                </SelectItem>
                              ) : null
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="edit_exam_date" className="text-right text-sm font-medium">
                          {t('admin_exams.datetime_label', 'Date & Time *')}
                        </label>
                        <Input 
                          id="edit_exam_date" 
                          name="exam_date"
                          type="datetime-local"
                          value={formData.exam_date ? format(new Date(formData.exam_date), "yyyy-MM-dd'T'HH:mm") : ''}
                          onChange={handleInputChange}
                          className="col-span-3" 
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <label htmlFor="edit_duration" className="text-right text-sm font-medium">
                            {t('admin_exams.duration_label', 'Duration (min)')}
                          </label>
                          <Input 
                            id="edit_duration" 
                            name="duration"
                            type="number"
                            value={formData.duration}
                            onChange={handleInputChange}
                            className="col-span-3" 
                            min={5}
                            required
                          />
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                          <label htmlFor="edit_total_marks" className="text-right text-sm font-medium">
                            {t('admin_exams.total_marks_label', 'Total Marks')}
                          </label>
                          <Input 
                            id="edit_total_marks" 
                            name="total_marks"
                            type="number"
                            value={formData.total_marks}
                            onChange={handleInputChange}
                            className="col-span-3"
                            min={0}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="edit_passing_marks" className="text-right text-sm font-medium">
                          {t('admin_exams.passing_marks_label', 'Passing Marks')}
                        </label>
                        <Input 
                          id="edit_passing_marks" 
                          name="passing_marks"
                          type="number"
                          value={formData.passing_marks}
                          onChange={handleInputChange}
                          className="col-span-3"
                          min={0}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="edit_status" className="text-right text-sm font-medium">
                          {t('admin_exams.status_label', 'Status')}
                        </label>
                        <Select 
                          value={formData.status || 'scheduled'} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">{t('admin_exams.status_scheduled', 'Scheduled')}</SelectItem>
                            <SelectItem value="ongoing">{t('admin_exams.status_ongoing', 'Ongoing')}</SelectItem>
                            <SelectItem value="completed">{t('admin_exams.status_completed', 'Completed')}</SelectItem>
                            <SelectItem value="cancelled">{t('admin_exams.status_cancelled', 'Cancelled')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="edit_description" className="text-right text-sm font-medium">
                          {t('admin_exams.description_label', 'Description')}
                        </label>
                        <textarea 
                          id="edit_description" 
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          className="col-span-3 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm" 
                          placeholder={t('admin_exams.description_placeholder', 'Additional exam details (optional)')}
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                        {t('common.cancel', 'Cancel')}
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                            {t('common.updating', 'Updating...')}
                          </>
                        ) : (
                          t('admin_exams.update_exam_btn', 'Update Exam')
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Advanced Filters */}
          {showFilters && (
            <Card className="p-4 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('admin_exams.status_label', 'Status')}</label>
                  <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_exams.all_statuses', 'All statuses')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin_exams.all_statuses', 'All statuses')}</SelectItem>
                      <SelectItem value="scheduled">{t('admin_exams.status_scheduled', 'Scheduled')}</SelectItem>
                      <SelectItem value="ongoing">{t('admin_exams.status_ongoing', 'Ongoing')}</SelectItem>
                      <SelectItem value="completed">{t('admin_exams.status_completed', 'Completed')}</SelectItem>
                      <SelectItem value="cancelled">{t('admin_exams.status_cancelled', 'Cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('admin_exams.class_label', 'Class')}</label>
                  <Select value={filters.classId?.toString() || 'all'} onValueChange={(value) => handleFilterChange('classId', value === 'all' ? undefined : parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_exams.all_classes', 'All classes')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin_exams.all_classes', 'All classes')}</SelectItem>
                      {classes?.map((cls) => (
                        cls.id != null ? (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name}
                          </SelectItem>
                        ) : null
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('admin_exams.subject_label', 'Subject')}</label>
                  <Select value={filters.subjectId?.toString() || 'all'} onValueChange={(value) => handleFilterChange('subjectId', value === 'all' ? undefined : parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_exams.all_subjects', 'All subjects')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin_exams.all_subjects', 'All subjects')}</SelectItem>
                      {subjects?.map((subject) => (
                        subject.id != null ? (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ) : null
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('admin_exams.sort_by_label', 'Sort By')}</label>
                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                    const [field, order] = value.split('-');
                    setSortBy(field as any);
                    setSortOrder(order as any);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">{t('admin_exams.sort_date_newest', 'Date (Newest)')}</SelectItem>
                      <SelectItem value="date-asc">{t('admin_exams.sort_date_oldest', 'Date (Oldest)')}</SelectItem>
                      <SelectItem value="title-asc">{t('admin_exams.sort_title_asc', 'Title (A-Z)')}</SelectItem>
                      <SelectItem value="title-desc">{t('admin_exams.sort_title_desc', 'Title (Z-A)')}</SelectItem>
                      <SelectItem value="class-asc">{t('admin_exams.sort_class_asc', 'Class (A-Z)')}</SelectItem>
                      <SelectItem value="subject-asc">{t('admin_exams.sort_subject_asc', 'Subject (A-Z)')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  {t('admin_exams.showing_exams_count', 'Showing {{count}} of {{total}} exams', { count: filteredAndSortedExams.length, total: exams.length })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({ searchTerm: filters.searchTerm })}
                >
                  {t('admin_exams.clear_filters', 'Clear Filters')}
                </Button>
              </div>
            </Card>
          )}
          
          {/* Enhanced Exams Table */}
          <div className="border rounded-md overflow-hidden font-sans">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedExams.size === filteredAndSortedExams.length && filteredAndSortedExams.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[250px]">{t('admin_exams.title_header', 'Exam Title')}</TableHead>
                  <TableHead>{t('admin_exams.class_header', 'Class')}</TableHead>
                  <TableHead>{t('admin_exams.subject_header', 'Subject')}</TableHead>
                  <TableHead>{t('admin_exams.datetime_header', 'Date & Time')}</TableHead>
                  <TableHead>{t('admin_exams.duration_header', 'Duration')}</TableHead>
                  <TableHead>{t('admin_exams.status_header', 'Status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedExams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center space-y-2">
                        <BookOpen className="h-8 w-8 text-gray-400" />
                        <p>{t('admin_exams.no_exams_found', 'No exams found')}</p>
                        <p className="text-sm">{t('admin_exams.no_exams_desc', 'Create your first exam or adjust your filters')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedExams.map((exam) => (
                    <TableRow 
                      key={exam.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedExam(exam.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedExams.has(exam.id)}
                          onCheckedChange={(checked) => handleSelectExam(exam.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{exam.title}</div>
                          {exam.description && (
                            <div className="text-sm text-gray-500 truncate max-w-[200px]">
                              {exam.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{exam.class_?.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4 text-gray-400" />
                          <span>{exam.subject?.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div>{format(new Date(exam.exam_date), 'PPP')}</div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(exam.exam_date), 'p')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{exam.duration} {t('admin_exams.minutes_abbr', 'min')}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(exam.status)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditDialog(exam)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setCurrentExam(exam);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        {/* Other tabs remain the same but with enhanced UI */}
        <TabsContent value="grades" className="space-y-4">
          {selectedExam ? (
            <GradeEntry examId={selectedExam} />
          ) : (
            <div className="p-8 text-center font-sans">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">{t('admin_exams.select_exam_grades', 'Select an exam to enter grades')}</p>
              <p className="text-sm text-gray-400">{t('admin_exams.select_exam_grades_desc', 'Choose an exam from the table above to start entering student grades')}</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="statistics" className="space-y-4">
          {selectedExam ? (
            <ExamStatistics examId={selectedExam} />
          ) : (
            <div className="p-8 text-center font-sans">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">{t('admin_exams.select_exam_statistics', 'Select an exam to view statistics')}</p>
              <p className="text-sm text-gray-400">{t('admin_exams.select_exam_statistics_desc', 'Choose an exam from the table above to view detailed analytics')}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Enhanced Delete Dialog */}
      <Dialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setIsForceDelete(false);
        }}
      >
        <DialogContent className="font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span>{isForceDelete ? t('admin_exams.confirm_force_delete', 'Confirm Force Delete') : t('admin_exams.delete_exam', 'Delete Exam')}</span>
            </DialogTitle>
            <DialogDescription>
              {isForceDelete ? (
                <div className="bg-red-50 p-3 rounded-md border border-red-200 text-red-700">
                  <p className="font-bold mb-2 uppercase text-xs">⚠️ {t('admin_exams.warning_critical', 'Warning: Critical Action')}</p>
                  <p>{t('admin_exams.force_delete_confirm', 'Are you sure you want to FORCE DELETE "{{title}}"?', { title: currentExam?.title })}</p>
                  <p className="mt-2 text-sm">{t('admin_exams.force_delete_desc', 'This will permanently remove all associated student grades. This action cannot be reversed.')}</p>
                </div>
              ) : (
                <>
                  {t('admin_exams.delete_confirm', 'Are you sure you want to delete "{{title}}"? This action cannot be undone and will also delete all associated grades.', { title: currentExam?.title })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteDialogOpen(false);
              setIsForceDelete(false);
            }}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (!currentExam) return;
                setIsSubmitting(true);
                try {
                  await examService.deleteExam(currentExam.id, isForceDelete);
                  toast.success(isForceDelete ? t('admin_exams.success_force_delete', 'Exam and all associated grades deleted') : t('admin_exams.success_delete_exam', 'Exam deleted successfully'));
                  setIsDeleteDialogOpen(false);
                  setIsForceDelete(false);
                  mutate();
                } catch (error: any) {
                  const errorMessage = error.response?.data?.message || '';
                  if (errorMessage.includes('force delete')) {
                    setIsForceDelete(true);
                  } else {
                    toast.error(errorMessage || t('admin_exams.failed_delete', 'Failed to delete exam'));
                  }
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  {isForceDelete ? t('admin_exams.force_deleting', 'Force Deleting...') : t('common.deleting', 'Deleting...')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isForceDelete ? t('admin_exams.force_delete_btn', 'Yes, Force Delete Everything') : t('common.delete', 'Delete')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
        <DialogContent className="font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {currentBulkAction?.icon}
              <span>{currentBulkAction?.label}</span>
            </DialogTitle>
            <DialogDescription>
              {t('admin_exams.bulk_confirm_desc', 'Are you sure you want to {{action}} {{count}} selected exam(s)?', { action: currentBulkAction?.type, count: selectedExams.size })}
              {currentBulkAction?.type === 'delete' && ' ' + t('admin_exams.undone_warning', 'This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkActionDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              variant={currentBulkAction?.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={executeBulkAction}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.processing', 'Processing...')}
                </>
              ) : (
                <>
                  {currentBulkAction?.icon}
                  <span className="ml-2">{t('common.confirm', 'Confirm')}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamManagement;
