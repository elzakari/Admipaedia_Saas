import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/useToast';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import { Upload, Download, FileSpreadsheet, Calculator, Users, BookOpen, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { examService } from '@/services/examService';
import { classService } from '@/services/classService';
import { subjectService } from '@/services/subjectService';
import { studentService } from '@/services/studentService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Student } from '@/types/student.types';
import { Grade } from '@/types/academics.types';

interface BulkGradeEntryProps {
  examId?: number;
  classId?: number;
  subjectId?: number;
  onClose?: () => void;
}

interface GradeEntryRow {
  id: string;
  studentId: number;
  studentName: string;
  studentNumber: string;
  currentGrade?: number | null;
  newGrade: number | null;
  remarks: string;
  status: 'pending' | 'valid' | 'invalid' | 'processing' | 'completed' | 'failed';
  errors: string[];
}

interface BulkGradeTemplate {
  examId: number;
  classId: number;
  subjectId: number;
  maxMarks: number;
  passingMarks: number;
  gradingScheme: string;
}

export const BulkGradeEntry: React.FC<BulkGradeEntryProps> = ({
  examId,
  classId,
  subjectId,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [selectedExam, setSelectedExam] = useState<number | null>(examId || null);
  const [selectedClass, setSelectedClass] = useState<number | null>(classId || null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(subjectId || null);
  const [gradeEntries, setGradeEntries] = useState<GradeEntryRow[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [validationResults, setValidationResults] = useState<any>(null);

  const { toast } = useToast();
  const bulkOps = useBulkOperations();

  // Fetch data
  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examService.getExams()
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses()
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectService.getSubjects()
  });

  const { data: students } = useQuery({
    queryKey: ['students', selectedClass],
    queryFn: () => selectedClass ? studentService.getStudentsByClass(selectedClass) : Promise.resolve([] as Student[]),
    enabled: !!selectedClass
  });

  const { data: existingGrades } = useQuery({
    queryKey: ['grades', selectedExam],
    queryFn: () => selectedExam ? examService.getGradesByExam(selectedExam) : Promise.resolve([] as Grade[]),
    enabled: !!selectedExam
  });

  // Initialize grade entries when students are loaded
  React.useEffect(() => {
    if (students && selectedExam && selectedSubject) {
      const entries: GradeEntryRow[] = students.map((student: Student) => {
        const existingGrade = (existingGrades as Grade[] | undefined)?.find((g: Grade) => g.student_id === student.id);
        return {
          id: `${student.id}-${selectedExam}`,
          studentId: student.id,
          studentName: `${student.first_name} ${student.last_name}`,
          studentNumber: student.admission_number,
          currentGrade: existingGrade?.score ?? null,
          newGrade: null,
          remarks: existingGrade?.remarks || '',
          status: 'pending' as const,
          errors: []
        };
      });
      setGradeEntries(entries);
    }
  }, [students, selectedExam, selectedSubject, existingGrades]);

  // Validation logic
  const validateGradeEntry = useCallback((entry: GradeEntryRow): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    const gradeValue = entry.newGrade;
    if (gradeValue === null || gradeValue === undefined || isNaN(gradeValue)) {
      errors.push('Grade is required');
    } else {
      if (gradeValue < 0) {
        errors.push('Grade cannot be negative');
      }
      if (template && gradeValue > template.maxMarks) {
        errors.push(`Grade cannot exceed maximum marks (${template.maxMarks})`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // Bulk validation
  const validateAllEntries = useCallback(() => {
    const updatedEntries = gradeEntries.map(entry => {
      const validation = validateGradeEntry(entry);
      return {
        ...entry,
        status: (validation.isValid ? 'valid' : 'invalid') as GradeEntryRow['status'],
        errors: validation.errors
      };
    });

    setGradeEntries(updatedEntries);

    const validCount = updatedEntries.filter(e => e.status === 'valid').length;
    const invalidCount = updatedEntries.filter(e => e.status === 'invalid').length;

    setValidationResults({
      total: updatedEntries.length,
      valid: validCount,
      invalid: invalidCount,
      readyToSubmit: invalidCount === 0 && validCount > 0
    });

    toast({
      title: "Validation Complete",
      description: `${validCount} valid entries, ${invalidCount} invalid entries`,
      variant: invalidCount > 0 ? "destructive" : "default"
    });
  }, [gradeEntries, validateGradeEntry, toast]);

  // Handle individual grade change
  const handleGradeChange = useCallback((entryId: string, field: keyof GradeEntryRow, value: any) => {
    setGradeEntries(prev => prev.map(entry =>
      entry.id === entryId
        ? { ...entry, [field]: value, status: 'pending' }
        : entry
    ));
  }, []);

  const handleCSVImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') return;

        const lines = result
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
        if (lines.length < 2) return;

        const headers = (lines[0] || '').split(',').map((h) => h.trim());

        const requiredHeaders = ['Student Number', 'Grade'];
        const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
        if (missingHeaders.length > 0) {
          toast({
            title: 'Invalid CSV Format',
            description: `Missing required headers: ${missingHeaders.join(', ')}`,
            variant: 'destructive'
          });
          return;
        }

        const importedEntries: Array<{ studentNumber: string; newGrade: number | null; remarks: string }> = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;

          const values = line.split(',').map((v) => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] ?? '';
          });

          const studentNumber = row['Student Number'] || row['Admission Number'] || '';
          if (!studentNumber) continue;

          const gradeStr = row['Grade'] || '';
          const parsedGrade = gradeStr ? Number(gradeStr) : NaN;

          importedEntries.push({
            studentNumber,
            newGrade: Number.isFinite(parsedGrade) ? parsedGrade : null,
            remarks: row['Remarks'] || ''
          });
        }

        if (importedEntries.length === 0) {
          toast({
            title: 'No Data Imported',
            description: 'No valid rows found in the CSV file',
            variant: 'destructive'
          });
          return;
        }

        setGradeEntries((prev) =>
          prev.map((entry) => {
            const imported = importedEntries.find((imp) => imp.studentNumber === entry.studentNumber);
            if (!imported) return entry;
            return {
              ...entry,
              newGrade: imported.newGrade,
              remarks: imported.remarks || entry.remarks,
              status: 'pending' as const
            };
          })
        );

        toast({
          title: 'CSV Imported',
          description: `Imported ${importedEntries.length} grade entries`
        });
      } catch (_error) {
        toast({
          title: 'Import Failed',
          description: 'Failed to parse CSV file',
          variant: 'destructive'
        });
      }
    };
    reader.readAsText(file);
  }, [toast]);

// Handle bulk submission
const handleBulkSubmit = useCallback(async () => {
  if (!selectedExam || !validationResults?.readyToSubmit) {
    toast({
      title: "Cannot Submit",
      description: "Please validate entries before submitting",
      variant: "destructive"
    });
    return;
  }

  const validEntries = gradeEntries.filter(entry => entry.status === 'valid');

  const gradeData = validEntries.map(entry => ({
    student_id: entry.studentId,
    marks_obtained: entry.newGrade!,
    remarks: entry.remarks
  }));

  try {
    await bulkOps.startOperation('create', gradeData, {
      batchSize: 20,
      onProgress: (operation) => {
        // Update UI with progress
        const processedIds = new Set(operation.data.slice(0, operation.processed).map((_: any, index: number) => validEntries[index]?.id));
        setGradeEntries(prev => prev.map(entry =>
          processedIds.has(entry.id)
            ? { ...entry, status: 'completed' }
            : entry.status === 'valid'
              ? { ...entry, status: 'processing' }
              : entry
        ));
      },
      onComplete: () => {
        toast({
          title: "Grades Submitted Successfully",
          description: `${validEntries.length} grades have been saved`
        });
        if (onClose) onClose();
      },
      onError: (_operation, error) => {
        toast({
          title: "Submission Failed",
          description: error,
          variant: "destructive"
        });
      }
    });

  } catch (error) {
    toast({
      title: "Submission Error",
      description: error instanceof Error ? error.message : 'Unknown error',
      variant: "destructive"
    });
  }
}, [selectedExam, validationResults, gradeEntries, bulkOps, toast, onClose]);

// Export template
const exportTemplate = useCallback(() => {
  if (!students || students.length === 0) {
    toast({
      title: "No Data to Export",
      description: "Please select a class first",
      variant: "destructive"
    });
    return;
  }

  const headers = ['Student Number', 'Student Name', 'Current Grade', 'New Grade', 'Remarks'];
  const rows = students.map(student => {
    const existingGrade = existingGrades?.find(g => g.student_id === student.id);
    return [
      student.admission_number,
      `${student.first_name} ${student.last_name}`,
      existingGrade?.marks_obtained || '',
      '',
      existingGrade?.remarks || ''
    ];
  });

  const csvContent = [headers, ...rows].map(row =>
    row.map(cell => {
      const str = String(cell ?? '');
      return (str.includes(',') || str.includes('"')) ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  ).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grade_template_${selectedClass}_${selectedSubject}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}, [students, existingGrades, selectedClass, selectedSubject, toast]);

return (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bulk Grade Entry</h2>
        <p className="text-gray-600">Enter grades for multiple students efficiently</p>
      </div>
      {onClose && (
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
      )}
    </div>

    {/* Configuration Section */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Configuration
        </CardTitle>
        <CardDescription>
          Select exam, class, and subject for grade entry
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="exam-select">Exam</Label>
            <Select value={selectedExam?.toString() || ""} onValueChange={(value) => setSelectedExam(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select exam" />
              </SelectTrigger>
              <SelectContent>
                {exams?.data.map((exam: any) => (
                  <SelectItem key={exam.id} value={exam.id.toString()}>
                    {exam.title} - {exam.subject_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="class-select">Class</Label>
            <Select value={selectedClass?.toString() || ""} onValueChange={(value) => setSelectedClass(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes?.data.map((cls: any) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject-select">Subject</Label>
            <Select value={selectedSubject?.toString() || ""} onValueChange={(value) => setSelectedSubject(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects?.subjects.map((subject: any) => (
                  <SelectItem key={subject.id} value={subject.id.toString()}>
                    {subject.name} ({subject.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Grade Entry Tabs */}
    {selectedExam && selectedClass && selectedSubject && (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            CSV Import
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Bulk Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Grade Entry</CardTitle>
                  <CardDescription>
                    Enter grades manually for each student
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={validateAllEntries}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Validate All
                  </Button>
                  <Button onClick={exportTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Template
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {validationResults && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Validation Results</span>
                    <Badge variant={validationResults.readyToSubmit ? "default" : "destructive"}>
                      {validationResults.readyToSubmit ? "Ready to Submit" : "Has Errors"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>Total: {validationResults.total}</div>
                    <div className="text-green-600">Valid: {validationResults.valid}</div>
                    <div className="text-red-600">Invalid: {validationResults.invalid}</div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedEntries.size === gradeEntries.length && gradeEntries.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEntries(new Set(gradeEntries.map(e => e.id)));
                            } else {
                              setSelectedEntries(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Student Number</TableHead>
                      <TableHead>Current Grade</TableHead>
                      <TableHead>New Grade</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedEntries.has(entry.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedEntries);
                              if (checked) {
                                newSelected.add(entry.id);
                              } else {
                                newSelected.delete(entry.id);
                              }
                              setSelectedEntries(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{entry.studentName}</TableCell>
                        <TableCell>{entry.studentNumber}</TableCell>
                        <TableCell>
                          {entry.currentGrade !== undefined ? (
                            <Badge variant="outline">{entry.currentGrade}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={entry.newGrade !== null ? entry.newGrade : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleGradeChange(entry.id, 'newGrade', val === '' ? null : parseFloat(val));
                            }}
                            className={`w-20 ${entry.status === 'invalid' ? 'border-red-500' : ''}`}
                            min="0"
                            max={template?.maxMarks || 200}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={entry.remarks}
                            onChange={(e) => handleGradeChange(entry.id, 'remarks', e.target.value)}
                            placeholder="Optional remarks"
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                entry.status === 'valid' ? 'default' :
                                  entry.status === 'invalid' ? 'destructive' :
                                    entry.status === 'completed' ? 'default' :
                                      entry.status === 'processing' ? 'secondary' :
                                        'outline'
                              }
                            >
                              {entry.status}
                            </Badge>
                            {entry.errors.length > 0 && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Grades
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="csv-import">Upload CSV File</Label>
                  <Input
                    id="csv-import"
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCSVImport(file);
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    CSV format: Student Name, Marks Obtained, Remarks
                  </p>
                </div>

                <Alert>
                  <FileSpreadsheet className="h-4 w-4" />
                  <AlertDescription>
                    Make sure your CSV file matches the expected format.
                    Student names must match exactly.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Template
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Download a CSV template with all student names pre-filled.
                </p>

                <Button onClick={exportTemplate} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>

                <Alert>
                  <AlertDescription>
                    Fill in the marks and remarks columns, then import the file back.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <div className="text-center py-8">
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Grade Templates</h3>
            <p className="text-gray-600 mb-4">
              Save and reuse grade entry templates for similar exams.
            </p>
            <Button variant="outline">
              Create Template
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    )}
    {/* The original conditional for bulkOps was here, but it's being moved */}

    {/* Bulk Operations Status - Separate root-level conditional */}
    {bulkOps.operations.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Bulk Operations Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bulkOps.operations.map((operation) => (
              <div key={operation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <Badge variant={operation.status === 'completed' ? 'default' : 'secondary'}>
                    {operation.status}
                  </Badge>
                  <span className="text-sm">
                    {operation.type} - {operation.processed}/{operation.total}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={operation.progress} className="w-20 h-2" />
                  <span className="text-xs text-gray-500">{operation.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);
};
