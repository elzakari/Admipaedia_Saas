import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Badge } from '../../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { useToast } from '../../ui/use-toast'
import { useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject, useSubject } from '../../../hooks/useSubjects'
import { Subject, SubjectFilters } from '../../../types/subject.types'
import { useClasses } from '../../../hooks/useClasses'
import { useTeachers } from '../../../hooks/useTeachers'
import subjectService from '../../../services/subjectService'
import { Plus, Edit, Trash2, Eye, RefreshCw, Link2 } from 'lucide-react'
import { useDebounce } from '../../../hooks/useDebounce'
import { ADMIN_PRIMARY_BUTTON_CLASS, ADMIN_SECONDARY_BUTTON_CLASS } from '../../../lib/adminUi'
import { getClassDisplayName } from '../../../utils/formatters'

const PAGE_SIZES = [10, 25, 50, 100]
type SubjectFormData = Partial<Subject> & {
  department_id?: number
  assigned_class_ids?: number[]
  assigned_teacher_ids?: number[]
}

export default function SubjectsManagement() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [filters, setFilters] = useState<SubjectFilters>({ page: 1, per_page: 10, is_active: true })
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const query = useSubjects({ ...filters, search: debouncedSearch })

  const createMutation = useCreateSubject()
  const updateMutation = useUpdateSubject()
  const deleteMutation = useDeleteSubject()

  const detailQuery = useSubject(selectedId || 0)

  const syncSubjectAssignments = async (subjectId: number, data: SubjectFormData) => {
    const latest = await subjectService.getSubjectById(subjectId)
    const currentClassIds = new Set((latest.classes || []).map((item) => item.id))
    const currentTeacherIds = new Set((latest.teachers || []).map((item) => item.id))
    const desiredClassIds = new Set(data.assigned_class_ids || [])
    const desiredTeacherIds = new Set(data.assigned_teacher_ids || [])

    const classAssignments = Array.from(desiredClassIds)
      .filter((classId) => !currentClassIds.has(classId))
      .map((classId) => subjectService.assignClass(subjectId, classId))
    const classRemovals = Array.from(currentClassIds)
      .filter((classId) => !desiredClassIds.has(classId))
      .map((classId) => subjectService.removeClass(subjectId, classId))
    const teacherAssignments = Array.from(desiredTeacherIds)
      .filter((teacherId) => !currentTeacherIds.has(teacherId))
      .map((teacherId) => subjectService.assignTeacher(subjectId, teacherId))
    const teacherRemovals = Array.from(currentTeacherIds)
      .filter((teacherId) => !desiredTeacherIds.has(teacherId))
      .map((teacherId) => subjectService.removeTeacher(subjectId, teacherId))

    const results = await Promise.allSettled([
      ...classAssignments,
      ...classRemovals,
      ...teacherAssignments,
      ...teacherRemovals,
    ])

    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (failures.length > 0) {
      throw new Error(failures[0]?.reason?.message || 'Some subject assignment changes could not be saved')
    }
  }

  const handleCreate = (data: Partial<Subject>) => {
    if (!data.name || !data.code) {
      toast({
          title: t('common.validation_error', 'Validation Error'),
          description: t('admin_settings.subjects_name_code_req', 'Name and code are required'),
          variant: 'destructive',
          id: ''
      })
      return
    }
    createMutation.mutate(data as any, {
      onSuccess: async (subject) => {
        try {
          await syncSubjectAssignments(subject.id, data as SubjectFormData)
          toast({
              title: t('admin_settings.subject_created', 'Subject Created'),
              description: 'New subject added and timetable mappings saved successfully',
              id: ''
          })
          setIsFormOpen(false)
        } catch (error: any) {
          toast({
            title: 'Subject created with mapping issue',
            description: error?.message || 'Subject was created but class or teacher mapping failed',
            variant: 'destructive',
            id: ''
          })
        }
      },
      onError: (e: any) => toast({
          title: t('admin_settings.create_failed', 'Create Failed'),
          description: e?.message || t('common.error', 'Error'),
          variant: 'destructive',
          id: ''
      }),
    })
  }

  const handleUpdate = (id: number, data: Partial<Subject>) => {
    updateMutation.mutate({ id, data }, {
      onSuccess: async () => {
        try {
          await syncSubjectAssignments(id, data as SubjectFormData)
          toast({
              title: t('admin_settings.subject_updated', 'Subject Updated'),
              description: 'Changes saved successfully and timetable mappings updated',
              id: ''
          })
          setIsFormOpen(false)
          setEditing(null)
        } catch (error: any) {
          toast({
            title: 'Subject updated with mapping issue',
            description: error?.message || 'Subject details were saved but class or teacher mapping failed',
            variant: 'destructive',
            id: ''
          })
        }
      },
      onError: (e: any) => toast({
          title: t('admin_settings.update_failed_title', 'Update Failed'),
          description: e?.message || t('common.error', 'Error'),
          variant: 'destructive',
          id: ''
      }),
    })
  }

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({
            title: t('admin_settings.subject_deleted', 'Subject Deleted'),
            description: t('admin_settings.subject_deleted_desc', 'Subject removed successfully'),
            id: ''
        })
        setIsDeleteOpen(false)
        setSelectedId(null)
      },
      onError: (e: any) => toast({
          title: t('admin_settings.delete_failed', 'Delete Failed'),
          description: e?.message || t('common.error', 'Error'),
          variant: 'destructive',
          id: ''
      }),
    })
  }

  const subjectsData = query.data as { subjects: Subject[]; pagination: any } | undefined
  const subjects: Subject[] = subjectsData?.subjects || []
  const pagination = subjectsData?.pagination

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">{t('admin_settings.subjects', 'Subjects')}</CardTitle>
            <CardDescription>{t('admin_settings.subjects_desc', 'Manage subjects with search, filters, and bulk operations')}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input 
              placeholder={t('admin_settings.search_subjects_placeholder', 'Search by name, code...')} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-64" 
            />
            <Select value={String(filters.per_page)} onValueChange={(v) => setFilters((f) => ({ ...f, per_page: parseInt(v), page: 1 }))}>
              <SelectTrigger className="w-28"><SelectValue placeholder={t('common.page_size', 'Page size')} /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (<SelectItem key={s} value={String(s)}>{s}/{t('common.page', 'page')}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filters.is_active ? 'active' : 'inactive'} onValueChange={(v) => setFilters((f) => ({ ...f, is_active: v === 'active' }))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('common.active', 'Active')}</SelectItem>
                <SelectItem value="inactive">{t('common.inactive', 'Inactive')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { setEditing(null); setIsFormOpen(true) }} className={`flex items-center gap-2 ${ADMIN_PRIMARY_BUTTON_CLASS}`}>
              <Plus className="h-4 w-4" />{t('admin_settings.add_subject', 'Add Subject')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <div className="flex items-center gap-2 font-medium">
            <Link2 className="h-4 w-4" />
            Subject setup powers timetable setup
          </div>
          <div className="mt-1 text-blue-800">
            Assign each subject to its classes and teachers here so timetable creation only offers valid combinations.
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name', 'Name')}</TableHead>
                <TableHead>{t('common.code', 'Code')}</TableHead>
                <TableHead>{t('common.department', 'Department')}</TableHead>
                <TableHead>{t('admin_settings.credits', 'Credits')}</TableHead>
                <TableHead>{t('admin_settings.subject_status_col', 'Status')}</TableHead>
                <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s: Subject) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium cursor-pointer" onClick={() => { setSelectedId(s.id); setIsDetailOpen(true) }}>{s.name}</TableCell>
                  <TableCell>{s.code}</TableCell>
                  <TableCell>{s.department_name || s.department || '-'}</TableCell>
                  <TableCell>{(s as any).credits ?? s.credit_hours ?? '-'}</TableCell>
                  <TableCell>{s.is_active ? <Badge>{t('common.active', 'Active')}</Badge> : <Badge variant="secondary">{t('common.inactive', 'Inactive')}</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedId(s.id); setIsDetailOpen(true) }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setIsFormOpen(true) }}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setSelectedId(s.id); setIsDeleteOpen(true) }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {subjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    {query.isLoading ? t('common.loading', 'Loading...') : t('admin_settings.no_subjects_found', 'No subjects found')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{t('common.total', 'Total:')} {pagination?.total ?? 0}</div>
          <div className="flex gap-2 items-center">
                      <Button variant="outline" className={ADMIN_SECONDARY_BUTTON_CLASS} disabled={!pagination?.prev} onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (pagination?.prev || 1)) }))}>{t('common.prev', 'Prev')}</Button>
            <span className="text-sm">{t('common.page_display', 'Page {{page}} / {{pages}}', { page: pagination?.page ?? 1, pages: pagination?.pages ?? 1 })}</span>
            <Button variant="outline" className={ADMIN_SECONDARY_BUTTON_CLASS} disabled={!pagination?.next} onClick={() => setFilters((f) => ({ ...f, page: (pagination?.next || (pagination?.page || 1)) }))}>{t('common.next', 'Next')}</Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? t('admin_settings.edit_subject', 'Edit Subject') : t('admin_settings.add_subject', 'Add Subject')}</DialogTitle>
            <DialogDescription>{t('admin_settings.subject_details_desc', 'Provide subject details')}</DialogDescription>
          </DialogHeader>
          <SubjectForm editing={editing} onCancel={() => setIsFormOpen(false)} onSubmit={(data) => (editing ? handleUpdate(editing.id, data) : handleCreate(data))} submitting={createMutation.isPending || updateMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin_settings.subject_details', 'Subject Details')}</DialogTitle>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <div className="flex items-center justify-center h-24"><RefreshCw className="h-5 w-5 animate-spin" /></div>
          ) : detailQuery.data ? (
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">{t('common.name', 'Name')}:</span> {detailQuery.data.name}</div>
              <div><span className="font-medium">{t('common.code', 'Code')}:</span> {detailQuery.data.code}</div>
              <div><span className="font-medium">{t('common.department', 'Department')}:</span> {detailQuery.data.department_name || detailQuery.data.department || '-'}</div>
              <div><span className="font-medium">{t('admin_settings.credits', 'Credits')}:</span> {(detailQuery.data as any).credits ?? detailQuery.data.credit_hours ?? '-'}</div>
              <div><span className="font-medium">{t('super_admin.users.table.status', 'Status')}:</span> {detailQuery.data.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}</div>
              <div><span className="font-medium">{t('common.description', 'Description')}:</span> {detailQuery.data.description || '-'}</div>
              <div>
                <span className="font-medium">Assigned classes:</span>{' '}
                {(detailQuery.data.classes || []).length > 0
                  ? detailQuery.data.classes?.map((item) => item.display_name || item.name).join(', ')
                  : 'None'}
              </div>
              <div>
                <span className="font-medium">Assigned teachers:</span>{' '}
                {(detailQuery.data.teachers || []).length > 0
                  ? detailQuery.data.teachers?.map((item) => item.name).join(', ')
                  : 'None'}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{t('common.no_data', 'No data')}</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin_settings.delete_subject', 'Delete Subject')}</DialogTitle>
            <DialogDescription>{t('admin_settings.choose_delete_type', 'Choose delete type')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 flex flex-col">
            <Button variant="destructive" onClick={() => selectedId && handleDelete(selectedId)}>{t('admin_settings.hard_delete', 'Hard Delete')}</Button>
            <Button variant="outline" onClick={() => selectedId && handleUpdate(selectedId, { is_active: false })}>{t('admin_settings.soft_delete', 'Soft Delete (Deactivate)')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function SubjectForm({ editing, onSubmit, onCancel, submitting }: { editing: Subject | null; onSubmit: (data: SubjectFormData) => void; onCancel: () => void; submitting: boolean }) {
  const { t } = useTranslation()
  const detailQuery = useSubject(editing?.id || 0)
  const { data: classesData } = useClasses({ page: 1, per_page: 200 })
  const { data: teachersData } = useTeachers({ page: 1, per_page: 200, status: 'active' })
  const { data: disciplines = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['academic-structures', 'discipline'],
    queryFn: async () => {
      const { academicStructureService } = await import('../../../services/departmentService')
      return academicStructureService.getDisciplines()
    },
    staleTime: 5 * 60 * 1000,
  })
  const [data, setData] = useState<SubjectFormData>({
    name: editing?.name || '',
    code: editing?.code || '',
    description: editing?.description || '',
    department_id: (editing as any)?.department_id ?? undefined,
    credit_hours: editing?.credit_hours ?? (editing as any)?.credits ?? 0,
    is_active: editing?.is_active ?? true,
    assigned_class_ids: editing?.classes?.map((item) => item.id) || [],
    assigned_teacher_ids: editing?.teachers?.map((item) => item.id) || [],
  })
  const [classSearch, setClassSearch] = useState('')
  const [teacherSearch, setTeacherSearch] = useState('')

  useEffect(() => {
    const source = detailQuery.data || editing
    setData({
      name: source?.name || '',
      code: source?.code || '',
      description: source?.description || '',
      department_id: (source as any)?.department_id ?? undefined,
      credit_hours: source?.credit_hours ?? (source as any)?.credits ?? 0,
      is_active: source?.is_active ?? true,
      assigned_class_ids: source?.classes?.map((item) => item.id) || [],
      assigned_teacher_ids: source?.teachers?.map((item) => item.id) || [],
    })
  }, [detailQuery.data, editing])

  const classOptions = Array.isArray(classesData?.data) ? classesData.data : []
  const teacherOptions = Array.isArray(teachersData?.teachers) ? teachersData.teachers : []
  const normalizedClassSearch = classSearch.trim().toLowerCase()
  const normalizedTeacherSearch = teacherSearch.trim().toLowerCase()

  const filteredClassOptions = useMemo(() => {
    return classOptions.filter((classOption: any) => {
      const label = getClassDisplayName(classOption).toLowerCase()
      const gradeLevel = typeof classOption.grade_level === 'object' && classOption.grade_level !== null
        ? String(classOption.grade_level.name || '')
        : String(classOption.grade_level || '')
      return !normalizedClassSearch || label.includes(normalizedClassSearch) || gradeLevel.toLowerCase().includes(normalizedClassSearch)
    })
  }, [classOptions, normalizedClassSearch])

  const filteredTeacherOptions = useMemo(() => {
    return teacherOptions.filter((teacher: any) => {
      const label =
        teacher.full_name ||
        teacher.name ||
        `${teacher.first_name || teacher.user?.first_name || ''} ${teacher.last_name || teacher.user?.last_name || ''}`.trim() ||
        `Teacher ${teacher.id}`
      return !normalizedTeacherSearch || label.toLowerCase().includes(normalizedTeacherSearch)
    })
  }, [teacherOptions, normalizedTeacherSearch])

  const selectedClassLabels = useMemo(() => {
    return classOptions
      .filter((classOption: any) => (data.assigned_class_ids || []).includes(classOption.id))
      .map((classOption: any) => ({
        id: classOption.id,
        label: getClassDisplayName(classOption),
      }))
  }, [classOptions, data.assigned_class_ids])

  const selectedTeacherLabels = useMemo(() => {
    return teacherOptions
      .filter((teacher: any) => (data.assigned_teacher_ids || []).includes(teacher.id))
      .map((teacher: any) => ({
        id: teacher.id,
        label:
          teacher.full_name ||
          teacher.name ||
          `${teacher.first_name || teacher.user?.first_name || ''} ${teacher.last_name || teacher.user?.last_name || ''}`.trim() ||
          `Teacher ${teacher.id}`,
      }))
  }, [teacherOptions, data.assigned_teacher_ids])

  const toggleMultiSelect = (field: 'assigned_class_ids' | 'assigned_teacher_ids', value: number) => {
    setData((current) => {
      const existing = new Set(current[field] || [])
      if (existing.has(value)) {
        existing.delete(value)
      } else {
        existing.add(value)
      }
      return { ...current, [field]: Array.from(existing) }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('common.name', 'Name')}</Label>
          <Input value={data.name || ''} onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>{t('common.code', 'Code')}</Label>
          <Input value={data.code || ''} onChange={(e) => setData((d) => ({ ...d, code: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>{t('common.department', 'Discipline')}</Label>
          <select
            value={String((data as any).department_id ?? '')}
            onChange={(e) => setData((d) => ({ ...d, department_id: e.target.value ? Number(e.target.value) : undefined }))}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">{t('admin_settings.select_discipline', 'Select discipline…')}</option>
            {disciplines.map(dep => (
              <option key={dep.id} value={String(dep.id)}>{dep.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>{t('admin_settings.credit_hours', 'Credit Hours')}</Label>
          <Input type="number" value={Number(data.credit_hours || 0)} onChange={(e) => setData((d) => ({ ...d, credit_hours: Number(e.target.value) }))} />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>{t('common.description', 'Description')}</Label>
          <Input value={data.description || ''} onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))} />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Assigned Classes</Label>
          <Input
            value={classSearch}
            onChange={(e) => setClassSearch(e.target.value)}
            placeholder="Search classes or streams..."
          />
          {selectedClassLabels.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-md border border-dashed border-slate-200 px-3 py-2">
              {selectedClassLabels.map((classItem) => (
                <Badge key={classItem.id} variant="secondary">{classItem.label}</Badge>
              ))}
            </div>
          )}
          <div className="max-h-40 overflow-y-auto rounded-md border border-input p-3">
            {filteredClassOptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredClassOptions.map((cls: any) => (
                  <label key={cls.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={(data.assigned_class_ids || []).includes(cls.id)}
                      onChange={() => toggleMultiSelect('assigned_class_ids', cls.id)}
                    />
                    <span>{getClassDisplayName(cls)}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {classOptions.length > 0 ? 'No classes match this search' : 'No classes available'}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Only assigned classes or streams can use this subject in timetable setup.</p>
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Assigned Teachers</Label>
          <Input
            value={teacherSearch}
            onChange={(e) => setTeacherSearch(e.target.value)}
            placeholder="Search teachers..."
          />
          {selectedTeacherLabels.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-md border border-dashed border-slate-200 px-3 py-2">
              {selectedTeacherLabels.map((teacherItem) => (
                <Badge key={teacherItem.id} variant="secondary">{teacherItem.label}</Badge>
              ))}
            </div>
          )}
          <div className="max-h-48 overflow-y-auto rounded-md border border-input p-3">
            {filteredTeacherOptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredTeacherOptions.map((teacher: any) => {
                  const label = teacher.full_name || teacher.name || `${teacher.first_name || teacher.user?.first_name || ''} ${teacher.last_name || teacher.user?.last_name || ''}`.trim() || `Teacher ${teacher.id}`
                  return (
                    <label key={teacher.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(data.assigned_teacher_ids || []).includes(teacher.id)}
                        onChange={() => toggleMultiSelect('assigned_teacher_ids', teacher.id)}
                      />
                      <span>{label}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {teacherOptions.length > 0 ? 'No teachers match this search' : 'No teachers available'}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Only assigned teachers can be selected for timetable slots under this subject.</p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" className={ADMIN_SECONDARY_BUTTON_CLASS} onClick={onCancel}>{t('common.cancel', 'Cancel')}</Button>
        <Button className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={() => onSubmit(data)} disabled={submitting}>{submitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}</Button>
      </div>
    </div>
  )
}
