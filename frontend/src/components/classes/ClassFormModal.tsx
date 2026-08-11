// ClassFormModal component
import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/use-toast';
import { Loader2, AlertCircle, RefreshCw, Plus, Settings2, X } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import teacherService from '../../services/teacherService';
import classService from '../../services/classService';
import academicService from '../../services/academicService';
import authService, { User } from '../../services/authService';
import { useTranslation } from 'react-i18next';

interface ClassFormData {
  name: string;
  grade_level: string;
  section: string;
  academic_year: string;
  room_number: string;
  capacity: string;
  teacher_id: string;
  description: string;
  age_min: string;
  age_max: string;
}

interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  classData?: any;
}

const ClassFormModal: React.FC<ClassFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  classData
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [formData, setFormData] = useState<ClassFormData>({
    name: '',
    grade_level: '',
    section: '',
    academic_year: '',
    room_number: '',
    capacity: '',
    teacher_id: '',
    description: '',
    age_min: '',
    age_max: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  const [gradeCreateOpen, setGradeCreateOpen] = useState(false);
  const [gradeCreateName, setGradeCreateName] = useState('');
  const [gradeCreateCode, setGradeCreateCode] = useState('');
  const [gradeCreateOrder, setGradeCreateOrder] = useState('');
  const [gradeCreateSubmitting, setGradeCreateSubmitting] = useState(false);
  const [gradeCreateErrors, setGradeCreateErrors] = useState<{ name?: string }>({});
  const [gradeManageOpen, setGradeManageOpen] = useState(false);
  const [gradeEditId, setGradeEditId] = useState<string | null>(null);
  const [gradeEditName, setGradeEditName] = useState('');
  const [gradeEditCode, setGradeEditCode] = useState('');
  const [gradeEditOrder, setGradeEditOrder] = useState('');
  const [gradeEditSubmitting, setGradeEditSubmitting] = useState(false);
  const [gradeEditErrors, setGradeEditErrors] = useState<{ name?: string }>({});
  const [gradeDeleteId, setGradeDeleteId] = useState<string | null>(null);
  const [gradeDeleteSubmitting, setGradeDeleteSubmitting] = useState(false);
  const [gradePendingId, setGradePendingId] = useState<string | null>(null);

  // Fetch current user for role-based access control
  const {
    data: currentUser,
    isLoading: isLoadingCurrentUser
  } = useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Enhanced teacher data fetching with better error handling
  const {
    data: teachersData,
    isLoading: isLoadingTeachers,
    error: teachersError,
    refetch: refetchTeachers,
    isRefetching: isRefetchingTeachers
  } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teacherService.getTeachers({ per_page: 1000 }),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch standardized grade levels sequentially
  const {
    data: gradeLevelsData,
    isLoading: isLoadingGradeLevels,
    error: gradeLevelsError,
  } = useQuery({
    queryKey: ['standardGradeLevels'],
    queryFn: () => academicService.getStandardGradeLevels(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const normalizedGradeLevels = React.useMemo(() => {
    if (!Array.isArray(gradeLevelsData)) return [];
    const seen = new Map<string, { display_name: string; cnt: number }>();
    return gradeLevelsData
      .filter((l: any) => !!l && !!l.id)
      .map((lvl: any) => {
        const baseName = (lvl.display_name || lvl.name || `Grade ${lvl.numeric_value || lvl.order_index || ''}`).toString().trim();
        const code = (lvl.code || '').toString().trim();
        const display = baseName + (code ? ` · ${code}` : '');
        const serverNoteRaw = (lvl.note || '').toString().trim();
        const isDupServer = !!serverNoteRaw || /\(#\d+\)$/.test(baseName);
        // Secondary dedupe on the frontend as a safety net against any duplicates from the backend
        const prev = seen.get(baseName) || { cnt: 0, display_name: '' };
        const nextCnt = prev.cnt + 1;
        let finalDisplay = display;
        if (nextCnt > 1 && !baseName.includes('(')) {
          finalDisplay = `${baseName} (#${nextCnt})${code ? ` · ${code}` : ''}`;
        }
        seen.set(baseName, { cnt: nextCnt, display_name: finalDisplay });
        const isDuplicate = isDupServer || nextCnt > 1;
        return {
          id: String(lvl.id),
          display_name: finalDisplay,
          name: baseName,
          code,
          order_index: typeof lvl.order_index === 'number' ? lvl.order_index : 0,
          note: serverNoteRaw || (nextCnt > 1 ? `Shared name — ${nextCnt} grade-level rows exist with this label` : null),
          isDuplicate,
        };
      })
      .sort((a, b) => {
        if (a.order_index === b.order_index) {
          return a.display_name.localeCompare(b.display_name);
        }
        return (a.order_index || 0) - (b.order_index || 0);
      });
  }, [gradeLevelsData]);

  // Enhanced teacher options with better error handling
  const teacherOptions = React.useMemo(() => {
    if (!teachersData?.teachers) return [];
    return teachersData.teachers.map((teacher: any) => ({
      value: teacher.id.toString(),
      label: `${teacher.first_name} ${teacher.last_name}`,
      email: teacher.email
    }));
  }, [teachersData]);

  const allTeacherOptions = React.useMemo(() => [
    { value: 'none', label: t('classes.form.no_teacher_assigned', 'No Teacher Assigned'), email: '' },
    ...teacherOptions
  ], [teacherOptions, t]);

  const openCreateGrade = () => {
    setGradeCreateName('');
    setGradeCreateCode('');
    setGradeCreateOrder('');
    setGradeCreateErrors({});
    setGradeCreateOpen(true);
  };

  const closeCreateGrade = () => {
    if (gradeCreateSubmitting) return;
    setGradeCreateOpen(false);
  };

  const submitCreateGrade = async () => {
    const trimmed = gradeCreateName.trim();
    if (!trimmed) {
      setGradeCreateErrors({ name: t('classes_page.form.err_grade_name_required', 'Grade level name is required') });
      return;
    }
    if (trimmed.length > 255) {
      setGradeCreateErrors({ name: t('classes_page.form.err_grade_name_length', 'Grade name must be 255 characters or less') });
      return;
    }
    try {
      setGradeCreateSubmitting(true);
      setGradeCreateErrors({});
      const payload: any = { name: trimmed };
      if (gradeCreateCode.trim()) payload.code = gradeCreateCode.trim();
      const orderNum = gradeCreateOrder.trim() !== '' ? Number(gradeCreateOrder) : null;
      if (orderNum !== null && Number.isFinite(orderNum) && Number.isInteger(orderNum) && orderNum >= 0) {
        payload.order_index = orderNum;
      }
      const newLevel: any = await academicService.createGradeLevel(payload);
      await queryClient.invalidateQueries({ queryKey: ['standardGradeLevels'] });
      toast({
        title: t('common.success', 'Success'),
        description: t('classes_page.form.grade_created', `Created grade level "{{name}}"`, { name: newLevel?.name || trimmed }),
        variant: 'default',
      });
      setGradeCreateOpen(false);
      if (newLevel && newLevel.id) {
        setFormData(prev => ({ ...prev, grade_level: String(newLevel.id) }));
        if (errors.grade_level) setErrors(prev => ({ ...prev, grade_level: '' }));
      }
    } catch (err: any) {
      const msg = err?.message || t('classes_page.form.grade_create_failed', 'Failed to create grade level');
      setGradeCreateErrors({ name: msg });
      toast({
        title: t('common.error', 'Error'),
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setGradeCreateSubmitting(false);
    }
  };

  const openManageGrade = (existingId?: string) => {
    const list = normalizedGradeLevels;
    if (existingId) {
      const found = list.find(g => g.id === existingId);
      setGradeEditId(existingId);
      setGradeEditName(found?.name ? found.name.replace(/\s*\(#\d+\)$/, '').trim() : '');
      setGradeEditCode(found?.code || '');
      setGradeEditOrder((found && typeof found.order_index === 'number' && found.order_index > 0) ? String(found.order_index) : '');
    } else {
      setGradeEditId(null);
      setGradeEditName('');
      setGradeEditCode('');
      setGradeEditOrder('');
    }
    setGradeEditErrors({});
    setGradeDeleteId(null);
    setGradeManageOpen(true);
  };

  const closeManageGrade = () => {
    if (gradeEditSubmitting || gradeDeleteSubmitting) return;
    setGradeManageOpen(false);
    setGradeEditId(null);
    setGradeDeleteId(null);
  };

  const openDeleteGrade = (levelId: string) => {
    if (gradeEditSubmitting || gradeDeleteSubmitting) return;
    const found = normalizedGradeLevels.find(g => g.id === levelId);
    if (!found) return;
    setGradeDeleteId(levelId);
  };

  const closeDeleteGrade = () => {
    if (gradeDeleteSubmitting) return;
    setGradeDeleteId(null);
  };

  const submitManageGrade = async () => {
    const trimmed = gradeEditName.trim();
    if (!trimmed) {
      setGradeEditErrors({ name: t('classes_page.form.err_grade_name_required', 'Grade level name is required') });
      return;
    }
    if (trimmed.length > 255) {
      setGradeEditErrors({ name: t('classes_page.form.err_grade_name_length', 'Grade name must be 255 characters or less') });
      return;
    }
    if (!gradeEditId) {
      setGradeManageOpen(false);
      return;
    }
    try {
      setGradeEditSubmitting(true);
      setGradeEditErrors({});
      const payload: any = { name: trimmed };
      payload.code = gradeEditCode.trim() || null;
      const orderNum = gradeEditOrder.trim() !== '' ? Number(gradeEditOrder) : null;
      if (orderNum !== null && Number.isFinite(orderNum) && Number.isInteger(orderNum) && orderNum >= 0) {
        payload.order_index = orderNum;
      } else {
        payload.order_index = null;
      }
      const updated: any = await academicService.updateGradeLevel(gradeEditId, payload);
      await queryClient.invalidateQueries({ queryKey: ['standardGradeLevels'] });
      toast({
        title: t('common.success', 'Success'),
        description: t('classes_page.form.grade_updated', `Updated grade level "{{name}}"`, { name: updated?.name || trimmed }),
        variant: 'default',
      });
      setGradeManageOpen(false);
    } catch (err: any) {
      const msg = err?.message || t('classes_page.form.grade_update_failed', 'Failed to update grade level');
      setGradeEditErrors({ name: msg });
      toast({
        title: t('common.error', 'Error'),
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setGradeEditSubmitting(false);
    }
  };

  const deleteGradeById = async (levelId: string) => {
    try {
      setGradeDeleteSubmitting(true);
      setGradePendingId(levelId);
      await academicService.deleteGradeLevel(levelId);
      await queryClient.invalidateQueries({ queryKey: ['standardGradeLevels'] });
      if (String(formData.grade_level) === String(levelId)) {
        setFormData(prev => ({ ...prev, grade_level: '' }));
        if (errors.grade_level) setErrors(prev => ({ ...prev, grade_level: '' }));
      }
      if (String(gradeEditId) === String(levelId)) {
        setGradeEditId(null);
      }
      const deletedDisplay = normalizedGradeLevels.find(g => g.id === levelId)?.display_name || null;
      toast({
        title: t('common.success', 'Success'),
        description: deletedDisplay
          ? t('classes_page.form.grade_deleted_named', `Deleted grade level "{{name}}"`, { name: deletedDisplay })
          : t('classes_page.form.grade_deleted', 'Grade level deleted'),
        variant: 'default',
      });
      setGradeDeleteId(null);
    } catch (err: any) {
      const base = err?.message || t('classes_page.form.grade_delete_failed', 'Failed to delete grade level (it may still be in use)');
      const msg = base && typeof base === 'string' && /^cannot delete/i.test(base.trim())
        ? base
        : t(
            'classes_page.form.grade_delete_failed_detail',
            'Failed to delete grade level — it may still be assigned to classes, students, or grading boundaries. Reassign those records first, then retry.'
          );
      toast({
        title: t('common.error', 'Error'),
        description: msg,
        variant: 'destructive',
        duration: 12000,
      });
    } finally {
      setGradePendingId(null);
      setGradeDeleteSubmitting(false);
    }
  };

  // Enhanced form reset with proper error clearing
  const resetFormData = () => {
    setFormData({
      name: '',
      grade_level: '',
      section: '',
      academic_year: '',
      room_number: '',
      capacity: '',
      teacher_id: '',
      description: '',
      age_min: '',
      age_max: '',
    });
    setErrors({});
    setIsSubmitting(false);
  };

  // Enhanced teacher error handling with retry mechanism
  const handleTeacherError = useCallback(() => {
    if (teachersError) {
      console.error('Teacher fetch error:', teachersError);
      
      // Show user-friendly error message
      toast({
        title: "Error Loading Teachers",
        description: "Failed to load teacher list. Click to retry.",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchTeachers();
            }}
          >
            Retry
          </Button>
        ),
        duration: 10000
      });
    }
  }, [teachersError, refetchTeachers, toast]);

  // Enhanced initialization effect
  useEffect(() => {
    if (isOpen) {
      // Clear any previous errors
      setErrors({});
      
      if (classData) {
        // Editing existing class - ensure teacher_id is properly set
        const teacherId = classData.teacher_id || classData.teacher?.id || 'none';
        setFormData({
          name: classData.name || '',
          grade_level: classData.grade_level || '',
          section: classData.section || '',
          academic_year: classData.academic_year || '',
          room_number: classData.room_number || '',
          capacity: classData.capacity?.toString() || '',
          teacher_id: teacherId.toString(),
          description: classData.description || '',
          age_min: classData.age_min != null ? String(classData.age_min) : '',
          age_max: classData.age_max != null ? String(classData.age_max) : '',
        });
      } else {
        // Creating new class
        resetFormData();
      }

      // Handle teacher loading errors
      handleTeacherError();
    }
  }, [isOpen, classData, handleTeacherError]);

  // Separate effect for handling teacher data refetch
  useEffect(() => {
    if (isOpen && teachersError && !isLoadingTeachers) {
      refetchTeachers();
    }
  }, [isOpen, teachersError, isLoadingTeachers, refetchTeachers]);

  // Enhanced validation function with comprehensive checks
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.name?.trim()) {
      newErrors.name = 'Class name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Class name must be at least 2 characters long';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Class name must not exceed 100 characters';
    }

    if (!formData.grade_level?.trim()) {
      newErrors.grade_level = 'Grade level is required';
    }

    if (!formData.academic_year?.trim()) {
      newErrors.academic_year = 'Academic year is required';
    }

    // Teacher validation
    if (formData.teacher_id && formData.teacher_id !== 'none' && formData.teacher_id !== '') {
      if (teachersData?.teachers && Array.isArray(teachersData.teachers)) {
        const selectedTeacher = teachersData.teachers.find((t: any) => t.id.toString() === formData.teacher_id);
        if (!selectedTeacher) {
          newErrors.teacher_id = 'Selected teacher is not available';
        }
      }
    }

    // Age limits validation (optional, but when provided → valid integers in range 2-99, min ≤ max)
    const ageMinTrim = formData.age_min?.trim() ?? '';
    const ageMaxTrim = formData.age_max?.trim() ?? '';
    const ageMinNum: number | null = ageMinTrim !== '' ? Number(ageMinTrim) : null;
    const ageMaxNum: number | null = ageMaxTrim !== '' ? Number(ageMaxTrim) : null;
    if (ageMinNum !== null) {
      if (!Number.isFinite(ageMinNum) || !Number.isInteger(ageMinNum) || ageMinNum < 2 || ageMinNum > 99) {
        newErrors.age_min = 'Min age must be an integer between 2 and 99, or leave blank';
      }
    }
    if (ageMaxNum !== null) {
      if (!Number.isFinite(ageMaxNum) || !Number.isInteger(ageMaxNum) || ageMaxNum < 2 || ageMaxNum > 99) {
        newErrors.age_max = 'Max age must be an integer between 2 and 99, or leave blank';
      }
    }
    if (ageMinNum !== null && ageMaxNum !== null && ageMinNum > ageMaxNum) {
      newErrors.age_max = 'Max age must be greater than or equal to min age';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!');
    console.log('Current user:', currentUser);
    console.log('Is loading current user:', isLoadingCurrentUser);

    // Guard: don't submit while role is still loading
    if (isLoadingCurrentUser) {
      console.log('Still loading user, aborting submission');
      toast({
        title: "Please wait",
        description: "Loading your permissions. Try again shortly."
      });
      return;
    }

    const userData = (currentUser as any)?.user || currentUser;
    const isAdmin = userData?.role === 'admin';
    console.log('User data:', userData);
    console.log('User role:', userData?.role);
    console.log('Is admin:', isAdmin);
    
    if (!isAdmin) {
      console.log('User is not admin, aborting submission');
      toast({
        title: "Admin Required",
        description: "You must be an admin to create or edit classes.",
        variant: "destructive"
      });
      return;
    }

    console.log('Validating form...');
    if (!validateForm()) {
      console.log('Form validation failed');
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive"
      });
      return;
    }

    console.log('Form validation passed, proceeding with submission');
    setIsSubmitting(true);

    try {
      console.log('Starting form submission process');
      console.log('Original form data:', formData);
      console.log('Class data for editing:', classData);
      
      // Base payload with required fields
      const base = {
        name: formData.name.trim(),
        grade_level: formData.grade_level.trim(),
        section: formData.section.trim() || null,
        academic_year: formData.academic_year.trim(),
      };
      console.log('Base payload constructed:', base);

      // Conditionally include optional fields
      const optional = {
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        teacher_id: (formData.teacher_id && formData.teacher_id !== 'none') ? parseInt(formData.teacher_id) : null,
        room: formData.room_number?.trim() || null,
        description: formData.description?.trim() || null,
        age_min: (formData.age_min?.trim() !== '') ? parseInt(formData.age_min, 10) : null,
        age_max: (formData.age_max?.trim() !== '') ? parseInt(formData.age_max, 10) : null,
      };
      console.log('Optional fields constructed:', optional);

      const payload = { ...base, ...optional };
      console.log('Final API payload:', payload);
      console.log('Payload size:', JSON.stringify(payload).length, 'characters');

      if (classData?.id) {
        console.log('=== UPDATE OPERATION ===');
        console.log('Updating class with ID:', classData.id);
        console.log('About to call classService.updateClass');
        const result = await classService.updateClass(classData.id, payload);
        console.log('Update API call completed successfully');
        console.log('Update result:', result);
        console.log('Showing success toast for update');
        toast({ title: "Success", description: "Class updated successfully!" });
      } else {
        console.log('=== CREATE OPERATION ===');
        console.log('Creating new class with payload:', payload);
        console.log('About to call classService.createClass');
        const result = await classService.createClass(payload);
        console.log('Create API call completed successfully');
        console.log('Create result:', result);
        console.log('Showing success toast for create');
        toast({ title: "Success", description: "Class created successfully!" });
      }

      console.log('API operation successful, calling callbacks');
      console.log('Calling onSuccess callback to refresh data');
      onSuccess?.();
      console.log('Closing modal');
      onClose();
      console.log('Resetting form data');
      resetFormData();
      console.log('Form submission process completed successfully');
    } catch (error: any) {
      console.error('=== API CALL FAILED ===');
            console.error('Class submission error:', error);
      
            let errorMessage = "Failed to submit class form. Please try again.";
      
      // Support both Standardized Error (flat) and Axios Error (nested) structures
      const status = error?.status || error?.response?.status;
      const responseData = error?.response?.data || error;
      const validationErrors = error?.errors || error?.response?.data?.errors;

      if (status === 409) {
        // Handle conflict (e.g., duplicate class name)
        errorMessage = "A class with this name already exists. Please choose a different name.";
        setErrors(prev => ({ ...prev, name: "Name already exists" }));
      } else if (status === 422 && validationErrors) {
        // Handle validation errors from backend
        errorMessage = "Please check the form for errors.";
        const serverErrors: Record<string, string> = {};
        Object.keys(validationErrors).forEach(key => {
          // Map backend field names to frontend form fields if they differ
          const fieldMap: Record<string, string> = { 'room': 'room_number' };
          const formField = fieldMap[key] || key;
          serverErrors[formField] = validationErrors[key][0]; // Take first error
        });
        setErrors(prev => ({ ...prev, ...serverErrors }));
      } else {
         errorMessage = responseData?.message || error?.message || errorMessage;
      }

      toast({
        title: "Submission Error",
        description: errorMessage,
        variant: "destructive"
      });console.error('Error toast displayed');
    } finally {
      console.log('Cleaning up: setting isSubmitting to false');
      setIsSubmitting(false);
      console.log('Form submission process ended');
    }
  };

  // Enhanced teacher retry handler
  const handleRetryTeachers = () => {
    refetchTeachers();
  };

  return (
    <Fragment>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {classData ? t('classes_page.form.edit_class', 'Edit Class') : t('classes_page.form.create_class', 'Create New Class')}
          </DialogTitle>
          <DialogDescription>
            {t('classes_page.form.form_desc', 'Fill out class details below; teacher selection is optional.')}
          </DialogDescription>
        </DialogHeader>
        {/* Enhanced Teacher Loading/Error State */}
        {teachersError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{t('classes_page.form.failed_load_teachers', 'Failed to load teachers. Some features may be limited.')}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryTeachers}
                disabled={isRefetchingTeachers}
                className="ml-2"
              >
                {isRefetchingTeachers ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {t('teachers_page.dashboard.retry', 'Retry')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Class Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {t('classes_page.form.class_name', 'Class Name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }));
                if (errors.name) {
                  setErrors(prev => ({ ...prev, name: '' }));
                }
              }}
              placeholder={t('classes_page.form.class_name_placeholder', 'Enter class name (e.g., Class 1A, Grade 5 Blue)')}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
            <p className="text-xs text-gray-500">
              {t('classes_page.form.class_name_help', 'Use the base class name here. Add the stream below for setups like Class 1 A and Class 1 B.')}
            </p>
          </div>

          {/* Grade Level */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="grade_level">
                {t('classes_page.form.grade_level', 'Grade Level')} <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs flex items-center gap-1"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openManageGrade(formData.grade_level || undefined);
                  }}
                  disabled={!formData.grade_level && normalizedGradeLevels.length === 0}
                  title={t('classes_page.form.manage_grade', 'Edit the selected grade level')}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  {t('classes_page.form.manage', 'Manage')}
                </Button>
              </div>
            </div>
            <Select
              value={formData.grade_level}
              onValueChange={(value) => {
                if (value === '__create_grade__') {
                  openCreateGrade();
                  return;
                }
                if (value === '__manage_grades__') {
                  openManageGrade(formData.grade_level || undefined);
                  return;
                }
                setFormData(prev => ({ ...prev, grade_level: value }));
                if (errors.grade_level) {
                  setErrors(prev => ({ ...prev, grade_level: '' }));
                }
              }}
            >
              <SelectTrigger className={errors.grade_level ? 'border-red-500' : ''}>
                <SelectValue placeholder={t('classes_page.form.select_grade_level', 'Select grade level')} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingGradeLevels ? (
                  <SelectItem value="loading" disabled>
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t('classes_page.form.loading_grade_levels', 'Loading grade levels...')}
                    </span>
                  </SelectItem>
                ) : gradeLevelsError ? (
                  <SelectItem value="error" disabled>
                    <span className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {t('classes_page.form.error_loading_grade_levels', 'Error loading grade levels')}
                    </span>
                  </SelectItem>
                ) : normalizedGradeLevels.length > 0 ? (
                  normalizedGradeLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      <span className="flex flex-col items-start leading-snug">
                        <span>{level.display_name}</span>
                        {level.note && (
                          <span className="text-[10px] text-gray-500 font-normal">{level.note}</span>
                        )}
                      </span>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    {t('classes_page.form.no_grade_levels', 'No grade levels available')}
                  </SelectItem>
                )}
                <SelectSeparator />
                <SelectItem value="__create_grade__" className="text-blue-600">
                  <span className="flex items-center gap-2">
                    <Plus className="h-3.5 w-3.5" />
                    {t('classes_page.form.create_grade_level', '+ Add new grade level')}
                  </span>
                </SelectItem>
                <SelectItem value="__manage_grades__" className="text-gray-600">
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-3.5 w-3.5" />
                    {t('classes_page.form.manage_grade_levels', 'Manage grade levels...')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.grade_level && (
              <p className="text-sm text-red-500">{errors.grade_level}</p>
            )}
            {normalizedGradeLevels.some((l: any) => l.display_name.includes('(#')) && (
              <p className="text-xs text-amber-700 flex items-start gap-1">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
                <span>
                  {t('classes_page.form.grade_duplicates_hint', 'Some grade levels share the same name — tagged with (#2), (#3)... Use the Manage button to rename them.')}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="section">{t('classes_page.form.section_stream', 'Section / Stream')}</Label>
            <Input
              id="section"
              value={formData.section}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, section: e.target.value }));
              }}
              placeholder={t('classes_page.form.section_placeholder', 'e.g., A, B, Science, Arts')}
            />
            <p className="text-xs text-gray-500">
              {t('classes_page.form.class_preview', 'Display preview: {{preview}}', { preview: [formData.name.trim(), formData.section.trim()].filter(Boolean).join(' ') || t('classes_page.form.class_preview_placeholder', 'Class preview') })}
            </p>
          </div>

          {/* Academic Year */}
          <div className="space-y-2">
            <Label htmlFor="academic_year">
              {t('classes_page.form.academic_year', 'Academic Year')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="academic_year"
              value={formData.academic_year}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, academic_year: e.target.value }));
                if (errors.academic_year) {
                  setErrors(prev => ({ ...prev, academic_year: '' }));
                }
              }}
              placeholder={t('classes_page.form.academic_year_placeholder', 'e.g., 2024/2025 or 2024-2025')}
              className={errors.academic_year ? 'border-red-500' : ''}
            />
            {errors.academic_year && (
              <p className="text-sm text-red-500">{errors.academic_year}</p>
            )}
          </div>

          {/* Room Number */}
          <div className="space-y-2">
            <Label htmlFor="room_number">{t('classes_page.form.room_number', 'Room Number')}</Label>
            <Input
              id="room_number"
              value={formData.room_number}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, room_number: e.target.value }));
                if (errors.room_number) {
                  setErrors(prev => ({ ...prev, room_number: '' }));
                }
              }}
              placeholder={t('classes_page.form.room_number_placeholder', 'e.g., A101, Room 15')}
              className={errors.room_number ? 'border-red-500' : ''}
            />
            {errors.room_number && (
              <p className="text-sm text-red-500">{errors.room_number}</p>
            )}
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity">{t('classes_page.form.class_capacity', 'Class Capacity')}</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              max="1000"
              value={formData.capacity}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, capacity: e.target.value }));
                if (errors.capacity) {
                  setErrors(prev => ({ ...prev, capacity: '' }));
                }
              }}
              placeholder={t('classes_page.form.class_capacity_placeholder', 'Maximum number of students')}
              className={errors.capacity ? 'border-red-500' : ''}
            />
            {errors.capacity && (
              <p className="text-sm text-red-500">{errors.capacity}</p>
            )}
          </div>

          {/* Age Limits */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>{t('classes_page.form.age_limits', 'Age Limits')}</span>
              <span className="text-xs text-gray-500 font-normal">{t('classes_page.form.age_limits_optional', 'Optional — leave blank to skip age validation')}</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="age_min" className="text-xs text-gray-600">
                  {t('classes_page.form.min_age', 'Minimum Age')}
                </Label>
                <Input
                  id="age_min"
                  type="number"
                  min="2"
                  max="99"
                  step="1"
                  value={formData.age_min}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, age_min: e.target.value }));
                    if (errors.age_min) {
                      setErrors(prev => ({ ...prev, age_min: '' }));
                    }
                    if (errors.age_max) {
                      setErrors(prev => ({ ...prev, age_max: '' }));
                    }
                  }}
                  placeholder={t('classes_page.form.min_age_placeholder', 'e.g. 5')}
                  className={errors.age_min ? 'border-red-500' : ''}
                />
                {errors.age_min && (
                  <p className="text-xs text-red-500">{errors.age_min}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="age_max" className="text-xs text-gray-600">
                  {t('classes_page.form.max_age', 'Maximum Age')}
                </Label>
                <Input
                  id="age_max"
                  type="number"
                  min="2"
                  max="99"
                  step="1"
                  value={formData.age_max}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, age_max: e.target.value }));
                    if (errors.age_max) {
                      setErrors(prev => ({ ...prev, age_max: '' }));
                    }
                    if (errors.age_min) {
                      setErrors(prev => ({ ...prev, age_min: '' }));
                    }
                  }}
                  placeholder={t('classes_page.form.max_age_placeholder', 'e.g. 7')}
                  className={errors.age_max ? 'border-red-500' : ''}
                />
                {errors.age_max && (
                  <p className="text-xs text-red-500">{errors.age_max}</p>
                )}
              </div>
            </div>
          </div>

          {/* Teacher Assignment */}
          <div className="space-y-2">
            <Label htmlFor="teacher_id">{t('classes_page.form.class_teacher', 'Class Teacher')}</Label>
            <Select
              value={formData.teacher_id}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, teacher_id: value }));
                if (errors.teacher_id) {
                  setErrors(prev => ({ ...prev, teacher_id: '' }));
                }
              }}
              disabled={isLoadingTeachers}
            >
              <SelectTrigger className={errors.teacher_id ? 'border-red-500' : ''}>
                <SelectValue placeholder={
                  isLoadingTeachers 
                    ? t('classes_page.form.loading_teachers', "Loading teachers...") 
                    : teachersError 
                    ? t('classes_page.form.error_loading_teachers', "Error loading teachers") 
                    : t('classes_page.form.select_teacher_optional', "Select a teacher (optional)")
                } />
              </SelectTrigger>
              <SelectContent>
                {allTeacherOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.email && (
                        <span className="text-xs text-gray-500">{option.email}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.teacher_id && (
              <p className="text-sm text-red-500">{errors.teacher_id}</p>
            )}
            {isLoadingTeachers && (
              <p className="text-sm text-gray-500 flex items-center">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                {t('classes_page.form.loading_teachers', 'Loading teachers...')}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('classes_page.form.description', 'Description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
                if (errors.description) {
                  setErrors(prev => ({ ...prev, description: '' }));
                }
              }}
              placeholder={t('classes_page.form.description_placeholder', 'Optional description or notes about the class')}
              rows={3}
              maxLength={500}
              className={errors.description ? 'border-red-500' : ''}
            />
            <div className="flex justify-between items-center">
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {t('classes_page.form.characters_count', '{{count}}/500 characters', { count: formData.description.length })}
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('classes_page.form.btn_cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingTeachers}
              onClick={() => console.log('Submit button clicked!')}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {classData ? t('classes_page.form.btn_updating', 'Updating...') : t('classes_page.form.btn_creating', 'Creating...')}
                </>
              ) : (
                classData ? t('classes_page.form.btn_update', 'Update Class') : t('classes_page.form.btn_create', 'Create Class')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Create Grade Level Dialog */}
    <Dialog open={gradeCreateOpen} onOpenChange={(open) => { if (!open) closeCreateGrade(); else setGradeCreateOpen(true); }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t('classes_page.form.create_grade_level_dialog_title', 'Create Grade Level')}</DialogTitle>
          <DialogDescription>
            {t('classes_page.form.create_grade_level_dialog_desc', 'Add a new grade level. It will be immediately available when creating classes.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="grade_create_name">
              {t('classes_page.form.grade_level_name', 'Name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="grade_create_name"
              value={gradeCreateName}
              onChange={(e) => {
                setGradeCreateName(e.target.value);
                if (gradeCreateErrors.name) setGradeCreateErrors({});
              }}
              placeholder={t('classes_page.form.grade_level_name_placeholder', 'e.g. Petite Section, CP2, 6ème, Grade 7')}
              autoFocus
              className={gradeCreateErrors.name ? 'border-red-500' : ''}
            />
            {gradeCreateErrors.name && (
              <p className="text-sm text-red-500">{gradeCreateErrors.name}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="grade_create_code">{t('classes_page.form.grade_level_code', 'Short Code')}</Label>
              <Input
                id="grade_create_code"
                value={gradeCreateCode}
                onChange={(e) => setGradeCreateCode(e.target.value)}
                maxLength={20}
                placeholder={t('classes_page.form.grade_level_code_placeholder', 'e.g. PS, CP2, 6E')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade_create_order">{t('classes_page.form.grade_level_order', 'Order (optional)')}</Label>
              <Input
                id="grade_create_order"
                type="number"
                min="0"
                step="1"
                value={gradeCreateOrder}
                onChange={(e) => setGradeCreateOrder(e.target.value)}
                placeholder={t('classes_page.form.grade_level_order_placeholder', 'Auto — append')}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeCreateGrade} disabled={gradeCreateSubmitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="button" onClick={submitCreateGrade} disabled={gradeCreateSubmitting}>
            {gradeCreateSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('common.creating', 'Creating...')}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {t('classes_page.form.create_grade_level', 'Create Grade Level')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Manage Grade Level Dialog */}
    <Dialog open={gradeManageOpen} onOpenChange={(open) => { if (!open) closeManageGrade(); else setGradeManageOpen(true); }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t('classes_page.form.manage_grade_levels', 'Manage Grade Levels')}</DialogTitle>
          <DialogDescription>
            {t('classes_page.form.manage_grade_levels_desc', 'Rename, reorder, or clean up duplicate grade levels.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="max-h-64 overflow-auto border rounded-md p-2 space-y-2">
            {normalizedGradeLevels.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                {t('classes_page.form.no_grade_levels', 'No grade levels available')}
              </p>
            ) : (
              normalizedGradeLevels.map((g) => {
                const isDeleting = gradePendingId === g.id;
                const isRowEditing = gradeEditId === g.id;
                return (
                  <div
                    key={g.id}
                    className={`flex items-start justify-between gap-2 rounded border px-3 py-2 transition ${isRowEditing ? 'border-blue-500 bg-blue-50/70' : 'border-gray-200 bg-white'} ${isDeleting ? 'opacity-60' : ''}`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{g.display_name}</span>
                        {g.isDuplicate && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Duplicate name
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500">
                        <span>
                          {t('classes_page.form.order_index', 'Order')}:{' '}
                          <span className="font-medium text-gray-700 tabular-nums">
                            {typeof g.order_index === 'number' && g.order_index > 0 ? g.order_index : '—'}
                          </span>
                        </span>
                        {g.code && (
                          <span>
                            {t('classes_page.form.grade_level_code', 'Short Code')}:{' '}
                            <span className="font-medium text-gray-700">{g.code}</span>
                          </span>
                        )}
                      </div>
                      {g.note && <p className="text-[11px] text-amber-700/90">{g.note}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        disabled={gradeEditSubmitting || gradeDeleteSubmitting || isDeleting}
                        onClick={() => openManageGrade(g.id)}
                      >
                        {isRowEditing
                          ? t('classes_page.form.editing', 'Editing')
                          : t('common.edit', 'Edit')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                        disabled={gradeEditSubmitting || gradeDeleteSubmitting || isDeleting}
                        onClick={() => openDeleteGrade(g.id)}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            {t('classes_page.form.deleting', 'Deleting…')}
                          </>
                        ) : (
                          <>
                            <X className="h-3.5 w-3.5 mr-1" />
                            {t('common.delete', 'Delete')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {gradeEditId && (
            <div className="border rounded-md p-3 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {t('classes_page.form.editing_grade', 'Editing Grade Level')}
                </Label>
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setGradeEditId(null)} disabled={gradeEditSubmitting}>
                  {t('common.close', 'Close')}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade_edit_name">
                  {t('classes_page.form.grade_level_name', 'Name')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="grade_edit_name"
                  value={gradeEditName}
                  onChange={(e) => {
                    setGradeEditName(e.target.value);
                    if (gradeEditErrors.name) setGradeEditErrors({});
                  }}
                  className={gradeEditErrors.name ? 'border-red-500' : ''}
                  maxLength={255}
                />
                {gradeEditErrors.name && (
                  <p className="text-sm text-red-500">{gradeEditErrors.name}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="grade_edit_code">{t('classes_page.form.grade_level_code', 'Short Code')}</Label>
                  <Input
                    id="grade_edit_code"
                    value={gradeEditCode}
                    onChange={(e) => setGradeEditCode(e.target.value)}
                    maxLength={50}
                    placeholder={t('classes_page.form.grade_level_code_placeholder', 'e.g. PS1, CP2, 6ème')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade_edit_order">{t('classes_page.form.grade_level_order', 'Order (optional)')}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="grade_edit_order"
                      type="number"
                      min="0"
                      step="1"
                      value={gradeEditOrder}
                      onChange={(e) => setGradeEditOrder(e.target.value)}
                      placeholder={t('classes_page.form.grade_level_order_placeholder', 'Append to end')}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 px-2 shrink-0"
                      disabled={gradeEditSubmitting}
                      onClick={() => setGradeEditOrder('')}
                      title={t('classes_page.form.grade_level_order_reset', 'Reset — append to end of the list')}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      {t('classes_page.form.grade_level_order_reset_label', 'End')}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-gray-500">
                  {t(
                    'classes_page.form.edit_grade_help',
                    'Tip: for duplicates shown above, rename each row and reorder to distinguish them.'
                  )}
                </p>
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setGradeEditId(null)} disabled={gradeEditSubmitting}>
                    {t('common.close', 'Close')}
                  </Button>
                  <Button type="button" size="sm" onClick={submitManageGrade} disabled={gradeEditSubmitting}>
                    {gradeEditSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t('common.saving', 'Saving...')}
                      </>
                    ) : (
                      t('common.save', 'Save changes')
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-3">
            <p className="text-[11px] text-gray-500">
              {t(
                'classes_page.form.manage_grade_levels_footer',
                'Need a clean slate? Rename or reorder duplicate rows first; delete is blocked while the grade is still assigned to classes, students, or grading boundaries.'
              )}
            </p>
            <div className="flex items-center gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={openCreateGrade} disabled={gradeCreateSubmitting || gradeEditSubmitting || gradeDeleteSubmitting}>
                <Plus className="h-4 w-4 mr-2" />
                {t('classes_page.form.create_grade_level', 'Create Grade Level')}
              </Button>
              <Button type="button" onClick={closeManageGrade} disabled={gradeEditSubmitting || gradeDeleteSubmitting}>
                {t('common.done', 'Done')}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Confirm Grade Level Delete Dialog */}
    <Dialog open={!!gradeDeleteId} onOpenChange={(open) => { if (!open) closeDeleteGrade(); }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t('classes_page.form.delete_grade_title', 'Delete Grade Level')}</DialogTitle>
          <DialogDescription>
            {gradeDeleteId && normalizedGradeLevels.find(g => g.id === gradeDeleteId) ? (
              <>
                {t(
                  'classes_page.form.delete_grade_intro',
                  'You are about to permanently delete the grade level:'
                )}
                <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {normalizedGradeLevels.find(g => g.id === gradeDeleteId)?.display_name || gradeDeleteId}
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {t(
                    'classes_page.form.delete_grade_desc',
                    'This cannot be undone. If any class, student, grading boundary, or progression link still points to this grade level, the delete will be blocked automatically so no data is lost.'
                  )}
                </p>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={closeDeleteGrade} disabled={gradeDeleteSubmitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={gradeDeleteSubmitting || !gradeDeleteId}
            onClick={async () => {
              if (!gradeDeleteId) return;
              const currentId = gradeDeleteId;
              await deleteGradeById(currentId);
            }}
          >
            {gradeDeleteSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('classes_page.form.deleting_grade', 'Deleting...')}
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                {t('classes_page.form.confirm_delete_grade_label', 'Delete this grade level')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </Fragment>
  );
};

export { ClassFormModal };
export default ClassFormModal;


