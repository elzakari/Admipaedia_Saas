import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';
import type { TeacherClass } from '../teacherMockData';
import api from '../../../lib/api';

interface SubjectOption {
  id: number;
  name: string;
}

interface AssessmentCategory {
  id: string | number;
  name: string;
  weight?: number;
}

interface AssessmentOption {
  assessment_key: string;
  assessment_name: string;
  assessment_type_id: string | number;
  total_marks?: number;
  assessment_date?: string | null;
}

interface GradeRecord {
  score?: number;
  total?: number;
  percentage?: number;
  grade?: string;
  remark?: string;
}

interface GradebookStudentRow {
  student_name: string;
  admission_number?: string;
  grades: Record<string, GradeRecord>;
}

interface GradebookResponse {
  students: Record<string, GradebookStudentRow>;
  assessments: AssessmentOption[];
}

interface GradeEntry {
  student_id: number;
  score: number | string;
  grade: string;
  remark: string;
}

const TERM_OPTIONS = ['First Term', 'Second Term', 'Third Term'];

export function TeacherClassGradebookTab({ cls }: { cls: TeacherClass }) {
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('First Term');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(String(cls.term || ''));
  const [assessmentCategories, setAssessmentCategories] = useState<AssessmentCategory[]>([]);
  const [assessmentOptions, setAssessmentOptions] = useState<AssessmentOption[]>([]);
  const [selectedAssessmentKey, setSelectedAssessmentKey] = useState<string>('');
  const [assessmentName, setAssessmentName] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [assessmentDate, setAssessmentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [maxScore, setMaxScore] = useState<number>(100);
  const [gradeMatrix, setGradeMatrix] = useState<Record<number, GradeEntry>>({});
  const [gradebookSnapshot, setGradebookSnapshot] = useState<GradebookResponse | null>(null);
  const [gradingSchemeId, setGradingSchemeId] = useState<number>(0);
  const [defaultMaxScore, setDefaultMaxScore] = useState<number>(100);
  const [isApc, setIsApc] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeRoster = useMemo(() => cls.roster.filter((r) => r.status === 'active'), [cls.roster]);
  const numericClassId = Number(cls.id);

  const buildEmptyMatrix = useCallback((): Record<number, GradeEntry> => {
    const next: Record<number, GradeEntry> = {};
    activeRoster.forEach((student) => {
      const numericStudentId = Number(student.id);
      if (Number.isFinite(numericStudentId)) {
        next[numericStudentId] = {
          student_id: numericStudentId,
          score: '',
          grade: '',
          remark: '',
        };
      }
    });
    return next;
  }, [activeRoster]);

  const calculateGradeAndRemark = useCallback((scoreNum: number, totalMarks: number) => {
    if (isApc) {
      let normalized = scoreNum;
      if (totalMarks !== 20) {
        normalized = (scoreNum / totalMarks) * 20;
      }
      if (normalized >= 16) return { grade: 'M', remark: 'Maîtrisé' };
      if (normalized >= 14) return { grade: 'A', remark: 'Acquis' };
      if (normalized >= 10) return { grade: 'EA', remark: 'En cours d’Acquisition' };
      return { grade: 'NA', remark: 'Non Acquis' };
    }

    const percentage = totalMarks > 0 ? (scoreNum / totalMarks) * 100 : 0;
    if (percentage >= 90) return { grade: 'A+', remark: 'Excellent' };
    if (percentage >= 80) return { grade: 'A', remark: 'Very Good' };
    if (percentage >= 75) return { grade: 'B+', remark: 'Very Good' };
    if (percentage >= 70) return { grade: 'B', remark: 'Good' };
    if (percentage >= 65) return { grade: 'C+', remark: 'Good' };
    if (percentage >= 60) return { grade: 'C', remark: 'Satisfactory' };
    if (percentage >= 55) return { grade: 'D+', remark: 'Credit' };
    if (percentage >= 50) return { grade: 'D', remark: 'Pass' };
    if (percentage >= 45) return { grade: 'E', remark: 'Pass' };
    return { grade: 'F', remark: 'Fail' };
  }, [isApc]);

  const applyAssessmentToMatrix = useCallback((assessmentKey: string, snapshot: GradebookResponse | null) => {
    if (!assessmentKey || !snapshot) {
      setGradeMatrix(buildEmptyMatrix());
      return;
    }

    const nextMatrix = buildEmptyMatrix();
    Object.entries(snapshot.students || {}).forEach(([studentId, studentRow]) => {
      const numericStudentId = Number(studentId);
      if (!Number.isFinite(numericStudentId)) {
        return;
      }

      const saved = studentRow?.grades?.[assessmentKey];
      if (!saved) {
        return;
      }

      nextMatrix[numericStudentId] = {
        student_id: numericStudentId,
        score: saved.score ?? '',
        grade: saved.grade ?? '',
        remark: saved.remark ?? '',
      };
    });

    setGradeMatrix(nextMatrix);
  }, [buildEmptyMatrix]);

  const hydrateAssessmentDetails = useCallback((assessmentKey: string, options: AssessmentOption[]) => {
    const selected = options.find((item) => item.assessment_key === assessmentKey);
    if (!selected) {
      return;
    }

    setAssessmentName(selected.assessment_name || '');
    setSelectedCategoryId(String(selected.assessment_type_id ?? ''));
    setAssessmentDate(selected.assessment_date || new Date().toISOString().slice(0, 10));
    setMaxScore(selected.total_marks && selected.total_marks > 0 ? selected.total_marks : defaultMaxScore);
  }, [defaultMaxScore]);

  useEffect(() => {
    setGradeMatrix(buildEmptyMatrix());
  }, [buildEmptyMatrix]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [subjectsResponse, categoriesResponse, academicResponse, gradingResponse] = await Promise.all([
          api.get(`/classes/${cls.id}/subjects`),
          api.get('/assessment-categories'),
          api.get('/settings/academic'),
          api.get('/academics/grading-scheme'),
        ]);

        if (!active) {
          return;
        }

        const subjectList = subjectsResponse.data?.subjects || subjectsResponse.data || [];
        const nextSubjects = Array.isArray(subjectList) ? subjectList : [];
        setSubjects(nextSubjects);
        if (nextSubjects.length > 0) {
          setSelectedSubjectId((prev) => prev || nextSubjects[0].id);
        }

        const categories = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];
        setAssessmentCategories(categories);
        if (categories.length > 0) {
          setSelectedCategoryId((prev) => prev || String(categories[0].id));
        }

        const academicConfig = academicResponse.data || {};
        if (!String(cls.term || '').trim() && academicConfig.academicYear) {
          setSelectedAcademicYear((prev) => prev || academicConfig.academicYear);
        }
        if (academicConfig.currentTerm) {
          setSelectedTerm((prev) => prev || academicConfig.currentTerm);
        }
        if (typeof academicConfig.maxGrade === 'number' && academicConfig.maxGrade > 0) {
          setDefaultMaxScore(academicConfig.maxGrade);
          setMaxScore((prev) => (prev > 0 ? prev : academicConfig.maxGrade));
        }

        const fullScheme = gradingResponse.data?.full_scheme || {};
        const boundaries = gradingResponse.data?.gradingScheme || fullScheme?.grade_boundaries || [];
        const hasApcDescriptors = Array.isArray(boundaries) && boundaries.some((boundary: any) => {
          const symbol = String(boundary.grade || boundary.grade_symbol || '').toUpperCase();
          return ['NA', 'EA', 'M'].includes(symbol);
        });
        const name = String(fullScheme?.name || '').toLowerCase();
        const description = String(fullScheme?.description || '').toLowerCase();
        const apcMode = name.includes('apc') || description.includes('apc') || hasApcDescriptors;
        setIsApc(apcMode);
        if (typeof fullScheme?.id === 'number') {
          setGradingSchemeId(fullScheme.id);
        }

        const configuredMax = typeof academicConfig.maxGrade === 'number' && academicConfig.maxGrade > 0
          ? academicConfig.maxGrade
          : 100;
        const nextDefaultMax = apcMode ? 20 : configuredMax;
        setDefaultMaxScore(nextDefaultMax);
        setMaxScore(nextDefaultMax);
      } catch (error) {
        console.error('Failed to bootstrap teacher gradebook context', error);
        if (active) {
          setErrorMessage('Failed to load gradebook settings for this class.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [cls.id, cls.term]);

  const refreshGradebook = useCallback(async (preferredAssessmentKey?: string) => {
    if (!Number.isFinite(numericClassId) || numericClassId <= 0) {
      setAssessmentOptions([]);
      setGradebookSnapshot(null);
      setGradeMatrix(buildEmptyMatrix());
      return;
    }
    if (!selectedSubjectId || !selectedTerm || !selectedAcademicYear.trim()) {
      setAssessmentOptions([]);
      setGradebookSnapshot(null);
      setGradeMatrix(buildEmptyMatrix());
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await api.get('/grades/gradebook', {
        params: {
          class_id: numericClassId,
          subject_id: selectedSubjectId,
          term: selectedTerm,
          academic_year: selectedAcademicYear.trim(),
        },
      });

      const snapshot: GradebookResponse = response.data?.data || { students: {}, assessments: [] };
      const options = Array.isArray(snapshot.assessments) ? snapshot.assessments : [];
      const preferredKey = preferredAssessmentKey || selectedAssessmentKey;
      const nextAssessmentKey = preferredKey && options.some((item) => item.assessment_key === preferredKey)
        ? preferredKey
        : '';

      setGradebookSnapshot(snapshot);
      setAssessmentOptions(options);

      if (nextAssessmentKey) {
        setSelectedAssessmentKey(nextAssessmentKey);
        hydrateAssessmentDetails(nextAssessmentKey, options);
        applyAssessmentToMatrix(nextAssessmentKey, snapshot);
      } else {
        setSelectedAssessmentKey('');
        setAssessmentName('');
        setAssessmentDate(new Date().toISOString().slice(0, 10));
        setMaxScore(defaultMaxScore);
        setGradeMatrix(buildEmptyMatrix());
      }
    } catch (error: any) {
      console.error('Failed to load enhanced gradebook snapshot', error);
      const backendMessage = error?.response?.data?.message || error?.message;
      setErrorMessage(backendMessage || 'Failed to load the shared gradebook for this class.');
      setAssessmentOptions([]);
      setGradebookSnapshot(null);
      setGradeMatrix(buildEmptyMatrix());
    } finally {
      setIsLoading(false);
    }
  }, [
    applyAssessmentToMatrix,
    buildEmptyMatrix,
    defaultMaxScore,
    hydrateAssessmentDetails,
    numericClassId,
    selectedAcademicYear,
    selectedAssessmentKey,
    selectedSubjectId,
    selectedTerm,
  ]);

  useEffect(() => {
    if (!selectedSubjectId) {
      setAssessmentOptions([]);
      setGradebookSnapshot(null);
      setSelectedAssessmentKey('');
      setAssessmentName('');
      setGradeMatrix(buildEmptyMatrix());
      return;
    }

    refreshGradebook();
  }, [buildEmptyMatrix, refreshGradebook, selectedSubjectId, selectedTerm, selectedAcademicYear]);

  useEffect(() => {
    if (!selectedAssessmentKey || !gradebookSnapshot) {
      return;
    }

    hydrateAssessmentDetails(selectedAssessmentKey, assessmentOptions);
    applyAssessmentToMatrix(selectedAssessmentKey, gradebookSnapshot);
  }, [applyAssessmentToMatrix, assessmentOptions, gradebookSnapshot, hydrateAssessmentDetails, selectedAssessmentKey]);

  const clearAssessmentForm = useCallback(() => {
    setSelectedAssessmentKey('');
    setAssessmentName('');
    setAssessmentDate(new Date().toISOString().slice(0, 10));
    setMaxScore(defaultMaxScore);
    setGradeMatrix(buildEmptyMatrix());
    if (assessmentCategories.length > 0) {
      setSelectedCategoryId(String(assessmentCategories[0].id));
    }
  }, [assessmentCategories, buildEmptyMatrix, defaultMaxScore]);

  const handleSaveGradebook = async () => {
    if (!Number.isFinite(numericClassId) || numericClassId <= 0) {
      setErrorMessage('Invalid class context for grade entry.');
      return;
    }
    if (!selectedSubjectId) {
      setErrorMessage('Please select a subject before saving.');
      return;
    }
    if (!selectedTerm || !selectedAcademicYear.trim()) {
      setErrorMessage('Please select the term and academic year before saving.');
      return;
    }
    if (!assessmentName.trim()) {
      setErrorMessage('Please enter an assessment name before saving.');
      return;
    }
    if (!selectedCategoryId) {
      setErrorMessage('Please select an assessment category before saving.');
      return;
    }
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      setErrorMessage('Please provide a valid total marks value.');
      return;
    }

    const rows = activeRoster
      .map((student) => {
        const numericStudentId = Number(student.id);
        const entry = gradeMatrix[numericStudentId];
        const numericScore = entry?.score === '' || entry?.score === undefined ? null : Number(entry.score);
        if (!Number.isFinite(numericStudentId) || numericScore === null || !Number.isFinite(numericScore)) {
          return null;
        }
        if (numericScore < 0 || numericScore > maxScore) {
          throw new Error(`Scores must be between 0 and ${maxScore}.`);
        }

        return {
          student_id: numericStudentId,
          class_id: numericClassId,
          subject_id: Number(selectedSubjectId),
          grading_scheme_id: gradingSchemeId || 1,
          assessment_type_id: Number(selectedCategoryId),
          assessment_name: assessmentName.trim(),
          assessment_date: assessmentDate,
          term: selectedTerm,
          academic_year: selectedAcademicYear.trim(),
          raw_score: numericScore,
          total_marks: maxScore,
          teacher_comments: entry?.remark?.trim() || '',
        };
      })
      .filter(Boolean);

    if (rows.length === 0) {
      setErrorMessage('Enter at least one score before saving the gradebook.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      await api.post('/grades/entry', rows);
      await api.post('/grades/calculate-final', {
        class_id: numericClassId,
        subject_id: Number(selectedSubjectId),
        term: selectedTerm,
        academic_year: selectedAcademicYear.trim(),
      });

      const preferredAssessmentKey = `${selectedCategoryId}:${assessmentName.trim()}`;
      await refreshGradebook(preferredAssessmentKey);
    } catch (error: any) {
      console.error('Failed to save enhanced gradebook', error);
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      setErrorMessage(backendMessage || 'Failed to save the gradebook. Please verify the selected assessment and scores.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAssessment = assessmentOptions.find((item) => item.assessment_key === selectedAssessmentKey);
  const categoryNameById = useMemo(() => {
    const next = new Map<string, string>();
    assessmentCategories.forEach((category) => {
      next.set(String(category.id), category.name);
    });
    return next;
  }, [assessmentCategories]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('teacher_portal.gradebook.title')}</div>
          <div className="text-xs text-slate-500">{t('teacher_portal.gradebook.subtitle')}</div>
          <div className="mt-1 text-xs text-slate-500">Teacher grading now saves into the shared enhanced grading workflow used by reports.</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl h-10" onClick={() => refreshGradebook()} disabled={isLoading || !selectedSubjectId}>
            {isLoading ? '...' : t('teacher_portal.gradebook.load')}
          </Button>
          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-10" onClick={handleSaveGradebook} disabled={isLoading || !selectedSubjectId}>
            {isLoading ? '...' : t('teacher_portal.gradebook.save')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-6 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">{t('Subject')}</span>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value === '' ? '' : Number(e.target.value))}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            disabled={isLoading}
          >
            <option value="">Select Subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">Term</span>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            disabled={isLoading}
          >
            {TERM_OPTIONS.map((term) => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">Academic Year</span>
          <input
            value={selectedAcademicYear}
            onChange={(e) => setSelectedAcademicYear(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-col gap-1 xl:col-span-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Saved Assessments</span>
            <button
              type="button"
              onClick={clearAssessmentForm}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              disabled={isLoading}
            >
              New Assessment
            </button>
          </div>
          <select
            value={selectedAssessmentKey}
            onChange={(e) => setSelectedAssessmentKey(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            disabled={isLoading || assessmentOptions.length === 0}
          >
            <option value="">Create or select an assessment</option>
            {assessmentOptions.map((assessment) => (
              <option key={assessment.assessment_key} value={assessment.assessment_key}>
                {assessment.assessment_name} • {categoryNameById.get(String(assessment.assessment_type_id)) || `Category ${assessment.assessment_type_id}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
        <div className="flex flex-col gap-1 xl:col-span-2">
          <span className="text-xs font-semibold text-slate-500">{t('Assessment')}</span>
          <input
            value={assessmentName}
            onChange={(e) => setAssessmentName(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder={t('teacher_portal.gradebook.assessment_placeholder')}
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">Category</span>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            disabled={isLoading}
          >
            <option value="">Select Category</option>
            {assessmentCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}{typeof category.weight === 'number' ? ` (${category.weight}%)` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">Assessment Date</span>
          <input
            type="date"
            value={assessmentDate}
            onChange={(e) => setAssessmentDate(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">Total Marks</span>
          <input
            type="number"
            min={1}
            step="0.01"
            value={maxScore}
            onChange={(e) => setMaxScore(Number(e.target.value))}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            disabled={isLoading || Boolean(selectedAssessment)}
          />
        </div>
      </div>

      {selectedAssessment && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 p-3 text-xs text-slate-600 dark:text-slate-300">
          Loading saved assessment <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedAssessment.assessment_name}</span>
          {selectedAssessment.assessment_date ? ` from ${selectedAssessment.assessment_date}` : ''} into the shared class gradebook.
        </div>
      )}

      {errorMessage && (
        <div className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
          {errorMessage}
        </div>
      )}

      <div className="space-y-2">
        {activeRoster.map((student) => {
          const numericStudentId = Number(student.id);
          const entry = gradeMatrix[numericStudentId] ?? { student_id: numericStudentId, score: '', grade: '', remark: '' };

          return (
            <div key={student.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center">{student.name}</div>
              {isApc ? (
                <select
                  value={entry.grade}
                  onChange={(e) => {
                    const grade = e.target.value;
                    let score: number | string = '';
                    let remark = '';
                    if (grade === 'M') { score = 18; remark = 'Maîtrisé'; }
                    else if (grade === 'A') { score = 15; remark = 'Acquis'; }
                    else if (grade === 'EA') { score = 12; remark = 'En cours d’Acquisition'; }
                    else if (grade === 'NA') { score = 5; remark = 'Non Acquis'; }

                    setGradeMatrix((prev) => ({
                      ...prev,
                      [numericStudentId]: { student_id: numericStudentId, score, grade, remark },
                    }));
                  }}
                  className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  disabled={isLoading}
                >
                  <option value="">Select Mastery</option>
                  <option value="M">M (Maîtrisé)</option>
                  <option value="A">A (Acquis)</option>
                  <option value="EA">EA (En cours d’Acquisition)</option>
                  <option value="NA">NA (Non Acquis)</option>
                </select>
              ) : (
                <input
                  type="number"
                  min={0}
                  max={maxScore}
                  step="0.01"
                  value={entry.score}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    if (rawValue === '') {
                      setGradeMatrix((prev) => ({
                        ...prev,
                        [numericStudentId]: { student_id: numericStudentId, score: '', grade: '', remark: '' },
                      }));
                      return;
                    }

                    const score = Number(rawValue);
                    const derived = calculateGradeAndRemark(score, maxScore);
                    setGradeMatrix((prev) => ({
                      ...prev,
                      [numericStudentId]: {
                        student_id: numericStudentId,
                        score,
                        grade: derived.grade,
                        remark: prev[numericStudentId]?.remark || derived.remark,
                      },
                    }));
                  }}
                  placeholder={t('teacher_portal.gradebook.score_placeholder')}
                  className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
                  disabled={isLoading}
                />
              )}
              <input
                value={entry.grade}
                onChange={(e) => setGradeMatrix((prev) => ({
                  ...prev,
                  [numericStudentId]: { ...entry, grade: e.target.value },
                }))}
                placeholder={t('teacher_portal.gradebook.grade_placeholder')}
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
                disabled={isLoading || isApc}
              />
              <input
                value={entry.remark}
                onChange={(e) => setGradeMatrix((prev) => ({
                  ...prev,
                  [numericStudentId]: { ...entry, remark: e.target.value },
                }))}
                placeholder={t('teacher_portal.gradebook.remark_placeholder')}
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
                disabled={isLoading}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
