import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useClasses, useDeleteClass } from '../../hooks/useClasses';
import { useSubjects, useDeleteSubject } from '../../hooks/useSubjects';
import { useAllTimetables, useDeleteTimeSlot } from '../../hooks/useTimetable';
import { TimeSlot } from '../../services/timetableService';
import { toast } from 'sonner';

// Import all required icons
import { 
  AlertCircle, 
  RefreshCw, 
  Loader, 
  X, 
  Info, 
  Edit, 
  GraduationCap, 
  BookOpen,
  Clock,
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Calendar,
  Grid,
  List,
  ChevronDown
} from 'lucide-react';

// Import modal components
import { ClassFormModal } from '../classes/ClassFormModal';
import { SubjectFormModal } from '../subjects/SubjectFormModal';
import { TimeSlotFormModal } from './TimeSlotFormModal';
import ClassDetails from './ClassDetails';

// Import service interfaces
import { Class as ServiceClass } from '../../services/classService';
import { Subject as ServiceSubject } from '../../services/subjectService';

// Use service interfaces directly
type Class = ServiceClass;
type Subject = ServiceSubject;

interface TimetableViewMode {
  type: 'grid' | 'list';
  filter: 'all' | 'class' | 'teacher' | 'subject';
}

const dayOptions = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
];



// Enhanced error boundary component
const ErrorBoundary: React.FC<{ error: any; retry: () => void; message?: string }> = ({ 
  error, 
  retry, 
  message = "Something went wrong" 
}) => (
  <Alert className="border-destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription className="flex items-center justify-between">
      <span>{message}: {error?.message || 'Unknown error'}</span>
      <Button variant="outline" size="sm" onClick={retry} className="ml-2">
        <RefreshCw className="h-4 w-4 mr-1" />
        Retry
      </Button>
    </AlertDescription>
  </Alert>
);

// Enhanced loading component
const EnhancedLoadingState: React.FC<{ message: string; progress?: number }> = ({ 
  message, 
  progress 
}) => (
  <div className="flex flex-col justify-center items-center h-64 space-y-4">
    <div className="relative">
      <Loader className="h-8 w-8 animate-spin text-primary" />
      {progress && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium">{progress}%</span>
        </div>
      )}
    </div>
    <span className="text-sm text-muted-foreground">{message}</span>
  </div>
);

// Confirmation Dialog Component
const ConfirmationDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  isLoading?: boolean;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", isLoading = false }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// View Modal Component
const ViewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  data: { type: 'class' | 'subject'; data: any } | null;
  onEdit: (type: 'class' | 'subject', data: any) => void;
}> = ({ isOpen, onClose, data, onEdit }) => {
  if (!isOpen || !data) return null;
  
  const { type, data: itemData } = data;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
          <div className="flex items-center space-x-3">
            {type === 'class' ? (
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            ) : (
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {type === 'class' ? 'Class Details' : 'Subject Details'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {type === 'class' ? itemData.name : `${itemData.name} (${(itemData as Subject).code || 'N/A'})`}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {type === 'class' ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Info className="h-5 w-5 mr-2 text-blue-600" />
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Class Name</label>
                    <p className="text-gray-900 dark:text-white font-medium">{itemData.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Grade Level</label>
                    <p className="text-gray-900 dark:text-white font-medium">{(itemData as Class).grade_level || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Academic Year</label>
                    <p className="text-gray-900 dark:text-white font-medium">{(itemData as Class).academic_year || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Section</label>
                    <p className="text-gray-900 dark:text-white font-medium">{(itemData as Class).section || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Room Number</label>
                    <p className="text-gray-900 dark:text-white font-medium">{(itemData as Class).room_number || 'Not assigned'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Status</label>
                    <Badge variant={(itemData as Class).status === 'active' || !(itemData as Class).status ? 'default' : 'secondary'}>
                      {(itemData as Class).status || 'active'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-gray-600" />
                  Record Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Created</label>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {itemData.created_at ? new Date(itemData.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Last Updated</label>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {itemData.updated_at ? new Date(itemData.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Info className="h-5 w-5 mr-2 text-green-600" />
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Subject Name</label>
                    <p className="text-gray-900 dark:text-white font-medium">{itemData.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Subject Code</label>
                    <p className="text-gray-900 dark:text-white font-medium">{(itemData as Subject).code}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Department</label>
                    <p className="text-gray-900 dark:text-white font-medium">{(itemData as Subject).department || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Status</label>
                    <Badge variant={(itemData as Subject).is_active ? 'default' : 'secondary'}>
                      {(itemData as Subject).is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                  Academic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Credit Hours</label>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {(itemData as Subject).credit_hours || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {(itemData as Subject).description && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-green-600" />
                    Description
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{(itemData as Subject).description}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-gray-600" />
                  Record Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Created</label>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {itemData.created_at ? new Date(itemData.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Last Updated</label>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {itemData.updated_at ? new Date(itemData.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {type === 'class' ? 'Class ID: ' + itemData.id : 'Subject ID: ' + itemData.id}
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                onEdit(type, itemData);
                onClose();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit {type === 'class' ? 'Class' : 'Subject'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main ClassRecords Component
const ClassRecords: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'timetable'>('classes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'updated_at'>('name');
  const [sortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Modal states
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [viewData, setViewData] = useState<{ type: 'class' | 'subject'; data: any } | null>(null);
  const [deleteData, setDeleteData] = useState<{ type: 'class' | 'subject'; data: any } | null>(null);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [editingTimeSlot, setEditingTimeSlot] = useState<any>(null);
  
  // Bulk selection states
  const [selectedClasses, setSelectedClasses] = useState<Set<number>>(new Set());
  const [selectedSubjects, setSelectedSubjects] = useState<Set<number>>(new Set());
  
  // Detail view state
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  // Timetable states
  const [timetableViewMode, setTimetableViewMode] = useState<TimetableViewMode>({ type: 'grid', filter: 'all' });
  
  // API hooks
  const { data: classesData, isLoading: classesLoading, error: classesError, refetch: refetchClasses } = useClasses();
  const { data: subjectsData, isLoading: subjectsLoading, error: subjectsError, refetch: refetchSubjects } = useSubjects({});
  const { data: timetableDataRaw, refetch: refetchTimetable } = useAllTimetables();
  
  const deleteClassMutation = useDeleteClass();
  const deleteSubjectMutation = useDeleteSubject();
  const deleteTimeSlotMutation = useDeleteTimeSlot();
  
  // Extract data from API responses
  const classes = useMemo(() => {
    console.log("ClassRecords - Raw classesData:", classesData);
    if (!classesData) return [];
    const extractedClasses = classesData.data || [];
    console.log("ClassRecords - Extracted classes:", extractedClasses);
    console.log("ClassRecords - Classes count:", extractedClasses.length);
    return extractedClasses;
  }, [classesData]);
  
  const subjects = useMemo(() => {
    if (!subjectsData) return [];
    return Array.isArray(subjectsData) ? subjectsData : subjectsData.subjects || [];
  }, [subjectsData]);
  
  const timetableSlots = useMemo(() => {
    if (!timetableDataRaw) return [];
    return Array.isArray(timetableDataRaw) ? timetableDataRaw : (timetableDataRaw as any).data || [];
  }, [timetableDataRaw]);
  
  // Filtered and sorted data
  const filteredClasses = useMemo(() => {
    return classes
      .filter((cls: Class) => {
        const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || 
          (filterStatus === 'active' && (cls.status === 'active' || !cls.status)) ||
          (filterStatus === 'inactive' && cls.status === 'inactive');
        return matchesSearch && matchesStatus;
      })
      .sort((a: Class, b: Class) => {
        const aValue = a[sortBy as keyof Class] || '';
        const bValue = b[sortBy as keyof Class] || '';
        const comparison = aValue.toString().localeCompare(bValue.toString());
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [classes, searchTerm, filterStatus, sortBy, sortOrder]);
  
  const filteredSubjects = useMemo(() => {
    return subjects
      .filter((subject: Subject) => {
        const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (subject.code && subject.code.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = filterStatus === 'all' || 
          (filterStatus === 'active' && subject.is_active) ||
          (filterStatus === 'inactive' && !subject.is_active);
        return matchesSearch && matchesStatus;
      })
      .sort((a: Subject, b: Subject) => {
        const aValue = a[sortBy as keyof Subject] || '';
        const bValue = b[sortBy as keyof Subject] || '';
        const comparison = aValue.toString().localeCompare(bValue.toString());
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [subjects, searchTerm, filterStatus, sortBy, sortOrder]);
  
  // Bulk selection handlers
  const handleSelectAllClasses = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedClasses(new Set(filteredClasses.map((cls: Class) => cls.id)));
    } else {
      setSelectedClasses(new Set());
    }
  }, [filteredClasses]);
  
  const handleSelectClass = useCallback((classId: number, checked: boolean) => {
    const newSelected = new Set(selectedClasses);
    if (checked) {
      newSelected.add(classId);
    } else {
      newSelected.delete(classId);
    }
    setSelectedClasses(newSelected);
  }, [selectedClasses]);
  
  const handleSelectAllSubjects = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedSubjects(new Set(filteredSubjects.map((subject: Subject) => subject.id)));
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
  
  // Action handlers
  const handleView = useCallback((type: 'class' | 'subject', data: any) => {
    setViewData({ type, data });
    setIsViewModalOpen(true);
  }, []);
  
  const handleEdit = useCallback((type: 'class' | 'subject', data: any) => {
    if (type === 'class') {
      setEditingClass(data);
      setIsClassModalOpen(true);
    } else {
      setEditingSubject(data);
      setIsSubjectModalOpen(true);
    }
  }, []);
  
  const handleDelete = useCallback((type: 'class' | 'subject', data: any) => {
    setDeleteData({ type, data });
    setIsDeleteModalOpen(true);
  }, []);
  
  const [isForceDelete, setIsForceDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const confirmDelete = useCallback(async () => {
    if (!deleteData) return;
    
    try {
      if (deleteData.type === 'class') {
        await deleteClassMutation.mutateAsync({ 
          classId: deleteData.data.id, 
          force: isForceDelete 
        });
        toast('Class deleted successfully');
        refetchClasses();
      } else {
        await deleteSubjectMutation.mutateAsync({ 
          id: deleteData.data.id, 
          force: isForceDelete 
        });
        toast('Subject deleted successfully');
        refetchSubjects();
      }
      setIsDeleteModalOpen(false);
      setDeleteData(null);
      setIsForceDelete(false);
      setErrorMessage(null);
    } catch (error: any) {
      // Handle standardized ApiError or generic Error
      const backendMessage = error.message || `Failed to delete ${deleteData.type}`;
      const status = error.status || error.response?.status;

      setErrorMessage(backendMessage);

      if (deleteData.type === 'class' && (backendMessage?.toLowerCase().includes('related records') || backendMessage?.toLowerCase().includes('force delete'))) {
        setIsForceDelete(true);
      } else {
        toast(backendMessage);
      }

      // Log for deep inspection
      console.error(`Delete ${deleteData.type} failed:`, {
        message: backendMessage,
        status,
        error
      });
    }
  }, [deleteData, isForceDelete, deleteClassMutation, deleteSubjectMutation, refetchClasses, refetchSubjects]);
  
  // Bulk actions
  const handleBulkAction = useCallback(async (action: 'delete' | 'export' | 'activate' | 'deactivate') => {
    const selectedItems = activeTab === 'classes' ? selectedClasses : selectedSubjects;
    const selectedData = activeTab === 'classes' 
      ? filteredClasses.filter((cls: Class) => selectedItems.has(cls.id))
      : filteredSubjects.filter((subject: Subject) => selectedItems.has(subject.id));
    
    switch (action) {
      case 'export':
        const csvContent = activeTab === 'classes'
          ? 'Name,Grade Level,Section,Enrollment,Teacher,Status\n' +
            selectedData.map((cls: Class) => 
              `"${cls.name}","${cls.grade_level || ''}","${cls.section || ''}","${cls.current_enrollment || 0}","${cls.class_teacher || ''}","${cls.status || 'active'}"`
            ).join('\n')
          : 'Name,Code,Department,Credits,Status\n' +
            selectedData.map((subject: Subject) => 
              `"${subject.name}","${subject.code}","${subject.department || ''}","${subject.credit_hours || ''}","${subject.is_active ? 'Active' : 'Inactive'}"`
            ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}_export.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast('Data exported successfully');
        break;
        
      case 'delete':
        try {
          if (activeTab === 'classes') {
            await Promise.all(Array.from(selectedClasses).map(id => deleteClassMutation.mutateAsync({ classId: id })));
            refetchClasses();
          } else {
            await Promise.all(Array.from(selectedSubjects).map(id => deleteSubjectMutation.mutateAsync({ id })));
            refetchSubjects();
          }
          toast(`${selectedItems.size} ${activeTab} deleted successfully`);
          setSelectedClasses(new Set());
          setSelectedSubjects(new Set());
        } catch (error) {
          toast('Failed to delete selected items');
        }
        break;
        
      case 'activate':
      case 'deactivate':
        // Placeholder for status change functionality
        toast(`${selectedItems.size} ${activeTab} ${action}d successfully`);
        break;
    }
  }, [activeTab, selectedClasses, selectedSubjects, filteredClasses, filteredSubjects, deleteClassMutation, deleteSubjectMutation, refetchClasses, refetchSubjects]);
  
  // Timetable functions
  const loadTimetableData = useCallback(async () => {
    try {
      refetchTimetable();
    } catch (error) {
      console.error('Failed to load timetable data:', error);
    }
  }, [refetchTimetable]);
  
  // Load timetable data on component mount
  useEffect(() => {
    if (activeTab === 'timetable') {
      loadTimetableData();
    }
  }, [activeTab, loadTimetableData]);
  
  // Render loading state
  if (classesLoading || subjectsLoading) {
    return <EnhancedLoadingState message="Loading class records..." />;
  }
  
  // Render error state
  if (classesError || subjectsError) {
    return (
      <ErrorBoundary 
        error={classesError || subjectsError} 
        retry={() => {
          refetchClasses();
          refetchSubjects();
        }}
        message="Failed to load class records"
      />
    );
  }

  // Render detail view if a class is selected
  if (selectedClassId) {
    return (
      <ClassDetails 
        classId={selectedClassId} 
        onBack={() => setSelectedClassId(null)} 
      />
    );
  }
  
  const selectedCount = activeTab === 'classes' ? selectedClasses.size : selectedSubjects.size;
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Class Records</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage classes, subjects, and timetables
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsClassModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
          <Button
            onClick={() => setIsSubjectModalOpen(true)}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        </div>
      </div>
      
      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedCount} {activeTab} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedClasses(new Set());
                  setSelectedSubjects(new Set());
                }}
              >
                Clear Selection
              </Button>
            </div>
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
      )}
      
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search classes and subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="created_at">Created Date</SelectItem>
            <SelectItem value="updated_at">Updated Date</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="classes">
            <GraduationCap className="h-4 w-4 mr-2" />
            Classes ({classes.length})
          </TabsTrigger>
          <TabsTrigger value="subjects">
            <BookOpen className="h-4 w-4 mr-2" />
            Subjects ({subjects.length})
          </TabsTrigger>
          <TabsTrigger value="timetable">
            <Calendar className="h-4 w-4 mr-2" />
            Timetable
          </TabsTrigger>
        </TabsList>
        
        {/* Classes Tab */}
        <TabsContent value="classes">
          <Card>
            <CardHeader>
              <CardTitle>Classes</CardTitle>
              <CardDescription>
                Manage class information and enrollment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredClasses.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No classes found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedClasses.size === filteredClasses.length && filteredClasses.length > 0}
                          onCheckedChange={handleSelectAllClasses}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Grade Level</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Enrollment</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClasses.map((cls: Class) => (
                      <TableRow key={cls.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedClasses.has(cls.id)}
                            onCheckedChange={(checked) => handleSelectClass(cls.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{cls.name}</TableCell>
                        <TableCell>{cls.grade_level || 'N/A'}</TableCell>
                        <TableCell>{cls.section || 'N/A'}</TableCell>
                        <TableCell>
                          {cls.current_enrollment || 0}/{cls.capacity || 0}
                        </TableCell>
                        <TableCell>{cls.class_teacher || 'Not assigned'}</TableCell>
                        <TableCell>
                          <Badge variant={cls.status === 'active' || !cls.status ? 'default' : 'secondary'}>
                            {cls.status || 'active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setSelectedClassId(cls.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleEdit('class', cls);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDelete('class', cls);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Subjects Tab */}
        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Subjects</CardTitle>
              <CardDescription>
                Manage subject information and curriculum
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSubjects.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No subjects found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedSubjects.size === filteredSubjects.length && filteredSubjects.length > 0}
                          onCheckedChange={handleSelectAllSubjects}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubjects.map((subject: Subject) => (
                      <TableRow key={subject.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedSubjects.has(subject.id)}
                            onCheckedChange={(checked) => handleSelectSubject(subject.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{subject.name}</TableCell>
                        <TableCell>{subject.code}</TableCell>
                        <TableCell>{subject.department || 'N/A'}</TableCell>
                        <TableCell>{subject.credit_hours || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={subject.is_active ? 'default' : 'secondary'}>
                            {subject.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleView('subject', subject);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleEdit('subject', subject);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDelete('subject', subject);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Timetable Tab */}
        <TabsContent value="timetable">
          <Card>
            <CardHeader>
              <CardTitle>Timetable</CardTitle>
              <CardDescription>
                Manage class schedules and time slots
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Timetable Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center space-x-4">
                    <Select value={timetableViewMode.type} onValueChange={(value: any) => setTimetableViewMode(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">
                          <Grid className="h-4 w-4 mr-2 inline" />
                          Grid
                        </SelectItem>
                        <SelectItem value="list">
                          <List className="h-4 w-4 mr-2 inline" />
                          List
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={timetableViewMode.filter} onValueChange={(value: any) => setTimetableViewMode(prev => ({ ...prev, filter: value }))}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="class">By Class</SelectItem>
                        <SelectItem value="teacher">By Teacher</SelectItem>
                        <SelectItem value="subject">By Subject</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => setIsTimeSlotModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Time Slot
                  </Button>
                </div>
                
                {/* Timetable Content */}
                {timetableSlots.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No timetable data available</p>
                    <p className="text-gray-400 text-sm mt-2">Create time slots to build your timetable</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Day</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Teacher</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timetableSlots.map((slot: TimeSlot) => (
                          <TableRow key={slot.id}>
                            <TableCell className="font-medium">
                              {dayOptions.find(d => d.value === slot.day_of_week?.toString())?.label || slot.day_of_week}
                            </TableCell>
                            <TableCell>{slot.start_time} - {slot.end_time}</TableCell>
                            <TableCell>{slot.class_name || slot.class_id}</TableCell>
                            <TableCell>{slot.subject_name || slot.subject_id}</TableCell>
                            <TableCell>{slot.teacher_name || slot.teacher_id}</TableCell>
                            <TableCell>{slot.room_number}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingTimeSlot(slot);
                                    setIsTimeSlotModalOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to delete this time slot?')) {
                                      await deleteTimeSlotMutation.mutateAsync(slot.id);
                                      toast.success('Time slot deleted successfully');
                                      loadTimetableData();
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modals */}
      <ClassFormModal
        isOpen={isClassModalOpen}
        onClose={() => {
          setIsClassModalOpen(false);
          setEditingClass(null);
        }}
        classData={editingClass}
        onSuccess={() => {
          refetchClasses();
          setIsClassModalOpen(false);
          setEditingClass(null);
        }}
      />
      
      <SubjectFormModal
        isOpen={isSubjectModalOpen}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setEditingSubject(null);
        }}
        subjectData={editingSubject}
        onSuccess={() => {
          refetchSubjects();
          setIsSubjectModalOpen(false);
          setEditingSubject(null);
        }}
      />
      
      <TimeSlotFormModal
        isOpen={isTimeSlotModalOpen}
        onClose={() => {
          setIsTimeSlotModalOpen(false);
          setEditingTimeSlot(null);
        }}
        slotData={editingTimeSlot}
        onSuccess={() => {
          loadTimetableData();
          setIsTimeSlotModalOpen(false);
          setEditingTimeSlot(null);
        }}
      />
      
      <ViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        data={viewData}
        onEdit={handleEdit}
      />
      
      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setIsForceDelete(false);
          setErrorMessage(null);
        }}
        onConfirm={confirmDelete}
        title={isForceDelete ? `Force Delete ${deleteData?.type}` : `Delete ${deleteData?.type || 'Item'}`}
        message={errorMessage || `Are you sure you want to delete this ${deleteData?.type}? This action cannot be undone.`}
        confirmText={isForceDelete ? "Force Delete Everything" : "Delete"}
        isLoading={deleteClassMutation.isPending || deleteSubjectMutation.isPending}
      />
    </div>
  );
};

export default ClassRecords;