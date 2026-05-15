import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useToast } from '../ui/use-toast';
import { 
  BookOpen, 
  Calculator, 
  Calendar, 
  Clock, 
  Award, 
  Save,
  RefreshCw,
  Edit,
  CheckCircle
} from 'lucide-react';
import { settingsService } from '../../services';
import SubjectsManagement from './subjects/SubjectsManagement';

interface AcademicConfiguration {
  // Academic Year
  academicYear: string;
  currentTerm: string;
  termStartDate: string;
  termEndDate: string;
  
  // Grading System
  gradingSystem: string;
  passingGrade: number;
  maxGrade: number;
  gradeScale: GradeRange[];
  
  // Assessment
  assessmentTypes: AssessmentType[];
  assessmentWeights: AssessmentWeights;
  
  // Class Management
  maxStudentsPerClass: number;
  minStudentsPerClass: number;
  classDuration: number;
  breakDuration: number;
  
  // Subjects
  coreSubjects: string[];
  electiveSubjects: string[];
  
  // Attendance
  attendanceRequired: boolean;
  minimumAttendance: number;
  
  // Features
  onlineExamsEnabled: boolean;
  gradeModeration: boolean;
  parentPortalGrades: boolean;
  transcriptGeneration: boolean;
}

interface GradeRange {
  id: string;
  minScore: number;
  maxScore: number;
  grade: string;
  description: string;
  gradePoint: number;
}

interface AssessmentType {
  id: string;
  name: string;
  weight: number;
  description: string;
  isActive: boolean;
}

interface AssessmentWeights {
  exams: number;
  assignments: number;
  quizzes: number;
  projects: number;
  classParticipation: number;
  attendance: number;
}

const DEFAULT_GRADE_RANGES: GradeRange[] = [
  { id: '1', minScore: 80, maxScore: 100, grade: 'A', description: 'Excellent', gradePoint: 4.0 },
  { id: '2', minScore: 70, maxScore: 79, grade: 'B', description: 'Very Good', gradePoint: 3.5 },
  { id: '3', minScore: 60, maxScore: 69, grade: 'C', description: 'Good', gradePoint: 3.0 },
  { id: '4', minScore: 50, maxScore: 59, grade: 'D', description: 'Satisfactory', gradePoint: 2.5 },
  { id: '5', minScore: 40, maxScore: 49, grade: 'E', description: 'Pass', gradePoint: 2.0 },
  { id: '6', minScore: 0, maxScore: 39, grade: 'F', description: 'Fail', gradePoint: 0.0 }
];

const ASSESSMENT_TYPES: AssessmentType[] = [
  { id: '1', name: 'Exams', weight: 40, description: 'Major examinations', isActive: true },
  { id: '2', name: 'Assignments', weight: 20, description: 'Homework and assignments', isActive: true },
  { id: '3', name: 'Quizzes', weight: 15, description: 'Short tests and quizzes', isActive: true },
  { id: '4', name: 'Projects', weight: 15, description: 'Research and practical projects', isActive: true },
  { id: '5', name: 'Class Participation', weight: 10, description: 'Student participation in class', isActive: true }
];

const CORE_SUBJECTS = [
  'English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 
  'Information and Communication Technology', 'Religious and Moral Education'
];

const ELECTIVE_SUBJECTS = [
  'Physics', 'Chemistry', 'Biology', 'Additional Mathematics', 'Geography', 
  'History', 'Economics', 'Government', 'Christian Religious Studies', 
  'Islamic Religious Studies', 'French', 'Twi', 'Ga', 'Ewe', 'Visual Arts', 
  'Music', 'Dance', 'Literature in English', 'Technical Drawing', 'Wood Work'
];

const AcademicConfiguration = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('academic-year');
  const [editingGrade, setEditingGrade] = useState<string | null>(null);
  const [newGrade, setNewGrade] = useState<Partial<GradeRange>>({});

  const [settings, setSettings] = useState<AcademicConfiguration>({
    // Academic Year
    academicYear: '2024/2025',
    currentTerm: 'First Term',
    termStartDate: '2024-09-09',
    termEndDate: '2024-12-20',
    
    // Grading System
    gradingSystem: 'GES',
    passingGrade: 50,
    maxGrade: 100,
    gradeScale: DEFAULT_GRADE_RANGES,
    
    // Assessment
    assessmentTypes: ASSESSMENT_TYPES,
    assessmentWeights: {
      exams: 40,
      assignments: 20,
      quizzes: 15,
      projects: 15,
      classParticipation: 10,
      attendance: 0
    },
    
    // Class Management
    maxStudentsPerClass: 40,
    minStudentsPerClass: 15,
    classDuration: 60,
    breakDuration: 15,
    
    // Subjects
    coreSubjects: CORE_SUBJECTS,
    electiveSubjects: ELECTIVE_SUBJECTS,
    
    // Attendance
    attendanceRequired: true,
    minimumAttendance: 75,
    
    // Features
    onlineExamsEnabled: true,
    gradeModeration: true,
    parentPortalGrades: true,
    transcriptGeneration: true
  });

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['academic-configuration'],
    queryFn: () => settingsService.getAcademicConfiguration(),
  });

  const normalizeAcademicSettings = (raw: any): Partial<AcademicConfiguration> | null => {
    if (!raw) return null;
    const unwrapped =
      raw?.data ??
      raw?.settings ??
      raw?.academic ??
      raw?.academic_configuration ??
      raw?.configuration ??
      raw;

    if (!unwrapped || typeof unwrapped !== 'object') return null;

    const normalized: Partial<AcademicConfiguration> = { ...(unwrapped as any) };

    const gradeScale = (unwrapped as any).gradeScale ?? (unwrapped as any).grade_scale;
    if (Array.isArray(gradeScale)) normalized.gradeScale = gradeScale;

    const assessmentTypes = (unwrapped as any).assessmentTypes ?? (unwrapped as any).assessment_types;
    if (Array.isArray(assessmentTypes)) normalized.assessmentTypes = assessmentTypes;

    const assessmentWeights = (unwrapped as any).assessmentWeights ?? (unwrapped as any).assessment_weights;
    if (assessmentWeights && typeof assessmentWeights === 'object') normalized.assessmentWeights = assessmentWeights;

    const coreSubjects = (unwrapped as any).coreSubjects ?? (unwrapped as any).core_subjects;
    if (Array.isArray(coreSubjects)) normalized.coreSubjects = coreSubjects;

    const electiveSubjects = (unwrapped as any).electiveSubjects ?? (unwrapped as any).elective_subjects;
    if (Array.isArray(electiveSubjects)) normalized.electiveSubjects = electiveSubjects;

    return normalized;
  };

  React.useEffect(() => {
    const normalized = normalizeAcademicSettings(currentSettings);
    if (!normalized) return;

    setSettings((prev) => ({
      ...prev,
      ...normalized,
      gradeScale: Array.isArray(normalized.gradeScale) ? normalized.gradeScale : prev.gradeScale,
      assessmentTypes: Array.isArray(normalized.assessmentTypes) ? normalized.assessmentTypes : prev.assessmentTypes,
      assessmentWeights: normalized.assessmentWeights && typeof normalized.assessmentWeights === 'object'
        ? { ...prev.assessmentWeights, ...normalized.assessmentWeights }
        : prev.assessmentWeights,
      coreSubjects: Array.isArray(normalized.coreSubjects) ? normalized.coreSubjects : prev.coreSubjects,
      electiveSubjects: Array.isArray(normalized.electiveSubjects) ? normalized.electiveSubjects : prev.electiveSubjects
    }));
  }, [currentSettings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: AcademicConfiguration) => settingsService.updateAcademicConfiguration(updatedSettings),
    onSuccess: () => {
      toast({
        title: "Academic Configuration Updated",
        description: "Academic settings have been updated successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['academic-configuration'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update academic configuration",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    // Validate assessment weights
    const totalWeight = Object.values(settings.assessmentWeights).reduce((sum, weight) => sum + weight, 0);
    if (totalWeight !== 100) {
      toast({
        title: "Validation Error",
        description: `Assessment weights must total 100%. Current total: ${totalWeight}%`,
        variant: "destructive"
      });
      return;
    }

    updateSettingsMutation.mutate(settings);
  };

  const handleInputChange = (field: keyof AcademicConfiguration, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleAssessmentWeightChange = (type: keyof AssessmentWeights, value: number) => {
    setSettings(prev => ({
      ...prev,
      assessmentWeights: {
        ...prev.assessmentWeights,
        [type]: value
      }
    }));
  };

  const handleGradeEdit = (gradeId: string) => {
    const grade = settings.gradeScale.find(g => g.id === gradeId);
    if (grade) {
      setEditingGrade(gradeId);
      setNewGrade(grade);
    }
  };

  const handleGradeSave = () => {
    if (!newGrade.minScore || !newGrade.maxScore || !newGrade.grade) {
      toast({
        title: "Validation Error",
        description: "Please fill in all grade fields",
        variant: "destructive"
      });
      return;
    }

    setSettings(prev => ({
      ...prev,
      gradeScale: prev.gradeScale.map(g => 
        g.id === editingGrade ? { ...g, ...newGrade } as GradeRange : g
      )
    }));
    
    setEditingGrade(null);
    setNewGrade({});
    
    toast({ title: "Grade Updated", description: "Grade range has been updated successfully.", variant: "default" });
  };

  const handleGradeCancel = () => {
    setEditingGrade(null);
    setNewGrade({});
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Academic Configuration</h2>
          <p className="text-gray-500 dark:text-gray-400">Configure academic settings, grading systems, and term structures</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateSettingsMutation.isPending}
          className="flex items-center gap-2"
        >
          {updateSettingsMutation.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="academic-year" className="flex items-center gap-2 min-w-[170px]">
            <Calendar className="h-4 w-4" />
            Academic Year
          </TabsTrigger>
          <TabsTrigger value="grading" className="flex items-center gap-2 min-w-[160px]">
            <Award className="h-4 w-4" />
            Grading System
          </TabsTrigger>
          <TabsTrigger value="assessment" className="flex items-center gap-2 min-w-[140px]">
            <Calculator className="h-4 w-4" />
            Assessment
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2 min-w-[130px]">
            <BookOpen className="h-4 w-4" />
            Subjects
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 min-w-[130px]">
            <Clock className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="academic-year" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Academic Year Configuration
              </CardTitle>
              <CardDescription>
                Configure academic year and term settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academic-year">Academic Year</Label>
                  <Input
                    id="academic-year"
                    value={settings.academicYear}
                    onChange={(e) => handleInputChange('academicYear', e.target.value)}
                    placeholder="2024/2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-term">Current Term</Label>
                  <Select value={settings.currentTerm} onValueChange={(value) => handleInputChange('currentTerm', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Term">First Term</SelectItem>
                      <SelectItem value="Second Term">Second Term</SelectItem>
                      <SelectItem value="Third Term">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="term-start">Term Start Date</Label>
                  <Input
                    id="term-start"
                    type="date"
                    value={settings.termStartDate}
                    onChange={(e) => handleInputChange('termStartDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="term-end">Term End Date</Label>
                  <Input
                    id="term-end"
                    type="date"
                    value={settings.termEndDate}
                    onChange={(e) => handleInputChange('termEndDate', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grading" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Grading System
              </CardTitle>
              <CardDescription>
                Configure grading scales and passing requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grading-system">Grading System</Label>
                  <Select value={settings.gradingSystem} onValueChange={(value) => handleInputChange('gradingSystem', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GES">Ghana Education Service (GES)</SelectItem>
                      <SelectItem value="WAEC">West African Examinations Council (WAEC)</SelectItem>
                      <SelectItem value="IB">International Baccalaureate (IB)</SelectItem>
                      <SelectItem value="Cambridge">Cambridge International</SelectItem>
                      <SelectItem value="Custom">Custom Grading System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passing-grade">Passing Grade (%)</Label>
                  <Input
                    id="passing-grade"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.passingGrade}
                    onChange={(e) => handleInputChange('passingGrade', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-grade">Maximum Grade (%)</Label>
                  <Input
                    id="max-grade"
                    type="number"
                    min="50"
                    max="200"
                    value={settings.maxGrade}
                    onChange={(e) => handleInputChange('maxGrade', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">Grade Scale</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grade</TableHead>
                        <TableHead>Min Score</TableHead>
                        <TableHead>Max Score</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Grade Point</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settings.gradeScale.map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell>
                            {editingGrade === grade.id ? (
                              <Input
                                value={newGrade.grade || ''}
                                onChange={(e) => setNewGrade(prev => ({ ...prev, grade: e.target.value }))}
                                className="w-16"
                              />
                            ) : (
                              <span className="font-medium">{grade.grade}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingGrade === grade.id ? (
                              <Input
                                type="number"
                                value={newGrade.minScore || ''}
                                onChange={(e) => setNewGrade(prev => ({ ...prev, minScore: parseInt(e.target.value) }))}
                                className="w-20"
                              />
                            ) : (
                              <span>{grade.minScore}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingGrade === grade.id ? (
                              <Input
                                type="number"
                                value={newGrade.maxScore || ''}
                                onChange={(e) => setNewGrade(prev => ({ ...prev, maxScore: parseInt(e.target.value) }))}
                                className="w-20"
                              />
                            ) : (
                              <span>{grade.maxScore}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingGrade === grade.id ? (
                              <Input
                                value={newGrade.description || ''}
                                onChange={(e) => setNewGrade(prev => ({ ...prev, description: e.target.value }))}
                                className="w-32"
                              />
                            ) : (
                              <span>{grade.description}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingGrade === grade.id ? (
                              <Input
                                type="number"
                                step="0.1"
                                value={newGrade.gradePoint || ''}
                                onChange={(e) => setNewGrade(prev => ({ ...prev, gradePoint: parseFloat(e.target.value) }))}
                                className="w-20"
                              />
                            ) : (
                              <span>{grade.gradePoint}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingGrade === grade.id ? (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  onClick={handleGradeSave}
                                  data-testid={`save-grade-${grade.id}`}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleGradeCancel}>
                                  ×
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleGradeEdit(grade.id)}
                                data-testid={`edit-grade-${grade.id}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Assessment Configuration
              </CardTitle>
              <CardDescription>
                Configure assessment types and their weights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">Assessment Weights</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="exams-weight">Exams</Label>
                      <span className="text-sm text-gray-500">{settings.assessmentWeights.exams}%</span>
                    </div>
                    <Input
                      id="exams-weight"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.assessmentWeights.exams}
                      onChange={(e) => handleAssessmentWeightChange('exams', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="assignments-weight">Assignments</Label>
                      <span className="text-sm text-gray-500">{settings.assessmentWeights.assignments}%</span>
                    </div>
                    <Input
                      id="assignments-weight"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.assessmentWeights.assignments}
                      onChange={(e) => handleAssessmentWeightChange('assignments', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="quizzes-weight">Quizzes</Label>
                      <span className="text-sm text-gray-500">{settings.assessmentWeights.quizzes}%</span>
                    </div>
                    <Input
                      id="quizzes-weight"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.assessmentWeights.quizzes}
                      onChange={(e) => handleAssessmentWeightChange('quizzes', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="projects-weight">Projects</Label>
                      <span className="text-sm text-gray-500">{settings.assessmentWeights.projects}%</span>
                    </div>
                    <Input
                      id="projects-weight"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.assessmentWeights.projects}
                      onChange={(e) => handleAssessmentWeightChange('projects', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="participation-weight">Class Participation</Label>
                      <span className="text-sm text-gray-500">{settings.assessmentWeights.classParticipation}%</span>
                    </div>
                    <Input
                      id="participation-weight"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.assessmentWeights.classParticipation}
                      onChange={(e) => handleAssessmentWeightChange('classParticipation', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
                  <div className="flex items-start">
                    <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Total Weight</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        Current total: {Object.values(settings.assessmentWeights).reduce((sum, weight) => sum + weight, 0)}%
                        {Object.values(settings.assessmentWeights).reduce((sum, weight) => sum + weight, 0) !== 100 && (
                          <span className="text-amber-600"> (Should equal 100%)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-4">
          <SubjectsManagement />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Class & Attendance Settings
              </CardTitle>
              <CardDescription>
                Configure class management and attendance requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-students">Maximum Students per Class</Label>
                  <Input
                    id="max-students"
                    type="number"
                    min="1"
                    max="100"
                    value={settings.maxStudentsPerClass}
                    onChange={(e) => handleInputChange('maxStudentsPerClass', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-students">Minimum Students per Class</Label>
                  <Input
                    id="min-students"
                    type="number"
                    min="1"
                    max="50"
                    value={settings.minStudentsPerClass}
                    onChange={(e) => handleInputChange('minStudentsPerClass', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class-duration">Class Duration (minutes)</Label>
                  <Input
                    id="class-duration"
                    type="number"
                    min="30"
                    max="180"
                    value={settings.classDuration}
                    onChange={(e) => handleInputChange('classDuration', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="break-duration">Break Duration (minutes)</Label>
                  <Input
                    id="break-duration"
                    type="number"
                    min="5"
                    max="60"
                    value={settings.breakDuration}
                    onChange={(e) => handleInputChange('breakDuration', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="attendance-required">Attendance Required</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Track and require minimum attendance
                    </p>
                  </div>
                  <Switch
                    id="attendance-required"
                    checked={settings.attendanceRequired}
                    onCheckedChange={(checked) => handleInputChange('attendanceRequired', checked)}
                  />
                </div>

                {settings.attendanceRequired && (
                  <div className="space-y-2">
                    <Label htmlFor="minimum-attendance">Minimum Attendance (%)</Label>
                    <Input
                      id="minimum-attendance"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.minimumAttendance}
                      onChange={(e) => handleInputChange('minimumAttendance', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-500">Minimum attendance required to pass</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-4">Academic Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="online-exams">Online Exams</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Enable online examination system
                      </p>
                    </div>
                    <Switch
                      id="online-exams"
                      checked={settings.onlineExamsEnabled}
                      onCheckedChange={(checked) => handleInputChange('onlineExamsEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="grade-moderation">Grade Moderation</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Enable grade moderation process
                      </p>
                    </div>
                    <Switch
                      id="grade-moderation"
                      checked={settings.gradeModeration}
                      onCheckedChange={(checked) => handleInputChange('gradeModeration', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="parent-portal">Parent Portal Grades</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Show grades in parent portal
                      </p>
                    </div>
                    <Switch
                      id="parent-portal"
                      checked={settings.parentPortalGrades}
                      onCheckedChange={(checked) => handleInputChange('parentPortalGrades', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="transcript-generation">Transcript Generation</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Enable automatic transcript generation
                      </p>
                    </div>
                    <Switch
                      id="transcript-generation"
                      checked={settings.transcriptGeneration}
                      onCheckedChange={(checked) => handleInputChange('transcriptGeneration', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AcademicConfiguration;
