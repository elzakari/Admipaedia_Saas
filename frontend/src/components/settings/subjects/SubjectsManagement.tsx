import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Badge } from '../../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { useToast } from '../../ui/use-toast'
import { useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject, useSubject } from '../../../hooks/useSubjects'
import { Subject, SubjectFilters } from '../../../types/subject.types'
import { Plus, Edit, Trash2, Eye, RefreshCw } from 'lucide-react'

const PAGE_SIZES = [10, 25, 50, 100]

export default function SubjectsManagement() {
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
          title: 'Validation Error', description: 'Name and code are required', variant: 'destructive',
          id: ''
      })
      return
    }
    createMutation.mutate(data as any, {
      onSuccess: () => {
        toast({
            title: 'Subject Created', description: 'New subject added successfully',
            id: ''
        })
        setIsFormOpen(false)
      },
      onError: (e: any) => toast({
          title: 'Create Failed', description: e?.message || 'Error', variant: 'destructive',
          id: ''
      }),
    })
  }

  const handleUpdate = (id: number, data: Partial<Subject>) => {
    updateMutation.mutate({ id, data }, {
      onSuccess: () => {
        toast({
            title: 'Subject Updated', description: 'Changes saved successfully',
            id: ''
        })
        setIsFormOpen(false)
        setEditing(null)
      },
      onError: (e: any) => toast({
          title: 'Update Failed', description: e?.message || 'Error', variant: 'destructive',
          id: ''
      }),
    })
  }

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({
            title: 'Subject Deleted', description: 'Subject removed successfully',
            id: ''
        })
        setIsDeleteOpen(false)
        setSelectedId(null)
      },
      onError: (e: any) => toast({
          title: 'Delete Failed', description: e?.message || 'Error', variant: 'destructive',
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">Subjects</CardTitle>
            <CardDescription>Manage subjects with search, filters, and bulk operations</CardDescription>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Search by name, code..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
            <Select value={String(filters.per_page)} onValueChange={(v) => setFilters((f) => ({ ...f, per_page: parseInt(v), page: 1 }))}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Page size" /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (<SelectItem key={s} value={String(s)}>{s}/page</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filters.is_active ? 'active' : 'inactive'} onValueChange={(v) => setFilters((f) => ({ ...f, is_active: v === 'active' }))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { setEditing(null); setIsFormOpen(true) }} className="flex items-center gap-2"><Plus className="h-4 w-4" />Add Subject</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s: Subject) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium cursor-pointer" onClick={() => { setSelectedId(s.id); setIsDetailOpen(true) }}>{s.name}</TableCell>
                  <TableCell>{s.code}</TableCell>
                  <TableCell>{s.department || '-'}</TableCell>
                  <TableCell>{(s as any).credits ?? s.credit_hours ?? '-'}</TableCell>
                  <TableCell>{s.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
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
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">{query.isLoading ? 'Loading...' : 'No subjects found'}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Total: {pagination?.total ?? 0}</div>
          <div className="flex gap-2 items-center">
            <Button variant="outline" disabled={!pagination?.prev} onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (pagination?.prev || 1)) }))}>Prev</Button>
            <span className="text-sm">Page {pagination?.page ?? 1} / {pagination?.pages ?? 1}</span>
            <Button variant="outline" disabled={!pagination?.next} onClick={() => setFilters((f) => ({ ...f, page: (pagination?.next || (pagination?.page || 1)) }))}>Next</Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
            <DialogDescription>Provide subject details</DialogDescription>
          </DialogHeader>
          <SubjectForm editing={editing} onCancel={() => setIsFormOpen(false)} onSubmit={(data) => (editing ? handleUpdate(editing.id, data) : handleCreate(data))} submitting={createMutation.isPending || updateMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subject Details</DialogTitle>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <div className="flex items-center justify-center h-24"><RefreshCw className="h-5 w-5 animate-spin" /></div>
          ) : detailQuery.data ? (
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {detailQuery.data.name}</div>
              <div><span className="font-medium">Code:</span> {detailQuery.data.code}</div>
              <div><span className="font-medium">Department:</span> {detailQuery.data.department || '-'}</div>
              <div><span className="font-medium">Credits:</span> {(detailQuery.data as any).credits ?? detailQuery.data.credit_hours ?? '-'}</div>
              <div><span className="font-medium">Status:</span> {detailQuery.data.is_active ? 'Active' : 'Inactive'}</div>
              <div><span className="font-medium">Description:</span> {detailQuery.data.description || '-'}</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No data</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subject</DialogTitle>
            <DialogDescription>Choose delete type</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button variant="destructive" onClick={() => selectedId && handleDelete(selectedId)}>Hard Delete</Button>
            <Button variant="outline" onClick={() => selectedId && handleUpdate(selectedId, { is_active: false })}>Soft Delete (Deactivate)</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function SubjectForm({ editing, onSubmit, onCancel, submitting }: { editing: Subject | null; onSubmit: (data: Partial<Subject>) => void; onCancel: () => void; submitting: boolean }) {
  const [data, setData] = useState<Partial<Subject>>({
    name: editing?.name || '',
    code: editing?.code || '',
    description: editing?.description || '',
    department: editing?.department || '',
    credit_hours: editing?.credit_hours ?? (editing as any)?.credits ?? 0,
    is_active: editing?.is_active ?? true,
  })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={data.name || ''} onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Code</Label>
          <Input value={data.code || ''} onChange={(e) => setData((d) => ({ ...d, code: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Input value={data.department || ''} onChange={(e) => setData((d) => ({ ...d, department: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Credit Hours</Label>
          <Input type="number" value={Number(data.credit_hours || 0)} onChange={(e) => setData((d) => ({ ...d, credit_hours: Number(e.target.value) }))} />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Description</Label>
          <Input value={data.description || ''} onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit(data)} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
      </div>
    </div>
  )
}

