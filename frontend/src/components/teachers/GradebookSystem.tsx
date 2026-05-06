import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  CheckCircle, 
  XCircle,
  Calendar,
  Clock,
  Save,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  XSquare,
  FileText,
  Edit3,
  Plus,
  Trash2,
  BarChart3,
  Clipboard
} from "lucide-react";
import { Progress } from "../ui/progress";

interface GradebookSystemProps {
  // Add props as needed
}

export function GradebookSystem({}: GradebookSystemProps) {
  const [selectedClass, setSelectedClass] = useState("10A");
  const [selectedAssessment, setSelectedAssessment] = useState("A1");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("grades");
  const [isEditing, setIsEditing] = useState(false);
  const [gradeData, setGradeData] = useState<Record<string, number>>({});

  // Mock class data
  const classes = [
    { id: "10A", name: "Class 10A", subject: "Mathematics", students: 32, room: "Room 101", schedule: "Mon, Wed, Fri 9:00 - 10:30" },
    { id: "11B", name: "Class 11B", subject: "Physics", students: 28, room: "Lab 3", schedule: "Tue, Thu 11:00 - 12:30" },
    { id: "12A", name: "Class 12A", subject: "Mathematics", students: 25, room: "Room 105", schedule: "Mon, Wed 14:00 - 15:30" },
  ];

  // Mock student data for each class
  const classStudents = {
    "10A": [
      { id: "S1", name: "John Doe", gender: "Male", photo: "https://randomuser.me/api/portraits/men/1.jpg" },
      { id: "S2", name: "Jane Smith", gender: "Female", photo: "https://randomuser.me/api/portraits/women/1.jpg" },
      { id: "S3", name: "Michael Johnson", gender: "Male", photo: "https://randomuser.me/api/portraits/men/2.jpg" },
      { id: "S4", name: "Emily Davis", gender: "Female", photo: "https://randomuser.me/api/portraits/women/2.jpg" },
    ],
    "11B": [
      { id: "S5", name: "Robert Wilson", gender: "Male", photo: "https://randomuser.me/api/portraits/men/3.jpg" },
      { id: "S6", name: "Sarah Brown", gender: "Female", photo: "https://randomuser.me/api/portraits/women/3.jpg" },
    ],
    "12A": [
      { id: "S7", name: "David Miller", gender: "Male", photo: "https://randomuser.me/api/portraits/men/4.jpg" },
      { id: "S8", name: "Lisa Taylor", gender: "Female", photo: "https://randomuser.me/api/portraits/women/4.jpg" },
    ],
  };

  // Mock assessments data
  const assessments = {
    "10A": [
      { id: "A1", title: "Algebra Quiz", date: "Sep 10, 2023", type: "Quiz", maxScore: 100, weight: 10 },
      { id: "A2", title: "Geometry Test", date: "Sep 20, 2023", type: "Test", maxScore: 100, weight: 20 },
      { id: "A3", title: "Homework 1", date: "Sep 5, 2023", type: "Homework", maxScore: 50, weight: 5 },
    ],
    "11B": [
      { id: "A4", title: "Physics Lab Report", date: "Sep 15, 2023", type: "Lab", maxScore: 100, weight: 15 },
      { id: "A5", title: "Mechanics Quiz", date: "Sep 25, 2023", type: "Quiz", maxScore: 50, weight: 10 },
    ],
    "12A": [
      { id: "A6", title: "Advanced Calculus Test", date: "Sep 22, 2023", type: "Test", maxScore: 100, weight: 25 },
    ],
  };

  // Mock grades data
  const mockGrades = {
    "10A": {
      "A1": { "S1": 85, "S2": 92, "S3": 78, "S4": 88 },
      "A2": { "S1": 80, "S2": 95, "S3": 75, "S4": 85 },
      "A3": { "S1": 45, "S2": 48, "S3": 40, "S4": 42 },
    },
    "11B": {
      "A4": { "S5": 88, "S6": 92 },
      "A5": { "S5": 42, "S6": 45 },
    },
    "12A": {
      "A6": { "S7": 85, "S8": 78 },
    },
  };

  // Filter students based on search query
  const filteredStudents = classStudents[selectedClass as keyof typeof classStudents].filter(
    (student) => student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Initialize grade data if not set
  React.useEffect(() => {
    if (selectedClass && selectedAssessment) {
      const classGrades = mockGrades[selectedClass as keyof typeof mockGrades] || {};
      const assessmentGrades = classGrades[selectedAssessment as keyof typeof classGrades] || {};
      setGradeData(assessmentGrades);
    }
  }, [selectedClass, selectedAssessment]);

  // Handle grade change
  const handleGradeChange = (studentId: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setGradeData(prev => ({
        ...prev,
        [studentId]: numValue
      }));
    }
  };

  // Handle save grades
  const handleSaveGrades = () => {
    // In a real app, this would send data to the server
    console.log("Saving grades:", { class: selectedClass, assessment: selectedAssessment, data: gradeData });
    setIsEditing(false);
    // Show success message or notification
  };

  // Get current assessment data
  const currentAssessment = assessments[selectedClass as keyof typeof assessments]?.find(
    a => a.id === selectedAssessment
  );

  // Calculate grade statistics
  const calculateGradeStats = () => {
    const grades = Object.values(gradeData);
    if (grades.length === 0) return { avg: 0, min: 0, max: 0, passing: 0 };
    
    const sum = grades.reduce((a, b) => a + b, 0);
    const avg = sum / grades.length;
    const min = Math.min(...grades);
    const max = Math.max(...grades);
    const passing = grades.filter(g => g >= 60).length;
    
    return { avg, min, max, passing };
  };

  const stats = calculateGradeStats();

  // Calculate letter grade
  const getLetterGrade = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return "A";
    if (percentage >= 80) return "B";
    if (percentage >= 70) return "C";
    if (percentage >= 60) return "D";
    return "F";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold text-indigo-900">Gradebook</h2>
          <p className="text-sm text-indigo-700">Manage student grades and assessments</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button className="flex items-center glass-button">
            <Plus className="h-4 w-4 mr-2" />
            New Assessment
          </Button>
          <Button variant="outline" className="flex items-center glass-button-outline">
            <Download className="h-4 w-4 mr-2" />
            Export Grades
          </Button>
        </div>
      </div>

      <Tabs defaultValue="grades" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-tabs">
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grades" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <CardTitle>Grade Management</CardTitle>
                  <CardDescription>
                    Enter and manage student grades
                  </CardDescription>
                </div>
                <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-[180px] glass-input">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name} - {cls.subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedAssessment} 
                    onValueChange={setSelectedAssessment}
                    disabled={!assessments[selectedClass as keyof typeof assessments]?.length}
                  >
                    <SelectTrigger className="w-[180px] glass-input">
                      <SelectValue placeholder="Select assessment" />
                    </SelectTrigger>
                    <SelectContent>
                      {assessments[selectedClass as keyof typeof assessments]?.map(assessment => (
                        <SelectItem key={assessment.id} value={assessment.id}>
                          {assessment.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {currentAssessment ? (
                <>
                  <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
                    <div className="flex flex-col md:flex-row justify-between">
                      <div>
                        <h3 className="font-medium text-indigo-900">{currentAssessment.title}</h3>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center text-sm text-indigo-700">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Date: {currentAssessment.date}</span>
                          </div>
                          <div className="flex items-center text-sm text-indigo-700">
                            <FileText className="h-4 w-4 mr-2" />
                            <span>Type: {currentAssessment.type}</span>
                          </div>
                          <div className="flex items-center text-sm text-indigo-700">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            <span>Max Score: {currentAssessment.maxScore} | Weight: {currentAssessment.weight}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 md:mt-0">
                        <Button 
                          variant={isEditing ? "outline" : "default"} 
                          onClick={() => setIsEditing(!isEditing)}
                          className={isEditing ? "glass-button-outline" : "glass-button"}
                        >
                          {isEditing ? (
                            <>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Cancel Editing
                            </>
                          ) : (
                            <>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit Grades
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex-grow max-w-md mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-indigo-700" />
                    <Input
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 glass-input"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-indigo-100">
                          <th className="text-left py-2 px-3 text-indigo-900">Student</th>
                          <th className="text-center py-2 px-3 text-indigo-900">Score</th>
                          <th className="text-center py-2 px-3 text-indigo-900">Grade</th>
                          <th className="text-center py-2 px-3 text-indigo-900">Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => (
                          <tr key={student.id} className="border-b border-indigo-100">
                            <td className="py-2 px-3">
                              <div className="flex items-center">
                                <Avatar className="h-8 w-8 mr-2">
                                  <AvatarImage src={student.photo} alt={student.name} />
                                  <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="text-indigo-900 font-medium">{student.name}</div>
                                  <div className="text-xs text-indigo-700">{student.gender}</div>
                                </div>
                              </div>
                            </td>
                            <td className="text-center py-2 px-3">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min={0}
                                  max={currentAssessment.maxScore}
                                  value={gradeData[student.id] || ""}
                                  onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                  className="w-20 mx-auto text-center glass-input"
                                />
                              ) : (
                                <span className="font-medium text-indigo-900">
                                  {gradeData[student.id] !== undefined ? `${gradeData[student.id]} / ${currentAssessment.maxScore}` : "-"}
                                </span>
                              )}
                            </td>
                            <td className="text-center py-2 px-3">
                              {gradeData[student.id] !== undefined ? (
                                <Badge variant={
                                  getLetterGrade(gradeData[student.id], currentAssessment.maxScore) === "A" ? "success" :
                                  getLetterGrade(gradeData[student.id], currentAssessment.maxScore) === "B" ? "outline" :
                                  getLetterGrade(gradeData[student.id], currentAssessment.maxScore) === "C" ? "secondary" :
                                  getLetterGrade(gradeData[student.id], currentAssessment.maxScore) === "D" ? "warning" :
                                  "destructive"
                                }>
                                  {getLetterGrade(gradeData[student.id], currentAssessment.maxScore)}
                                </Badge>
                              ) : (
                                <span className="text-indigo-400">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {gradeData[student.id] !== undefined ? (
                                <Progress 
                                  value={(gradeData[student.id] / currentAssessment.maxScore) * 100} 
                                  className="h-2" 
                                  // Remove the indicatorClassName prop and use a different approach
                                  // indicatorClassName={
                                  //   (gradeData[student.id] / currentAssessment.maxScore) * 100 >= 90 ? "bg-green-500" :
                                  //   (gradeData[student.id] / currentAssessment.maxScore) * 100 >= 80 ? "bg-blue-500" :
                                  //   (gradeData[student.id] / currentAssessment.maxScore) * 100 >= 70 ? "bg-amber-500" :
                                  //   (gradeData[student.id] / currentAssessment.maxScore) * 100 >= 60 ? "bg-orange-500" :
                                  //   "bg-red-500"
                                  // }
                                  style={{
                                    '--progress-foreground': (gradeData[student.id] / currentAssessment.maxScore) * 100 >= 90 ? 'hsl(142, 76%, 36%)' :
                                    (gradeData[student.id] / currentAssessment.maxScore) * 100 >= 80 ? 'hsl(221, 83%, 53%)' :
                                    (gradeData[student.id] / currentAssessment.maxScore) * 100 >= 70 ? 'hsl(43, 96%, 56%)' :
                                    (gradeData[student.id] / currentAssessment.maxScore) * 100 >= 60 ? 'hsl(33, 98%, 44%)' :
                                    'hsl(0, 84%, 60%)'
                                  } as React.CSSProperties}
                                />
                              ) : (
                                <div className="h-2 bg-gray-100 rounded"></div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {isEditing && (
                    <div className="mt-6 flex justify-end">
                      <Button 
                        onClick={handleSaveGrades}
                        className="glass-button"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Grades
                      </Button>
                    </div>
                  )}

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="glass-card">
                      <CardContent className="p-4 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-indigo-900 mb-1">
                          {stats.avg.toFixed(1)}
                        </div>
                        <div className="text-sm text-indigo-700">Class Average</div>
                      </CardContent>
                    </Card>
                    <Card className="glass-card">
                      <CardContent className="p-4 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          {stats.max}
                        </div>
                        <div className="text-sm text-indigo-700">Highest Score</div>
                      </CardContent>
                    </Card>
                    <Card className="glass-card">
                      <CardContent className="p-4 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-red-600 mb-1">
                          {stats.min}
                        </div>
                        <div className="text-sm text-indigo-700">Lowest Score</div>
                      </CardContent>
                    </Card>
                    <Card className="glass-card">
                      <CardContent className="p-4 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-indigo-900 mb-1">
                          {stats.passing}/{filteredStudents.length}
                        </div>
                        <div className="text-sm text-indigo-700">Passing Rate</div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="bg-indigo-100 p-4 rounded-full mb-4">
                    <FileText className="h-8 w-8 text-indigo-700" />
                  </div>
                  <h3 className="text-lg font-medium mb-1 text-indigo-900">No Assessment Selected</h3>
                  <p className="text-sm text-indigo-700 max-w-md">
                    Please select a class and assessment to view and manage grades
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <CardTitle>Assessment Management</CardTitle>
                  <CardDescription>
                    Create and manage assessments for your classes
                  </CardDescription>
                </div>
                <div className="mt-4 md:mt-0">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-[180px] glass-input">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name} - {cls.subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-indigo-900">Assessments</h3>
                <Button className="flex items-center glass-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assessment
                </Button>
              </div>

              <div className="space-y-4">
                {assessments[selectedClass as keyof typeof assessments]?.map((assessment) => (
                  <Card key={assessment.id} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-indigo-900">{assessment.title}</h4>
                          <p className="text-sm text-indigo-700">Date: {assessment.date}</p>
                          <div className="flex items-center mt-1">
                            <Badge variant="outline" className="mr-2">
                              {assessment.type}
                            </Badge>
                            <span className="text-xs text-indigo-700">
                              Max Score: {assessment.maxScore} | Weight: {assessment.weight}%
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedAssessment(assessment.id);
                              setActiveTab("grades");
                            }}
                            className="glass-button-outline"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Grades
                          </Button>
                          <Button variant="outline" size="sm" className="glass-button-outline">
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="glass-button-outline text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {!assessments[selectedClass as keyof typeof assessments]?.length && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="bg-indigo-100 p-4 rounded-full mb-4">
                    <FileText className="h-8 w-8 text-indigo-700" />
                  </div>
                  <h3 className="text-lg font-medium mb-1 text-indigo-900">No Assessments Yet</h3>
                  <p className="text-sm text-indigo-700 max-w-md">
                    Create your first assessment for this class
                  </p>
                  <Button className="mt-4 glass-button">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Assessment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <CardTitle>Grade Analytics</CardTitle>
                  <CardDescription>
                    Analyze student performance and grade distributions
                  </CardDescription>
                </div>
                <div className="mt-4 md:mt-0">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-[180px] glass-input">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name} - {cls.subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-base">Grade Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 flex items-center justify-center">
                    <div className="text-center text-indigo-700">
                      [Chart Placeholder: Grade distribution visualization]
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-base">Performance Trend</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 flex items-center justify-center">
                    <div className="text-center text-indigo-700">
                      [Chart Placeholder: Performance trend over time]
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-indigo-900 mb-4">Student Rankings</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-indigo-100">
                        <th className="text-left py-2 px-3 text-indigo-900">Rank</th>
                        <th className="text-left py-2 px-3 text-indigo-900">Student</th>
                        <th className="text-center py-2 px-3 text-indigo-900">Average Score</th>
                        <th className="text-center py-2 px-3 text-indigo-900">Grade</th>
                        <th className="text-center py-2 px-3 text-indigo-900">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents[selectedClass as keyof typeof classStudents].map((student, index) => {
                        // Calculate average score for this student across all assessments
                        const studentGrades = assessments[selectedClass as keyof typeof assessments]?.map(assessment => {
                          // Fix the type issue by using a type assertion
                          const classGrades = mockGrades[selectedClass as keyof typeof mockGrades];
                          // Use a type guard to ensure safe access
                          const assessmentGrades = classGrades && typeof classGrades === 'object' 
                            ? (classGrades as Record<string, Record<string, number>>)[assessment.id] || {}
                            : {};
                          
                          return {
                            score: assessmentGrades[student.id as keyof typeof assessmentGrades] || 0,
                            maxScore: assessment.maxScore,
                            weight: assessment.weight
                          };
                        }) || [];
                        
                        const totalWeight = studentGrades.reduce((sum, grade) => sum + grade.weight, 0);
                        const weightedAvg = totalWeight === 0 ? 0 : 
                          studentGrades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * grade.weight, 0) / totalWeight * 100;
                        
                        const letterGrade = 
                          weightedAvg >= 90 ? "A" :
                          weightedAvg >= 80 ? "B" :
                          weightedAvg >= 70 ? "C" :
                          weightedAvg >= 60 ? "D" : "F";

                        return (
                          <tr key={student.id} className="border-b border-indigo-100">
                            <td className="py-2 px-3 text-indigo-900 font-medium">
                              #{index + 1}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center">
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarImage src={student.photo} alt={student.name} />
                                  <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-indigo-900">{student.name}</span>
                              </div>
                            </td>
                            <td className="text-center py-2 px-3 font-medium text-indigo-900">
                              {weightedAvg.toFixed(1)}%
                            </td>
                            <td className="text-center py-2 px-3">
                              <Badge variant={
                                letterGrade === "A" ? "success" :
                                letterGrade === "B" ? "outline" :
                                letterGrade === "C" ? "secondary" :
                                letterGrade === "D" ? "warning" :
                                "destructive"
                              }>
                                {letterGrade}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              <Progress 
                                value={weightedAvg} 
                                className={`h-2 ${
                                  weightedAvg >= 90 ? "bg-green-500/20" :
                                  weightedAvg >= 80 ? "bg-blue-500/20" :
                                  weightedAvg >= 70 ? "bg-amber-500/20" :
                                  weightedAvg >= 60 ? "bg-orange-500/20" :
                                  "bg-red-500/20"
                                }`}
                                style={{
                                  "--progress-foreground": 
                                    weightedAvg >= 90 ? "rgb(34 197 94)" :
                                    weightedAvg >= 80 ? "rgb(59 130 246)" :
                                    weightedAvg >= 70 ? "rgb(245 158 11)" :
                                    weightedAvg >= 60 ? "rgb(249 115 22)" :
                                    "rgb(239 68 68)"
                                } as React.CSSProperties}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}