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
import { useTranslation } from 'react-i18next';

const formatCreditHours = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '1';
  }
  return Number.isInteger(Number(value)) ? String(Number(value)) : Number(value).toFixed(1);
};

interface TimeSlotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotData?: any;
  onSuccess?: () => void;
  initialValues?: Partial<{
    class_id: number;
    term: string;
    academic_year: string;
    day_of_week: string;
    period_id: number;
    subject_id: number;
    teacher_id: number;
    room_id: string | number | null;
  }>;
  disableClassSelection?: boolean;
  disableTermSelection?: boolean;
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
  { value: 'Term 1', label: 'Term 1' },
  { value: 'Term 2', label: 'Term 2' },
  { value: 'Term 3', label: 'Term 3' },
];

const normalizeTimetableTerm = (term?: string) => {
  const normalized = String(term || '').trim().toLowerCase();
  if (normalized === 'term1' || normalized === 'term 1' || normalized === '1') return 'Term 1';
  if (normalized === 'term2' || normalized === 'term 2' || normalized === '2') return 'Term 2';
  if (normalized === 'term3' || normalized === 'term 3' || normalized === '3') return 'Term 3';
  return 'Term 1';
};

export function TimeSlotFormModal({
  isOpen,
  onClose,
  slotData,
  onSuccess,
  initialValues,
  disableClassSelection = false,
  disableTermSelection = false,
}: TimeSlotFormModalProps) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const { height, isVisible } = useMobileKeyboard();
  
  const translatedDayOptions = useMemo(() => [
    { value: 'Monday', label: t('common.days.monday', 'Monday') },
    { value: 'Tuesday', label: t('common.days.tuesday', 'Tuesday') },
    { value: 'Wednesday', label: t('common.days.wednesday', 'Wednesday') },
    { value: 'Thursday', label: t('common.days.thursday', 'Thursday') },
    { value: 'Friday', label: t('common.days.friday', 'Friday') },
    { value: 'Saturday', label: t('common.days.saturday', 'Saturday') },
    { value: 'Sunday', label: t('common.days.sunday', 'Sunday') },
  ], [t]);

  const translatedTermOptions = useMemo(() => [
    { value: 'Term 1', label: t('common.terms.term_1', 'Term 1') },
    { value: 'Term 2', label: t('common.terms.term_2', 'Term 2') },
    { value: 'Term 3', label: t('common.terms.term_3', 'Term 3') },
  ], [t]);

  const [formData, setFormData] = useState({
    day_of_week: 'Monday',
    period_id: 0,
    subject_id: 0,
    class_id: 0,
    teacher_id: 0,
    room_id: '',
    academic_year: new Date().getFullYear().toString(),
    term: 'Term 1',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { data: classesData } = useClasses();
  const { data: subjectsData } = useSubjects({
    class_id: formData.class_id || undefined,
    page: 1,
    per_page: 200,
    is_active: true,
  });
  const { data: teachersData } = useTeachers({ page: 1, per_page: 200, status: 'active' });
  const selectedClass = useMemo(
    () => (classesData?.data || []).find((cls: any) => Number(cls.id) === Number(formData.class_id)),
    [classesData, formData.class_id]
  );
  const { data: periodsData } = usePeriods({
    class_id: formData.class_id || undefined,
    subject_id: formData.subject_id || undefined,
    teacher_id: formData.teacher_id || undefined,
    day_of_week: formData.day_of_week || undefined,
    term: formData.term || undefined,
    academic_year: formData.academic_year || undefined,
    slot_id: slotData?.id || undefined,
  });
  
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
      label: `${teacher.user?.first_name || teacher.first_name || ''} ${teacher.user?.last_name || teacher.last_name || ''}`.trim() || `Teacher ${teacher.id}`
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
      label: p.disabled && p.blocked_reason ? `${p.label || `${p.start} - ${p.end}`} • ${p.blocked_reason}` : (p.label || `${p.name} (${p.start} - ${p.end})`),
      disabled: Boolean(p.disabled),
    }));
  }, [periodsData]);

  const periodMeta = periodsData?.meta;

  useEffect(() => {
    if (slotData) {
      setFormData({
        day_of_week: slotData.day_of_week || 'Monday',
        period_id: slotData.period_id || 0,
        subject_id: slotData.subject_id || 0,
        class_id: slotData.class_id || 0,
        teacher_id: slotData.teacher_id || 0,
        room_id: slotData.room_id ?? slotData.room_number ?? '',
        academic_year: slotData.academic_year || new Date().getFullYear().toString(),
        term: normalizeTimetableTerm(slotData.term),
      });
    } else {
      setFormData({
        day_of_week: initialValues?.day_of_week || 'Monday',
        period_id: initialValues?.period_id || 0,
        subject_id: initialValues?.subject_id || 0,
        class_id: initialValues?.class_id || 0,
        teacher_id: initialValues?.teacher_id || 0,
        room_id: initialValues?.room_id?.toString() || '',
        academic_year: initialValues?.academic_year || new Date().getFullYear().toString(),
        term: normalizeTimetableTerm(initialValues?.term),
      });
    }
    setErrors({});
  }, [slotData, isOpen, initialValues]);
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.period_id) newErrors.period_id = t('academics.timetable.errors.period_required', 'Timeframe is required');
    if (!formData.subject_id) newErrors.subject_id = t('academics.timetable.errors.subject_required', 'Subject is required');
    if (!formData.class_id) newErrors.class_id = t('academics.timetable.errors.class_required', 'Class is required');
    if (!formData.teacher_id) newErrors.teacher_id = t('academics.timetable.errors.teacher_required', 'Teacher is required');
    
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

  useEffect(() => {
    if (!isOpen || slotData || !periodMeta?.recommended_period_id) {
      return;
    }

    const selectedOption = periodsData?.data?.find((option: any) => Number(option.id) === Number(formData.period_id));
    if (formData.period_id && selectedOption && !selectedOption.disabled) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      period_id: Number(periodMeta.recommended_period_id) || prev.period_id,
    }));
  }, [isOpen, slotData, periodMeta?.recommended_period_id, periodsData?.data, formData.period_id]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error(t('common.errors.fix_errors', 'Please fix the errors in the form'));
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
        toast.success(t('academics.timetable.toast.update_success', 'Time slot updated successfully'));
      } else {
        await createTimeSlot.mutateAsync(payload as any);
        toast.success(t('academics.timetable.toast.create_success', 'Time slot created successfully'));
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
              {slotData ? t('academics.timetable.edit_slot', 'Edit Time Slot') : t('academics.timetable.add_slot', 'Add Time Slot')}
            </DialogTitle>
            <DialogDescription>
              {slotData ? t('academics.timetable.edit_slot_desc', 'Update the details of this timetable slot.') : t('academics.timetable.add_slot_desc', 'Fill in the details to add a new lesson to the timetable.')}
            </DialogDescription>
          </DialogHeader>
          
          <ResponsiveForm onSubmit={handleSubmit}>
            <FormSection>
              <FormRow>
                <FormField label={t('academics.timetable.day_of_week', 'Day of Week')} htmlFor="day_of_week" error={errors.day_of_week} required>
                  <MobileOptimizedSelect
                    value={formData.day_of_week}
                    onChange={(value: string) => handleInputChange('day_of_week', value)}
                    options={translatedDayOptions}
                    leftIcon={<Calendar className="h-4 w-4" />}
                  />
                </FormField>
                
                <FormField label={t('academics.timetable.term', 'Term')} htmlFor="term" error={errors.term} required>
                  <MobileOptimizedSelect
                    value={formData.term}
                    onChange={(value: string) => handleInputChange('term', value)}
                    options={translatedTermOptions}
                    leftIcon={<Hash className="h-4 w-4" />}
                    disabled={disableTermSelection}
                  />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label={t('academics.timetable.timeframe', 'Timeframe')} htmlFor="period_id" error={errors.period_id} required>
                  <MobileOptimizedSelect
                    value={formData.period_id.toString()}
                    onChange={(value: string) => handleInputChange('period_id', parseInt(value))}
                    options={periodOptions}
                    placeholder={t('academics.timetable.select_timeframe', 'Select Timeframe')}
                    leftIcon={<Clock className="h-4 w-4" />}
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    {formData.class_id
                      ? t('academics.timetable.period_info_class_start', 'Class start: {{startTime}} • Subject credit hours: {{creditHours}} • Required hourly slots: {{requiredSlots}}', { startTime: selectedClass?.start_time || periodMeta?.class_start_time || '08:00', creditHours: formatCreditHours(selectedSubject?.credit_hours), requiredSlots: periodMeta?.required_period_count || 1 })
                      : t('academics.timetable.period_info_placeholder', 'Select a class and subject to automate the available timeframe options.')}
                  </div>
                </FormField>
                
                <FormField label={t('academics.timetable.room_number', 'Room Number')} htmlFor="room_id" error={errors.room_id}>
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
                <FormField label={t('common.class', 'Class')} htmlFor="class_id" error={errors.class_id} required>
                  <MobileOptimizedSelect
                    value={formData.class_id.toString()}
                    onChange={(value: string) => handleInputChange('class_id', parseInt(value))}
                    options={classOptions}
                    placeholder={t('academics.timetable.select_class', 'Select Class')}
                    leftIcon={<GraduationCap className="h-4 w-4" />}
                    disabled={disableClassSelection}
                  />
                </FormField>
                
                <FormField label={t('common.subject', 'Subject')} htmlFor="subject_id" error={errors.subject_id} required>
                  <MobileOptimizedSelect
                    value={formData.subject_id.toString()}
                    onChange={(value: string) => handleInputChange('subject_id', parseInt(value))}
                    options={subjectOptions}
                    placeholder={formData.class_id ? t('academics.timetable.select_subject', 'Select Subject') : t('academics.timetable.select_class_first', 'Select class first')}
                    leftIcon={<BookOpen className="h-4 w-4" />}
                  />
                  {selectedSubject && (
                    <div className="mt-2 text-xs text-slate-500">
                      {t('academics.timetable.subject_credit_info', 'This subject uses {{hours}} credit hour(s), so matching consecutive timeframe slots are locked automatically to avoid clashes.', { hours: formatCreditHours(selectedSubject.credit_hours) })}
                    </div>
                  )}
                </FormField>
              </FormRow>

              {formData.class_id > 0 && subjectOptions.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {t('academics.timetable.no_subjects_assigned', 'No subjects are assigned to this class yet. Add the subject, then assign its class and teacher in Settings > Academic > Subjects before creating timetable slots.')}
                </div>
              )}

              <FormRow>
                <FormField label={t('common.teacher', 'Teacher')} htmlFor="teacher_id" error={errors.teacher_id} required>
                  <MobileOptimizedSelect
                    value={formData.teacher_id.toString()}
                    onChange={(value: string) => handleInputChange('teacher_id', parseInt(value))}
                    options={teacherOptions}
                    placeholder={formData.subject_id ? t('academics.timetable.select_teacher', 'Select Teacher') : t('academics.timetable.select_subject_first', 'Select subject first')}
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
                {t('common.cancel', 'Cancel')}
              </TouchFriendlyButton>
              <TouchFriendlyButton
                type="submit"
                loading={isSubmitting}
                size={isMobile ? "lg" : "md"}
                className={isMobile ? 'w-full order-1' : ''}
              >
                {slotData ? t('academics.timetable.update_slot', 'Update Slot') : t('academics.timetable.create_slot', 'Create Slot')}
              </TouchFriendlyButton>
            </DialogFooter>
          </ResponsiveForm>
        </DialogContent>
      </Dialog>
    </FormValidationProvider>
  );
}
