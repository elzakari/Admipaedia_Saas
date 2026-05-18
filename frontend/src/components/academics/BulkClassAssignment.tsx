import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Calendar, Users, BookOpen, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import teacherService from '../../services/teacherService';
import { Teacher } from '../../services/teacherService';
import classService, { Class } from '@/services/classService';
import subjectService, { Subject } from '@/services/subjectService';

interface BulkClassAssignmentProps {
  onClose?: () => void;
}

interface AssignmentRow {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  scheduleSlots: ScheduleSlot[];
  status: 'pending' | 'valid' | 'invalid';
  errors: string[];
}

interface ScheduleSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const BulkClassAssignment: React.FC<BulkClassAssignmentProps> = ({ onClose }) => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkScheduleTemplate, setBulkScheduleTemplate] = useState<ScheduleSlot[]>([]);
  const [activeTab, setActiveTab] = useState('assignments');

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [teachersData, classesData, subjectsData] = await Promise.all([
          teacherService.getTeachers(),
          classService.getClasses(),
          subjectService.getSubjects()
        ]);
        
        // Fix: Extract arrays from API response objects
        setTeachers(teachersData.teachers || []);
        setClasses(classesData.classes || []);
        setSubjects(subjectsData.subjects || []);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          id: Math.random().toString(),
          title: 'Error',
          description: 'Failed to load initial data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // Add new assignment row
  const addAssignmentRow = () => {
    const newAssignment: AssignmentRow = {
      id: Math.random().toString(36).substr(2, 9),
      teacherId: '',
      classId: '',
      subjectId: '',
      startDate: undefined,
      endDate: undefined,
      scheduleSlots: [],
      status: 'pending',
      errors: []
    };
    setAssignments([...assignments, newAssignment]);
  };

  // Remove assignment row
  const removeAssignmentRow = (id: string) => {
    setAssignments(assignments.filter(assignment => assignment.id !== id));
  };

  // Update assignment row
  const updateAssignmentRow = (id: string, updates: Partial<AssignmentRow>) => {
    setAssignments(assignments.map(assignment => 
      assignment.id === id ? { ...assignment, ...updates } : assignment
    ));
  };

  // Add schedule slot to assignment
  const addScheduleSlot = (assignmentId: string) => {
    const newSlot: ScheduleSlot = {
      id: Math.random().toString(36).substr(2, 9),
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      room: ''
    };
    
    updateAssignmentRow(assignmentId, {
      scheduleSlots: [...(assignments.find(a => a.id === assignmentId)?.scheduleSlots || []), newSlot]
    });
  };

  // Remove schedule slot from assignment
  const removeScheduleSlot = (assignmentId: string, slotId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      updateAssignmentRow(assignmentId, {
        scheduleSlots: assignment.scheduleSlots.filter(slot => slot.id !== slotId)
      });
    }
  };

  // Update schedule slot
  const updateScheduleSlot = (assignmentId: string, slotId: string, updates: Partial<ScheduleSlot>) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      updateAssignmentRow(assignmentId, {
        scheduleSlots: assignment.scheduleSlots.map(slot => 
          slot.id === slotId ? { ...slot, ...updates } : slot
        )
      });
    }
  };

  // Validate individual assignment
  const validateAssignment = (assignment: AssignmentRow): ValidationResult => {
    const errors: string[] = [];

    if (!assignment.teacherId) errors.push('Teacher is required');
    if (!assignment.classId) errors.push('Class is required');
    if (!assignment.subjectId) errors.push('Subject is required');
    if (!assignment.startDate) errors.push('Start date is required');
    if (!assignment.endDate) errors.push('End date is required');
    if (assignment.startDate && assignment.endDate && assignment.startDate >= assignment.endDate) {
      errors.push('End date must be after start date');
    }
    if (assignment.scheduleSlots.length === 0) {
      errors.push('At least one schedule slot is required');
    }

    // Validate schedule slots
    assignment.scheduleSlots.forEach((slot, index) => {
      if (!slot.dayOfWeek) errors.push(`Schedule slot ${index + 1}: Day of week is required`);
      if (!slot.startTime) errors.push(`Schedule slot ${index + 1}: Start time is required`);
      if (!slot.endTime) errors.push(`Schedule slot ${index + 1}: End time is required`);
      if (!slot.room) errors.push(`Schedule slot ${index + 1}: Room is required`);
      if (slot.startTime && slot.endTime && slot.startTime >= slot.endTime) {
        errors.push(`Schedule slot ${index + 1}: End time must be after start time`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Validate all assignments
  const validateAllAssignments = () => {
    const updatedAssignments = assignments.map(assignment => {
      const validation = validateAssignment(assignment);
      return {
        ...assignment,
        status: validation.isValid ? 'valid' as const : 'invalid' as const,
        errors: validation.errors
      };
    });
    setAssignments(updatedAssignments);
    return updatedAssignments.every(assignment => assignment.status === 'valid');
  };

  // Apply bulk schedule template
  const applyBulkSchedule = () => {
    if (bulkScheduleTemplate.length === 0) {
      toast({
        id: Math.random().toString(),
        title: 'Warning',
        description: 'Please add schedule slots to the template first',
        variant: 'destructive'
      });
      return;
    }

    const updatedAssignments = assignments.map(assignment => ({
      ...assignment,
      scheduleSlots: [...bulkScheduleTemplate.map(slot => ({
        ...slot,
        id: Math.random().toString(36).substr(2, 9)
      }))]
    }));
    setAssignments(updatedAssignments);
    
    toast({
      id: Math.random().toString(),
      title: 'Success',
      description: `Applied schedule template to ${assignments.length} assignments`
    });
  };

  // Handle bulk submit
  const handleBulkSubmit = async () => {
    if (assignments.length === 0) {
      toast({
        id: Math.random().toString(),
        title: 'Warning',
        description: 'Please add at least one assignment',
        variant: 'destructive'
      });
      return;
    }

    if (!validateAllAssignments()) {
      toast({
        id: Math.random().toString(),
        title: 'Validation Error',
        description: 'Please fix all validation errors before submitting',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Here you would make API calls to create the assignments
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        id: Math.random().toString(),
        title: 'Success',
        description: `Successfully created ${assignments.length} class assignments`
      });
      
      // Reset form
      setAssignments([]);
      setBulkScheduleTemplate([]);
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error creating assignments:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create assignments';
      toast({
        id: Math.random().toString(),
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Add bulk schedule slot
  const addBulkScheduleSlot = () => {
    const newSlot: ScheduleSlot = {
      id: Math.random().toString(36).substr(2, 9),
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      room: ''
    };
    setBulkScheduleTemplate([...bulkScheduleTemplate, newSlot]);
  };

  // Remove bulk schedule slot
  const removeBulkScheduleSlot = (slotId: string) => {
    setBulkScheduleTemplate(bulkScheduleTemplate.filter(slot => slot.id !== slotId));
  };

  // Update bulk schedule slot
  const updateBulkScheduleSlot = (slotId: string, updates: Partial<ScheduleSlot>) => {
    setBulkScheduleTemplate(bulkScheduleTemplate.map(slot => 
      slot.id === slotId ? { ...slot, ...updates } : slot
    ));
  };

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  if (loading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bulk Class Assignment</h2>
          <p className="text-gray-600 mt-1">Create multiple class assignments efficiently</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={validateAllAssignments}
            variant="outline"
            disabled={assignments.length === 0}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Validate All
          </Button>
          <Button
            onClick={handleBulkSubmit}
            disabled={loading || assignments.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create All Assignments
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assignments">Individual Assignments</TabsTrigger>
          <TabsTrigger value="bulk-schedule">Bulk Schedule Template</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold">Class Assignments</h3>
              <Badge variant="secondary">
                {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <Button onClick={addAssignmentRow} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Assignment
            </Button>
          </div>

          {assignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assignments Yet</h3>
                <p className="text-gray-600 text-center mb-4">
                  Start by adding your first class assignment
                </p>
                <Button onClick={addAssignmentRow}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Assignment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment, index) => (
                <Card key={assignment.id} className="relative">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CardTitle className="text-lg">Assignment #{index + 1}</CardTitle>
                        <Badge 
                          variant={assignment.status === 'valid' ? 'default' : assignment.status === 'invalid' ? 'destructive' : 'secondary'}
                        >
                          {assignment.status === 'valid' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {assignment.status === 'invalid' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {assignment.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                        </Badge>
                      </div>
                      <Button
                        onClick={() => removeAssignmentRow(assignment.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {assignment.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="list-disc list-inside space-y-1">
                            {assignment.errors.map((error, errorIndex) => (
                              <li key={errorIndex}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teacher
                        </label>
                        <Select
                          value={assignment.teacherId}
                          onValueChange={(value) => updateAssignmentRow(assignment.id, { teacherId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id?.toString() || ''}>
                                {teacher.firstName} {teacher.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Class
                        </label>
                        <Select
                          value={assignment.classId}
                          onValueChange={(value) => updateAssignmentRow(assignment.id, { classId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id?.toString() || ''}>
                                {cls.name} - {typeof cls.grade_level === 'object' && cls.grade_level !== null ? (cls.grade_level as any).name : cls.grade_level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subject
                        </label>
                        <Select
                          value={assignment.subjectId}
                          onValueChange={(value) => updateAssignmentRow(assignment.id, { subjectId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((subject) => (
                              <SelectItem key={subject.id} value={subject.id?.toString() || ''}>
                                {subject.name} ({subject.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Date
                        </label>
                        <DatePicker
                          date={assignment.startDate}
                          setDate={(date) => updateAssignmentRow(assignment.id, { startDate: date })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Date
                        </label>
                        <DatePicker
                          date={assignment.endDate}
                          setDate={(date) => updateAssignmentRow(assignment.id, { endDate: date })}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Schedule Slots
                        </label>
                        <Button
                          onClick={() => addScheduleSlot(assignment.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Slot
                        </Button>
                      </div>
                      {assignment.scheduleSlots.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                          No schedule slots added yet
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {assignment.scheduleSlots.map((slot) => (
                            <div key={slot.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded-lg">
                              <Select
                                value={slot.dayOfWeek}
                                onValueChange={(value) => updateScheduleSlot(assignment.id, slot.id, { dayOfWeek: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Day" />
                                </SelectTrigger>
                                <SelectContent>
                                  {daysOfWeek.map((day) => (
                                    <SelectItem key={day} value={day}>
                                      {day}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => updateScheduleSlot(assignment.id, slot.id, { startTime: e.target.value })}
                                placeholder="Start time"
                              />
                              <Input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => updateScheduleSlot(assignment.id, slot.id, { endTime: e.target.value })}
                                placeholder="End time"
                              />
                              <Input
                                value={slot.room}
                                onChange={(e) => updateScheduleSlot(assignment.id, slot.id, { room: e.target.value })}
                                placeholder="Room"
                              />
                              <Button
                                onClick={() => removeScheduleSlot(assignment.id, slot.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bulk-schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Bulk Schedule Template
              </CardTitle>
              <CardDescription>
                Create a schedule template that can be applied to all assignments at once.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h4 className="font-medium">Schedule Slots</h4>
                  <Badge variant="secondary">
                    {bulkScheduleTemplate.length} slot{bulkScheduleTemplate.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Button onClick={addBulkScheduleSlot} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Slot
                  </Button>
                  <Button
                    onClick={applyBulkSchedule}
                    disabled={bulkScheduleTemplate.length === 0 || assignments.length === 0}
                    size="sm"
                  >
                    Apply to All
                  </Button>
                </div>
              </div>

              {bulkScheduleTemplate.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="mb-4">No schedule slots in template</p>
                  <Button onClick={addBulkScheduleSlot} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Slot
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {bulkScheduleTemplate.map((slot) => (
                    <div key={slot.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded-lg">
                      <Select
                        value={slot.dayOfWeek}
                        onValueChange={(value) => updateBulkScheduleSlot(slot.id, { dayOfWeek: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {daysOfWeek.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateBulkScheduleSlot(slot.id, { startTime: e.target.value })}
                        placeholder="Start time"
                      />
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateBulkScheduleSlot(slot.id, { endTime: e.target.value })}
                        placeholder="End time"
                      />
                      <Input
                        value={slot.room}
                        onChange={(e) => updateBulkScheduleSlot(slot.id, { room: e.target.value })}
                        placeholder="Room"
                      />
                      <Button
                        onClick={() => removeBulkScheduleSlot(slot.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BulkClassAssignment;