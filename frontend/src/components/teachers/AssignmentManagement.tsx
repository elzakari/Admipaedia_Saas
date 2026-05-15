// Create a new component for assignment management
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";
import { useToast } from "../ui/use-toast";
import { format } from "date-fns";
import { CalendarIcon, Plus, Edit, Trash2, FileText, CheckCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

// Import services
import assignmentService from "../../services/assignmentService";
import classService from "../../services/classService";
import subjectService from "../../services/subjectService";
import studentService from "../../services/studentService";

// Use the types from the service
import type { Assignment, AssignmentSubmission } from "../../services/assignmentService";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatePicker } from '../ui/date-picker';

// Define interfaces for other entities
interface Class {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
}

export function AssignmentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('create');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [isViewingSubmission, setIsViewingSubmission] = useState(false);
  const [selectedAssignmentForGrading, setSelectedAssignmentForGrading] = useState<number | null>(null);
  
  // Form state for creating/editing assignments
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
    due_date: new Date(),
    total_points: 100,
    assignment_type: 'homework'
  });
  
  // Form state for grading
  const [gradeData, setGradeData] = useState({
    score: 0,
    feedback: ''
  });
  
  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
  });
  
  // Fetch subjects
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectService.getSubjects(),
  });
  
  // Fetch assignments
  const { data: assignmentsData, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentService.getAssignments(),
  });
  
  // Fetch submissions for selected assignment
  const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['submissions', selectedAssignmentForGrading],
    queryFn: () => selectedAssignmentForGrading ? 
      assignmentService.getSubmissions(selectedAssignmentForGrading) : 
      Promise.resolve([]),
    enabled: !!selectedAssignmentForGrading,
  });
  
  // Fetch students
  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentService.getStudents(),
  });
  
  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: (data: any) => {
      // Convert due_date from Date to ISO string
      const assignmentData = {
        ...data,
        due_date: data.due_date.toISOString(),
      };
      return selectedAssignment
        ? assignmentService.updateAssignment(selectedAssignment.id, assignmentData)
        : assignmentService.createAssignment(assignmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast({
        title: selectedAssignment ? "Assignment Updated" : "Assignment Created",
        description: selectedAssignment 
          ? "The assignment has been updated successfully."
          : "The assignment has been created successfully.",
        id: ''
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${selectedAssignment ? 'update' : 'create'} assignment: ${error.message}`,
        variant: "destructive",
        id: ''
      });
    }
  });
  
  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: number) => assignmentService.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast({
        title: "Assignment Deleted",
        description: "The assignment has been deleted successfully.",
        id: ''
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete assignment: ${error.message}`,
        variant: "destructive",
        id: ''
      });
    }
  });
  
  // Grade submission mutation
  const gradeSubmissionMutation = useMutation({
    mutationFn: ({ submissionId, data }: { submissionId: number, data: any }) => 
      assignmentService.gradeSubmission(submissionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', selectedAssignmentForGrading] });
      toast({
        title: "Submission Graded",
        description: "The submission has been graded successfully.",
        id: ''
      });
      setIsGrading(false);
      setGradeData({ score: 0, feedback: '' });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to grade submission: ${error.message}`,
        variant: "destructive",
        id: ''
      });
    }
  });
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setFormData(prev => ({ ...prev, due_date: date }));
    }
  };
  
  // Handle grade input changes
  const handleGradeInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGradeData(prev => ({ ...prev, [name]: value }));
  };
  
  // Submit assignment form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.title || !formData.class_id || !formData.subject_id || !formData.due_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
        id: ''
      });
      return;
    }
    
    // Convert string IDs to numbers
    const dataToSubmit = {
      ...formData,
      class_id: parseInt(formData.class_id),
      subject_id: parseInt(formData.subject_id),
      total_marks: parseInt(formData.total_points.toString()),
      teacher_id: 1, // This would come from auth context in a real app
    };
    
    createAssignmentMutation.mutate(dataToSubmit);
  };
  
  // Delete assignment
  const handleDeleteAssignment = (id: number) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      deleteAssignmentMutation.mutate(id);
    }
  };
  
  // Edit assignment
  const handleEditAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description,
      class_id: assignment.class_id.toString(),
      subject_id: assignment.subject_id.toString(),
      due_date: new Date(assignment.due_date),
      total_points: ((assignment as any).total_points ?? (assignment as any).total_marks) || 100,
      assignment_type: assignment.assignment_type
    });
    setSelectedDate(new Date(assignment.due_date));
    setActiveTab('create');
  };
  
  // Submit grade
  const handleSubmitGrade = () => {
    if (!selectedSubmissionId) return;
    
    const dataToSubmit = {
      score: parseInt(gradeData.score.toString()),
      feedback: gradeData.feedback
    };
    
    gradeSubmissionMutation.mutate({ 
      submissionId: selectedSubmissionId, 
      data: dataToSubmit 
    });
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      class_id: '',
      subject_id: '',
      due_date: new Date(),
      total_points: 100,
      assignment_type: 'homework'
    });
    setSelectedDate(new Date());
    setSelectedAssignment(null);
  };
  
  // Get student name by ID
  const getStudentName = (studentId: number) => {
    const student = studentsData?.data?.find(s => s.id === studentId);
    return student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assignment Management</CardTitle>
          <CardDescription>
            Create, edit, and grade assignments for your classes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Assignment</TabsTrigger>
              <TabsTrigger value="grade">Grade Submissions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Title
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Assignment title"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Assignment description"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="class" className="text-right">
                    Class
                  </Label>
                  <Select 
                    onValueChange={(value) => handleSelectChange('class_id', value)}
                    value={formData.class_id}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classesData?.data?.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subject" className="text-right">
                    Subject
                  </Label>
                  <Select 
                    onValueChange={(value) => handleSelectChange('subject_id', value)}
                    value={formData.subject_id}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectsData?.subjects?.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="due-date" className="text-right">
                    Due Date
                  </Label>
                  <div className="col-span-3">
                    <DatePicker
                      date={selectedDate}
                      setDate={handleDateSelect}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="total-points" className="text-right">
                    Total Points
                  </Label>
                  <Input
                    id="total-points"
                    name="total_points"
                    type="number"
                    value={formData.total_points}
                    onChange={handleInputChange}
                    className="col-span-3"
                    min="1"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assignment-type" className="text-right">
                    Type
                  </Label>
                  <Select 
                    onValueChange={(value) => handleSelectChange('assignment_type', value)}
                    value={formData.assignment_type}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homework">Homework</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="essay">Essay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={createAssignmentMutation.isPending}>
                    {createAssignmentMutation.isPending ? "Saving..." : selectedAssignment ? "Update Assignment" : "Create Assignment"}
                  </Button>
                </div>
              </form>
              
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Existing Assignments</h3>
                {isLoadingAssignments ? (
                  <div className="text-center py-4">Loading assignments...</div>
                ) : !assignmentsData?.data || assignmentsData.data.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No assignments found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignmentsData?.data?.map((assignment) => {
                        const classItem = classesData?.data?.find(c => c.id === assignment.class_id);
                        const subject = subjectsData?.subjects?.find(s => s.id === assignment.subject_id);
                        
                        return (
                          <TableRow key={assignment.id}>
                            <TableCell>{assignment.title}</TableCell>
                            <TableCell>{classItem?.name || 'Unknown Class'}</TableCell>
                            <TableCell>{subject?.name || 'Unknown Subject'}</TableCell>
                            <TableCell>{format(new Date(assignment.due_date), 'PPP')}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {assignment.assignment_type.charAt(0).toUpperCase() + assignment.assignment_type.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={cn(
                                  (assignment.status as any) === 'active' ? 'bg-green-100 text-green-800' : 
                                  (assignment.status as any) === 'archived' ? 'bg-gray-100 text-gray-800' : ''
                                )}
                              >
                                {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditAssignment(assignment)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteAssignment(assignment.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="grade" className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assignment-select" className="text-right">
                  Select Assignment
                </Label>
                <Select 
                  onValueChange={(value) => setSelectedAssignmentForGrading(parseInt(value))}
                  value={selectedAssignmentForGrading?.toString() || ''}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select assignment to grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignmentsData?.data?.map((assignment) => (
                      <SelectItem key={assignment.id} value={assignment.id.toString()}>
                        {assignment.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end">
                <Button variant="outline">
                  Export Grades
                </Button>
              </div>
              
              {selectedAssignmentForGrading && (
                <div className="mt-4">
                  {isLoadingSubmissions ? (
                    <div className="text-center py-4">Loading submissions...</div>
                  ) : submissionsData?.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No submissions found for this assignment.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Submission Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissionsData?.map((submission) => (
                          <TableRow key={submission.id}>
                            <TableCell>{getStudentName(submission.student_id)}</TableCell>
                            <TableCell>{format(new Date(submission.submission_date), 'PPP')}</TableCell>
                            <TableCell>
                              <Badge 
                                className={cn(
                                  submission.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 
                                  submission.status === 'graded' ? 'bg-green-100 text-green-800' : 
                                  'bg-yellow-100 text-yellow-800'
                                )}
                              >
                                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {submission.score !== null ? `${submission.score}/${(((assignmentsData?.data?.find(a => a.id === selectedAssignmentForGrading) as any)?.total_points ?? (assignmentsData?.data?.find(a => a.id === selectedAssignmentForGrading) as any)?.total_marks) || 100)}` : 'Not graded'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSubmissionId(submission.id);
                                    setIsViewingSubmission(true);
                                  }}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSubmissionId(submission.id);
                                    setGradeData({
                                      score: submission.score || 0,
                                      feedback: submission.feedback || ''
                                    });
                                    setIsGrading(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Grading Dialog */}
      <Dialog open={isGrading} onOpenChange={setIsGrading}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
            <DialogDescription>
              Provide a score and feedback for this submission.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="score">Score</Label>
              <Input
                id="score"
                name="score"
                type="number"
                value={gradeData.score}
                onChange={handleGradeInputChange}
                min="0"
                max={(((assignmentsData?.data?.find(a => a.id === selectedAssignmentForGrading) as any)?.total_points ?? (assignmentsData?.data?.find(a => a.id === selectedAssignmentForGrading) as any)?.total_marks) || 100)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                name="feedback"
                value={gradeData.feedback}
                onChange={handleGradeInputChange}
                rows={5}
                placeholder="Provide feedback to the student"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGrading(false)}>Cancel</Button>
            <Button onClick={handleSubmitGrade} disabled={gradeSubmissionMutation.isPending}>
              {gradeSubmissionMutation.isPending ? "Saving..." : "Submit Grade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Submission Dialog */}
      <Dialog open={isViewingSubmission} onOpenChange={setIsViewingSubmission}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>View Submission</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedSubmissionId && submissionsData && (
              <div>
                {(() => {
                  const submission = submissionsData.find(s => s.id === selectedSubmissionId);
                  if (!submission) return <div>Submission not found</div>;
                  
                  return (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium">Student</h3>
                        <p>{getStudentName(submission.student_id)}</p>
                      </div>
                      
                      <div>
                        <h3 className="font-medium">Submission Date</h3>
                        <p>{format(new Date(submission.submission_date), 'PPP')}</p>
                      </div>
                      
                      <div>
                        <h3 className="font-medium">Content</h3>
                        <div className="p-4 border rounded-md bg-muted/50 whitespace-pre-wrap">
                          {submission.content}
                        </div>
                      </div>
                      
                      {submission.file_path && (
                        <div>
                          <h3 className="font-medium">Attached File</h3>
                          <a 
                            href={submission.file_path} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Attachment
                          </a>
                        </div>
                      )}
                      
                      {submission.status === 'graded' && (
                        <div>
                          <h3 className="font-medium">Grade</h3>
                          <p>{submission.score} / {(((assignmentsData?.data?.find(a => a.id === selectedAssignmentForGrading) as any)?.total_points ?? (assignmentsData?.data?.find(a => a.id === selectedAssignmentForGrading) as any)?.total_marks) || 100)}</p>
                          
                          <h3 className="font-medium mt-4">Feedback</h3>
                          <div className="p-4 border rounded-md bg-muted/50 whitespace-pre-wrap">
                            {submission.feedback || 'No feedback provided.'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewingSubmission(false)}>Close</Button>
            {selectedSubmissionId && submissionsData?.find(s => s.id === selectedSubmissionId)?.status !== 'graded' && (
              <Button onClick={() => {
                const submission = submissionsData?.find(s => s.id === selectedSubmissionId);
                if (submission) {
                  setGradeData({
                    score: submission.score || 0,
                    feedback: submission.feedback || ''
                  });
                  setIsViewingSubmission(false);
                  setIsGrading(true);
                }
              }}>
                Grade Submission
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
