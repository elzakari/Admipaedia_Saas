import React, { useRef, useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Loader, Save, Download, Upload } from 'lucide-react';
import { useGradesByExam } from '../../hooks/useExams';
import { useAuth } from '../../contexts/AuthContext';
import examService from '../../services/examService';
import { Grade, GradeCreate, GradeBulkCreate } from '../../types/academics.types';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';

interface GradeEntryProps {
  examId: number;
  onClose?: () => void;
}

const GradeEntry: React.FC<GradeEntryProps> = ({ examId, onClose }) => {
  const [grades, setGrades] = useState<Record<number, number>>({});
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exam, setExam] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const { grades: existingGrades, isLoading, isError, mutate } = useGradesByExam(examId);

  // Initialize grades from existing data
  useEffect(() => {
    if (existingGrades && existingGrades.length > 0) {
      const initialGrades: Record<number, number> = {};
      const initialRemarks: Record<number, string> = {};
      
      existingGrades.forEach(grade => {
        initialGrades[grade.student_id] = grade.marks_obtained;
        if (grade.remarks) {
          initialRemarks[grade.student_id] = grade.remarks;
        }
      });
      
      setGrades(initialGrades);
      setRemarks(initialRemarks);
    }
  }, [existingGrades]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const e = await examService.getExamById(examId);
        if (cancelled) return;
        setExam(e);

        const res = await api.get('/students', { params: { class_id: e.class_id, per_page: 200 } });
        const list = res.data?.students || res.data?.data?.students || [];
        if (cancelled) return;
        setStudents(Array.isArray(list) ? list : []);
      } catch {
        if (cancelled) return;
        setStudents([]);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [examId]);

  const rows = React.useMemo(() => {
    if (students.length > 0) {
      const gradeByStudent: Record<number, any> = {};
      for (const g of existingGrades || []) {
        gradeByStudent[Number(g.student_id)] = g;
      }

      return students.map((s: any) => ({
        student_id: Number(s.id),
        student: s,
        grade: gradeByStudent[Number(s.id)]
      }));
    }

    return (existingGrades || []).map((g: any) => ({
      student_id: Number(g.student_id),
      student: g.student,
      grade: g
    }));
  }, [students, existingGrades]);

  const handleGradeChange = (studentId: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setGrades(prev => ({ ...prev, [studentId]: numValue }));
    }
  };

  const handleRemarkChange = (studentId: number, value: string) => {
    setRemarks(prev => ({ ...prev, [studentId]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Prepare data for bulk creation
      const gradeData: GradeBulkCreate = {
        exam_id: examId,
        grades: Object.entries(grades).map(([studentId, marks_obtained]) => ({
          student_id: parseInt(studentId),
          marks_obtained,
          remarks: remarks[parseInt(studentId)] || ''
        }))
      };
      
      await examService.bulkCreateGrades(gradeData);
      toast.success('Grades saved successfully');
      mutate(); // Refresh grades list
      
      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save grades');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 70) return 'text-blue-500';
    if (percentage >= 60) return 'text-yellow-500';
    if (percentage >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading grades...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        <p>Failed to load grades. Please try again later.</p>
        <Button onClick={() => mutate()} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Grade Entry</h3>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              const totalMarks = Number(exam?.total_marks || (existingGrades?.[0] as any)?.exam?.total_marks || 100);
              const lines = ['student_id,student_name,marks_obtained,percentage,grade_letter,remarks'];
              rows.forEach((r: any) => {
                const sid = r.student_id;
                const name = (r.student?.full_name || `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.trim()).replace(/\s+/g, ' ').trim();
                const marks = grades[sid] !== undefined ? grades[sid] : Number(r.grade?.marks_obtained || 0);
                const percentage = totalMarks > 0 ? (marks / totalMarks) * 100 : 0;
                let letter = '';
                if (percentage >= 90) letter = 'A+';
                else if (percentage >= 80) letter = 'A';
                else if (percentage >= 75) letter = 'B+';
                else if (percentage >= 70) letter = 'B';
                else if (percentage >= 65) letter = 'C+';
                else if (percentage >= 60) letter = 'C';
                else if (percentage >= 55) letter = 'D+';
                else if (percentage >= 50) letter = 'D';
                else if (percentage >= 45) letter = 'E';
                else letter = 'F';
                const remark = (remarks[sid] !== undefined ? remarks[sid] : (r.grade?.remarks || '')).replace(/"/g, '""');
                lines.push(`${sid},"${name}",${marks},${percentage.toFixed(2)},${letter},"${remark}"`);
              });
              const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `exam_${examId}_grades.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
                if (lines.length < 2) throw new Error('CSV is empty');
                const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
                const idxStudent = header.indexOf('student_id');
                const idxMarks = header.indexOf('marks_obtained') >= 0 ? header.indexOf('marks_obtained') : header.indexOf('marks');
                const idxRemarks = header.indexOf('remarks');
                if (idxStudent < 0 || idxMarks < 0) throw new Error('CSV must include student_id and marks_obtained');

                const parsed = lines.slice(1).map((line) => {
                  const cols = line.split(',');
                  const student_id = Number(cols[idxStudent]);
                  const marks_obtained = Number(cols[idxMarks]);
                  const remarks = idxRemarks >= 0 ? (cols[idxRemarks] || '').trim() : '';
                  return { student_id, marks_obtained, remarks };
                }).filter((r) => Number.isFinite(r.student_id) && Number.isFinite(r.marks_obtained));

                if (parsed.length === 0) throw new Error('No valid grade rows found');

                await examService.bulkCreateGrades({ exam_id: examId, grades: parsed });
                toast.success('Grades imported successfully');
                mutate();
              } catch (err: any) {
                toast.error(err?.message || 'Failed to import grades');
              } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Grades
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="border rounded-md overflow-auto max-h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No.</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="w-[150px]">Marks</TableHead>
              <TableHead className="w-[100px]">Grade</TableHead>
              <TableHead className="w-[250px]">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row: any, index: number) => {
              const studentId = row.student_id;
              const totalMarks = Number(exam?.total_marks || row.grade?.exam?.total_marks || 100);
              const baseMarks = row.grade?.marks_obtained != null ? Number(row.grade.marks_obtained) : 0;
              const currentMarks = grades[studentId] !== undefined ? grades[studentId] : baseMarks;
              const percentage = totalMarks > 0 ? (currentMarks / totalMarks) * 100 : 0;
              let gradeLetter = '';
              
              // Determine grade letter based on percentage
              if (percentage >= 90) gradeLetter = 'A+';
              else if (percentage >= 80) gradeLetter = 'A';
              else if (percentage >= 75) gradeLetter = 'B+';
              else if (percentage >= 70) gradeLetter = 'B';
              else if (percentage >= 65) gradeLetter = 'C+';
              else if (percentage >= 60) gradeLetter = 'C';
              else if (percentage >= 55) gradeLetter = 'D+';
              else if (percentage >= 50) gradeLetter = 'D';
              else if (percentage >= 45) gradeLetter = 'E';
              else gradeLetter = 'F';
              
              return (
                <TableRow key={row.grade?.id || row.student_id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{row.student?.full_name || `${row.student?.first_name || ''} ${row.student?.last_name || ''}`.trim()}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={totalMarks}
                      value={currentMarks}
                      onChange={(e) => handleGradeChange(studentId, e.target.value)}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className={getGradeColor(percentage)}>
                      {gradeLetter} ({percentage.toFixed(1)}%)
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={remarks[studentId] || row.grade?.remarks || ''}
                      onChange={(e) => handleRemarkChange(studentId, e.target.value)}
                      placeholder="Add remarks"
                      className="w-full"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No students found for this exam. Please add students to the class first.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default GradeEntry;
