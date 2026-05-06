import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"
import { GraduationCap, BookOpen, Award, Users, Settings, Plus, Edit, Save, Map, Loader2 } from 'lucide-react'
import { gesService, type EducationalLevel } from '../../services/gesService'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const GhanaEducationServiceFixed: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('levels')
  const [editingItem, setEditingItem] = useState<any>(null)
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null)
  const [gradingDialogOpen, setGradingDialogOpen] = useState(false)
  const [assessmentFrameworks, setAssessmentFrameworks] = useState<Array<{ id: number; name: string; type: string; is_active: boolean }>>([
    { id: 1, name: 'School-Based Assessment (SBA)', type: 'SBA', is_active: true }
  ])

  const keyPhaseLabel = useMemo(() => {
    return {
      pre_primary: 'Pre-Primary',
      primary: 'Primary',
      jhs: 'Junior High School',
      shs: 'Senior High School',
      tertiary: 'Tertiary'
    } as Record<string, string>
  }, [])

  const { data: educationalLevels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ['educational-levels'],
    queryFn: gesService.getEducationalLevels
  })

  const { data: gradingSchemes = [], isLoading: gradingLoading } = useQuery({
    queryKey: ['grading-schemes'],
    queryFn: gesService.getGradingScheme
  })

  const { data: coreCompetencies = [], isLoading: competenciesLoading } = useQuery({
    queryKey: ['core-competencies'],
    queryFn: gesService.getCoreCompetencies
  })

  useEffect(() => {
    if (educationalLevels && educationalLevels.length > 0 && !selectedLevelId) {
      setSelectedLevelId(educationalLevels[0]?.id || null)
    }
  }, [educationalLevels, selectedLevelId])

  const EducationalLevelForm = ({ level, onSave, onCancel }: { level?: EducationalLevel; onSave: (data: Partial<EducationalLevel>) => void; onCancel: () => void }) => {
    const [formData, setFormData] = useState<Partial<EducationalLevel>>({
      level_name: level?.level_name || '',
      level_code: level?.level_code || '',
      key_phase: level?.key_phase || '',
      curriculum_focus: level?.curriculum_focus || '',
      min_age: level?.min_age || 0,
      max_age: level?.max_age || 0,
      is_active: level?.is_active ?? true
    })
    return (
      <Card>
        <CardHeader>
          <CardTitle>{level ? 'Edit' : 'Add'} Educational Level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="level_name">Level Name</Label>
              <Input id="level_name" value={formData.level_name} onChange={(e) => setFormData({ ...formData, level_name: e.target.value })} placeholder="Enter level name" />
            </div>
            <div>
              <Label htmlFor="level_code">Code</Label>
              <Input id="level_code" value={formData.level_code} onChange={(e) => setFormData({ ...formData, level_code: e.target.value })} placeholder="Enter level code" />
            </div>
          </div>
          <div>
            <Label htmlFor="key_phase">Educational Phase</Label>
            <Select value={formData.key_phase || ''} onValueChange={(value) => setFormData({ ...formData, key_phase: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre_primary">Pre-Primary</SelectItem>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="jhs">Junior High School</SelectItem>
                <SelectItem value="shs">Senior High School</SelectItem>
                <SelectItem value="tertiary">Tertiary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="curriculum_focus">Curriculum Focus</Label>
            <Textarea id="curriculum_focus" value={formData.curriculum_focus} onChange={(e) => setFormData({ ...formData, curriculum_focus: e.target.value })} placeholder="Describe this educational level" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_age">Min Age</Label>
              <Input id="min_age" type="number" value={formData.min_age} onChange={(e) => setFormData({ ...formData, min_age: parseInt(e.target.value, 10) })} />
            </div>
            <div>
              <Label htmlFor="max_age">Max Age</Label>
              <Input id="max_age" type="number" value={formData.max_age} onChange={(e) => setFormData({ ...formData, max_age: parseInt(e.target.value, 10) })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onSave(formData)}>
              <Save className="h-4 w-4 mr-2" />
              Save Level
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderEducationalLevelsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-64">
          <Label>Select Educational Level</Label>
          <Select value={(selectedLevelId !== null ? String(selectedLevelId) : '')} onValueChange={(v) => setSelectedLevelId(v ? parseInt(v, 10) : null)}>
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {educationalLevels.map((lvl) => (
                <SelectItem key={lvl.id} value={String(lvl.id)}>{lvl.level_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setEditingItem({ type: 'level', data: null })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Level
        </Button>
      </div>
      
      {levelsLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {educationalLevels.map((level) => (
            <Card key={level.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      {level.level_name} ({level.level_code})
                    </CardTitle>
                    <CardDescription>{level.curriculum_focus}</CardDescription>
                    <p className="text-xs text-muted-foreground mt-1">
                      Phase: {level.key_phase_description} • Age Range: {level.min_age}-{level.max_age} years
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={level.is_active ? 'default' : 'secondary'}>{level.is_active ? 'Active' : 'Inactive'}</Badge>
                    <Button variant="outline" size="sm" onClick={() => setEditingItem({ type: 'level', data: level })}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={editingItem?.type === 'level'} onOpenChange={(open) => { if (!open) setEditingItem(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem?.data ? 'Edit Educational Level' : 'Add Educational Level'}</DialogTitle>
          </DialogHeader>
          <EducationalLevelForm
            level={editingItem?.data || undefined}
            onCancel={() => setEditingItem(null)}
            onSave={(data) => {
              const existing = educationalLevels || []
              const isEdit = Boolean((editingItem?.data as EducationalLevel | null)?.id)

              const next: EducationalLevel = {
                id: isEdit ? (editingItem.data as EducationalLevel).id : (Math.max(0, ...existing.map((l) => l.id || 0)) + 1),
                level_name: String(data.level_name || '').trim(),
                level_code: String(data.level_code || '').trim(),
                key_phase: String(data.key_phase || '').trim(),
                key_phase_description: keyPhaseLabel[String(data.key_phase || '').trim()] || String(data.key_phase || '').trim(),
                curriculum_focus: String(data.curriculum_focus || ''),
                min_age: typeof data.min_age === 'number' ? data.min_age : 0,
                max_age: typeof data.max_age === 'number' ? data.max_age : 0,
                is_active: data.is_active ?? true
              }

              if (!next.level_name || !next.level_code || !next.key_phase) {
                setEditingItem(null)
                return
              }

              queryClient.setQueryData(['educational-levels'], (prev: any) => {
                const list: EducationalLevel[] = Array.isArray(prev) ? prev : []
                if (isEdit) {
                  return list.map((l) => (l.id === next.id ? { ...l, ...next } : l))
                }
                return [next, ...list]
              })

              setSelectedLevelId(next.id)
              setEditingItem(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )

  const renderCurriculumTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Curriculum Management</h3>
          <p className="text-sm text-gray-600">Manage curriculum standards and learning objectives</p>
        </div>
        <Button onClick={() => navigate('/academics')}>
          <BookOpen className="h-4 w-4 mr-2" />
          Go to Academic Management
        </Button>
      </div>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Standards-Based Curriculum Framework
                </CardTitle>
                <CardDescription>Core curriculum framework aligned with Ghana Education Service standards</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  )

  const renderGradingSchemesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Grading Schemes</h3>
        <Button variant="outline" onClick={() => setGradingDialogOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Configure Scales
        </Button>
      </div>
      
      {gradingLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Score Range</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gradingSchemes.map((scheme, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-bold">{scheme.grade}</TableCell>
                  <TableCell>{scheme.minScore} - {scheme.maxScore}</TableCell>
                  <TableCell>{scheme.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={gradingDialogOpen} onOpenChange={setGradingDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Grading scales</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-slate-600">Editing grading scales is not enabled yet in this module.</div>
          <div className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Score Range</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradingSchemes.map((scheme, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-bold">{scheme.grade}</TableCell>
                    <TableCell>{scheme.minScore} - {scheme.maxScore}</TableCell>
                    <TableCell>{scheme.description}</TableCell>
                  </TableRow>
                ))}
                {gradingSchemes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-sm text-slate-600">No grading schemes found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" className="bg-white" onClick={() => setGradingDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  const renderSTEMTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">STEM Domains</h3>
        <Button onClick={() => setEditingItem({ type: 'stem', data: null })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Domain
        </Button>
      </div>
      
      {competenciesLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {coreCompetencies.filter(c => c.category === 'STEM' || c.category === 'Academic').map((domain) => (
            <Card key={domain.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      {domain.name}
                    </CardTitle>
                    <CardDescription>{domain.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={domain.is_active ? 'default' : 'secondary'}>{domain.is_active ? 'Active' : 'Inactive'}</Badge>
                    <Button variant="outline" size="sm" onClick={() => setEditingItem({ type: 'stem', data: domain })}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
          {coreCompetencies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No STEM domains defined.
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderCharacterTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Character Traits</h3>
        <Button onClick={() => setEditingItem({ type: 'character', data: null })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Trait
        </Button>
      </div>
      
      <div className="grid gap-4">
        {coreCompetencies.filter(c => c.category === 'Character' || c.category === 'Behavior').map((trait) => (
          <Card key={trait.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {trait.name}
                  </CardTitle>
                  <CardDescription>{trait.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={trait.is_active ? 'default' : 'secondary'}>{trait.is_active ? 'Active' : 'Inactive'}</Badge>
                  <Button variant="outline" size="sm" onClick={() => setEditingItem({ type: 'character', data: trait })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
        {coreCompetencies.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No character traits defined.
          </div>
        )}
      </div>
    </div>
  )

  const renderAssessmentTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Assessment Frameworks</h3>
        <Button onClick={() => setEditingItem({ type: 'assessment', data: null })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Framework
        </Button>
      </div>
      <div className="grid gap-4">
        {assessmentFrameworks.map((f) => (
          <Card key={f.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {f.name}
                  </CardTitle>
                  <CardDescription>Type: {f.type}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={f.is_active ? 'default' : 'secondary'}>{f.is_active ? 'Active' : 'Inactive'}</Badge>
                  <Button variant="outline" size="sm" onClick={() => setEditingItem({ type: 'assessment', data: f })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )

  const CompetencyForm = ({
    title,
    item,
    defaultCategory,
    onCancel,
    onSave
  }: {
    title: string
    item: any
    defaultCategory: string
    onCancel: () => void
    onSave: (next: any) => void
  }) => {
    const [name, setName] = useState<string>(item?.name || '')
    const [description, setDescription] = useState<string>(item?.description || '')
    const [category, setCategory] = useState<string>(item?.category || defaultCategory)
    const [isActive, setIsActive] = useState<boolean>(item?.is_active ?? true)

    return (
      <div className="space-y-4">
        <div className="text-base font-semibold text-slate-900">{title}</div>
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white" placeholder="Enter name" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="STEM">STEM</SelectItem>
                <SelectItem value="Academic">Academic</SelectItem>
                <SelectItem value="Character">Character</SelectItem>
                <SelectItem value="Behavior">Behavior</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={isActive ? 'active' : 'inactive'} onValueChange={(v) => setIsActive(v === 'active')}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="bg-white" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={() => {
              const trimmed = name.trim()
              if (!trimmed) return
              onSave({
                ...(item || {}),
                name: trimmed,
                description,
                category,
                is_active: isActive
              })
            }}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    )
  }

  const AssessmentForm = ({ item, onCancel, onSave }: { item: any; onCancel: () => void; onSave: (next: any) => void }) => {
    const [name, setName] = useState<string>(item?.name || '')
    const [type, setType] = useState<string>(item?.type || 'SBA')
    const [isActive, setIsActive] = useState<boolean>(item?.is_active ?? true)

    return (
      <div className="space-y-4">
        <div className="text-base font-semibold text-slate-900">{item?.id ? 'Edit framework' : 'Add framework'}</div>
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white" placeholder="School-Based Assessment" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Input value={type} onChange={(e) => setType(e.target.value)} className="bg-white" placeholder="SBA" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={isActive ? 'active' : 'inactive'} onValueChange={(v) => setIsActive(v === 'active')}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="bg-white" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={() => {
              const trimmed = name.trim()
              if (!trimmed) return
              onSave({
                ...(item || {}),
                name: trimmed,
                type: type.trim() || 'SBA',
                is_active: isActive
              })
            }}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="px-6 py-4 bg-indigo-50/50 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-900/20">
        <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-300">Ghana Educational Service</h2>
        <p className="text-sm text-indigo-600/80 dark:text-indigo-400/80">Standards-Based Curriculum & Assessment Framework</p>
      </div>
      
      <div className="px-6 pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-gray-100/50 dark:bg-slate-900/50 rounded-xl mb-6">
            <TabsTrigger value="levels" className="py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 shadow-none transition-all">
              <GraduationCap className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Levels</span>
              <span className="sm:hidden text-xs">Levels</span>
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 shadow-none transition-all">
              <Map className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Curriculum</span>
              <span className="sm:hidden text-xs">Curr.</span>
            </TabsTrigger>
            <TabsTrigger value="grading" className="py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 shadow-none transition-all">
              <Award className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Grading</span>
              <span className="sm:hidden text-xs">Grades</span>
            </TabsTrigger>
            <TabsTrigger value="stem" className="py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 shadow-none transition-all">
              <BookOpen className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">STEM</span>
              <span className="sm:hidden text-xs">STEM</span>
            </TabsTrigger>
            <TabsTrigger value="character" className="py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 shadow-none transition-all">
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Character</span>
              <span className="sm:hidden text-xs">Char.</span>
            </TabsTrigger>
            <TabsTrigger value="assessment" className="py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 shadow-none transition-all">
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Assessment</span>
              <span className="sm:hidden text-xs">Assmt.</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TabsContent value="levels">{renderEducationalLevelsTab()}</TabsContent>
            <TabsContent value="curriculum">{renderCurriculumTab()}</TabsContent>
            <TabsContent value="grading">{renderGradingSchemesTab()}</TabsContent>
            <TabsContent value="stem">{renderSTEMTab()}</TabsContent>
            <TabsContent value="character">{renderCharacterTab()}</TabsContent>
            <TabsContent value="assessment">{renderAssessmentTab()}</TabsContent>
          </div>
        </Tabs>
      </div>

      <Dialog
        open={editingItem?.type === 'stem' || editingItem?.type === 'character'}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem?.type === 'stem' ? 'STEM domain' : 'Character trait'}</DialogTitle>
          </DialogHeader>
          <CompetencyForm
            title={editingItem?.data ? 'Edit item' : 'Add item'}
            item={editingItem?.data}
            defaultCategory={editingItem?.type === 'stem' ? 'STEM' : 'Character'}
            onCancel={() => setEditingItem(null)}
            onSave={(next) => {
              const existing = (coreCompetencies || []) as any[]
              const isEdit = Boolean(editingItem?.data?.id)
              const id = isEdit ? editingItem.data.id : (Math.max(0, ...existing.map((c) => c.id || 0)) + 1)
              const payload = { ...next, id }
              queryClient.setQueryData(['core-competencies'], (prev: any) => {
                const list: any[] = Array.isArray(prev) ? prev : []
                if (isEdit) return list.map((c) => (c.id === id ? { ...c, ...payload } : c))
                return [payload, ...list]
              })
              setEditingItem(null)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingItem?.type === 'assessment'}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null)
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Assessment framework</DialogTitle>
          </DialogHeader>
          <AssessmentForm
            item={editingItem?.data}
            onCancel={() => setEditingItem(null)}
            onSave={(next) => {
              setAssessmentFrameworks((prev) => {
                const isEdit = Boolean(next?.id)
                if (isEdit) {
                  return prev.map((f) => (f.id === next.id ? { ...f, ...next } : f))
                }
                const nextId = Math.max(0, ...prev.map((f) => f.id)) + 1
                return [{ id: nextId, name: next.name, type: next.type, is_active: next.is_active }, ...prev]
              })
              setEditingItem(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default GhanaEducationServiceFixed
