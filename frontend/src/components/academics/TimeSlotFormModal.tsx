import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { useCreateTimeSlot, useUpdateTimeSlot, usePeriods } from '../../hooks/useTimetable';
import { useClasses } from '../../hooks/useClasses';
import { useSubjects } from '../../hooks/useSubjects';
import { useTeachers } from '../../hooks/useTeachers';
import { toast } from 'sonner';
import { ResponsiveForm, FormSection, FormRow, FormField } from '../common/ResponsiveForm';
import MobileOptimizedInput from '../common/MobileOptimizedInput';
import MobileOptimizedSelect from '../common/MobileOptimizedSelect';
import { TouchFriendlyButton } from '../common/TouchFriendlyButton';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard';
import { FormValidationProvider } from '../common/FormValidationProvider';
import { Clock, BookOpen, GraduationCap, User, MapPin, Calendar, Hash } from 'lucide-react';
import { getErrorMessage } from '@/utils/errorHandling';

interface TimeSlotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotData?: any;
  onSuccess?: () => void;
}

const dayOptions = [
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' },
];

const termOptions = [
  { value: 'term1', label: 'Term 1' },
  { value: 'term2', label: 'Term 2' },
  { value: 'term3', label: 'Term 3' },
];

export function TimeSlotFormModal({ isOpen, onClose, slotData, onSuccess }: TimeSlotFormModalProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const { height, isVisible } = useMobileKeyboard();
  
  const [formData, setFormData] = useState({
    day_of_week: 'Monday',
    period_id: 0,
    subject_id: 0,
    class_id: 0,
    teacher_id: 0,
    room_id: '',
    academic_year: new Date().getFullYear().toString(),
    term: 'term1',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { data: classesData } = useClasses();
  const { data: subjectsData } = useSubjects({
    class_id: formData.class_id || undefined,
    page: 1,
    per_page: 200,
    is_active: true,
  });
  const { data: teachersData } = useTeachers();
  const { data: periodsData } = usePeriods();
  
  const createTimeSlot = useCreateTimeSlot();
  const updateTimeSlot = useUpdateTimeSlot();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const classOptions = useMemo(() => {
    if (!classesData?.data) return [];
    return classesData.data.map((cls: any) => ({
      value: cls.id.toString(),
      label: cls.name
    }));
  }, [classesData]);

  const subjectOptions = useMemo(() => {
    if (!subjectsData?.subjects) return [];
    return subjectsData.subjects.map((sub: any) => ({
      value: sub.id.toString(),
      label: sub.name,
      teachers: Array.isArray(sub.teachers) ? sub.teachers : [],
    }));
  }, [subjectsData]);

  const selectedSubject = useMemo(
    () => (subjectsData?.subjects || []).find((subject: any) => Number(subject.id) === Number(formData.subject_id)),
    [subjectsData, formData.subject_id]
  );

  const teacherOptions = useMemo(() => {
    if (!teachersData?.teachers) return [];
    const allowedTeacherIds = new Set(
      Array.isArray(selectedSubject?.teachers)
        ? selectedSubject.teachers.map((teacher: any) => Number(teacher.id))
        : []
    );

    const mappedTeachers = teachersData.teachers.map((teacher: any) => ({
      value: teacher.id.toString(),
      label: `${teacher.first_name} ${teacher.last_name}`
    }));

    if (allowedTeacherIds.size === 0) {
      return mappedTeachers;
    }

    return mappedTeachers.filter((teacher) => allowedTeacherIds.has(Number(teacher.value)));
  }, [teachersData, selectedSubject]);

  const periodOptions = useMemo(() => {
    if (!periodsData?.data) return [];
    return periodsData.data.map((p: any) => ({
      value: p.id.toString(),
      label: `${p.name} (${p.start} - ${p.end})`
    }));
  }, [periodsData]);

  useEffect(() => {
    if (slotData) {
      setFormData({
        day_of_week: slotData.day_of_week || 'Monday',
        period_id: slotData.period_id || 0,
        subject_id: slotData.subject_id || 0,
        class_id: slotData.class_id || 0,
        teacher_id: slotData.teacher_id || 0,
        room_id: slotData.room_id || '',
        academic_year: slotData.academic_year || new Date().getFullYear().toString(),
        term: slotData.term || 'term1',
      });
    } else {
      setFormData({
        day_of_week: 'Monday',
        period_id: 0,
        subject_id: 0,
        class_id: 0,
        teacher_id: 0,
        room_id: '',
        academic_year: new Date().getFullYear().toString(),
        term: 'term1',
      });
    }
    setErrors({});
  }, [slotData, isOpen]);
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.period_id) newErrors.period_id = 'Period is required';
    if (!formData.subject_id) newErrors.subject_id = 'Subject is required';
    if (!formData.class_id) newErrors.class_id = 'Class is required';
    if (!formData.teacher_id) newErrors.teacher_id = 'Teacher is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'class_id' ? { subject_id: 0, teacher_id: 0 } : {}),
      ...(name === 'subject_id' ? { teacher_id: 0 } : {}),
    }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  useEffect(() => {
    if (!selectedSubject || !Array.isArray(selectedSubject.teachers)) {
      return;
    }

    const allowedTeacherIds = selectedSubject.teachers.map((teacher: any) => Number(teacher.id));
    if (allowedTeacherIds.length === 1) {
      setFormData((prev) => ({ ...prev, teacher_id: allowedTeacherIds[0] }));
      return;
    }

    if (formData.teacher_id && !allowedTeacherIds.includes(Number(formData.teacher_id))) {
      setFormData((prev) => ({ ...prev, teacher_id: 0 }));
    }
  }, [selectedSubject, formData.teacher_id]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        room_id: formData.room_id ? parseInt(formData.room_id.toString()) : null
      };

      if (slotData) {
        await updateTimeSlot.mutateAsync({
          slotId: slotData.id,
          updates: payload as any
        });
        toast.success('Time slot updated successfully');
      } else {
        await createTimeSlot.mutateAsync(payload as any);
        toast.success('Time slot created successfully');
      }
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <FormValidationProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className={`sm:max-w-[600px] max-h-[90vh] overflow-y-auto ${
            isMobile && isVisible ? 'h-screen' : ''
          }`}
          style={{
            height: isMobile && isVisible ? `${height}px` : 'auto'
          }}
        >
          <DialogHeader>
            <DialogTitle className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>
              {slotData ? 'Edit Time Slot' : 'Add Time Slot'}
            </DialogTitle>
            <DialogDescription>
              {slotData ? 'Update the details of this timetable slot.' : 'Fill in the details to add a new lesson to the timetable.'}
            </DialogDescription>
          </DialogHeader>
          
          <ResponsiveForm onSubmit={handleSubmit}>
            <FormSection>
              <FormRow>
                <FormField label="Day of Week" htmlFor="day_of_week" error={errors.day_of_week} required>
                  <MobileOptimizedSelect
                    value={formData.day_of_week}
                    onChange={(value: string) => handleInputChange('day_of_week', value)}
                    options={dayOptions}
                    leftIcon={<Calendar className="h-4 w-4" />}
                  />
                </FormField>
                
                <FormField label="Term" htmlFor="term" error={errors.term} required>
                  <MobileOptimizedSelect
                    value={formData.term}
                    onChange={(value: string) => handleInputChange('term', value)}
                    options={termOptions}
                    leftIcon={<Hash className="h-4 w-4" />}
                  />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label="Period" htmlFor="period_id" error={errors.period_id} required>
                  <MobileOptimizedSelect
                    value={formData.period_id.toString()}
                    onChange={(value: string) => handleInputChange('period_id', parseInt(value))}
                    options={periodOptions}
                    placeholder="Select Period"
                    leftIcon={<Clock className="h-4 w-4" />}
                  />
                </FormField>
                
                <FormField label="Room Number" htmlFor="room_id" error={errors.room_id}>
                  <MobileOptimizedInput
                    id="room_id"
                    type="text"
                    value={formData.room_id.toString()}
                    onChange={(e) => handleInputChange('room_id', e.target.value)}
                    placeholder="e.g., 101"
                    leftIcon={<MapPin className="h-4 w-4" />}
                    error={errors.room_id}
                  />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label="Class" htmlFor="class_id" error={errors.class_id} required>
                  <MobileOptimizedSelect
                    value={formData.class_id.toString()}
                    onChange={(value: string) => handleInputChange('class_id', parseInt(value))}
                    options={classOptions}
                    placeholder="Select Class"
                    leftIcon={<GraduationCap className="h-4 w-4" />}
                  />
                </FormField>
                
                <FormField label="Subject" htmlFor="subject_id" error={errors.subject_id} required>
                  <MobileOptimizedSelect
                    value={formData.subject_id.toString()}
                    onChange={(value: string) => handleInputChange('subject_id', parseInt(value))}
                    options={subjectOptions}
                    placeholder={formData.class_id ? "Select Subject" : "Select class first"}
                    leftIcon={<BookOpen className="h-4 w-4" />}
                  />
                </FormField>
              </FormRow>

              {formData.class_id > 0 && subjectOptions.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  No subjects are assigned to this class yet. Add the subject, then assign its class and teacher in Settings &gt; Academic &gt; Subjects before creating timetable slots.
                </div>
              )}

              <FormRow>
                <FormField label="Teacher" htmlFor="teacher_id" error={errors.teacher_id} required>
                  <MobileOptimizedSelect
                    value={formData.teacher_id.toString()}
                    onChange={(value: string) => handleInputChange('teacher_id', parseInt(value))}
                    options={teacherOptions}
                    placeholder={formData.subject_id ? "Select Teacher" : "Select subject first"}
                    leftIcon={<User className="h-4 w-4" />}
                  />
                </FormField>
              </FormRow>
            </FormSection>
            
            <DialogFooter className={`${isMobile ? 'flex-col gap-3 pt-6' : 'flex-row gap-2'}`}>
              <TouchFriendlyButton
                type="button"
                variant="outline"
                onClick={onClose}
                size={isMobile ? "lg" : "md"}
                className={isMobile ? 'w-full order-2' : ''}
              >
                Cancel
              </TouchFriendlyButton>
              <TouchFriendlyButton
                type="submit"
                loading={isSubmitting}
                size={isMobile ? "lg" : "md"}
                className={isMobile ? 'w-full order-1' : ''}
              >
                {slotData ? 'Update Slot' : 'Create Slot'}
              </TouchFriendlyButton>
            </DialogFooter>
          </ResponsiveForm>
        </DialogContent>
      </Dialog>
    </FormValidationProvider>
  );
}
