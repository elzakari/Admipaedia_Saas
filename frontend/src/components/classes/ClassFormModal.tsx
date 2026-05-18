// ClassFormModal component
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/use-toast';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import teacherService from '../../services/teacherService';
import classService from '../../services/classService';
import academicService from '../../services/academicService';
import authService, { User } from '../../services/authService';

interface ClassFormData {
  name: string;
  grade_level: string;
  academic_year: string;
  room_number: string;
  capacity: string;
  teacher_id: string;
  description: string;
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
  const { toast } = useToast();
  const [formData, setFormData] = useState<ClassFormData>({
    name: '',
    grade_level: '',
    academic_year: '',
    room_number: '',
    capacity: '',
    teacher_id: '',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    { value: 'none', label: 'No Teacher Assigned', email: '' },
    ...teacherOptions
  ], [teacherOptions]);

  // Enhanced form reset with proper error clearing
  const resetFormData = () => {
    setFormData({
      name: '',
      grade_level: '',
      academic_year: '',
      room_number: '',
      capacity: '',
      teacher_id: '',
      description: ''
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
          academic_year: classData.academic_year || '',
          room_number: classData.room_number || '',
          capacity: classData.capacity?.toString() || '',
          teacher_id: teacherId.toString(),
          description: classData.description || ''
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
        academic_year: formData.academic_year.trim(),
      };
      console.log('Base payload constructed:', base);

      // Conditionally include optional fields
      const optional = {
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        teacher_id: (formData.teacher_id && formData.teacher_id !== 'none') ? parseInt(formData.teacher_id) : null,
        room: formData.room_number?.trim() || null,
        description: formData.description?.trim() || null,
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {classData ? 'Edit Class' : 'Create New Class'}
          </DialogTitle>
          <DialogDescription>
            Fill out class details below; teacher selection is optional.
          </DialogDescription>
        </DialogHeader>
        {/* Enhanced Teacher Loading/Error State */}
        {teachersError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load teachers. Some features may be limited.</span>
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
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Class Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Class Name <span className="text-red-500">*</span>
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
              placeholder="Enter class name (e.g., Class 1A, Grade 5 Blue)"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Grade Level */}
          <div className="space-y-2">
            <Label htmlFor="grade_level">
              Grade Level <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.grade_level}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, grade_level: value }));
                if (errors.grade_level) {
                  setErrors(prev => ({ ...prev, grade_level: '' }));
                }
              }}
            >
              <SelectTrigger className={errors.grade_level ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select grade level" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingGradeLevels ? (
                  <SelectItem value="loading" disabled>
                    Loading grade levels...
                  </SelectItem>
                ) : gradeLevelsError ? (
                  <SelectItem value="error" disabled>
                    Error loading grade levels
                  </SelectItem>
                ) : Array.isArray(gradeLevelsData) && gradeLevelsData.length > 0 ? (
                  gradeLevelsData.map((level: any) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No grade levels available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.grade_level && (
              <p className="text-sm text-red-500">{errors.grade_level}</p>
            )}
          </div>

          {/* Academic Year */}
          <div className="space-y-2">
            <Label htmlFor="academic_year">
              Academic Year <span className="text-red-500">*</span>
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
              placeholder="e.g., 2024/2025 or 2024-2025"
              className={errors.academic_year ? 'border-red-500' : ''}
            />
            {errors.academic_year && (
              <p className="text-sm text-red-500">{errors.academic_year}</p>
            )}
          </div>

          {/* Room Number */}
          <div className="space-y-2">
            <Label htmlFor="room_number">Room Number</Label>
            <Input
              id="room_number"
              value={formData.room_number}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, room_number: e.target.value }));
                if (errors.room_number) {
                  setErrors(prev => ({ ...prev, room_number: '' }));
                }
              }}
              placeholder="e.g., A101, Room 15"
              className={errors.room_number ? 'border-red-500' : ''}
            />
            {errors.room_number && (
              <p className="text-sm text-red-500">{errors.room_number}</p>
            )}
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity">Class Capacity</Label>
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
              placeholder="Maximum number of students"
              className={errors.capacity ? 'border-red-500' : ''}
            />
            {errors.capacity && (
              <p className="text-sm text-red-500">{errors.capacity}</p>
            )}
          </div>

          {/* Teacher Assignment */}
          <div className="space-y-2">
            <Label htmlFor="teacher_id">Class Teacher</Label>
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
                    ? "Loading teachers..." 
                    : teachersError 
                    ? "Error loading teachers" 
                    : "Select a teacher (optional)"
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
                Loading teachers...
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
                if (errors.description) {
                  setErrors(prev => ({ ...prev, description: '' }));
                }
              }}
              placeholder="Optional description or notes about the class"
              rows={3}
              maxLength={500}
              className={errors.description ? 'border-red-500' : ''}
            />
            <div className="flex justify-between items-center">
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {formData.description.length}/500 characters
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
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingTeachers}
              onClick={() => console.log('Submit button clicked!')}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {classData ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                classData ? 'Update Class' : 'Create Class'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { ClassFormModal };
export default ClassFormModal;


