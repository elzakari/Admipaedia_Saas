import React, { useState, useEffect } from 'react';
import { AITeacherService } from "../../../services/aiTeacherService";
import classService, { Class } from "../../../services/classService";
import gradeService, { Grade } from "../../../services/gradeService";
import examService from "../../../services/examService";
import studentService, { Student } from "../../../services/studentService";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Progress } from "../../../components/ui/progress";
import { 
  BookOpen, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Brain,
  BarChart3,
  Plus,
  FileDown,
  Printer,
  Share2,
  Download,
  Search,
  Filter,
  Edit,
  Save,
  X
} from "lucide-react";
import { QuickActions } from "../../../components/common/quick-actions";
import { useToast } from "../../../components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";

interface EnhancedGradesTabProps {
  teacherId: number;
}

// Define assessment interface
interface Assessment {
  id: number;
  name: string;
  class: string;
  date: string;
  average?: string;
  status: 'completed' | 'pending';
  class_id?: number;
  subject_id?: number;
}

// Define student grade interface
interface StudentGrade {
  id: number;
  name: string;
  grade?: number;
  previousGrade?: number;
  change?: string;
}

export function EnhancedGradesTab({ teacherId }: EnhancedGradesTabProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState("");
  // Add state for grade insights
  const [gradeInsights, setGradeInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  // Add toast for notifications
  const { toast } = useToast();
  
  // Add state for assessment form modal
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    name: "",
    class: "",
    class_id: 0,
    subject_id: 0,
    date: new Date().toISOString().split('T')[0],
    description: ""
  });
  
  // Add state for gradebook
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Replace mock classes with real data
  const [classes, setClasses] = useState<Class[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  
  // Replace mock assessments with real data
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(true);
  
  // Load classes
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setClassesLoading(true);
        const response = await classService.getClasses();
        setClasses(response.classes);
      } catch (error) {
        console.error('Failed to load classes:', error);
        toast({
          title: "Error",
          description: "Failed to load classes. Please try again.",
          id: '',
          variant: "destructive"
        });
      } finally {
        setClassesLoading(false);
      }
    };

    loadClasses();
  }, [toast]);

  // Load assessments (exams)
  useEffect(() => {
    const loadAssessments = async () => {
      try {
        setAssessmentsLoading(true);
        const response = await examService.getExams();
        
        // Transform exam data to match Assessment interface
        const formattedAssessments = response.exams.map(exam => ({
          id: exam.id,
          name: exam.title,
          class: exam.class_?.name || 'Unknown Class',
          date: exam.exam_date,
          status: exam.status === 'completed' ? 'completed' : 'pending' as 'completed' | 'pending',
          class_id: exam.class_id,
          subject_id: exam.subject_id
        }));
        
        setAssessments(formattedAssessments);
      } catch (error) {
        console.error('Failed to load assessments:', error);
        // Fallback to mock data if API fails
        setAssessments([
          { id: 1, name: "Midterm Exam", class: "Math - Grade 10A", date: "2023-05-15", average: "82%", status: "completed" },
          { id: 2, name: "Quiz 3", class: "Physics - Grade 11B", date: "2023-05-18", status: "pending" },
          { id: 3, name: "Final Project", class: "Chemistry - Grade 10C", date: "2023-05-25", status: "pending" }
        ]);
      } finally {
        setAssessmentsLoading(false);
      }
    };

    loadAssessments();
  }, []);

  // Load grade insights
  useEffect(() => {
    const loadGradeInsights = async () => {
      try {
        setInsightsLoading(true);
        // Use the teacher insights from AITeacherService
        const teacherInsights = await AITeacherService.generateTeacherInsights(teacherId);
        
        // Try to get class performance data if a class is selected
        let classPerformance = null;
        if (selectedClassId) {
          try {
            classPerformance = await gradeService.getClassPerformance(selectedClassId);
          } catch (error) {
            console.error('Failed to load class performance:', error);
          }
        }
        
        // Format the data as needed for this component
        setGradeInsights({
          classAverage: classPerformance?.average || 78.5,
          trend: teacherInsights.performancePrediction.trend === 'improving' ? "Improving" : 
                 teacherInsights.performancePrediction.trend === 'declining' ? "Declining" : "Stable",
          topPerformers: classPerformance?.topPerformers || [
            { name: "Alice Johnson", grade: 95, improvement: "+5%" },
            { name: "Bob Smith", grade: 92, improvement: "+3%" }
          ],
          strugglingStudents: classPerformance?.strugglingStudents || [
            { name: "Charlie Brown", grade: 65, decline: "-8%" },
            { name: "Diana Prince", grade: 68, decline: "-3%" }
          ],
          recommendations: teacherInsights.workloadAnalysis.suggestions
        });
      } catch (error) {
        console.error('Failed to load grade insights:', error);
        // Fallback to default data if API fails
        setGradeInsights({
          classAverage: 78.5,
          trend: "Improving",
          topPerformers: [
            { name: "Alice Johnson", grade: 95, improvement: "+5%" },
            { name: "Bob Smith", grade: 92, improvement: "+3%" }
          ],
          strugglingStudents: [
            { name: "Charlie Brown", grade: 65, decline: "-8%" },
            { name: "Diana Prince", grade: 68, decline: "-3%" }
          ],
          recommendations: [
            "Focus on algebra concepts for struggling students",
            "Provide advanced problems for top performers"
          ]
        });
      } finally {
        setInsightsLoading(false);
      }
    };

    loadGradeInsights();
  }, [teacherId, selectedClassId]);

  // Load students when class is selected
  useEffect(() => {
    const loadStudents = async () => {
      if (selectedClassId) {
        try {
          // Get students for the selected class
          const response = await studentService.getStudents({ class_id: selectedClassId });
          
          // Get grades for these students if an assessment is selected
          let studentGrades: StudentGrade[] = response.students.map((student: Student) => ({
            id: student.id,
            name: student.full_name || `${student.first_name} ${student.last_name}`,
            grade: undefined,
            previousGrade: undefined,
            change: undefined
          }));
          
          // If an assessment is selected, try to get grades
          if (selectedAssessment) {
            const assessmentId = parseInt(selectedAssessment);
            try {
              const gradesResponse = await examService.getGradesByExam(assessmentId);
              
              // Match grades with students
              studentGrades = studentGrades.map(student => {
                const grade = gradesResponse.grades.find((g: any) => g.student_id === student.id);
                if (grade) {
                  return {
                    ...student,
                    grade: grade.score,
                    // We don't have previous grades in the API, so this is a placeholder
                    previousGrade: undefined,
                    change: undefined
                  };
                }
                return student;
              });
            } catch (error) {
              console.error('Failed to load grades for assessment:', error);
            }
          }
          
          setStudents(studentGrades);
        } catch (error) {
          console.error('Failed to load students for class:', error);
          // Fallback to mock data
          setStudents([
            { id: 1, name: "Alice Johnson", grade: 95, previousGrade: 90, change: "+5%" },
            { id: 2, name: "Bob Smith", grade: 92, previousGrade: 89, change: "+3%" },
            { id: 3, name: "Charlie Brown", grade: 65, previousGrade: 73, change: "-8%" },
            { id: 4, name: "Diana Prince", grade: 68, previousGrade: 71, change: "-3%" },
            { id: 5, name: "Edward Stark", grade: 88, previousGrade: 85, change: "+3%" },
          ]);
        }
      }
    };
    
    loadStudents();
  }, [selectedClassId, selectedAssessment]);

  // Handle class selection
  const handleClassSelection = (classId: string) => {
    setSelectedClass(classId);
    setSelectedClassId(parseInt(classId));
  };

  // Filter students based on search query
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle grade change
  const handleGradeChange = async (studentId: number, grade: number) => {
    try {
      // Update the grade in the UI immediately for responsiveness
      setStudents(students.map(student => 
        student.id === studentId ? { ...student, grade } : student
      ));
      
      // If we have an assessment selected, update the grade in the backend
      if (selectedAssessment) {
        const assessmentId = parseInt(selectedAssessment);
        await gradeService.updateGrade(studentId, { score: grade });
        
        toast({
          title: "Grade Updated",
          description: "Student grade has been updated successfully.",
          id: ''
        });
      }
    } catch (error) {
      console.error('Failed to update grade:', error);
      toast({
        title: "Error",
        description: "Failed to update grade. Please try again.",
        id: '',
        variant: "destructive"
      });
    }
  };

  // Handle assessment form change
  const handleAssessmentFormChange = (field: string, value: string) => {
    setNewAssessment(prev => ({ ...prev, [field]: value }));
  };

  // Handle assessment submission
  const handleSubmitAssessment = async () => {
    try {
      // Create the assessment in the backend
      const examData = {
        title: newAssessment.name,
        description: newAssessment.description,
        exam_date: newAssessment.date,
        duration: 60, // Default duration in minutes
        total_marks: 100, // Default total marks
        passing_marks: 50, // Default passing marks
        class_id: newAssessment.class_id,
        subject_id: newAssessment.subject_id,
        status: 'scheduled' as 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
      };
      
      const response = await examService.createExam(examData);
      
      // Add the new assessment to the list with the returned data
      const assessment: Assessment = {
        id: response.id,
        name: response.title,
        class: classes.find(c => c.id === response.class_id)?.name || 'Unknown Class',
        date: response.exam_date,
        status: 'pending',
        class_id: response.class_id,
        subject_id: response.subject_id
      };
      
      setAssessments([...assessments, assessment]);
      
      // Close the modal and show success message
      setAssessmentModalOpen(false);
      toast({
        title: "Assessment Added",
        description: `${newAssessment.name} for ${assessment.class} has been added.`,
        id: ''
      });
      
      // Reset form
      setNewAssessment({
        name: "",
        class: "",
        class_id: 0,
        subject_id: 0,
        date: new Date().toISOString().split('T')[0],
        description: ""
      });
    } catch (error) {
      console.error('Failed to create assessment:', error);
      toast({
        title: "Error",
        description: "Failed to create assessment. Please try again.",
        id: '',
        variant: "destructive"
      });
    }
  };
  
  // Use gradeInsights from state instead of generating them inline
  // const insights = generateGradeInsights();
  
  if (insightsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Handle quick actions
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add':
        setAssessmentModalOpen(true);
        break;
      case 'export':
        // Generate and download CSV of grades data
        const csvContent = "Assessment,Class,Date,Average,Status\n" +
          "Midterm Exam,Math - Grade 10A,2023-05-15,82%,Completed\n" +
          "Quiz 3,Physics - Grade 11B,2023-05-18,-,Pending";
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "grades_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Export Successful",
          description: "Grades data has been exported to CSV",
          id: ''
        });
        break;
      case 'print':
        // Print the current page
        window.print();
        toast({
          title: "Print Initiated",
          description: "Preparing grades report for printing",
          id: ''
        });
        break;
      case 'share':
        // Copy the current URL to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Grades page URL copied to clipboard",
          id: ''
        });
        break;
      default:
        break;
    }
  };

  // Define quick actions
  const quickActions = [
    {
      icon: Plus,
      label: "Add Assessment",
      onClick: () => handleQuickAction('add')
    },
    {
      icon: FileDown,
      label: "Export Grades",
      onClick: () => handleQuickAction('export')
    },
    {
      icon: Printer,
      label: "Print Report",
      onClick: () => handleQuickAction('print')
    },
    {
      icon: Share2,
      label: "Share",
      onClick: () => handleQuickAction('share')
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-indigo-900">Grades Management</h3>
        <div className="flex gap-2">
          <Button className="glass-button" onClick={() => setActiveTab("ai-insights")}>
            <Brain className="h-4 w-4 mr-2" />
            AI Analysis
          </Button>
          <Button className="glass-button" onClick={() => setAssessmentModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Assessment
          </Button>
          <Button className="glass-button" onClick={() => handleQuickAction('export')}>
            <Download className="h-4 w-4 mr-2" />
            Export Grades
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-tabs">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="gradebook">Gradebook</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Grade Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-600">Class Average</p>
                    <p className="text-2xl font-bold text-indigo-900">{gradeInsights.classAverage}%</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-600">Pending Grades</p>
                    <p className="text-2xl font-bold text-orange-600">12</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">45</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-600">Trend</p>
                    <p className="text-2xl font-bold text-green-600">{gradeInsights.trend}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Assessments */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Recent Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.slice(0, 5).map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">{assessment.name}</TableCell>
                      <TableCell>{assessment.class}</TableCell>
                      <TableCell>{assessment.date}</TableCell>
                      <TableCell>{assessment.average || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={assessment.status === 'completed' ? "success" : "warning"}>
                          {assessment.status === 'completed' ? 'Completed' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedAssessment(assessment.name);
                            setSelectedClass(assessment.class);
                            setActiveTab("gradebook");
                          } }
                        >
                          {assessment.status === 'completed' ? 'View Details' : 'Grade Now'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Assessments</CardTitle>
              <Button size="sm" onClick={() => setAssessmentModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Assessment
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assessments..."
                    className="pl-8" />
                </div>
                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls, index) => (
                      <SelectItem key={index} value={cls.id.toString()}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">{assessment.name}</TableCell>
                      <TableCell>{assessment.class}</TableCell>
                      <TableCell>{assessment.date}</TableCell>
                      <TableCell>{assessment.average || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={assessment.status === 'completed' ? "success" : "warning"}>
                          {assessment.status === 'completed' ? 'Completed' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedAssessment(assessment.name);
                              setSelectedClass(assessment.class);
                              setActiveTab("gradebook");
                            } }
                          >
                            {assessment.status === 'completed' ? 'View Details' : 'Grade Now'}
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gradebook Tab */}
        <TabsContent value="gradebook" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gradebook</CardTitle>
              <div className="flex space-x-2">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                      {classes.map((cls, index) => (
                      <SelectItem key={index} value={cls.id.toString()}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select assessment" />
                  </SelectTrigger>
                  <SelectContent>
                    {assessments
                      .filter(a => !selectedClass || a.class === selectedClass)
                      .map((assessment) => (
                        <SelectItem key={assessment.id} value={assessment.name}>
                          {assessment.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {selectedClass ? (
                <>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save Grades
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Current Grade</TableHead>
                        <TableHead>Previous Grade</TableHead>
                        <TableHead>Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={student.grade || ''}
                              onChange={(e) => handleGradeChange(student.id, parseInt(e.target.value))}
                              className="w-20" />
                          </TableCell>
                          <TableCell>{student.previousGrade || '-'}</TableCell>
                          <TableCell>
                            {student.change && (
                              <Badge
                                variant={student.change.startsWith('+') ? "success" : "destructive"}
                              >
                                {student.change}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Please select a class to view the gradebook</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Grade Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">Overall Class Average</p>
                  <p className="text-2xl font-bold text-indigo-600">{gradeInsights.classAverage}%</p>
                  <p className="text-sm text-gray-500">Across all assessments</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">Highest Performing Class</p>
                  <p className="text-2xl font-bold text-green-600">Math - Grade 10A</p>
                  <p className="text-sm text-gray-500">Average: 85.2%</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">Needs Improvement</p>
                  <p className="text-2xl font-bold text-orange-600">Physics - Grade 11B</p>
                  <p className="text-sm text-gray-500">Average: 72.8%</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Grade Distribution by Class</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span>Math - Grade 10A</span>
                      <span className="text-sm font-medium">85.2%</span>
                    </div>
                    <Progress value={85.2} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span>Physics - Grade 11B</span>
                      <span className="text-sm font-medium">72.8%</span>
                    </div>
                    <Progress value={72.8} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span>Chemistry - Grade 10C</span>
                      <span className="text-sm font-medium">79.5%</span>
                    </div>
                    <Progress value={79.5} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span>Biology - Grade 11A</span>
                      <span className="text-sm font-medium">81.3%</span>
                    </div>
                    <Progress value={81.3} className="h-2" />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Assessment Performance</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Average</TableHead>
                      <TableHead>Highest</TableHead>
                      <TableHead>Lowest</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Midterm Exam</TableCell>
                      <TableCell>Math - Grade 10A</TableCell>
                      <TableCell>82%</TableCell>
                      <TableCell>95%</TableCell>
                      <TableCell>65%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Final Project</TableCell>
                      <TableCell>Chemistry - Grade 10C</TableCell>
                      <TableCell>79%</TableCell>
                      <TableCell>92%</TableCell>
                      <TableCell>62%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                AI-Powered Grade Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Performance Trends */}
              <div>
                <h4 className="font-semibold mb-3">Performance Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-green-600 mb-2">Top Performers</h5>
                    {gradeInsights.topPerformers.map((student: { name: string; grade: number; improvement: string; }, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span>{student.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{student.grade}%</span>
                          <Badge variant="success">{student.improvement}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h5 className="font-medium text-red-600 mb-2">Needs Attention</h5>
                    {gradeInsights.strugglingStudents.map((student: { name: string; grade: number; decline: string; }, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span>{student.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{student.grade}%</span>
                          <Badge variant="destructive">{student.decline}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Recommendations */}
              <div>
                <h4 className="font-semibold mb-3">AI Recommendations</h4>
                <ul className="space-y-2">
                  {gradeInsights.recommendations.map((rec: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined, index: React.Key | null | undefined) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-1 mr-2" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Grade Distribution */}
              <div>
                <h4 className="font-semibold mb-3">Grade Distribution</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>A (90-100%)</span>
                    <div className="flex items-center gap-2">
                      <Progress value={25} className="w-20" />
                      <span className="text-sm">25%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>B (80-89%)</span>
                    <div className="flex items-center gap-2">
                      <Progress value={35} className="w-20" />
                      <span className="text-sm">35%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>C (70-79%)</span>
                    <div className="flex items-center gap-2">
                      <Progress value={25} className="w-20" />
                      <span className="text-sm">25%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>D (60-69%)</span>
                    <div className="flex items-center gap-2">
                      <Progress value={10} className="w-20" />
                      <span className="text-sm">10%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>F (Below 60%)</span>
                    <div className="flex items-center gap-2">
                      <Progress value={5} className="w-20" />
                      <span className="text-sm">5%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
      )
      {/* Add QuickActions component */}
      <QuickActions actions={quickActions} />
  
}