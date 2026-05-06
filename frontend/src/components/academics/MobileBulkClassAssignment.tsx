import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useMobileKeyboard } from '@/hooks/useMobileKeyboard';
import { TouchFriendlyButton } from '@/components/common/TouchFriendlyButton';
import MobileOptimizedInput from '@/components/common/MobileOptimizedInput';
import MobileOptimizedSelect from '@/components/common/MobileOptimizedSelect';
import { ResponsiveForm, FormSection, FormRow, FormField } from '@/components/common/ResponsiveForm';
import { 
  Users, BookOpen, Calendar, Clock, MapPin, UserCheck, 
  AlertCircle, CheckCircle, X, Plus, Trash2, ChevronDown, 
  ChevronUp, Menu, Grid, List, Filter, Search 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import teacherService, { Teacher } from '@/services/teacherService';
import { classService } from '@/services/classService';
import { subjectService } from '@/services/subjectService';
import { cn } from '@/lib/utils';

interface MobileBulkClassAssignmentProps {
  onClose?: () => void;
}

interface AssignmentRow {
  id: string;
  teacherId: number;
  teacherName: string;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  startDate: Date;
  endDate?: Date;
  schedule: {
    day: string;
    startTime: string;
    endTime: string;
    room?: string;
  }[];
  status: 'pending' | 'valid' | 'invalid' | 'processing' | 'completed' | 'failed';
  errors: string[];
}

interface ScheduleSlot {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string;
  endTime: string;
  room?: string;
}

export const MobileBulkClassAssignment: React.FC<MobileBulkClassAssignmentProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('individual');
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());
  const [bulkSchedule, setBulkSchedule] = useState<ScheduleSlot[]>([]);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [expandedAssignments, setExpandedAssignments] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const isSmallMobile = useMediaQuery('(max-width: 480px)');
  
  const { toast } = useToast();
  const bulkOps = useBulkOperations();
  const { isVisible: keyboardVisible, scrollToInput } = useMobileKeyboard();

  // Fetch data
  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teacherService.getTeachers()
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses()
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectService.getSubjects()
  });

  // Mobile-optimized day options
  const dayOptions = [
    { value: 'monday', label: isMobile ? 'Mon' : 'Monday' },
    { value: 'tuesday', label: isMobile ? 'Tue' : 'Tuesday' },
    { value: 'wednesday', label: isMobile ? 'Wed' : 'Wednesday' },
    { value: 'thursday', label: isMobile ? 'Thu' : 'Thursday' },
    { value: 'friday', label: isMobile ? 'Fri' : 'Friday' },
    { value: 'saturday', label: isMobile ? 'Sat' : 'Saturday' },
    { value: 'sunday', label: isMobile ? 'Sun' : 'Sunday' }
  ];

  // Add new assignment row
  const addAssignmentRow = useCallback(() => {
    const newAssignment: AssignmentRow = {
      id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      teacherId: 0,
      teacherName: '',
      classId: 0,
      className: '',
      subjectId: 0,
      subjectName: '',
      startDate: new Date(),
      schedule: [],
      status: 'pending',
      errors: []
    };
    setAssignments(prev => [...prev, newAssignment]);
    
    // Auto-expand on mobile
    if (isMobile) {
      setExpandedAssignments(prev => new Set([...prev, newAssignment.id]));
    }
  }, [isMobile]);

  // Toggle assignment expansion
  const toggleAssignmentExpansion = useCallback((assignmentId: string) => {
    setExpandedAssignments(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(assignmentId)) {
        newExpanded.delete(assignmentId);
      } else {
        newExpanded.add(assignmentId);
      }
      return newExpanded;
    });
  }, []);

  // Mobile-optimized assignment card
  const renderMobileAssignmentCard = (assignment: AssignmentRow, index: number) => {
    const isExpanded = expandedAssignments.has(assignment.id);
    
    return (
      <Card key={assignment.id} className={cn(
        'transition-all duration-200',
        assignment.status === 'invalid' && 'border-red-200 bg-red-50/50',
        assignment.status === 'valid' && 'border-green-200 bg-green-50/50'
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Checkbox 
                checked={selectedAssignments.has(assignment.id)}
                onCheckedChange={(checked) => {
                  const newSelected = new Set(selectedAssignments);
                  if (checked) {
                    newSelected.add(assignment.id);
                  } else {
                    newSelected.delete(assignment.id);
                  }
                  setSelectedAssignments(newSelected);
                }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Assignment {index + 1}</span>
                  <Badge 
                    variant={
                      assignment.status === 'valid' ? 'default' :
                      assignment.status === 'invalid' ? 'destructive' :
                      assignment.status === 'completed' ? 'default' :
                      assignment.status === 'processing' ? 'secondary' :
                      'outline'
                    }
                    className="text-xs"
                  >
                    {assignment.status}
                  </Badge>
                </div>
                {assignment.teacherName && assignment.className && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {assignment.teacherName} • {assignment.className}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <TouchFriendlyButton
                variant="ghost"
                size="sm"
                onClick={() => toggleAssignmentExpansion(assignment.id)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </TouchFriendlyButton>
              <TouchFriendlyButton
                variant="ghost"
                size="sm"
                onClick={() => removeAssignmentRow(assignment.id)}
                className="h-8 w-8 p-0 text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </TouchFriendlyButton>
            </div>
          </div>
          
          {assignment.errors.length > 0 && (
            <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              {assignment.errors.join(', ')}
            </div>
          )}
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="pt-0 space-y-4">
            {/* Teacher Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Teacher</Label>
              <MobileOptimizedSelect
                value={assignment.teacherId.toString()}
                onChange={(value) => updateAssignment(assignment.id, 'teacherId', parseInt(value))}
                placeholder="Select teacher"
                options={teachers?.map(teacher => ({
                  value: teacher.id.toString(),
                  label: `${teacher.first_name} ${teacher.last_name}`
                })) || []}
              />
            </div>
            
            {/* Class Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Class</Label>
              <MobileOptimizedSelect
                value={assignment.classId.toString()}
                onChange={(value) => updateAssignment(assignment.id, 'classId', parseInt(value))}
                placeholder="Select class"
                options={classes?.map(cls => ({
                  value: cls.id.toString(),
                  label: cls.name
                })) || []}
              />
            </div>
            
            {/* Subject Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Subject</Label>
              <MobileOptimizedSelect
                value={assignment.subjectId.toString()}
                onChange={(value) => updateAssignment(assignment.id, 'subjectId', parseInt(value))}
                placeholder="Select subject"
                options={subjects?.map(subject => ({
                  value: subject.id.toString(),
                  label: `${subject.name} (${subject.code})`
                })) || []}
              />
            </div>
            
            {/* Date Range */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Start Date</Label>
                <DatePicker
                  date={assignment.startDate}
                  onDateChange={(date) => updateAssignment(assignment.id, 'startDate', date)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">End Date (Optional)</Label>
                <DatePicker
                  date={assignment.endDate}
                  onDateChange={(date) => updateAssignment(assignment.id, 'endDate', date)}
                />
              </div>
            </div>
            
            {/* Schedule Slots */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Schedule</Label>
                <TouchFriendlyButton
                  variant="outline"
                  size="sm"
                  onClick={() => addScheduleSlot(assignment.id)}
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </TouchFriendlyButton>
              </div>
              
              <div className="space-y-2">
                {assignment.schedule.map((slot, slotIndex) => (
                  <div key={slotIndex} className="p-3 border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Slot {slotIndex + 1}</span>
                      <TouchFriendlyButton
                        variant="ghost"
                        size="sm"
                        onClick={() => removeScheduleSlot(assignment.id, slotIndex)}
                        className="h-6 w-6 p-0 text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </TouchFriendlyButton>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <MobileOptimizedSelect
                        value={slot.day}
                        onChange={(value) => updateScheduleSlot(assignment.id, slotIndex, 'day', value)}
                        placeholder="Select day"
                        options={dayOptions}
                      />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <MobileOptimizedInput
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateScheduleSlot(assignment.id, slotIndex, 'startTime', e.target.value)}
                          label="Start"
                          size="sm"
                        />
                        <MobileOptimizedInput
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateScheduleSlot(assignment.id, slotIndex, 'endTime', e.target.value)}
                          label="End"
                          size="sm"
                        />
                      </div>
                      
                      <MobileOptimizedInput
                        value={slot.room || ''}
                        onChange={(e) => updateScheduleSlot(assignment.id, slotIndex, 'room', e.target.value)}
                        placeholder="Room (optional)"
                        label="Room"
                        size="sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className={cn(
      'h-full flex flex-col',
      keyboardVisible && isMobile && 'pb-0'
    )}>
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TouchFriendlyButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </TouchFriendlyButton>
            <div>
              <h2 className={cn(
                'font-semibold',
                isSmallMobile ? 'text-lg' : 'text-xl'
              )}>
                Bulk Class Assignment
              </h2>
              {!isSmallMobile && (
                <p className="text-sm text-muted-foreground">
                  Assign teachers to classes and subjects
                </p>
              )}
            </div>
          </div>
          
          {!isMobile && (
            <div className="flex items-center gap-2">
              <TouchFriendlyButton
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              >
                {viewMode === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </TouchFriendlyButton>
              <TouchFriendlyButton
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </TouchFriendlyButton>
            </div>
          )}
        </div>
        
        {/* Mobile Search */}
        {isMobile && (
          <div className="mb-4">
            <MobileOptimizedInput
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              clearable
              onClear={() => setSearchQuery('')}
            />
          </div>
        )}
      </div>

      {/* Mobile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className={cn(
          'mx-4 mb-4',
          isMobile ? 'grid grid-cols-2 h-12' : 'justify-start h-10'
        )}>
          <TabsTrigger value="individual" className={cn(
            'flex items-center gap-2',
            isMobile && 'text-sm'
          )}>
            <BookOpen className="h-4 w-4" />
            {isSmallMobile ? 'Individual' : 'Individual Assignments'}
          </TabsTrigger>
          <TabsTrigger value="bulk" className={cn(
            'flex items-center gap-2',
            isMobile && 'text-sm'
          )}>
            <Users className="h-4 w-4" />
            {isSmallMobile ? 'Bulk' : 'Bulk Schedule'}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 px-4 pb-4 overflow-auto">
          <TabsContent value="individual" className="mt-0 space-y-4">
            {/* Validation Results */}
            {validationResults && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Validation Results</span>
                    <Badge variant={validationResults.readyToSubmit ? "default" : "destructive"}>
                      {validationResults.readyToSubmit ? "Ready" : "Errors"}
                    </Badge>
                  </div>
                  <div className={cn(
                    'grid gap-2 text-sm',
                    isMobile ? 'grid-cols-3' : 'grid-cols-3'
                  )}>
                    <div>Total: {validationResults.total}</div>
                    <div className="text-green-600">Valid: {validationResults.valid}</div>
                    <div className="text-red-600">Invalid: {validationResults.invalid}</div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Action Buttons */}
            <div className={cn(
              'flex gap-2',
              isMobile ? 'flex-col' : 'flex-row justify-between'
            )}>
              <div className={cn(
                'flex gap-2',
                isMobile && 'flex-1'
              )}>
                <TouchFriendlyButton
                  variant="outline"
                  onClick={validateAllAssignments}
                  className={isMobile ? 'flex-1' : ''}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isMobile ? 'Validate' : 'Validate All'}
                </TouchFriendlyButton>
                <TouchFriendlyButton
                  onClick={addAssignmentRow}
                  className={isMobile ? 'flex-1' : ''}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isMobile ? 'Add' : 'Add Assignment'}
                </TouchFriendlyButton>
              </div>
              
              {selectedAssignments.size > 0 && (
                <TouchFriendlyButton
                  onClick={handleBulkSubmit}
                  disabled={!validationResults?.readyToSubmit}
                  className={isMobile ? 'w-full' : ''}
                >
                  Submit {selectedAssignments.size} Assignment{selectedAssignments.size > 1 ? 's' : ''}
                </TouchFriendlyButton>
              )}
            </div>
            
            {/* Assignments List */}
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No assignments yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first class assignment to get started
                    </p>
                    <TouchFriendlyButton onClick={addAssignmentRow}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Assignment
                    </TouchFriendlyButton>
                  </CardContent>
                </Card>
              ) : (
                assignments.map((assignment, index) => 
                  isMobile 
                    ? renderMobileAssignmentCard(assignment, index)
                    : renderDesktopAssignmentRow(assignment, index)
                )
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="bulk" className="mt-0">
            {/* Bulk Schedule Template */}
            <Card>
              <CardHeader>
                <CardTitle className={isMobile ? 'text-lg' : 'text-xl'}>
                  Bulk Schedule Template
                </CardTitle>
                <CardDescription>
                  Create a schedule template to apply to selected assignments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bulk schedule implementation */}
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p>Bulk schedule template coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
      
      {/* Mobile Bottom Actions */}
      {isMobile && assignments.length > 0 && (
        <div className="sticky bottom-0 bg-background border-t p-4">
          <div className="flex gap-2">
            <TouchFriendlyButton
              variant="outline"
              onClick={() => setSelectedAssignments(new Set(assignments.map(a => a.id)))}
              className="flex-1"
            >
              Select All
            </TouchFriendlyButton>
            <TouchFriendlyButton
              onClick={handleBulkSubmit}
              disabled={selectedAssignments.size === 0 || !validationResults?.readyToSubmit}
              className="flex-2"
            >
              Submit ({selectedAssignments.size})
            </TouchFriendlyButton>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions (updateAssignment, validateAllAssignments, etc. would be implemented here)
const updateAssignment = (assignmentId: string, field: string, value: any) => {
  // Implementation here
};

const validateAllAssignments = () => {
  // Implementation here
};

const handleBulkSubmit = () => {
  // Implementation here
};

const removeAssignmentRow = (assignmentId: string) => {
  // Implementation here
};

const addScheduleSlot = (assignmentId: string) => {
  // Implementation here
};

const updateScheduleSlot = (assignmentId: string, slotIndex: number, field: string, value: any) => {
  // Implementation here
};

const removeScheduleSlot = (assignmentId: string, slotIndex: number) => {
  // Implementation here
};

const renderDesktopAssignmentRow = (assignment: AssignmentRow, index: number) => {
  // Desktop version implementation
  return null;
};