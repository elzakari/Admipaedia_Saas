import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../src/components/ui/card';
import { SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useMobileKeyboard } from '@/hooks/useMobileKeyboard';
import { TouchFriendlyButton } from '@/components/common/TouchFriendlyButton';
import MobileOptimizedInput from '@/components/common/MobileOptimizedInput';
import MobileOptimizedSelect from '@/components/common/MobileOptimizedSelect';
import { ResponsiveForm, FormSection, FormRow, FormField } from '@/components/common/ResponsiveForm';
import {
  Users, BookOpen, Calendar, Copy, Archive, Download, Trash2, CheckCircle, AlertCircle,
  X, Plus, Grid, List, Filter, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { examService, classService, subjectService } from '@/services';
// Add the correct import for Class and Subject interfaces
import { Class } from '../../services/academicService';
import { Subject } from '../../services/subjectService';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/errorHandling';
import { toast } from 'sonner';

interface ExamSchedule {
  id?: number;
  title: string;
  description?: string;
  exam_type: 'midterm' | 'final' | 'quiz' | 'assignment' | 'project';
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  total_marks: number;
  venue?: string;
  instructions?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  academic_year: string;
  term: string;
  validation_errors?: string[];
}

interface BulkExamOperationsProps {
  selectedExams?: number[];
  onClose?: () => void;
}

export const MobileBulkExamOperations: React.FC<BulkExamOperationsProps> = ({ 
  selectedExams = [], 
  onClose 
}): JSX.Element => {
  const { toast: toastFn } = useToast();
  const bulkOps = useBulkOperations();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const { isVisible: isKeyboardVisible, height: keyboardHeight, scrollToInput } = useMobileKeyboard();
  
  const [activeTab, setActiveTab] = useState('schedule');
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [selectedSchedules, setSelectedSchedules] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [validationResults, setValidationResults] = useState<any>(null);

  // Fetch data
  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses()
  });

  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectService.getSubjects()
  });

  // Handle both possible response structures with correct typing
  const classes: Class[] = Array.isArray(classesData) ? classesData : classesData?.classes || [];
  const subjects: Subject[] = Array.isArray(subjectsData) ? subjectsData : subjectsData?.subjects || [];

  // Update the existingExams query to handle the correct response structure
  const { data: existingExams } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const response = await examService.getExams();
      return response.exams || response; // Handle both response structures
    }
  });

  // Add new exam schedule
  const addExamSchedule = useCallback(() => {
    const newSchedule: ExamSchedule = {
      title: '',
      description: '',
      exam_type: 'midterm',
      class_id: 0,
      class_name: '',
      subject_id: 0,
      subject_name: '',
      exam_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '11:00',
      duration_minutes: 120,
      total_marks: 100,
      venue: '',
      instructions: '',
      status: 'scheduled',
      academic_year: new Date().getFullYear().toString(),
      term: '1'
    };
    setExamSchedules(prev => [...prev, newSchedule]);
  }, []);

  // Update exam schedule
  const updateExamSchedule = useCallback((index: number, field: keyof ExamSchedule, value: any) => {
    setExamSchedules(prev => prev.map((schedule, i) => {
      if (i === index) {
        const updated = { ...schedule, [field]: value };
        
        // Auto-populate names when IDs are selected
        if (field === 'class_id' && classes) {
          const classItem = classes.find((c: Class) => c.id === value);
          updated.class_name = classItem?.name || '';
        }
        if (field === 'subject_id' && subjects) {
          const subject = subjects.find((s: Subject) => s.id === value);
          updated.subject_name = subject?.name || '';
        }
        
        // Auto-calculate duration when times change
        if (field === 'start_time' || field === 'end_time') {
          const start = new Date(`2000-01-01T${updated.start_time}:00`);
          const end = new Date(`2000-01-01T${updated.end_time}:00`);
          if (end > start) {
            updated.duration_minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
          }
        }
        
        return updated;
      }
      return schedule;
    }));
  }, [classes, subjects]);

  // Remove exam schedule
  const removeExamSchedule = useCallback((index: number) => {
    setExamSchedules(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Duplicate exam schedule
  const duplicateExamSchedule = useCallback((index: number) => {
    const schedule = examSchedules[index];
    const duplicated = { ...schedule, id: undefined, title: `${schedule.title} (Copy)` };
    setExamSchedules(prev => [...prev, duplicated]);
  }, [examSchedules]);

  // Validate exam schedules
  const validateExamSchedules = useCallback(() => {
    const errors: string[] = [];
    const validSchedules: ExamSchedule[] = [];
    
    const updatedSchedules = examSchedules.map((schedule, index) => {
      const scheduleErrors: string[] = [];
      
      if (!schedule.title.trim()) scheduleErrors.push('Title is required');
      if (!schedule.class_id) scheduleErrors.push('Class is required');
      if (!schedule.subject_id) scheduleErrors.push('Subject is required');
      if (!schedule.exam_date) scheduleErrors.push('Exam date is required');
      if (!schedule.start_time) scheduleErrors.push('Start time is required');
      if (!schedule.end_time) scheduleErrors.push('End time is required');
      if (schedule.total_marks <= 0) scheduleErrors.push('Total marks must be greater than 0');
      
      // Check for time conflicts
      const examDateTime = new Date(`${schedule.exam_date}T${schedule.start_time}`);
      const conflicts = existingExams?.filter((exam: any) => {
        const existingDateTime = new Date(`${exam.exam_date}T${exam.start_time}`);
        return exam.class_id === schedule.class_id && 
               Math.abs(existingDateTime.getTime() - examDateTime.getTime()) < 2 * 60 * 60 * 1000; // 2 hours
      }) || [];
      
      if (conflicts.length > 0) {
        scheduleErrors.push('Time conflict with existing exam');
      }
      
      const updatedSchedule = {
        ...schedule,
        validation_errors: scheduleErrors
      };
      
      if (scheduleErrors.length === 0) {
        validSchedules.push(updatedSchedule);
      } else {
        errors.push(...scheduleErrors.map(error => `Row ${index + 1}: ${error}`));
      }
      
      return updatedSchedule;
    });
    
    setExamSchedules(updatedSchedules);
    
    const results = {
      total: examSchedules.length,
      valid: validSchedules.length,
      invalid: examSchedules.length - validSchedules.length,
      errors,
      readyToSubmit: validSchedules.length > 0 && errors.length === 0
    };
    
    setValidationResults(results);
    
    toastFn({
      title: "Validation Complete",
      description: `${results.valid} valid, ${results.invalid} invalid schedules`,
      variant: results.invalid > 0 ? "destructive" : "default",
      id: ''
    });
    
    return results;
  }, [examSchedules, existingExams, toastFn]);

  // Handle bulk submission
  const handleBulkSubmit = useCallback(async () => {
    if (!validationResults?.readyToSubmit) {
      toastFn({
        title: "Cannot Submit",
        description: "Please validate schedules before submitting",
        variant: "destructive",
        id: ''
      });
      return;
    }
    
    const validSchedules = examSchedules.filter(schedule => !schedule.validation_errors?.length);
    
    try {
      const operationId = await bulkOps.startOperation('create', validSchedules, {
        batchSize: 10,
        onProgress: (operation) => {
          const processedIds = new Set(operation.data.slice(0, operation.processed).map((_: any, index: any) => index));
          setExamSchedules(prev => prev.map((schedule, index) => 
            processedIds.has(index) 
              ? { ...schedule, status: 'completed' as const }
              : schedule
          ));
        },
        onComplete: () => {
          toastFn({
            title: "Exams Scheduled Successfully",
            description: `${validSchedules.length} exam schedules have been created`,
            id: ''
          });
          if (onClose) onClose();
        },
        onError: (operation, error) => {
          toastFn({
            title: "Submission Failed",
            description: getErrorMessage(error),
            variant: "destructive",
            id: ''
          });
        }
      });
    } catch (error: any) {
      toastFn({
        title: "Submission Failed",
        description: getErrorMessage(error),
        variant: "destructive",
        id: ''
      });
    }
  }, [validationResults, examSchedules, bulkOps, toastFn, onClose]);

  // Toggle card expansion
  const toggleCardExpansion = useCallback((index: number) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Filter schedules based on search
  const filteredSchedules = useMemo(() => {
    if (!searchTerm) return examSchedules;
    return examSchedules.filter((schedule) => 
      schedule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [examSchedules, searchTerm]);

  const currentOperation = bulkOps.operations.find((op: { status: string; }) => op.status === 'processing');

  return (
    <div className={cn(
      "space-y-4 p-4",
      isMobile && "px-2"
    )}>
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white border-b pb-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h2 className={cn(
              "font-bold text-gray-900",
              isMobile ? "text-lg" : "text-2xl"
            )}>Bulk Exam Operations</h2>
            <p className={cn(
              "text-gray-600",
              isMobile ? "text-sm" : "text-base"
            )}>Schedule multiple exams efficiently</p>
          </div>
          {onClose && (
            <TouchFriendlyButton variant="outline" onClick={onClose} size={isMobile ? "sm" : "md"}>
              <X className="h-4 w-4" />
            </TouchFriendlyButton>
          )}
        </div>

        {/* Mobile Search and Filters */}
        {isMobile && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <MobileOptimizedInput
                  placeholder="Search exams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search className="h-4 w-4" />}
                  clearable
                />
              </div>
              <TouchFriendlyButton
                variant="outline"
                size="sm"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter className="h-4 w-4" />
              </TouchFriendlyButton>
              <TouchFriendlyButton
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </TouchFriendlyButton>
            </div>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {currentOperation && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Processing Exams...</span>
              <span className="text-sm text-gray-600">
                {currentOperation.processed}/{currentOperation.total}
              </span>
            </div>
            <Progress 
              value={(currentOperation.processed / currentOperation.total) * 100} 
              className="h-2"
            />
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationResults && (
        <Card className={cn(
          "border-2",
          validationResults.invalid > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {validationResults.invalid > 0 ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <span className="font-medium">
                  {validationResults.valid} valid, {validationResults.invalid} invalid
                </span>
              </div>
              <Badge variant={validationResults.readyToSubmit ? "default" : "destructive"}>
                {validationResults.readyToSubmit ? "Ready" : "Needs Fix"}
              </Badge>
            </div>
            {validationResults.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {validationResults.errors.slice(0, 3).map((error: string, index: number) => (
                  <p key={index} className="text-sm text-red-600">• {error}</p>
                ))}
                {validationResults.errors.length > 3 && (
                  <p className="text-sm text-red-600">... and {validationResults.errors.length - 3} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={cn(
          "grid w-full",
          isMobile ? "grid-cols-2 h-12" : "grid-cols-3 h-10"
        )}>
          <TabsTrigger value="schedule" className={isMobile ? "text-sm" : ""}>
            <Calendar className="h-4 w-4 mr-2" />
            {isMobile ? "Schedule" : "Individual Schedule"}
          </TabsTrigger>
          <TabsTrigger value="bulk" className={isMobile ? "text-sm" : ""}>
            <BookOpen className="h-4 w-4 mr-2" />
            {isMobile ? "Bulk" : "Bulk Template"}
          </TabsTrigger>
          {!isMobile && (
            <TabsTrigger value="manage">
              <Users className="h-4 w-4 mr-2" />
              Manage
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          {/* Add Schedule Button */}
          <div className="flex justify-between items-center">
            <TouchFriendlyButton onClick={addExamSchedule} size={isMobile ? "sm" : "md"}>
              <Plus className="h-4 w-4 mr-2" />
              Add Exam Schedule
            </TouchFriendlyButton>
            {examSchedules.length > 0 && (
              <div className="flex gap-2">
                <TouchFriendlyButton 
                  variant="outline" 
                  onClick={validateExamSchedules}
                  size={isMobile ? "sm" : "md"}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Validate
                </TouchFriendlyButton>
                {validationResults?.readyToSubmit && (
                  <TouchFriendlyButton 
                    onClick={handleBulkSubmit}
                    disabled={bulkOps.isProcessing}
                    size={isMobile ? "sm" : "md"}
                  >
                    Submit All
                  </TouchFriendlyButton>
                )}
              </div>
            )}
          </div>

          {/* Exam Schedules */}
          <div className={cn(
            "space-y-4",
            viewMode === 'grid' && !isMobile && "grid grid-cols-2 gap-4 space-y-0"
          )}>
            {filteredSchedules.map((schedule, index) => {
              const isExpanded = expandedCards.has(index);
              const hasErrors = schedule.validation_errors && schedule.validation_errors.length > 0;
              
              return (
                <Card key={index} className={cn(
                  "transition-all duration-200",
                  hasErrors && "border-red-200 bg-red-50",
                  isMobile && "shadow-sm"
                )}>
                  <CardHeader className={cn(
                    "pb-3",
                    isMobile && "p-4"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className={cn(
                          "flex items-center gap-2",
                          isMobile ? "text-base" : "text-lg"
                        )}>
                          <Calendar className="h-4 w-4" />
                          Exam Schedule {index + 1}
                          {hasErrors && <AlertCircle className="h-4 w-4 text-red-500" />}
                        </CardTitle>
                        {schedule.title && (
                          <p className="text-sm text-gray-600 mt-1">{schedule.title}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isMobile && (
                          <TouchFriendlyButton
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCardExpansion(index)}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </TouchFriendlyButton>
                        )}
                        <TouchFriendlyButton
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateExamSchedule(index)}
                        >
                          <Copy className="h-4 w-4" />
                        </TouchFriendlyButton>
                        <TouchFriendlyButton
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExamSchedule(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </TouchFriendlyButton>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className={cn(
                    isMobile && !isExpanded && "hidden",
                    isMobile && "p-4 pt-0"
                  )}>
                    <ResponsiveForm>
                      <FormSection title="Basic Information">
                        <FormRow>
                          <FormField label="Exam Title" required>
                            <MobileOptimizedInput
                              placeholder="Enter exam title"
                              value={schedule.title}
                              onChange={(e) => updateExamSchedule(index, 'title', e.target.value)}
                              error={hasErrors && schedule.validation_errors?.includes('Title is required') ? 'Title is required' : undefined}
                            />
                          </FormField>
                        </FormRow>
                      </FormSection>
                      
                      <FormSection title="Additional Details">
                        <FormRow>
                          <FormField label="Total Marks" required>
                            <MobileOptimizedInput
                              type="number"
                              placeholder="100"
                              value={schedule.total_marks.toString()}
                              onChange={(e) => updateExamSchedule(index, 'total_marks', parseInt(e.target.value) || 0)}
                              error={hasErrors && schedule.validation_errors?.includes('Total marks must be greater than 0') ? 'Total marks must be greater than 0' : undefined}
                            />
                          </FormField>
                          <FormField label="Venue">
                            <MobileOptimizedInput
                              placeholder="Exam hall, classroom, etc."
                              value={schedule.venue || ''}
                              onChange={(e) => updateExamSchedule(index, 'venue', e.target.value)}
                            />
                          </FormField>
                        </FormRow>
                        
                        <FormField label="Instructions">
                          <Textarea
                            placeholder="Special instructions for the exam..."
                            value={schedule.instructions || ''}
                            onChange={(e) => updateExamSchedule(index, 'instructions', e.target.value)}
                            className={cn(
                              "min-h-[80px] resize-none",
                              isMobile && "text-base" // Prevent zoom on iOS
                            )}
                          />
                        </FormField>
                      </FormSection>
                    </ResponsiveForm>
                    
                    {/* Validation Errors */}
                    {hasErrors && (
                      <Alert className="mt-4 border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            {schedule.validation_errors?.map((error, errorIndex) => (
                              <p key={errorIndex} className="text-sm">• {error}</p>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {examSchedules.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Exam Schedules</h3>
                <p className="text-gray-600 text-center mb-4">
                  Create your first exam schedule to get started with bulk operations.
                </p>
                <TouchFriendlyButton onClick={addExamSchedule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Schedule
                </TouchFriendlyButton>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Bulk Template Operations
              </CardTitle>
              <CardDescription>
                Use templates to quickly create multiple similar exams
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Exam Templates</h3>
                <p className="text-gray-600 mb-4">
                  Save and reuse exam scheduling templates for similar exams.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <TouchFriendlyButton variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Import Template
                  </TouchFriendlyButton>
                  <TouchFriendlyButton>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </TouchFriendlyButton>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {!isMobile && (
          <TabsContent value="manage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Manage Existing Exams
                </CardTitle>
                <CardDescription>
                  Bulk operations on existing exam schedules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Bulk Management</h3>
                  <p className="text-gray-600 mb-4">
                    Select and manage multiple existing exams at once.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <TouchFriendlyButton variant="outline">
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Selected
                    </TouchFriendlyButton>
                    <TouchFriendlyButton variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Selected
                    </TouchFriendlyButton>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      {/* Mobile Bottom Action Bar */}
      {isMobile && examSchedules.length > 0 && (
        <div className={cn(
          "fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-2",
          isKeyboardVisible && "hidden"
        )}>
          <TouchFriendlyButton 
            variant="outline" 
            onClick={validateExamSchedules}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Validate
          </TouchFriendlyButton>
          {validationResults?.readyToSubmit && (
            <TouchFriendlyButton 
              onClick={handleBulkSubmit}
              disabled={bulkOps.isProcessing}
              className="flex-1"
            >
              Submit All
            </TouchFriendlyButton>
          )}
        </div>
      )}
      
      {/* Bulk Operations Status */}
      {bulkOps.operations.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Bulk Operations Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bulkOps.operations.map((operation) => (
                <div key={operation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{operation.type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {operation.processed}/{operation.total}
                    </span>
                    <Badge variant={operation.status === 'completed' ? 'default' : 'secondary'}>
                      {operation.status}
                    </Badge>
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

export default MobileBulkExamOperations;