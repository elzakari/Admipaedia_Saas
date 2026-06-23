import React, { useMemo, useState } from 'react'
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
import { Plus, Edit, Trash2, Eye, RefreshCw } from 'lucide-react'

const PAGE_SIZES = [10, 25, 50, 100]
type SubjectFormData = Partial<Subject> & { department_id?: number }

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

  const debouncedSearch = useMemo(() => search, [search])
  const query = useSubjects({ ...filters, search: debouncedSearch })

  const createMutation = useCreateSubject()
  const updateMutation = useUpdateSubject()
  const deleteMutation = useDeleteSubject()

  const detailQuery = useSubject(selectedId || 0)

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
      onSuccess: () => {
        toast({
            title: t('admin_settings.subject_created', 'Subject Created'),
            description: t('admin_settings.subject_created_desc', 'New subject added successfully'),
            id: ''
        })
        setIsFormOpen(false)
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
      onSuccess: () => {
        toast({
            title: t('admin_settings.subject_updated', 'Subject Updated'),
            description: t('common.changes_saved', 'Changes saved successfully'),
            id: ''
        })
        setIsFormOpen(false)
        setEditing(null)
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
            <Button onClick={() => { setEditing(null); setIsFormOpen(true) }} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />{t('admin_settings.add_subject', 'Add Subject')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
                  <TableCell>{s.department || '-'}</TableCell>
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
            <Button variant="outline" disabled={!pagination?.prev} onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (pagination?.prev || 1)) }))}>{t('common.prev', 'Prev')}</Button>
            <span className="text-sm">{t('common.page_display', 'Page {{page}} / {{pages}}', { page: pagination?.page ?? 1, pages: pagination?.pages ?? 1 })}</span>
            <Button variant="outline" disabled={!pagination?.next} onClick={() => setFilters((f) => ({ ...f, page: (pagination?.next || (pagination?.page || 1)) }))}>{t('common.next', 'Next')}</Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
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
              <div><span className="font-medium">{t('common.department', 'Department')}:</span> {detailQuery.data.department || '-'}</div>
              <div><span className="font-medium">{t('admin_settings.credits', 'Credits')}:</span> {(detailQuery.data as any).credits ?? detailQuery.data.credit_hours ?? '-'}</div>
              <div><span className="font-medium">{t('super_admin.users.table.status', 'Status')}:</span> {detailQuery.data.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}</div>
              <div><span className="font-medium">{t('common.description', 'Description')}:</span> {detailQuery.data.description || '-'}</div>
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
  })
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
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>{t('common.cancel', 'Cancel')}</Button>
        <Button onClick={() => onSubmit(data)} disabled={submitting}>{submitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}</Button>
      </div>
    </div>
  )
}
