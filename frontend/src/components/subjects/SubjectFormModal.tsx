import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { useCreateSubject, useUpdateSubject } from '../../hooks/useSubjects';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ResponsiveForm, FormSection, FormRow, FormField } from '../common/ResponsiveForm';
import MobileOptimizedInput from '../common/MobileOptimizedInput';
import MobileOptimizedSelect from '../common/MobileOptimizedSelect';
import MobileOptimizedTextarea from '../common/MobileOptimizedTextarea';
import { TouchFriendlyButton } from '../common/TouchFriendlyButton';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard';
import { FormValidationProvider } from '../common/FormValidationProvider';
import { BookOpen, Hash, FileText, Building, Clock, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { getErrorMessage } from '@/utils/errorHandling';
import { academicStructureService } from '@/services/departmentService';
import type { AcademicStructure } from '@/types/academic_structure.types';

interface SubjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectData?: any;
  onSuccess?: () => void;
}

// ── Code auto-generation ──────────────────────────────────────────────────────
function binaryPrefix(name: string): string {
  if (!name) return '00000';
  const letter = name.trim().toUpperCase()[0];
  if (letter < 'A' || letter > 'Z') return '00000';
  const val = letter.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
  return val.toString(2).padStart(5, '0');
}

function buildAutoCode(subjectName: string, deptName: string, serial: number): string {
  const alphaOnly = subjectName.toUpperCase().replace(/[^A-Z]/g, '');
  const prefix    = alphaOnly.substring(0, 3).padEnd(3, 'X');
  const deptBin   = binaryPrefix(deptName);
  const seq       = String(serial).padStart(3, '0');
  return `${prefix}-${deptBin}-${seq}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SubjectFormModal({ isOpen, onClose, subjectData, onSuccess }: SubjectFormModalProps) {
  const isMobile             = useMediaQuery('(max-width: 640px)');
  const { height, isVisible } = useMobileKeyboard();

  const [formData, setFormData] = useState({
    name: '',
    department_id: '' as '' | number,
    description: '',
    credit_hours: 1,
    is_active: true,
  });

  // Auto-generated code preview; only used when creating a new subject
  const [autoCode, setAutoCode]           = useState('');
  const [codeOverride, setCodeOverride]   = useState(false);
  const [customCode, setCustomCode]       = useState('');
  const [errors, setErrors]               = useState<Record<string, string>>({});

  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const [isSubmitting, setIsSubmitting]   = useState(false);

  // Fetch discipline-type structures for the dropdown
  const { data: departments = [], isLoading: deptsLoading } = useQuery<AcademicStructure[]>({
    queryKey: ['academic-structures', 'discipline'],
    queryFn:  academicStructureService.getDisciplines,
    staleTime: 5 * 60 * 1000,
  });

  // Re-compute auto-code whenever name or department_id changes
  useEffect(() => {
    if (subjectData || codeOverride) return; // don't overwrite manual/existing codes
    const dept = departments.find(d => d.id === formData.department_id);
    if (formData.name) {
      // serial is unknown here; server resolves it — show placeholder
      setAutoCode(buildAutoCode(formData.name, dept?.name ?? '', 0).replace('-000', '-???'));
    } else {
      setAutoCode('');
    }
  }, [formData.name, formData.department_id, departments, codeOverride, subjectData]);

  // Populate form from subjectData when editing
  useEffect(() => {
    if (subjectData) {
      setFormData({
        name:          subjectData.name          ?? '',
        department_id: subjectData.department_id ?? '',
        description:   subjectData.description   ?? '',
        credit_hours:  subjectData.credit_hours  ?? 1,
        is_active:     subjectData.is_active      !== undefined ? subjectData.is_active : true,
      });
      setCustomCode(subjectData.code ?? '');
      setCodeOverride(true); // editing: always manual
    } else {
      setFormData({ name: '', department_id: '', description: '', credit_hours: 1, is_active: true });
      setCustomCode('');
      setCodeOverride(false);
    }
    setErrors({});
  }, [subjectData, isOpen]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Subject name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Subject name must be at least 2 characters';
    }

    if (codeOverride && !customCode.trim()) {
      newErrors.code = 'Subject code is required when overriding';
    }

    if (!formData.department_id) {
      newErrors.department_id = 'Discipline / department is required';
    }

    if (formData.credit_hours < 1 || formData.credit_hours > 10) {
      newErrors.credit_hours = 'Credit hours must be between 1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name:          formData.name,
        department_id: formData.department_id || null,
        description:   formData.description,
        credit_hours:  formData.credit_hours,
        is_active:     formData.is_active,
      };
      // Only include code when overriding (server auto-generates otherwise)
      if (codeOverride && customCode.trim()) {
        payload.code = customCode.trim().toUpperCase();
      }

      if (subjectData) {
        await updateSubject.mutateAsync({ id: subjectData.id, data: payload });
        toast.success('Subject updated successfully');
      } else {
        await createSubject.mutateAsync(payload);
        toast.success('Subject created successfully');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || getErrorMessage(error)
                  || 'Failed to save subject. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Department select options ─────────────────────────────────────────────
  const deptOptions = departments.map(d => ({ value: String(d.id), label: d.name }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <FormValidationProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className={`sm:max-w-[500px] max-h-[90vh] overflow-y-auto ${isMobile && isVisible ? 'h-screen' : ''}`}
          style={{ height: isMobile && isVisible ? `${height}px` : 'auto' }}
        >
          <DialogHeader>
            <DialogTitle className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>
              {subjectData ? 'Edit Subject' : 'Add New Subject'}
            </DialogTitle>
            <DialogDescription>
              {subjectData
                ? 'Update the details of this subject.'
                : 'Create a new academic subject. The subject code is auto-generated from the name and discipline.'}
            </DialogDescription>
          </DialogHeader>

          <ResponsiveForm onSubmit={handleSubmit}>
            <FormSection>
              <FormRow>
                {/* Subject name */}
                <FormField label="Subject Name" htmlFor="name" error={errors.name} required>
                  <MobileOptimizedInput
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter subject name"
                    leftIcon={<BookOpen className="h-4 w-4" />}
                    error={errors.name}
                    autoComplete="off"
                  />
                </FormField>

                {/* Discipline / Department — live from API */}
                <FormField label="Discipline" htmlFor="department_id" error={errors.department_id} required>
                  {deptsLoading ? (
                    <div className="flex items-center gap-2 h-10 px-3 text-sm text-slate-500">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Loading…
                    </div>
                  ) : (
                    <MobileOptimizedSelect
                      value={formData.department_id === '' ? '' : String(formData.department_id)}
                      onChange={(value: string) =>
                        setFormData(prev => ({ ...prev, department_id: value ? Number(value) : '' }))
                      }
                      placeholder={departments.length === 0 ? 'No disciplines yet — create one first' : 'Select discipline'}
                      error={errors.department_id}
                      options={deptOptions}
                    />
                  )}
                </FormField>
              </FormRow>

              {/* Code row — auto-generated or manual override */}
              <FormRow>
                <FormField
                  label={codeOverride ? 'Subject Code (Manual)' : 'Subject Code (Auto-generated)'}
                  htmlFor="code"
                  error={errors.code}
                >
                  {codeOverride ? (
                    <div className="flex gap-2 items-center">
                      <MobileOptimizedInput
                        id="code"
                        type="text"
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                        placeholder="e.g. MAT-01101-001"
                        leftIcon={<Hash className="h-4 w-4" />}
                        error={errors.code}
                        autoComplete="off"
                      />
                      {!subjectData && (
                        <TouchFriendlyButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => { setCodeOverride(false); setCustomCode(''); }}
                        >
                          Auto
                        </TouchFriendlyButton>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 h-10 px-3 flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-500">
                        {autoCode || <span className="text-slate-300">enter name & discipline…</span>}
                      </div>
                      <TouchFriendlyButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setCodeOverride(true); setCustomCode(''); }}
                      >
                        Override
                      </TouchFriendlyButton>
                    </div>
                  )}
                </FormField>

                {/* Credit Hours */}
                <FormField label="Credit Hours" htmlFor="credit_hours" error={errors.credit_hours} required>
                  <MobileOptimizedInput
                    id="credit_hours"
                    type="number"
                    value={formData.credit_hours.toString()}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, credit_hours: parseInt(e.target.value) || 1 }))
                    }
                    placeholder="1"
                    leftIcon={<Clock className="h-4 w-4" />}
                    error={errors.credit_hours}
                    min="1"
                    max="10"
                  />
                </FormField>
              </FormRow>

              <FormField label="Description" htmlFor="description" error={errors.description}>
                <MobileOptimizedTextarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter subject description (optional)"
                  rows={3}
                />
              </FormField>

              <FormField label="Status" htmlFor="is_active">
                <div className="flex items-center space-x-3">
                  {formData.is_active
                    ? <ToggleRight className="h-5 w-5 text-green-600" />
                    : <ToggleLeft  className="h-5 w-5 text-gray-400"  />
                  }
                  <TouchFriendlyButton
                    type="button"
                    variant={formData.is_active ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                    className={`min-w-[80px] ${
                      formData.is_active
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </TouchFriendlyButton>
                </div>
              </FormField>
            </FormSection>

            <DialogFooter className={`${isMobile ? 'flex-col gap-3 pt-6' : 'flex-row gap-2'}`}>
              <TouchFriendlyButton
                type="button" variant="outline" onClick={onClose}
                size={isMobile ? 'lg' : 'md'}
                className={isMobile ? 'w-full order-2' : ''}
              >
                Cancel
              </TouchFriendlyButton>
              <TouchFriendlyButton
                type="submit" loading={isSubmitting}
                size={isMobile ? 'lg' : 'md'}
                className={isMobile ? 'w-full order-1' : ''}
              >
                {subjectData ? 'Update Subject' : 'Create Subject'}
              </TouchFriendlyButton>
            </DialogFooter>
          </ResponsiveForm>
        </DialogContent>
      </Dialog>
    </FormValidationProvider>
  );
}