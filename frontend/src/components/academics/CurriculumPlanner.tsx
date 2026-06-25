import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useToast } from "../ui/use-toast";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import curriculumService, { Curriculum, CurriculumUnit, CurriculumCreate, CurriculumUnitCreate } from '../../services/curriculumService';
import subjectService from '../../services/subjectService';
import { gesService, EducationalLevel } from '../../services/gesService';

interface Subject {
  id: number;
  name: string;
  code: string;
}

const defaultCurriculumForm = {
  title: '',
  description: '',
  educational_level_id: '',
  subject_id: '',
  curriculum_standard: 'standards_based',
  academic_year: '',
  term: 'Term 1',
  status: 'draft'
};

export function CurriculumPlanner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('curricula');
  const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<CurriculumUnit | null>(null);
  
  // Form state for creating/editing curricula
  const [curriculumForm, setCurriculumForm] = useState<{
    title: string;
    description: string;
    educational_level_id: string;
    subject_id: string;
    curriculum_standard: string;
    academic_year: string;
    term: string;
    status: string;
  }>(defaultCurriculumForm);
  
  // Form state for creating/editing curriculum units
  const [unitForm, setUnitForm] = useState<{
    curriculum_id: string;
    title: string;
    description: string;
    objectives: string;
    resources: string;
    duration_weeks: number;
    sequence_order: number;
  }>({
    curriculum_id: '',
    title: '',
    description: '',
    objectives: '',
    resources: '',
    duration_weeks: 1,
    sequence_order: 1
  });
  
  // Fetch subjects
  const { data: subjectsData, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectService.getSubjects(),
  });

  const { data: educationalLevelsData, isLoading: isLoadingEducationalLevels } = useQuery({
    queryKey: ['educational-levels'],
    queryFn: () => gesService.getEducationalLevels(),
  });

  // Fetch curricula
  const { data: curriculaData, isLoading: isLoadingCurricula } = useQuery({
    queryKey: ['curricula'],
    queryFn: () => curriculumService.getCurricula(),
  });

  // Fetch curriculum units when a curriculum is selected
  const { data: curriculumUnitsData, isLoading: isLoadingUnits } = useQuery({
    queryKey: ['curriculum-units', selectedCurriculum?.id],
    queryFn: () => selectedCurriculum ? curriculumService.getCurriculumUnits(selectedCurriculum.id) : Promise.resolve([]),
    enabled: !!selectedCurriculum,
  });

  // Create curriculum mutation
  const createCurriculumMutation = useMutation({
    mutationFn: (data: CurriculumCreate) => 
      selectedCurriculum 
        ? curriculumService.updateCurriculum(selectedCurriculum.id, data)
        : curriculumService.createCurriculum(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast({
        title: "Success",
        description: selectedCurriculum ? "Curriculum updated successfully" : "Curriculum created successfully",
        id: ''
      });
      // Reset form
      setCurriculumForm(defaultCurriculumForm);
      setSelectedCurriculum(null);
      setActiveTab('curricula');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: selectedCurriculum ? "Failed to update curriculum" : "Failed to create curriculum",
        variant: "destructive",
        id: ''
      });
      console.error(error);
    }
  });

  // Create curriculum unit mutation
  const createUnitMutation = useMutation({
    mutationFn: (data: CurriculumUnitCreate) => 
      selectedUnit 
        ? curriculumService.updateCurriculumUnit(selectedUnit.id, data)
        : curriculumService.createCurriculumUnit(data),
    onSuccess: () => {
      const currId = unitForm.curriculum_id ? parseInt(unitForm.curriculum_id) : undefined;
      if (currId) {
        queryClient.invalidateQueries({ queryKey: ['curriculum-units', currId] });
      }
      toast({
        title: "Success",
        description: selectedUnit ? "Unit updated successfully" : "Unit added successfully",
        id: ''
      });
      // Reset form but keep the curriculum_id
      const currentCurriculumId = unitForm.curriculum_id;
      setUnitForm({
        curriculum_id: currentCurriculumId,
        title: '',
        description: '',
        objectives: '',
        resources: '',
        duration_weeks: 1,
        sequence_order: (curriculumUnitsData?.length || 0) + 1
      });
      setSelectedUnit(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: selectedUnit ? "Failed to update unit" : "Failed to add unit",
        variant: "destructive",
        id: ''
      });
      console.error(error);
    }
  });

  // Delete curriculum mutation
  const deleteCurriculumMutation = useMutation({
    mutationFn: (id: number) => curriculumService.deleteCurriculum(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast({
        title: "Success",
        description: "Curriculum deleted successfully",
        id: ''
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete curriculum",
        variant: "destructive",
        id: ''
      });
      console.error(error);
    }
  });

  // Delete curriculum unit mutation
  const deleteUnitMutation = useMutation({
    mutationFn: (id: number) => curriculumService.deleteCurriculumUnit(id),
    onSuccess: () => {
      const currId = unitForm.curriculum_id ? parseInt(unitForm.curriculum_id) : undefined;
      if (currId) {
        queryClient.invalidateQueries({ queryKey: ['curriculum-units', currId] });
      }
      toast({
        title: "Success",
        description: "Curriculum unit deleted successfully",
        id: ''
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete curriculum unit",
        variant: "destructive",
        id: ''
      });
      console.error(error);
    }
  });
  
  // Handle curriculum form input changes
  const handleCurriculumInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurriculumForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle curriculum select changes
  const handleCurriculumSelectChange = (name: string, value: string) => {
    setCurriculumForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle unit form input changes
  const handleUnitInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUnitForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle unit select changes
  const handleUnitSelectChange = (name: string, value: string) => {
    setUnitForm(prev => ({ ...prev, [name]: value }));
    
    // If curriculum_id changes, update the sequence order
    if (name === 'curriculum_id') {
      const currId = parseInt(value);
      const units = curriculumUnitsData || [];
      const filteredUnits = Array.isArray(units) ? units.filter(u => u.curriculum_id === currId) : [];
      setUnitForm(prev => ({
        ...prev,
        curriculum_id: value,
        sequence_order: filteredUnits.length + 1
      }));
    }
  };
  
  // Handle create/update curriculum
  const handleCreateCurriculum = (e: React.FormEvent) => {
    e.preventDefault();
    const formData: CurriculumCreate = {
      title: curriculumForm.title,
      description: curriculumForm.description,
      educational_level_id: parseInt(curriculumForm.educational_level_id),
      subject_id: parseInt(curriculumForm.subject_id),
      curriculum_standard: curriculumForm.curriculum_standard,
      academic_year: curriculumForm.academic_year,
      term: curriculumForm.term,
      status: curriculumForm.status as 'draft' | 'published' | 'archived'
    };
    createCurriculumMutation.mutate(formData);
  };

  // Handle create/update unit
  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData: CurriculumUnitCreate = {
      curriculum_id: parseInt(unitForm.curriculum_id),
      title: unitForm.title,
      description: unitForm.description,
      objectives: unitForm.objectives,
      resources: unitForm.resources,
      duration_weeks: unitForm.duration_weeks,
      sequence_order: unitForm.sequence_order
    };
    createUnitMutation.mutate(formData);
  };

  // Handle delete curriculum
  const handleDeleteCurriculum = (id: number) => {
    if (window.confirm('Are you sure you want to delete this curriculum?')) {
      deleteCurriculumMutation.mutate(id);
    }
  };

  // Handle delete unit
  const handleDeleteUnit = (id: number) => {
    if (window.confirm('Are you sure you want to delete this unit?')) {
      deleteUnitMutation.mutate(id);
    }
  };
  
  // Prepare data for rendering
  const subjects = subjectsData?.subjects || [];
  const educationalLevels = educationalLevelsData || [];
  const curricula = curriculaData || [];
  const curriculumUnits = curriculumUnitsData || [];
  const isLoading = isLoadingSubjects || isLoadingCurricula || isLoadingUnits || 
                   createCurriculumMutation.isPending || createUnitMutation.isPending ||
                   deleteCurriculumMutation.isPending || deleteUnitMutation.isPending;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Curriculum Planner</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="curricula">Curricula</TabsTrigger>
            <TabsTrigger value="create">Create Curriculum</TabsTrigger>
            <TabsTrigger value="units">Curriculum Units</TabsTrigger>
          </TabsList>
          
          {/* Curricula List Tab */}
          <TabsContent value="curricula" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => {
                setSelectedCurriculum(null);
                setCurriculumForm({
                  ...defaultCurriculumForm
                });
                setActiveTab('create');
              }}>
                <Plus className="h-4 w-4 mr-2" />
                New Curriculum
              </Button>
            </div>
            
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium">Title</th>
                    <th className="p-2 text-left font-medium">Subject</th>
                    <th className="p-2 text-left font-medium">Grade Level</th>
                    <th className="p-2 text-left font-medium">Academic Year</th>
                    <th className="p-2 text-left font-medium">Status</th>
                    <th className="p-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingCurricula ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center">Loading curricula...</td>
                    </tr>
                  ) : curricula.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center">No curricula found</td>
                    </tr>
                  ) : (
                    curricula.map((curriculum) => (
                      <tr key={curriculum.id} className="border-b">
                        <td className="p-2">{curriculum.title}</td>
                        <td className="p-2">{curriculum.subject_name}</td>
                        <td className="p-2">{curriculum.grade_level}</td>
                        <td className="p-2">{curriculum.academic_year}</td>
                        <td className="p-2">
                          <Badge 
                            className={
                              curriculum.status === 'published' ? 'bg-green-100 text-green-800' : 
                              curriculum.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {curriculum.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedCurriculum(curriculum);
                                setCurriculumForm({
                                  title: curriculum.title,
                                  description: curriculum.description,
                                  educational_level_id: curriculum.educational_level_id?.toString() || '',
                                  subject_id: curriculum.subject_id.toString(),
                                  curriculum_standard: curriculum.curriculum_standard || 'standards_based',
                                  academic_year: curriculum.academic_year,
                                  term: curriculum.term || 'Term 1',
                                  status: curriculum.status
                                });
                                setActiveTab('create');
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setUnitForm(prev => ({
                                  ...prev,
                                  curriculum_id: curriculum.id.toString(),
                                  sequence_order: (curriculumUnits.filter(u => u.curriculum_id === curriculum.id).length || 0) + 1
                                }));
                                setActiveTab('units');
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteCurriculum(curriculum.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          {/* Create Curriculum Tab */}
          <TabsContent value="create" className="space-y-4">
            <form onSubmit={handleCreateCurriculum}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Title
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={curriculumForm.title}
                    onChange={handleCurriculumInputChange}
                    className="col-span-3"
                    placeholder="Curriculum title"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={curriculumForm.description}
                    onChange={handleCurriculumInputChange}
                    className="col-span-3"
                    placeholder="Curriculum description"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="educational-level" className="text-right">
                    Educational Level
                  </Label>
                  <Select 
                    onValueChange={(value) => handleCurriculumSelectChange('educational_level_id', value)}
                    value={curriculumForm.educational_level_id}
                    required
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select educational level" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingEducationalLevels ? (
                        <SelectItem value="loading" disabled>Loading levels...</SelectItem>
                      ) : educationalLevels.length === 0 ? (
                        <SelectItem value="none" disabled>No levels available</SelectItem>
                      ) : (
                        educationalLevels.map((level: EducationalLevel) => (
                          <SelectItem key={level.id} value={level.id.toString()}>
                            {level.level_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subject" className="text-right">
                    Subject
                  </Label>
                  <Select 
                    onValueChange={(value) => handleCurriculumSelectChange('subject_id', value)}
                    value={curriculumForm.subject_id}
                    required
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingSubjects ? (
                        <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                      ) : subjects.length === 0 ? (
                        <SelectItem value="none" disabled>No subjects available</SelectItem>
                      ) : (
                        subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="curriculum-standard" className="text-right">
                    Standard
                  </Label>
                  <Select 
                    onValueChange={(value) => handleCurriculumSelectChange('curriculum_standard', value)}
                    value={curriculumForm.curriculum_standard}
                    required
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select curriculum standard" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standards_based">Standards Based</SelectItem>
                      <SelectItem value="competency_based">Competency Based</SelectItem>
                      <SelectItem value="stem_focused">STEM Focused</SelectItem>
                      <SelectItem value="character_development">Character Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="academic-year" className="text-right">
                    Academic Year
                  </Label>
                  <Select 
                    onValueChange={(value) => handleCurriculumSelectChange('academic_year', value)}
                    value={curriculumForm.academic_year}
                    required
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2022-2023">2022-2023</SelectItem>
                      <SelectItem value="2023-2024">2023-2024</SelectItem>
                      <SelectItem value="2024-2025">2024-2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="term" className="text-right">
                    Term
                  </Label>
                  <Select 
                    onValueChange={(value) => handleCurriculumSelectChange('term', value)}
                    value={curriculumForm.term}
                    required
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Term 1">Term 1</SelectItem>
                      <SelectItem value="Term 2">Term 2</SelectItem>
                      <SelectItem value="Term 3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select 
                    onValueChange={(value) => handleCurriculumSelectChange('status', value)}
                    value={curriculumForm.status}
                    required
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => {
                  setCurriculumForm(defaultCurriculumForm);
                  setSelectedCurriculum(null);
                  setActiveTab('curricula');
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : selectedCurriculum ? "Update Curriculum" : "Create Curriculum"}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          {/* Curriculum Units Tab */}
          <TabsContent value="units" className="space-y-4">
            <form onSubmit={handleCreateUnit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="curriculum" className="text-right">
                    Curriculum
                  </Label>
                  <Select 
                    onValueChange={(value) => handleUnitSelectChange('curriculum_id', value)}
                    value={unitForm.curriculum_id}
                    required
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select curriculum" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingCurricula ? (
                        <SelectItem value="loading" disabled>Loading curricula...</SelectItem>
                      ) : curricula.length === 0 ? (
                        <SelectItem value="none" disabled>No curricula available</SelectItem>
                      ) : (
                        curricula.map((curriculum) => (
                          <SelectItem key={curriculum.id} value={curriculum.id.toString()}>
                            {curriculum.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                {unitForm.curriculum_id && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="unit-title" className="text-right">
                        Unit Title
                      </Label>
                      <Input
                        id="unit-title"
                        name="title"
                        value={unitForm.title}
                        onChange={handleUnitInputChange}
                        className="col-span-3"
                        placeholder="Unit title"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="unit-description" className="text-right">
                        Description
                      </Label>
                      <Textarea
                        id="unit-description"
                        name="description"
                        value={unitForm.description}
                        onChange={handleUnitInputChange}
                        className="col-span-3"
                        placeholder="Unit description"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="unit-objectives" className="text-right">
                        Objectives
                      </Label>
                      <Textarea
                        id="unit-objectives"
                        name="objectives"
                        value={unitForm.objectives}
                        onChange={handleUnitInputChange}
                        className="col-span-3"
                        placeholder="Learning objectives"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="unit-resources" className="text-right">
                        Resources
                      </Label>
                      <Textarea
                        id="unit-resources"
                        name="resources"
                        value={unitForm.resources}
                        onChange={handleUnitInputChange}
                        className="col-span-3"
                        placeholder="Teaching resources"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="unit-duration" className="text-right">
                        Duration (weeks)
                      </Label>
                      <Input
                        id="unit-duration"
                        name="duration_weeks"
                        type="number"
                        value={unitForm.duration_weeks}
                        onChange={handleUnitInputChange}
                        className="col-span-3"
                        min="1"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="unit-sequence" className="text-right">
                        Sequence Order
                      </Label>
                      <Input
                        id="unit-sequence"
                        name="sequence_order"
                        type="number"
                        value={unitForm.sequence_order}
                        onChange={handleUnitInputChange}
                        className="col-span-3"
                        min="1"
                        required
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving..." : selectedUnit ? "Update Unit" : "Add Unit"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </form>
            
            {unitForm.curriculum_id && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">
                  Units for {curricula.find(c => c.id.toString() === unitForm.curriculum_id)?.title}
                </h3>
                
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium">Order</th>
                        <th className="p-2 text-left font-medium">Title</th>
                        <th className="p-2 text-left font-medium">Duration</th>
                        <th className="p-2 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingUnits ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center">Loading units...</td>
                        </tr>
                      ) : curriculumUnits.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center">No units found</td>
                        </tr>
                      ) : (
                        Array.isArray(curriculumUnits) && curriculumUnits
                          .filter(unit => unit.curriculum_id.toString() === unitForm.curriculum_id)
                          .sort((a, b) => a.sequence_order - b.sequence_order)
                          .map((unit) => (
                            <tr key={unit.id} className="border-b">
                              <td className="p-2">{unit.sequence_order}</td>
                              <td className="p-2">{unit.title}</td>
                              <td className="p-2">{unit.duration_weeks} weeks</td>
                              <td className="p-2">
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUnit(unit);
                                      setUnitForm({
                                        curriculum_id: unit.curriculum_id.toString(),
                                        title: unit.title,
                                        description: unit.description,
                                        objectives: unit.objectives,
                                        resources: unit.resources,
                                        duration_weeks: unit.duration_weeks,
                                        sequence_order: unit.sequence_order
                                      });
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleDeleteUnit(unit.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
