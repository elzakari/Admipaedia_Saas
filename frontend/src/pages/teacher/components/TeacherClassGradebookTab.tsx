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
  const [assessment, setAssessment] = useState<string>('');
  const [isCustomAssessment, setIsCustomAssessment] = useState<boolean>(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [gradeMatrix, setGradeMatrix] = useState<Record<number, GradeEntry>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assessmentCategories, setAssessmentCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const activeRoster = cls.roster.filter((r) => r.status === 'active');

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
            setAssessment(mapped[0].title);
            setIsCustomAssessment(false);
          } else {
            setAssessment('');
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
    const percentage = (scoreNum / maxScore) * 100;
    if (percentage >= 80) return { grade: 'A', remark: 'Excellent' };
    if (percentage >= 70) return { grade: 'B', remark: 'Very Good' };
    if (percentage >= 60) return { grade: 'C', remark: 'Good' };
    if (percentage >= 50) return { grade: 'D', remark: 'Credit' };
    if (percentage >= 40) return { grade: 'E', remark: 'Pass' };
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

    // Flatten spacing, casing, and punctuation to prevent strict matching drops
    const sanitizedInput = assessment.trim().toLowerCase().replace(/[\s_-]+/g, '');

    if (!sanitizedInput) {
      setErrorMessage("Please select or enter an assessment title to load.");
      setIsLoading(false);
      return;
    }

    // Scan pre-fetched assignments securely
    const matchedAssignment = assignments.find(a => 
      a.title.trim().toLowerCase().replace(/[\s_-]+/g, '') === sanitizedInput
    );

    if (!matchedAssignment) {
      // Fallback: If not found in API, check local storage key
      const localKey = `admipaedia.teacher.gradebook.v1.${cls.id}.${selectedSubjectId}`;
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) {
          const parsed = JSON.parse(raw) as any[];
          const filtered = parsed.filter(r => r.assessment.trim().toLowerCase().replace(/[\s_-]+/g, '') === sanitizedInput);
          if (filtered.length > 0) {
            const initialMatrix: Record<number, GradeEntry> = {};
            activeRoster.forEach((student) => {
              const savedRecord = filtered.find((g: any) => g.studentId === student.id);
              initialMatrix[Number(student.id)] = {
                student_id: Number(student.id),
                score: savedRecord ? (savedRecord.score ?? '') : '',
                grade: savedRecord ? (savedRecord.grade ?? '') : '',
                remark: savedRecord ? (savedRecord.remark ?? '') : ''
              };
            });
            setGradeMatrix(initialMatrix);
            setIsLoading(false);
            return;
          }
        }
      } catch (localErr) {
        console.warn("Failed to check local fallback:", localErr);
      }

      setErrorMessage(`No matching assessment named "${assessment}" found for this subject.`);
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

      const gradesResponse = await api.get(`/exams/${matchedAssignment.id}/grades`);
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

    const sanitizedInput = assessment.trim().toLowerCase().replace(/[\s_-]+/g, '');
    let matchedAssignment = assignments.find(a => 
      a.title.trim().toLowerCase().replace(/[\s_-]+/g, '') === sanitizedInput
    );

    try {
      if (!matchedAssignment) {
        // Create new assignment/exam dynamically for the selected class + subject
        const createRes = await api.post('/exams', {
          title: assessment,
          exam_date: new Date().toISOString(),
          duration: 60,
          total_marks: 100,
          passing_marks: 50,
          class_id: Number(cls.id),
          subject_id: Number(selectedSubjectId),
          assessment_type: selectedCategoryId
        });
        const newExam = createRes.data?.exam;
        if (newExam) {
          matchedAssignment = {
            id: newExam.id,
            title: newExam.title,
            max_score: newExam.total_marks || 100
          };
          setAssignments(prev => [...prev, matchedAssignment!]);
          setAssessment(newExam.title);
          setIsCustomAssessment(false);
        }
      }

      if (matchedAssignment) {
        const payload = {
          exam_id: matchedAssignment.id,
          grades: activeRoster.map((s) => {
            const entry = gradeMatrix[Number(s.id)] ?? {};
            return {
              student_id: Number(s.id),
              marks_obtained: entry.score !== undefined && entry.score !== '' ? Number(entry.score) : 0,
              remarks: entry.remark || ''
            };
          })
        };
        await api.post('/grades/bulk', payload);
      }
    } catch (err) {
      console.warn("API save failed, using local storage fallback:", err);
    }

    // Save to localStorage as fallback
    try {
      const localKey = `admipaedia.teacher.gradebook.v1.${cls.id}.${selectedSubjectId}`;
      const existing: any[] = (() => {
        try {
          const raw = localStorage.getItem(localKey);
          if (!raw) return [];
          return JSON.parse(raw) as any[];
        } catch {
          return [];
        }
      })();

      const withoutAssessment = existing.filter(r => r.assessment.trim().toLowerCase().replace(/[\s_-]+/g, '') !== sanitizedInput);
      const next = activeRoster.map((s) => {
        const entry = gradeMatrix[Number(s.id)] ?? {};
        return {
          studentId: s.id,
          assessment: assessment,
          score: entry.score !== '' ? Number(entry.score) : undefined,
          grade: entry.grade || undefined,
          remark: entry.remark || undefined
        };
      });

      localStorage.setItem(localKey, JSON.stringify([...withoutAssessment, ...next]));
    } catch (localErr) {
      console.error("Local storage save failed:", localErr);
    } finally {
      setIsLoading(false);
    }
  };

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
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
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
                value={assessment}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setIsCustomAssessment(true);
                    setAssessment('');
                  } else {
                    setAssessment(e.target.value);
                  }
                }}
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-w-[180px]"
                disabled={isLoading || !selectedSubjectId}
              >
                <option value="">Select Assessment</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.title}>{a.title}</option>
                ))}
                <option value="__new__">+ Create New...</option>
              </select>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl h-10" onClick={handleLoadGradebook} disabled={isLoading || !selectedSubjectId}>
              {isLoading ? "..." : t('teacher_portal.gradebook.load')}
            </Button>
            <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-10" onClick={handleSaveGradebook} disabled={isLoading || !selectedSubjectId || !assessment}>
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
              <input
                type="number"
                min={0}
                max={100}
                value={entry.score}
                onChange={(e) => {
                  const val = e.target.value;
                  const score = val === '' ? '' : Number(val);
                  const maxScore = 100;
                  const { grade, remark } = score !== '' ? calculateGradeAndRemark(score, maxScore) : { grade: '', remark: '' };
                  setGradeMatrix((prev) => ({
                    ...prev,
                    [Number(s.id)]: { student_id: Number(s.id), score, grade, remark }
                  }));
                }}
                placeholder={t('teacher_portal.gradebook.score_placeholder')}
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
                disabled={isLoading}
              />
              <input
                value={entry.grade}
                onChange={(e) => setGradeMatrix((prev) => ({
                  ...prev,
                  [Number(s.id)]: { ...entry, grade: e.target.value }
                }))}
                placeholder={t('teacher_portal.gradebook.grade_placeholder')}
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
                disabled={isLoading}
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
