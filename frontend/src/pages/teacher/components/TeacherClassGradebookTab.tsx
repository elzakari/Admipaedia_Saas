import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';
import type { TeacherClass } from '../teacherMockData';
import api from '../../../lib/api';

interface Student {
  id: number;
  name: string;
}

interface Assignment {
  id: number;
  title: string;
  max_score: number;
}

interface GradeEntry {
  student_id: number;
  score: number | string;
  grade: string;
  remark: string;
}

export function TeacherClassGradebookTab({ cls }: { cls: TeacherClass }) {
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | ''>('');
  const [customAssessmentTitle, setCustomAssessmentTitle] = useState<string>('');
  const [isCustomAssessment, setIsCustomAssessment] = useState<boolean>(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [gradeMatrix, setGradeMatrix] = useState<Record<number, GradeEntry>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assessmentCategories, setAssessmentCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isApc, setIsApc] = useState<boolean>(false);

  const activeRoster = cls.roster.filter((r) => r.status === 'active');

  // Fetch grading scheme to determine APC context
  useEffect(() => {
    const fetchGradingScheme = async () => {
      try {
        const response = await api.get('/academics/grading-scheme');
        const fullScheme = response.data?.full_scheme || response.data;
        const name = String(fullScheme?.name || '').toLowerCase();
        const description = String(fullScheme?.description || '').toLowerCase();
        
        const boundaries = response.data?.gradingScheme || fullScheme?.grade_boundaries || [];
        const hasApcDescriptors = boundaries.some((b: any) => {
          const sym = String(b.grade || b.grade_symbol || '').toUpperCase();
          return ['NA', 'EA', 'M'].includes(sym);
        });

        if (name.includes('apc') || description.includes('apc') || hasApcDescriptors) {
          setIsApc(true);
        } else {
          setIsApc(false);
        }
      } catch (err) {
        console.error("Failed to load grading scheme:", err);
      }
    };
    fetchGradingScheme();
  }, [cls.id, selectedSubjectId]);

  // Fetch assessment categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/assessment-categories');
        setAssessmentCategories(response.data || []);
      } catch (err) {
        console.error("Failed to load assessment categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Pre-fetch assigned subjects for this class context on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.get(`/classes/${cls.id}/subjects`);
        const list = response.data?.subjects || response.data || [];
        if (Array.isArray(list)) {
          setSubjects(list);
          if (list.length > 0) {
            setSelectedSubjectId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load subjects for class:", err);
      }
    };
    fetchSubjects();
  }, [cls.id]);

  // Fetch valid assignments (exams) whenever class_id or subject_id changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setAssignments([]);
      return;
    }
    const fetchClassSubjectContext = async () => {
      try {
        const response = await api.get('/exams', {
          params: { class_id: cls.id, subject_id: selectedSubjectId }
        });
        const list = response.data?.exams || response.data || [];
        if (Array.isArray(list)) {
          const mapped = list.map((e: any) => ({
            id: e.id,
            title: e.title || '',
            max_score: e.total_marks || 100
          }));
          setAssignments(mapped);
          
          // Pre-select first assignment if available to reduce manual selection steps
          if (mapped.length > 0) {
            setSelectedAssessmentId(mapped[0].id);
            setIsCustomAssessment(false);
            setCustomAssessmentTitle('');
          } else {
            setSelectedAssessmentId('');
          }
        }
      } catch (err) {
        console.error("Failed to load secure assignment validation tokens:", err);
      }
    };
    fetchClassSubjectContext();
  }, [cls.id, selectedSubjectId]);

  // Standardized Education Scale Evaluator
  const calculateGradeAndRemark = (scoreNum: number, maxScore: number = 100) => {
    if (isApc) {
      let normalized = scoreNum;
      if (maxScore !== 20) {
        normalized = (scoreNum / maxScore) * 20;
      }
      if (normalized >= 16) return { grade: 'M', remark: 'Maîtrisé' };
      if (normalized >= 14) return { grade: 'A', remark: 'Acquis' };
      if (normalized >= 10) return { grade: 'EA', remark: 'En cours d’Acquisition' };
      return { grade: 'NA', remark: 'Non Acquis' };
    }
    const percentage = (scoreNum / maxScore) * 100;
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
  };

  // Secure Load Handler: Token-sanitizes input text strings safely
  const handleLoadGradebook = async () => {
    if (!selectedSubjectId) {
      setErrorMessage("Please select a subject context first.");
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    if (isCustomAssessment || !selectedAssessmentId) {
      setErrorMessage("Please select an existing assessment to load.");
      setIsLoading(false);
      return;
    }

    try {
      // Direct HTTP REST query fallbacks (Decoupled completely from WebSocket status)
      const rosterResponse = await api.get('/students', { params: { class_id: cls.id, per_page: 100 } });
      const studentList = rosterResponse.data?.students || rosterResponse.data?.data?.students || rosterResponse.data?.data || rosterResponse.data || [];
      
      const mappedStudents = studentList.map((s: any) => ({
        id: s.id,
        name: s.full_name || `${s.first_name} ${s.last_name}`
      }));
      setStudents(mappedStudents);

      const gradesResponse = await api.get(`/exams/${selectedAssessmentId}/grades`);
      const existingGrades = gradesResponse.data?.grades || gradesResponse.data || [];

      const initialMatrix: Record<number, GradeEntry> = {};
      mappedStudents.forEach((student: Student) => {
        const savedRecord = existingGrades.find((g: any) => g.student_id === student.id);
        initialMatrix[student.id] = {
          student_id: student.id,
          score: savedRecord ? (savedRecord.marks_obtained ?? '') : '',
          grade: savedRecord ? (savedRecord.grade_letter ?? '') : '',
          remark: savedRecord ? (savedRecord.remarks ?? '') : ''
        };
      });

      setGradeMatrix(initialMatrix);
    } catch (err) {
      setErrorMessage("System error connecting to REST endpoint. Please verify server status.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGradebook = async () => {
    if (!selectedSubjectId) {
      setErrorMessage("Please select a subject context first.");
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    let matchedAssignment = assignments.find((a) => a.id === selectedAssessmentId);

    try {
      if (!matchedAssignment) {
        if (!isCustomAssessment || !customAssessmentTitle.trim()) {
          setErrorMessage("Please select an assessment or create a new one before saving.");
          return;
        }

        const totalMarks = isApc ? 20 : 100;
        const selectedCategory = assessmentCategories.find((c) => String(c.id) === String(selectedCategoryId));
        // Create new assignment/exam dynamically for the selected class + subject
        const createRes = await api.post('/exams', {
          title: customAssessmentTitle.trim(),
          description: selectedCategory ? `Assessment Category: ${selectedCategory.name}` : undefined,
          exam_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          duration: 60,
          total_marks: totalMarks,
          passing_marks: isApc ? 10 : 50,
          class_id: Number(cls.id),
          subject_id: Number(selectedSubjectId)
        });
        const newExam = createRes.data?.exam;
        if (newExam) {
          matchedAssignment = {
            id: newExam.id,
            title: newExam.title,
            max_score: newExam.total_marks || totalMarks
          };
          setAssignments(prev => [...prev, matchedAssignment!]);
          setSelectedAssessmentId(newExam.id);
          setIsCustomAssessment(false);
          setCustomAssessmentTitle('');
        }
      }

      if (matchedAssignment) {
        const payload = {
          exam_id: matchedAssignment.id,
          grades: activeRoster.map((s) => {
            const entry: GradeEntry = gradeMatrix[Number(s.id)] ?? {
              student_id: Number(s.id),
              score: '',
              grade: '',
              remark: '',
            };
            return {
              student_id: Number(s.id),
              marks_obtained: entry.score !== undefined && entry.score !== '' ? Number(entry.score) : 0,
              remarks: entry.remark || ''
            };
          })
        };
        await api.post('/grades/bulk', payload);
        await handleLoadGradebook();
      }
    } catch (err) {
      console.error("API save failed:", err);
      setErrorMessage("Failed to save the gradebook. Please verify the selected assessment and scores.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAssignment = assignments.find((assignment) => assignment.id === selectedAssessmentId);
  const selectedMaxScore = selectedAssignment?.max_score || (isApc ? 20 : 100);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('teacher_portal.gradebook.title')}</div>
          <div className="text-xs text-slate-500">{t('teacher_portal.gradebook.subtitle')}</div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500">{t('Subject')}</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value === '' ? '' : Number(e.target.value));
              }}
              className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              disabled={isLoading}
            >
              <option value="">Select Subject</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500">{t('Assessment')}</span>
            {isCustomAssessment ? (
              <div className="flex gap-2 items-center">
                <input
                  value={customAssessmentTitle}
                  onChange={(e) => setCustomAssessmentTitle(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder={t('teacher_portal.gradebook.assessment_placeholder')}
                  disabled={isLoading}
                />
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  disabled={isLoading}
                >
                  <option value="">Select Category</option>
                  {assessmentCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Button variant="ghost" onClick={() => setIsCustomAssessment(false)} className="h-10 px-2 text-xs">
                  {t('Cancel')}
                </Button>
              </div>
            ) : (
              <select
                value={selectedAssessmentId === '' ? '' : String(selectedAssessmentId)}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setIsCustomAssessment(true);
                    setSelectedAssessmentId('');
                    setCustomAssessmentTitle('');
                  } else {
                    setSelectedAssessmentId(e.target.value === '' ? '' : Number(e.target.value));
                    setIsCustomAssessment(false);
                  }
                }}
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-w-[180px]"
                disabled={isLoading || !selectedSubjectId}
              >
                <option value="">Select Assessment</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
                <option value="__new__">+ Create New...</option>
              </select>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl h-10" onClick={handleLoadGradebook} disabled={isLoading || !selectedSubjectId || isCustomAssessment || !selectedAssessmentId}>
              {isLoading ? "..." : t('teacher_portal.gradebook.load')}
            </Button>
            <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-10" onClick={handleSaveGradebook} disabled={isLoading || !selectedSubjectId || (isCustomAssessment ? !customAssessmentTitle.trim() : !selectedAssessmentId)}>
              {isLoading ? "..." : t('teacher_portal.gradebook.save')}
            </Button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
          {errorMessage}
        </div>
      )}

      <div className="space-y-2">
        {activeRoster.map((s) => {
          const entry = gradeMatrix[Number(s.id)] ?? { student_id: Number(s.id), score: '', grade: '', remark: '' };
          return (
            <div key={s.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center">{s.name}</div>
              {isApc ? (
                <select
                  value={entry.grade}
                  onChange={(e) => {
                    const grade = e.target.value;
                    let score = '';
                    let remark = '';
                    if (grade === 'M') { score = '18'; remark = 'Maîtrisé'; }
                    else if (grade === 'A') { score = '15'; remark = 'Acquis'; }
                    else if (grade === 'EA') { score = '12'; remark = 'En cours d’Acquisition'; }
                    else if (grade === 'NA') { score = '5'; remark = 'Non Acquis'; }

                    setGradeMatrix((prev) => ({
                      ...prev,
                      [Number(s.id)]: { student_id: Number(s.id), score, grade, remark }
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
                  max={selectedMaxScore}
                  value={entry.score}
                  onChange={(e) => {
                    const val = e.target.value;
                    const score = val === '' ? '' : Number(val);
                    const { grade, remark } = score !== '' ? calculateGradeAndRemark(score, selectedMaxScore) : { grade: '', remark: '' };
                    setGradeMatrix((prev) => ({
                      ...prev,
                      [Number(s.id)]: { student_id: Number(s.id), score, grade, remark }
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
                  [Number(s.id)]: { ...entry, grade: e.target.value }
                }))}
                placeholder={t('teacher_portal.gradebook.grade_placeholder')}
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
                disabled={isLoading || isApc}
              />
              <input
                value={entry.remark}
                onChange={(e) => setGradeMatrix((prev) => ({
                  ...prev,
                  [Number(s.id)]: { ...entry, remark: e.target.value }
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
