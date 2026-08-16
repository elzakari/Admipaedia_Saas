import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { useCreateSubject, useUpdateSubject, useSubject } from '../../hooks/useSubjects';
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
import { BookOpen, Hash, FileText, Building, Clock, ToggleLeft, ToggleRight, RefreshCw, GraduationCap, Users } from 'lucide-react';
import { getErrorMessage } from '@/utils/errorHandling';
import { academicStructureService } from '@/services/departmentService';
import { useTranslation } from 'react-i18next';
import type { SubjectCreate, SubjectUpdate } from '@/services/subjectService';
import type { AcademicStructure } from '@/types/academic_structure.types';
import { useClasses } from '../../hooks/useClasses';
import { useTeachers } from '../../hooks/useTeachers';
import { getClassDisplayName } from '../../utils/formatters';

interface SubjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectData?: any;
  onSuccess?: () => void;
}

// Safe translation helper — returns the fallback string if t() returns an object
// (e.g. i18next backend misconfigured, or key points at a nested object such as
// `common.status` being a parent with {active,inactive}). Always passes fallback
// via `defaultValue` option to suppress i18next "returned an object instead of
// string" warnings for object-typed keys.
function tStr(tFn: any, key: string, fallback: string, opts?: any): string {
  try {
    const tOpts = Object.assign(
      { defaultValue: fallback, returnObjects: false },
      typeof opts === 'object' && opts != null ? opts : {}
    );
    const val = tFn(key, tOpts);
    if (typeof val === 'string') return val;
    if (val == null) return fallback;
    if (typeof val === 'object') {
      const anyObj: any = val;
      if (typeof anyObj.label === 'string') return anyObj.label;
      if (typeof anyObj.value === 'string') return anyObj.value;
      if (typeof anyObj.message === 'string') return anyObj.message;
      if (typeof anyObj.text === 'string') return anyObj.text;
      // Last-ditch: if the value is a locale keyed object like {en, fr},
      // pick the first non-empty string entry.
      for (const candidate of ['en', 'fr', 'en-US', 'fr-FR']) {
        if (typeof anyObj[candidate] === 'string' && anyObj[candidate].length > 0) return anyObj[candidate];
      }
    }
  } catch {
    /* noop */
  }
  return fallback;
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
  const { t }                  = useTranslation();
  const isMobile             = useMediaQuery('(max-width: 640px)');
  const { height, isVisible } = useMobileKeyboard();

  const [formData, setFormData] = useState({
    name: '',
    department_id: '' as '' | number,
    description: '',
    credit_hours: 1,
    is_active: true,
  });
  const [assignedClassIds, setAssignedClassIds]   = useState<number[]>([]);
  const [assignedTeacherIds, setAssignedTeacherIds] = useState<number[]>([]);
  const [classSearch, setClassSearch]   = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');

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
    refetchOnMount: true,
    retry: 1,
  });

  // For editing, fetch full subject detail (classes + teachers relations) to hydrate assignments
  const detailQuery = useSubject(subjectData?.id || 0);

  const { data: classesData, isFetching: classesLoading } = useClasses({ page: 1, per_page: 200 });
  const { data: teachersData, isFetching: teachersLoading } = useTeachers({ page: 1, per_page: 200, status: 'active' });

  const classOptions: any[] = useMemo(() => {
    if (Array.isArray(classesData)) return classesData;
    const cd: any = classesData || {};
    if (Array.isArray(cd.data)) return cd.data;
    if (Array.isArray(cd.classes)) return cd.classes;
    if (cd && typeof cd === 'object') {
      for (const v of Object.values(cd)) {
        if (Array.isArray(v) && (v.length === 0 || (v[0] && typeof v[0] === 'object' && 'id' in v[0]))) return v;
      }
    }
    return [];
  }, [classesData]);

  const teacherOptions: any[] = useMemo(() => {
    if (Array.isArray(teachersData)) return teachersData;
    const td: any = teachersData || {};
    if (Array.isArray(td.teachers)) return td.teachers;
    if (Array.isArray(td.data)) return td.data;
    if (td && typeof td === 'object') {
      for (const v of Object.values(td)) {
        if (Array.isArray(v) && (v.length === 0 || (v[0] && typeof v[0] === 'object' && 'id' in v[0]))) return v;
      }
    }
    return [];
  }, [teachersData]);

  const filteredClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    return classOptions.filter((cls: any) => {
      const label = getClassDisplayName(cls).toLowerCase();
      const grade = (typeof cls.grade_level === 'object' && cls.grade_level ? String((cls.grade_level as any).name || '') : String(cls.grade_level || '')).toLowerCase();
      return !q || label.includes(q) || grade.includes(q);
    });
  }, [classOptions, classSearch]);

  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    return teacherOptions.filter((t: any) => {
      const label =
        t.full_name || t.name ||
        `${t.first_name || t.user?.first_name || ''} ${t.last_name || t.user?.last_name || ''}`.trim() ||
        `Teacher ${t.id}`;
      return !q || String(label).toLowerCase().includes(q);
    });
  }, [teacherOptions, teacherSearch]);

  const selectedClassLabels = useMemo(() => {
    const ids = new Set(assignedClassIds);
    return classOptions
      .filter((c: any) => ids.has(c.id))
      .map((c: any) => ({ id: c.id, label: getClassDisplayName(c) }));
  }, [classOptions, assignedClassIds]);

  const selectedTeacherLabels = useMemo(() => {
    const ids = new Set(assignedTeacherIds);
    return teacherOptions
      .filter((t: any) => ids.has(t.id))
      .map((t: any) => ({
        id: t.id,
        label: t.full_name || t.name ||
          `${t.first_name || t.user?.first_name || ''} ${t.last_name || t.user?.last_name || ''}`.trim() ||
          `Teacher ${t.id}`,
      }));
  }, [teacherOptions, assignedTeacherIds]);

  const toggleArray = <K extends number>(arr: K[], id: K): K[] => {
    const s = new Set(arr);
    if (s.has(id)) s.delete(id); else s.add(id);
    return Array.from(s);
  };

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
    if (!isOpen) return;
    const source: any = detailQuery.data || subjectData;
    if (source) {
      setFormData({
        name:          source.name          ?? '',
        department_id: source.department_id ?? '',
        description:   source.description   ?? '',
        credit_hours:  source.credit_hours  ?? (source as any).credits ?? 1,
        is_active:     source.is_active      !== undefined ? source.is_active : true,
      });
      setAssignedClassIds(Array.isArray(source.classes) ? source.classes.map((c: any) => c.id) : []);
      setAssignedTeacherIds(Array.isArray(source.teachers) ? source.teachers.map((tch: any) => tch.id) : []);
      setCustomCode(source.code ?? '');
      setCodeOverride(true); // editing: always manual
    } else {
      setFormData({ name: '', department_id: '', description: '', credit_hours: 1, is_active: true });
      setAssignedClassIds([]);
      setAssignedTeacherIds([]);
      setCustomCode('');
      setCodeOverride(false);
    }
    setClassSearch('');
    setTeacherSearch('');
    setErrors({});
  }, [subjectData, isOpen, detailQuery.data]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = tStr(t, 'academics.subjects.errors.name_required', 'Subject name is required');
    } else if (formData.name.length < 2) {
      newErrors.name = tStr(t, 'academics.subjects.errors.name_min', 'Subject name must be at least 2 characters');
    }

    if (codeOverride && !customCode.trim()) {
      newErrors.code = tStr(t, 'academics.subjects.errors.code_required', 'Subject code is required when overriding');
    }

    if (!formData.department_id) {
      newErrors.department_id = tStr(t, 'academics.subjects.errors.department_required', 'Discipline / department is required');
    }

    if (formData.credit_hours < 1 || formData.credit_hours > 10) {
      newErrors.credit_hours = tStr(t, 'academics.subjects.errors.credit_hours_range', 'Credit hours must be between 1 and 10');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error(tStr(t, 'common.errors.fix_errors', 'Please fix the errors in the form'));
      return;
    }
    setIsSubmitting(true);
    try {
      const basePayload = {
        name:          formData.name,
        department_id: formData.department_id || null,
        description:   formData.description,
        credit_hours:  formData.credit_hours,
        is_active:     formData.is_active,
        assigned_class_ids:   assignedClassIds.length   ? assignedClassIds   : [],
        assigned_teacher_ids: assignedTeacherIds.length ? assignedTeacherIds : [],
      };
      const payload: any = { ...basePayload };
      // Only include code when overriding (server auto-generates otherwise for create)
      if (codeOverride && customCode.trim()) {
        payload.code = customCode.trim().toUpperCase();
      }

      if (subjectData) {
        const updatePayload: any = basePayload;
        if (codeOverride && customCode.trim()) updatePayload.code = customCode.trim().toUpperCase();
        const response: any = await updateSubject.mutateAsync({ id: subjectData.id, data: updatePayload });
        const report = response?.assignments_report;
        let suffix = '';
        if (report) {
          const classFailed  = (report.classes?.failed  || []).length;
          const teacherFailed = (report.teachers?.failed || []).length;
          if (classFailed + teacherFailed > 0) suffix = ` (${classFailed + teacherFailed} assignment(s) failed to save)`;
        }
        toast.success(tStr(t, 'academics.subjects.toast.update_success', 'Subject updated successfully') + suffix);
      } else {
        const response: any = await createSubject.mutateAsync(payload);
        const report = response?.assignments_report;
        let suffix = '';
        if (report) {
          const classAdded  = (report.classes?.added  ?? 0);
          const teacherAdded = (report.teachers?.added ?? 0);
          const classFailed  = (report.classes?.failed  || []).length;
          const teacherFailed = (report.teachers?.failed || []).length;
          const totals: string[] = [];
          if (classAdded   + teacherAdded   > 0) totals.push(`${classAdded + teacherAdded} assigned`);
          if (classFailed  + teacherFailed  > 0) totals.push(`${classFailed + teacherFailed} failed`);
          if (totals.length) suffix = ` (${totals.join(', ')})`;
        }
        toast.success(tStr(t, 'academics.subjects.toast.create_success', 'Subject created successfully') + suffix);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || getErrorMessage(error)
                  || tStr(t, 'academics.subjects.toast.save_failed', 'Failed to save subject. Please try again.');
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
              {subjectData ? tStr(t, 'academics.subjects.edit_subject', 'Edit Subject') : tStr(t, 'academics.subjects.add_subject', 'Add New Subject')}
            </DialogTitle>
            <DialogDescription>
              {subjectData
                ? tStr(t, 'academics.subjects.edit_subject_desc', 'Update the details of this subject.')
                : tStr(t, 'academics.subjects.add_subject_desc', 'Create a new academic subject. The subject code is auto-generated from the name and discipline.')}
            </DialogDescription>
          </DialogHeader>

          <ResponsiveForm onSubmit={handleSubmit}>
            <FormSection>
              <FormRow>
                {/* Subject name */}
                <FormField label={tStr(t, 'academics.subjects.subject_name', 'Subject Name')} htmlFor="name" error={errors.name} required>
                  <MobileOptimizedInput
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={tStr(t, 'academics.subjects.subject_name_placeholder', 'Enter subject name')}
                    leftIcon={<BookOpen className="h-4 w-4" />}
                    error={errors.name}
                    autoComplete="off"
                  />
                </FormField>

                {/* Discipline / Department — live from API */}
                <FormField label={tStr(t, 'academics.subjects.discipline', 'Discipline')} htmlFor="department_id" error={errors.department_id} required>
                  {deptsLoading ? (
                    <div className="flex items-center gap-2 h-10 px-3 text-sm text-slate-500">
                      <RefreshCw className="h-3 w-3 animate-spin" /> {tStr(t, 'common.loading', 'Loading...')}
                    </div>
                  ) : (
                    <>
                      <MobileOptimizedSelect
                        value={formData.department_id === '' ? '' : String(formData.department_id)}
                        onChange={(value: string) =>
                          setFormData(prev => ({ ...prev, department_id: value ? Number(value) : '' }))
                        }
                        placeholder={departments.length === 0 ? tStr(t, 'academics.subjects.no_disciplines', 'No disciplines yet — create one first') : tStr(t, 'academics.subjects.select_discipline', 'Select discipline')}
                        error={errors.department_id}
                        options={deptOptions}
                      />
                      {!deptsLoading && departments.length === 0 && (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-200">
                          <div className="font-medium mb-1">{tStr(t, 'academics.subjects.no_disciplines_title', 'No disciplines yet')}</div>
                          <div className="opacity-90 mb-2">
                            {tStr(t, 'academics.subjects.no_disciplines_help', 'Create a Discipline (type=Discipline) in the Admin > Administration > Departments page first, then return here.')}
                          </div>
                          <a
                            href="/admin/administration"
                            className="inline-flex items-center gap-1 font-medium text-amber-900 dark:text-amber-100 underline hover:no-underline"
                            onClick={(e) => {
                              // Allow normal navigation, close modal first so user returns to a clean state
                              try { onClose(); } catch { /* noop */ }
                            }}
                          >
                            {tStr(t, 'academics.subjects.go_to_administration', 'Go to Administration → Departments')}
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </FormField>
              </FormRow>

              {/* Code row — auto-generated or manual override */}
              <FormRow>
                <FormField
                  label={codeOverride ? tStr(t, 'academics.subjects.code_manual', 'Subject Code (Manual)') : tStr(t, 'academics.subjects.code_auto', 'Subject Code (Auto-generated)')}
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
                          {tStr(t, 'academics.subjects.auto_btn', 'Auto')}
                        </TouchFriendlyButton>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 h-10 px-3 flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-500">
                        {autoCode || <span className="text-slate-300">{tStr(t, 'academics.subjects.enter_info_placeholder', 'enter name & discipline…')}</span>}
                      </div>
                      <TouchFriendlyButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setCodeOverride(true); setCustomCode(''); }}
                      >
                        {tStr(t, 'academics.subjects.override_btn', 'Override')}
                      </TouchFriendlyButton>
                    </div>
                  )}
                </FormField>

                {/* Credit Hours */}
                <FormField label={tStr(t, 'academics.timetable.credit_hours', 'Credit Hours')} htmlFor="credit_hours" error={errors.credit_hours} required>
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

              <FormField label={tStr(t, 'academics.timetable.description', 'Description')} htmlFor="description" error={errors.description}>
                <MobileOptimizedTextarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={tStr(t, 'academics.subjects.description_placeholder', 'Enter subject description (optional)')}
                  rows={3}
                />
              </FormField>

              <FormField label={tStr(t, 'common.status_label', 'Status')} htmlFor="is_active">
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
                    {formData.is_active
                      ? tStr(t, 'common.status.active', 'Active')
                      : tStr(t, 'common.status.inactive', 'Inactive')}
                  </TouchFriendlyButton>
                </div>
              </FormField>

              {/* Assigned Classes */}
              <FormField
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 opacity-70" />
                    {tStr(t, 'academics.subjects.assigned_classes', 'Assigned Classes')}
                  </span>
                }
                htmlFor="classSearch"
                hint={tStr(
                  t,
                  'academics.subjects.assigned_classes_hint',
                  'Only classes you select here will be able to use this subject in timetable creation.'
                )}
              >
                <div className="space-y-2">
                  <MobileOptimizedInput
                    id="classSearch"
                    type="text"
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    placeholder={tStr(t, 'academics.subjects.class_search', 'Search classes or grade levels…')}
                    leftIcon={classesLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <GraduationCap className="h-3.5 w-3.5" />}
                  />
                  {selectedClassLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2 bg-slate-50/60 dark:bg-slate-900/20">
                      {selectedClassLabels.map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-900/60 px-2.5 py-0.5 text-xs text-sky-900 dark:text-sky-100"
                        >
                          {c.label}
                          <button
                            type="button"
                            className="opacity-60 hover:opacity-100 hover:text-red-700"
                            onClick={() => setAssignedClassIds(prev => prev.filter(x => x !== c.id))}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-900/30">
                    {classesLoading && classOptions.length === 0 ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-2 py-1">
                        <RefreshCw className="h-3 w-3 animate-spin" /> {tStr(t, 'common.loading', 'Loading...')}
                      </div>
                    ) : filteredClasses.length === 0 ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1">
                        {classOptions.length > 0
                          ? tStr(t, 'academics.subjects.no_class_match', 'No classes match this search.')
                          : tStr(t, 'academics.subjects.no_classes_available', 'No classes available — create classes first under Admin > Classes.')}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {filteredClasses.map((cls: any) => {
                          const checked = assignedClassIds.includes(cls.id);
                          return (
                            <label
                              key={cls.id}
                              className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                                checked
                                  ? 'bg-sky-50 dark:bg-sky-950/50 ring-1 ring-sky-300 dark:ring-sky-800'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={checked}
                                onChange={() =>
                                  setAssignedClassIds(prev => toggleArray(prev, cls.id))
                                }
                              />
                              <span className="leading-snug">{getClassDisplayName(cls)}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </FormField>

              {/* Assigned Teachers */}
              <FormField
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 opacity-70" />
                    {tStr(t, 'academics.subjects.assigned_teachers', 'Assigned Teachers')}
                  </span>
                }
                htmlFor="teacherSearch"
                hint={tStr(
                  t,
                  'academics.subjects.assigned_teachers_hint',
                  'Teachers assigned here will be able to grade and schedule lessons for this subject.'
                )}
              >
                <div className="space-y-2">
                  <MobileOptimizedInput
                    id="teacherSearch"
                    type="text"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder={tStr(t, 'academics.subjects.teacher_search', 'Search teachers by name…')}
                    leftIcon={teachersLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                  />
                  {selectedTeacherLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2 bg-slate-50/60 dark:bg-slate-900/20">
                      {selectedTeacherLabels.map((tch) => (
                        <span
                          key={tch.id}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 text-xs text-emerald-900 dark:text-emerald-100"
                        >
                          {tch.label}
                          <button
                            type="button"
                            className="opacity-60 hover:opacity-100 hover:text-red-700"
                            onClick={() => setAssignedTeacherIds(prev => prev.filter(x => x !== tch.id))}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-900/30">
                    {teachersLoading && teacherOptions.length === 0 ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-2 py-1">
                        <RefreshCw className="h-3 w-3 animate-spin" /> {tStr(t, 'common.loading', 'Loading...')}
                      </div>
                    ) : filteredTeachers.length === 0 ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1">
                        {teacherOptions.length > 0
                          ? tStr(t, 'academics.subjects.no_teacher_match', 'No teachers match this search.')
                          : tStr(t, 'academics.subjects.no_teachers_available', 'No active teachers available — invite staff first.')}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {filteredTeachers.map((tch: any) => {
                          const checked = assignedTeacherIds.includes(tch.id);
                          const label =
                            tch.full_name || tch.name ||
                            `${tch.first_name || tch.user?.first_name || ''} ${tch.last_name || tch.user?.last_name || ''}`.trim() ||
                            `Teacher ${tch.id}`;
                          return (
                            <label
                              key={tch.id}
                              className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                                checked
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 ring-1 ring-emerald-300 dark:ring-emerald-800'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={checked}
                                onChange={() =>
                                  setAssignedTeacherIds(prev => toggleArray(prev, tch.id))
                                }
                              />
                              <span className="leading-snug">{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </FormField>
            </FormSection>

            <DialogFooter className={`${isMobile ? 'flex-col gap-3 pt-6' : 'flex-row gap-2'}`}>
              <TouchFriendlyButton
                type="button" variant="outline" onClick={onClose}
                size={isMobile ? 'lg' : 'md'}
                className={isMobile ? 'w-full order-2' : ''}
              >
                {tStr(t, 'common.cancel', 'Cancel')}
              </TouchFriendlyButton>
              <TouchFriendlyButton
                type="submit" loading={isSubmitting}
                size={isMobile ? 'lg' : 'md'}
                className={isMobile ? 'w-full order-1' : ''}
              >
                {subjectData
                  ? tStr(t, 'academics.subjects.btn_update', 'Update Subject')
                  : tStr(t, 'academics.subjects.btn_create', 'Create Subject')}
              </TouchFriendlyButton>
            </DialogFooter>
          </ResponsiveForm>
        </DialogContent>
      </Dialog>
    </FormValidationProvider>
  );
}
