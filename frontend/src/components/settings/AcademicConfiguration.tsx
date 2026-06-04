import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  CheckCircle,
  Plus,
  Trash2
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('academic-year');
  const [editingGrade, setEditingGrade] = useState<string | null>(null);
  const [newGrade, setNewGrade] = useState<Partial<GradeRange>>({});
  const [selectedSystem, setSelectedSystem] = useState<string>('GES');
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);

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
    if (normalized && normalized.gradingSystem) {
      setSelectedSystem(normalized.gradingSystem);
    }
  }, [currentSettings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: AcademicConfiguration) => settingsService.updateAcademicConfiguration(updatedSettings),
    onSuccess: () => {
      toast({
        title: t('admin_settings.updated_title', 'Academic Configuration Updated'),
        description: t('admin_settings.updated_desc', 'Academic settings have been updated successfully.'),
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['academic-configuration'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin_settings.update_failed', 'Failed to update academic configuration'),
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    // Validate assessment weights
    const activeCategories = settings.assessmentTypes?.filter(cat => cat.isActive) || [];
    const totalWeight = activeCategories.reduce((sum, cat) => sum + (Number(cat.weight) || 0), 0);
    if (totalWeight !== 100) {
      toast({
        title: t('common.validation_error', 'Validation Error'),
        description: t('admin_settings.assessment_weights_total_validation', 'Active assessment weights must total exactly 100%. Current total: {{total}}%', { total: totalWeight }),
        variant: "destructive"
      });
      return;
    }

    updateSettingsMutation.mutate(settings);
  };

  const handleInputChange = (field: keyof AcademicConfiguration, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const fetchGradingSchemeBoundaries = async (selectedValue: string) => {
    const boundaries = await settingsService.getGradingSchemeBoundaries(selectedValue);
    if (boundaries && Array.isArray(boundaries)) {
      const mappedBoundaries = boundaries.map((b: any, idx: number) => ({
        id: b.id?.toString() || (idx + 1).toString(),
        minScore: b.minScore,
        maxScore: b.maxScore,
        grade: b.grade,
        description: b.description || b.grade,
        gradePoint: b.gradePoint || 0.0
      }));
      setSettings(prev => {
        const nextSettings = {
          ...prev,
          gradingSystem: selectedValue,
          gradeScale: mappedBoundaries
        };
        if (selectedValue === 'APC') {
          nextSettings.maxGrade = 20;
          nextSettings.passingGrade = 10;
        } else {
          if (nextSettings.maxGrade === 20) nextSettings.maxGrade = 100;
          if (nextSettings.passingGrade === 10) nextSettings.passingGrade = 50;
        }
        return nextSettings;
      });
    } else {
      setSettings(prev => {
        const nextSettings = {
          ...prev,
          gradingSystem: selectedValue
        };
        if (selectedValue === 'APC') {
          nextSettings.maxGrade = 20;
          nextSettings.passingGrade = 10;
          nextSettings.gradeScale = [
            { id: '1', minScore: 16.00, maxScore: 20.00, grade: 'M', description: 'Maîtrisé', gradePoint: 16.00 },
            { id: '2', minScore: 12.00, maxScore: 15.99, grade: 'A', description: 'Acquis', gradePoint: 14.00 },
            { id: '3', minScore: 10.00, maxScore: 11.99, grade: 'EA', description: 'En cours d\'Acquisition', gradePoint: 10.00 },
            { id: '4', minScore: 0.00, maxScore: 9.99, grade: 'NA', description: 'Non Acquis', gradePoint: 0.00 }
          ];
        } else {
          if (nextSettings.maxGrade === 20) nextSettings.maxGrade = 100;
          if (nextSettings.passingGrade === 10) nextSettings.passingGrade = 50;
        }
        return nextSettings;
      });
    }
  };

  const handleSystemChange = async (selectedValue: string) => {
    try {
      setSelectedSystem(selectedValue);
      if (!selectedValue) return;
      
      // Trigger the network query purely independent of socket lifecycle states
      await fetchGradingSchemeBoundaries(selectedValue);
    } catch (err) {
      console.error("Defensive UI Trap: Dropdown state update halted safely", err);
      setLocalErrorMessage("Unable to change template selection due to state collision.");
    }
  };

  const handleCategoryChange = (index: number, key: keyof AssessmentType, value: any) => {
    setSettings(prev => {
      const updated = [...(prev.assessmentTypes || [])];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, assessmentTypes: updated };
    });
  };

  const handleAddCategory = () => {
    setSettings(prev => ({
      ...prev,
      assessmentTypes: [
        ...(prev.assessmentTypes || []),
        { id: Date.now().toString(), name: 'New Category', weight: 0, description: '', isActive: true }
      ]
    }));
  };

  const handleRemoveCategory = (index: number) => {
    setSettings(prev => ({
      ...prev,
      assessmentTypes: (prev.assessmentTypes || []).filter((_, idx) => idx !== index)
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
        title: t('common.validation_error', 'Validation Error'),
        description: t('admin_settings.fill_all_grade_fields', 'Please fill in all grade fields'),
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
    
    toast({ title: t('admin_settings.grade_updated', 'Grade Updated'), description: t('admin_settings.grade_updated_desc', 'Grade range has been updated successfully.'), variant: "default" });
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
      {localErrorMessage && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-md p-4 text-sm" role="alert">
          {localErrorMessage}
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('admin_settings.academic', 'Academic Configuration')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('admin_settings.academic_desc', 'Configure academic settings, grading systems, and term structures')}</p>
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
          {updateSettingsMutation.isPending ? t('common.saving', 'Saving...') : t('school_settings.save_changes', 'Save Changes')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="academic-year" className="flex items-center gap-2 min-w-[170px]">
            <Calendar className="h-4 w-4" />
            {t('admin_settings.academic_year', 'Academic Year')}
          </TabsTrigger>
          <TabsTrigger value="grading" className="flex items-center gap-2 min-w-[160px]">
            <Award className="h-4 w-4" />
            {t('admin_settings.grading_system', 'Grading System')}
          </TabsTrigger>
          <TabsTrigger value="assessment" className="flex items-center gap-2 min-w-[140px]">
            <Calculator className="h-4 w-4" />
            {t('admin_settings.assessment', 'Assessment')}
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2 min-w-[130px]">
            <BookOpen className="h-4 w-4" />
            {t('admin_settings.subjects', 'Subjects')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 min-w-[130px]">
            <Clock className="h-4 w-4" />
            {t('admin_settings.settings', 'Settings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="academic-year" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('admin_settings.academic_year_config', 'Academic Year Configuration')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.academic_year_config_desc', 'Configure academic year and term settings')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academic-year">{t('admin_settings.academic_year_label', 'Academic Year')}</Label>
                  <Input
                    id="academic-year"
                    value={settings.academicYear}
                    onChange={(e) => handleInputChange('academicYear', e.target.value)}
                    placeholder="2024/2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-term">{t('admin_settings.current_term', 'Current Term')}</Label>
                  <Select value={settings.currentTerm} onValueChange={(value) => handleInputChange('currentTerm', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Term">{t('admin_settings.first_term', 'First Term')}</SelectItem>
                      <SelectItem value="Second Term">{t('admin_settings.second_term', 'Second Term')}</SelectItem>
                      <SelectItem value="Third Term">{t('admin_settings.third_term', 'Third Term')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="term-start">{t('admin_settings.term_start_date', 'Term Start Date')}</Label>
                  <Input
                    id="term-start"
                    type="date"
                    value={settings.termStartDate}
                    onChange={(e) => handleInputChange('termStartDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="term-end">{t('admin_settings.term_end_date', 'Term End Date')}</Label>
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
                {t('admin_settings.grading_system', 'Grading System')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.grading_system_desc', 'Configure grading scales and passing requirements')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grading-system">{t('admin_settings.grading_system', 'Grading System')}</Label>
                  <Select value={settings.gradingSystem || selectedSystem} onValueChange={handleSystemChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GES">Ghana Education Service (GES)</SelectItem>
                      <SelectItem value="WAEC">West African Examinations Council (WAEC)</SelectItem>
                      <SelectItem value="IB">International Baccalaureate (IB)</SelectItem>
                      <SelectItem value="Cambridge">Cambridge International</SelectItem>
                      <SelectItem value="APC">Approche Par Compétence (APC - Togo)</SelectItem>
                      <SelectItem value="Custom">Custom Grading System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passing-grade">{t('admin_settings.passing_grade', 'Passing Grade (%)')}</Label>
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
                  <Label htmlFor="max-grade">{t('admin_settings.maximum_grade', 'Maximum Grade (%)')}</Label>
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
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{t('admin_settings.grade_scale', 'Grade Scale')}</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin_settings.grade', 'Grade')}</TableHead>
                        <TableHead>{t('admin_settings.min_score', 'Min Score')}</TableHead>
                        <TableHead>{t('admin_settings.max_score', 'Max Score')}</TableHead>
                        <TableHead>{t('common.description', 'Description')}</TableHead>
                        <TableHead>{t('admin_settings.grade_point', 'Grade Point')}</TableHead>
                        <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  {t('admin_settings.assessment_config', 'Assessment Configuration')}
                </CardTitle>
                <CardDescription>
                  {t('admin_settings.assessment_config_desc', 'Configure assessment types and their weights')}
                </CardDescription>
              </div>
              <Button onClick={handleAddCategory} size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('admin_settings.add_category', 'Add Category')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin_settings.category_name', 'Category Name')}</TableHead>
                        <TableHead>{t('admin_settings.description', 'Description')}</TableHead>
                        <TableHead>{t('admin_settings.weight', 'Weight (%)')}</TableHead>
                        <TableHead>{t('admin_settings.active', 'Active')}</TableHead>
                        <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(settings.assessmentTypes || []).map((category, index) => (
                        <TableRow key={category.id || index}>
                          <TableCell>
                            <Input
                              value={category.name}
                              onChange={(e) => handleCategoryChange(index, 'name', e.target.value)}
                              className="max-w-[200px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={category.description}
                              onChange={(e) => handleCategoryChange(index, 'description', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={category.weight}
                              onChange={(e) => handleCategoryChange(index, 'weight', parseInt(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={category.isActive}
                              onCheckedChange={(checked) => handleCategoryChange(index, 'isActive', checked)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCategory(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(settings.assessmentTypes || []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                            {t('admin_settings.no_categories', 'No assessment categories defined. Click Add Category.')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
                  <div className="flex items-start">
                    <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">{t('admin_settings.total_weight', 'Total Active Weight')}</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        {t('admin_settings.current_total', 'Current total:')} {(settings.assessmentTypes || []).filter(cat => cat.isActive).reduce((sum, cat) => sum + (Number(cat.weight) || 0), 0)}%
                        {(settings.assessmentTypes || []).filter(cat => cat.isActive).reduce((sum, cat) => sum + (Number(cat.weight) || 0), 0) !== 100 && (
                          <span className="text-amber-600">{t('admin_settings.should_equal_100', ' (Should equal 100%)')}</span>
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
                {t('admin_settings.class_attendance_settings', 'Class & Attendance Settings')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.class_attendance_settings_desc', 'Configure class management and attendance requirements')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-students">{t('admin_settings.max_students_per_class', 'Maximum Students per Class')}</Label>
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
                  <Label htmlFor="min-students">{t('admin_settings.min_students_per_class', 'Minimum Students per Class')}</Label>
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
                  <Label htmlFor="class-duration">{t('admin_settings.class_duration', 'Class Duration (minutes)')}</Label>
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
                  <Label htmlFor="break-duration">{t('admin_settings.break_duration', 'Break Duration (minutes)')}</Label>
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
                    <Label htmlFor="attendance-required">{t('admin_settings.attendance_required', 'Attendance Required')}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('admin_settings.attendance_required_desc', 'Track and require minimum attendance')}
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
                    <Label htmlFor="minimum-attendance">{t('admin_settings.minimum_attendance', 'Minimum Attendance (%)')}</Label>
                    <Input
                      id="minimum-attendance"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.minimumAttendance}
                      onChange={(e) => handleInputChange('minimumAttendance', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-500">{t('admin_settings.minimum_attendance_hint', 'Minimum attendance required to pass')}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-4">{t('admin_settings.academic_features', 'Academic Features')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="online-exams">{t('admin_settings.online_exams', 'Online Exams')}</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('admin_settings.online_exams_desc', 'Enable online examination system')}
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
                      <Label htmlFor="grade-moderation">{t('admin_settings.grade_moderation', 'Grade Moderation')}</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('admin_settings.grade_moderation_desc', 'Enable grade moderation process')}
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
                      <Label htmlFor="parent-portal">{t('admin_settings.parent_portal_grades', 'Parent Portal Grades')}</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('admin_settings.parent_portal_grades_desc', 'Show grades in parent portal')}
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
                      <Label htmlFor="transcript-generation">{t('admin_settings.transcript_generation', 'Transcript Generation')}</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('admin_settings.transcript_generation_desc', 'Enable automatic transcript generation')}
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
