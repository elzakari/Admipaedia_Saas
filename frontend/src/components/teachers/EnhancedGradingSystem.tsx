import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  GraduationCap, TrendingUp, Users, Award, AlertTriangle,
  Calculator, FileText, BarChart3, Target, BookOpen
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { enhancedGradingService, studentService, classService, subjectService } from '@/services';

// Types
interface GESGradeBoundary {
  min: number;
  max: number;
  points: number;
  interpretation: string;
}

interface GESGradeBoundaries {
  [key: string]: GESGradeBoundary;
}

interface EnhancedGrade {
  id: number;
  student_id: number;
  subject_id: number;
  class_id: number;
  assessment_name: string;
  assessment_date: string;
  term: string;
  academic_year: string;
  raw_score: number;
  total_marks: number;
  percentage: number;
  grade_symbol: string;
  grade_points: number;
  is_passing: boolean;
  weight: number;
  teacher_comments?: string;
}

interface StudentAnalytics {
  student_id: number;
  academic_year: string;
  term?: string;
  total_assessments: number;
  average_percentage: number;
  overall_grade: string;
  grade_distribution: { [key: string]: number };
  subject_performance: { [key: string]: any };
  performance_trend: Array<{
    date: string;
    percentage: number;
    grade_symbol: string;
    subject: string;
  }>;
  strengths: string[];
  areas_for_improvement: string[];
  passing_rate: number;
}

interface ClassAnalytics {
  class_id: number;
  subject_id?: number;
  term?: string;
  academic_year?: string;
  total_students: number;
  total_assessments: number;
  class_average: number;
  overall_grade: string;
  performance_distribution: {
    excellent: number;
    very_good: number;
    good: number;
    average: number;
    below_average: number;
  };
  top_performers: Array<{
    student_id: number;
    student_name: string;
    average_percentage: number;
    grade_symbol: string;
  }>;
  students_needing_support: Array<{
    student_id: number;
    student_name: string;
    average_percentage: number;
    grade_symbol: string;
  }>;
  passing_rate: number;
}

const EnhancedGradingSystem: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState('grade-entry');
  const [loading, setLoading] = useState(false);
  const [gesGradeBoundaries, setGesGradeBoundaries] = useState<GESGradeBoundaries>({});

  // Grade entry state
  const [gradeForm, setGradeForm] = useState({
    student_id: '',
    subject_id: '',
    class_id: '',
    assessment_type_id: '',
    grading_scheme_id: '1',
    raw_score: '',
    total_marks: '',
    assessment_name: '',
    assessment_date: '',
    term: '',
    academic_year: '',
    weight: '1.0',
    teacher_comments: ''
  });

  // Analytics state
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2023-2024');

  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics | null>(null);
  const [classAnalytics, setClassAnalytics] = useState<ClassAnalytics | null>(null);

  // Mock data for dropdowns (replace with actual API calls)
  const students = [
    { id: 1, name: 'John Doe', class_id: 1 },
    { id: 2, name: 'Jane Smith', class_id: 1 },
    { id: 3, name: 'Mike Johnson', class_id: 2 }
  ];

  const classes = [
    { id: 1, name: 'Form 1A', grade_level: 'JHS 1' },
    { id: 2, name: 'Form 2B', grade_level: 'JHS 2' }
  ];

  const subjects = [
    { id: 1, name: 'Mathematics', code: 'MATH' },
    { id: 2, name: 'English Language', code: 'ENG' },
    { id: 3, name: 'Science', code: 'SCI' }
  ];

  const assessmentTypes = [
    { id: 1, name: 'Class Exercise', weight: 0.1 },
    { id: 2, name: 'Homework', weight: 0.1 },
    { id: 3, name: 'Class Test', weight: 0.2 },
    { id: 4, name: 'Mid-term Exam', weight: 0.3 },
    { id: 5, name: 'End of Term Exam', weight: 0.3 }
  ];

  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const academicYears = ['2023-2024', '2024-2025'];

  // Load GES grade boundaries on component mount
  useEffect(() => {
    fetchGESGradeBoundaries();
  }, []);

  const fetchGESGradeBoundaries = async () => {
    try {
      const data = await enhancedGradingService.getGESGradeBoundaries();
      if (data.success) {
        setGesGradeBoundaries(data.data.grade_boundaries);
      }
    } catch (error) {
      console.error('Error fetching GES grade boundaries:', error);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await enhancedGradingService.createGrade(gradeForm);

      if (data.success) {
        toast.success('Grade created successfully!');
        setGradeForm({
          student_id: '',
          subject_id: '',
          class_id: '',
          assessment_type_id: '',
          grading_scheme_id: '1',
          raw_score: '',
          total_marks: '',
          assessment_name: '',
          assessment_date: '',
          term: '',
          academic_year: '',
          weight: '1.0',
          teacher_comments: ''
        });
      } else {
        toast.error(data.message || 'Failed to create grade');
      }
    } catch (error) {
      toast.error('An error occurred while creating the grade');
      console.error('Error creating grade:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAnalytics = async () => {
    if (!selectedStudent || !selectedAcademicYear) return;

    setLoading(true);
    try {
      const data = await enhancedGradingService.getStudentAnalytics(
        parseInt(selectedStudent),
        {
          academic_year: selectedAcademicYear,
          term: selectedTerm || undefined
        }
      );
      if (data.success) {
        setStudentAnalytics(data.data);
      } else {
        toast.error(data.message || 'Failed to fetch student analytics');
      }
    } catch (error) {
      toast.error('Error fetching student analytics');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassAnalytics = async () => {
    if (!selectedClass) return;

    setLoading(true);
    try {
      const data = await enhancedGradingService.getClassAnalytics(
        parseInt(selectedClass),
        {
          subject_id: selectedSubject ? parseInt(selectedSubject) : undefined,
          term: selectedTerm || undefined,
          academic_year: selectedAcademicYear || undefined
        }
      );
      if (data.success) {
        setClassAnalytics(data.data);
      } else {
        toast.error(data.message || 'Failed to fetch class analytics');
      }
    } catch (error) {
      toast.error('Error fetching class analytics');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinalGrade = async () => {
    if (!selectedStudent || !selectedSubject || !selectedClass || !selectedTerm || !selectedAcademicYear) {
      toast.error('Please select all required fields');
      return;
    }

    setLoading(true);
    try {
      const data = await enhancedGradingService.calculateFinalGrade({
        student_id: parseInt(selectedStudent),
        subject_id: parseInt(selectedSubject),
        class_id: parseInt(selectedClass),
        term: selectedTerm,
        academic_year: selectedAcademicYear
      });

      if (data.success) {
        toast.success('Final grade calculated successfully!');
        // Refresh analytics if they're loaded
        if (studentAnalytics) fetchStudentAnalytics();
      } else {
        toast.error(data.message || 'Failed to calculate final grade');
      }
    } catch (error) {
      toast.error('Error calculating final grade');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (gradeSymbol: string) => {
    const colors: { [key: string]: string } = {
      'A1': 'bg-green-500',
      'B2': 'bg-blue-500',
      'B3': 'bg-blue-400',
      'C4': 'bg-yellow-500',
      'C5': 'bg-yellow-400',
      'C6': 'bg-orange-400',
      'D7': 'bg-orange-500',
      'E8': 'bg-red-400',
      'F9': 'bg-red-500'
    };
    return colors[gradeSymbol] || 'bg-gray-500';
  };

  const performanceDistributionData = classAnalytics ? [
    { name: 'Excellent (80-100%)', value: classAnalytics.performance_distribution.excellent, color: '#10B981' },
    { name: 'Very Good (70-79%)', value: classAnalytics.performance_distribution.very_good, color: '#3B82F6' },
    { name: 'Good (60-69%)', value: classAnalytics.performance_distribution.good, color: '#F59E0B' },
    { name: 'Average (50-59%)', value: classAnalytics.performance_distribution.average, color: '#F97316' },
    { name: 'Below Average (<50%)', value: classAnalytics.performance_distribution.below_average, color: '#EF4444' }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Grading System</h1>
          <p className="text-gray-600 mt-2">GES-compliant grading with advanced analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <Badge variant="outline" className="text-sm">
            GES Compliant
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="grade-entry" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Grade Entry</span>
          </TabsTrigger>
          <TabsTrigger value="student-analytics" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Student Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="class-analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Class Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="final-grades" className="flex items-center space-x-2">
            <Calculator className="h-4 w-4" />
            <span>Final Grades</span>
          </TabsTrigger>
        </TabsList>

        {/* Grade Entry Tab */}
        <TabsContent value="grade-entry" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Enhanced Grade</CardTitle>
              <CardDescription>
                Enter assessment grades with GES-compliant calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGradeSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student">Student</Label>
                    <Select
                      value={gradeForm.student_id}
                      onValueChange={(value) => setGradeForm({ ...gradeForm, student_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map(student => (
                          <SelectItem key={student.id} value={student.id.toString()}>
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select
                      value={gradeForm.subject_id}
                      onValueChange={(value) => setGradeForm({ ...gradeForm, subject_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class">Class</Label>
                    <Select
                      value={gradeForm.class_id}
                      onValueChange={(value) => setGradeForm({ ...gradeForm, class_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name} ({typeof cls.grade_level === 'object' && cls.grade_level !== null ? (cls.grade_level as any).name : cls.grade_level})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assessment_type">Assessment Type</Label>
                    <Select
                      value={gradeForm.assessment_type_id}
                      onValueChange={(value) => setGradeForm({ ...gradeForm, assessment_type_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assessment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {assessmentTypes.map(type => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name} (Weight: {type.weight})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="term">Term</Label>
                    <Select
                      value={gradeForm.term}
                      onValueChange={(value) => setGradeForm({ ...gradeForm, term: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                      <SelectContent>
                        {terms.map(term => (
                          <SelectItem key={term} value={term}>
                            {term}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="academic_year">Academic Year</Label>
                    <Select
                      value={gradeForm.academic_year}
                      onValueChange={(value) => setGradeForm({ ...gradeForm, academic_year: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.map(year => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assessment_name">Assessment Name</Label>
                    <Input
                      id="assessment_name"
                      value={gradeForm.assessment_name}
                      onChange={(e) => setGradeForm({ ...gradeForm, assessment_name: e.target.value })}
                      placeholder="e.g., Mid-term Mathematics Test"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assessment_date">Assessment Date</Label>
                    <Input
                      id="assessment_date"
                      type="date"
                      value={gradeForm.assessment_date}
                      onChange={(e) => setGradeForm({ ...gradeForm, assessment_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="raw_score">Raw Score</Label>
                    <Input
                      id="raw_score"
                      type="number"
                      min="0"
                      step="0.1"
                      value={gradeForm.raw_score}
                      onChange={(e) => setGradeForm({ ...gradeForm, raw_score: e.target.value })}
                      placeholder="e.g., 85"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_marks">Total Marks</Label>
                    <Input
                      id="total_marks"
                      type="number"
                      min="1"
                      step="0.1"
                      value={gradeForm.total_marks}
                      onChange={(e) => setGradeForm({ ...gradeForm, total_marks: e.target.value })}
                      placeholder="e.g., 100"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      step="0.1"
                      value={gradeForm.weight}
                      onChange={(e) => setGradeForm({ ...gradeForm, weight: e.target.value })}
                      placeholder="e.g., 1.0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacher_comments">Teacher Comments (Optional)</Label>
                  <textarea
                    id="teacher_comments"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows={3}
                    value={gradeForm.teacher_comments}
                    onChange={(e) => setGradeForm({ ...gradeForm, teacher_comments: e.target.value })}
                    placeholder="Additional comments about the student's performance..."
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setGradeForm({
                      student_id: '',
                      subject_id: '',
                      class_id: '',
                      assessment_type_id: '',
                      grading_scheme_id: '1',
                      raw_score: '',
                      total_marks: '',
                      assessment_name: '',
                      assessment_date: '',
                      term: '',
                      academic_year: '',
                      weight: '1.0',
                      teacher_comments: ''
                    })}
                  >
                    Clear Form
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Grade'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* GES Grade Boundaries Reference */}
          <Card>
            <CardHeader>
              <CardTitle>GES Grade Boundaries Reference</CardTitle>
              <CardDescription>
                Ghana Education Service compliant grading scale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(gesGradeBoundaries).map(([grade, boundary]) => (
                  <div key={grade} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge className={getGradeColor(grade)} variant="secondary">
                        {grade}
                      </Badge>
                      <div>
                        <div className="font-medium">{boundary.interpretation}</div>
                        <div className="text-sm text-gray-500">
                          {boundary.min}% - {boundary.max}%
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {boundary.points} pts
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student Analytics Tab */}
        <TabsContent value="student-analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Performance Analytics</CardTitle>
              <CardDescription>
                Comprehensive performance analysis for individual students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map(year => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Term (Optional)</Label>
                  <Select value={selectedTerm || "all"} onValueChange={(val) => setSelectedTerm(val === "all" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All terms</SelectItem>
                      {terms.map(term => (
                        <SelectItem key={term} value={term}>
                          {term}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button onClick={fetchStudentAnalytics} disabled={loading}>
                    {loading ? 'Loading...' : 'Get Analytics'}
                  </Button>
                </div>
              </div>

              {studentAnalytics && (
                <div className="space-y-6">
                  {/* Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm text-gray-600">Total Assessments</p>
                            <p className="text-2xl font-bold">{studentAnalytics.total_assessments}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm text-gray-600">Average Score</p>
                            <p className="text-2xl font-bold">{studentAnalytics.average_percentage}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Award className="h-5 w-5 text-yellow-600" />
                          <div>
                            <p className="text-sm text-gray-600">Overall Grade</p>
                            <p className="text-2xl font-bold">{studentAnalytics.overall_grade}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Target className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="text-sm text-gray-600">Passing Rate</p>
                            <p className="text-2xl font-bold">{studentAnalytics.passing_rate}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Performance Trend Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={studentAnalytics.performance_trend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="percentage" stroke="#8884d8" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Strengths and Areas for Improvement */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-green-600">Strengths</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {studentAnalytics.strengths.map((strength, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <Award className="h-4 w-4 text-green-600" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-orange-600">Areas for Improvement</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {studentAnalytics.areas_for_improvement.map((area, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <span>{area}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Class Analytics Tab */}
        <TabsContent value="class-analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Performance Analytics</CardTitle>
              <CardDescription>
                Comprehensive performance analysis for individual classes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Term (Optional)</Label>
                  <Select value={selectedTerm || "all"} onValueChange={(val) => setSelectedTerm(val === "all" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All terms</SelectItem>
                      {terms.map(term => (
                        <SelectItem key={term} value={term}>
                          {term}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button onClick={fetchClassAnalytics} disabled={loading}>
                    {loading ? 'Loading...' : 'Get Analytics'}
                  </Button>
                </div>
              </div>

              {classAnalytics && (
                <div className="space-y-6">
                  {/* Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm text-gray-600">Total Students</p>
                            <p className="text-2xl font-bold">{classAnalytics.total_students}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm text-gray-600">Total Assessments</p>
                            <p className="text-2xl font-bold">{classAnalytics.total_assessments}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5 text-yellow-600" />
                          <div>
                            <p className="text-sm text-gray-600">Class Average</p>
                            <p className="text-2xl font-bold">{classAnalytics.class_average}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Award className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="text-sm text-gray-600">Passing Rate</p>
                            <p className="text-2xl font-bold">{classAnalytics.passing_rate}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Performance Distribution Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={performanceDistributionData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {performanceDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Top Performers and Students Needing Support */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-green-600">Top Performers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {classAnalytics.top_performers.map((student, index) => (
                            <div key={student.student_id} className="flex items-center justify-between p-2 border rounded">
                              <span className="font-medium">{student.student_name}</span>
                              <div className="flex items-center space-x-2">
                                <Badge className={getGradeColor(student.grade_symbol)}>
                                  {student.grade_symbol}
                                </Badge>
                                <span className="text-sm">{student.average_percentage}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-orange-600">Students Needing Support</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {classAnalytics.students_needing_support.map((student, index) => (
                            <div key={student.student_id} className="flex items-center justify-between p-2 border rounded">
                              <span className="font-medium">{student.student_name}</span>
                              <div className="flex items-center space-x-2">
                                <Badge className={getGradeColor(student.grade_symbol)}>
                                  {student.grade_symbol}
                                </Badge>
                                <span className="text-sm">{student.average_percentage}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Final Grades Tab */}
        <TabsContent value="final-grades" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compute Final Grades</CardTitle>
              <CardDescription>
                Calculate final grades using GES formula: 40% continuous assessment + 60% external exam
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleComputeFinalGrade} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="final_class">Class</Label>
                    <Select
                      value={finalGradeForm.class_id}
                      onValueChange={(value) => setFinalGradeForm({ ...finalGradeForm, class_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="final_student">Student</Label>
                    <Select
                      value={finalGradeForm.student_id}
                      onValueChange={(value) => setFinalGradeForm({ ...finalGradeForm, student_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students
                          .filter(student => !finalGradeForm.class_id || student.class_id.toString() === finalGradeForm.class_id)
                          .map(student => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              {student.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="final_subject">Subject</Label>
                    <Select
                      value={finalGradeForm.subject_id}
                      onValueChange={(value) => setFinalGradeForm({ ...finalGradeForm, subject_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="final_term">Term</Label>
                    <Select
                      value={finalGradeForm.term}
                      onValueChange={(value) => setFinalGradeForm({ ...finalGradeForm, term: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                      <SelectContent>
                        {terms.map(term => (
                          <SelectItem key={term} value={term}>
                            {term}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="final_academic_year">Academic Year</Label>
                    <Select
                      value={finalGradeForm.academic_year}
                      onValueChange={(value) => setFinalGradeForm({ ...finalGradeForm, academic_year: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.map(year => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Final grade calculation uses GES formula: 40% continuous assessment + 60% external exam.
                    Ensure all continuous assessments and external exam scores are recorded before calculation.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFinalGradeForm({
                      student_id: '',
                      subject_id: '',
                      class_id: '',
                      term: '',
                      academic_year: '2023-2024'
                    })}
                  >
                    Clear Form
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Computing...' : 'Compute Final Grade'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Final Grade Calculation Info */}
          <Card>
            <CardHeader>
              <CardTitle>GES Final Grade Calculation</CardTitle>
              <CardDescription>
                Understanding the Ghana Education Service grading formula
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-blue-600 mb-2">Continuous Assessment (40%)</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Class Exercises: 10%</li>
                      <li>• Homework: 10%</li>
                      <li>• Class Tests: 20%</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-green-600 mb-2">External Exam (60%)</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Mid-term Exam: 30%</li>
                      <li>• End of Term Exam: 30%</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Final Grade Formula:</h4>
                  <p className="text-sm">
                    <strong>Final Score = (Continuous Assessment × 0.4) + (External Exam × 0.6)</strong>
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    The final score is then mapped to the appropriate GES grade symbol (A1-F9) based on percentage ranges.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedGradingSystem;