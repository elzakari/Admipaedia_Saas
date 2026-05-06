import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookCopy, CalendarClock, Download, Plus, RotateCcw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import libraryService, { BorrowRecord, LibraryBook, LibraryMember } from '../../services/libraryService'

const toCsv = (rows: Array<Record<string, any>>) => {
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
  const escape = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v)
    const needs = /[",\n]/.test(s)
    const escaped = s.replace(/"/g, '""')
    return needs ? `"${escaped}"` : escaped
  }
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(','))].join('\n')
}

const downloadCsv = (filename: string, rows: Array<Record<string, any>>) => {
  const csv = toCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const BorrowingSystem: React.FC<{ searchTerm?: string }> = ({ searchTerm }) => {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'current' | 'overdue' | 'history'>('current')
  const [search, setSearch] = useState('')

  const [issueOpen, setIssueOpen] = useState(false)
  const [issueForm, setIssueForm] = useState({ book_id: '', member_id: '' })

  const { data: currentResp, isLoading: currentLoading } = useQuery({
    queryKey: ['library', 'borrow', 'active', search],
    queryFn: () => libraryService.getBorrowRecords({ page: 1, per_page: 200, status: 'active', search: search.trim() || undefined })
  })

  const { data: overdueResp, isLoading: overdueLoading } = useQuery({
    queryKey: ['library', 'borrow', 'overdue', search],
    queryFn: () => libraryService.getBorrowRecords({ page: 1, per_page: 200, status: 'overdue', search: search.trim() || undefined })
  })

  const { data: historyResp, isLoading: historyLoading } = useQuery({
    queryKey: ['library', 'borrow', 'returned', search],
    queryFn: () => libraryService.getBorrowRecords({ page: 1, per_page: 200, status: 'returned', search: search.trim() || undefined })
  })

  const { data: booksResp } = useQuery({
    queryKey: ['library', 'books', 'available'],
    queryFn: () => libraryService.getBooks({ page: 1, per_page: 200, available_only: true })
  })

  const { data: membersResp } = useQuery({
    queryKey: ['library', 'members'],
    queryFn: () => libraryService.getMembers({ page: 1, per_page: 200, is_active: true })
  })

  const books = (booksResp?.books || []) as LibraryBook[]
  const members = (membersResp?.members || []) as LibraryMember[]

  const current = (currentResp?.borrow_records || []) as BorrowRecord[]
  const overdue = (overdueResp?.borrow_records || []) as BorrowRecord[]
  const history = (historyResp?.borrow_records || []) as BorrowRecord[]

  const activeList = tab === 'current' ? current : tab === 'overdue' ? overdue : history
  const isLoading = tab === 'current' ? currentLoading : tab === 'overdue' ? overdueLoading : historyLoading

  const issueMutation = useMutation({
    mutationFn: async () => {
      const book_id = Number(issueForm.book_id)
      const member_id = Number(issueForm.member_id)
      if (!book_id || !member_id) throw new Error('Select a book and member')
      return libraryService.borrowBook({ book_id, member_id })
    },
    onSuccess: () => {
      toast.success('Book issued')
      setIssueOpen(false)
      queryClient.invalidateQueries({ queryKey: ['library', 'borrow'] })
      queryClient.invalidateQueries({ queryKey: ['library', 'books'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to issue')
  })

  const returnMutation = useMutation({
    mutationFn: async (borrow_record_id: number) => {
      return libraryService.returnBook({ borrow_record_id })
    },
    onSuccess: () => {
      toast.success('Book returned')
      queryClient.invalidateQueries({ queryKey: ['library', 'borrow'] })
      queryClient.invalidateQueries({ queryKey: ['library', 'books'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to return')
  })

  const openIssue = () => {
    setIssueForm({ book_id: '', member_id: '' })
    setIssueOpen(true)
  }

  useEffect(() => {
    const handler = () => {
      setTab('current')
      openIssue()
    }
    window.addEventListener('library:issueBook', handler)
    return () => window.removeEventListener('library:issueBook', handler)
  }, [])

  const exportCurrent = () => {
    downloadCsv(`library_borrow_${tab}.csv`, activeList.map((r) => ({
      id: r.id,
      book: r.book_title,
      member: r.member_name,
      member_code: r.member_code,
      status: r.status,
      borrow_date: r.borrow_date,
      due_date: r.due_date,
      return_date: r.return_date,
      fine: r.fine
    })))
    toast.success('Exported records')
  }

  useEffect(() => {
    if (searchTerm === undefined) return
    setSearch(searchTerm)
  }, [searchTerm])

  const badgeForStatus = (s: string) => {
    const v = (s || '').toLowerCase()
    if (v === 'active') return <Badge className="bg-indigo-100 text-indigo-800">Active</Badge>
    if (v === 'overdue') return <Badge className="bg-rose-100 text-rose-800">Overdue</Badge>
    if (v === 'returned') return <Badge className="bg-emerald-100 text-emerald-800">Returned</Badge>
    return <Badge className="bg-slate-100 text-slate-800">{s}</Badge>
  }

  const bookOptions = useMemo(() => {
    return books.map((b) => ({ id: b.id, label: `${b.title} • ${b.author} (${b.available_copies ?? 0}/${b.total_copies ?? 0})` }))
  }, [books])

  const memberOptions = useMemo(() => {
    return members.map((m) => {
      const fn = m.user?.first_name || ''
      const ln = m.user?.last_name || ''
      const name = `${fn} ${ln}`.trim() || `User ${m.user_id}`
      return { id: m.id, label: `${name} • ${m.member_id}` }
    })
  }, [members])

  return (
    <Card className="bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><BookCopy className="h-5 w-5" /> Borrowing</CardTitle>
            <CardDescription>Issue, return, and track borrowed books</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCurrent}><Download className="h-4 w-4 mr-2" /> Export</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openIssue}><Plus className="h-4 w-4 mr-2" /> Issue Book</Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <TabsList>
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search book, member, ISBN" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => { setSearch(''); queryClient.invalidateQueries({ queryKey: ['library', 'borrow'] }) }}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </div>

          <TabsContent value="current" className="mt-0">
            <BorrowTable
              isLoading={currentLoading}
              rows={current}
              badgeForStatus={badgeForStatus}
              onReturn={(id) => returnMutation.mutate(id)}
              returning={returnMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="overdue" className="mt-0">
            <BorrowTable
              isLoading={overdueLoading}
              rows={overdue}
              badgeForStatus={badgeForStatus}
              onReturn={(id) => returnMutation.mutate(id)}
              returning={returnMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <BorrowTable
              isLoading={historyLoading}
              rows={history}
              badgeForStatus={badgeForStatus}
              onReturn={(id) => returnMutation.mutate(id)}
              returning={returnMutation.isPending}
            />
          </TabsContent>
        </Tabs>

        <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Issue book</DialogTitle>
              <DialogDescription>Select a book and member to issue.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Book</Label>
                <Select value={issueForm.book_id} onValueChange={(v) => setIssueForm((p) => ({ ...p, book_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select book" /></SelectTrigger>
                  <SelectContent>
                    {bookOptions.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Member</Label>
                <Select value={issueForm.member_id} onValueChange={(v) => setIssueForm((p) => ({ ...p, member_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {memberOptions.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">Members are library members (not student IDs).</div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={issueMutation.isPending} onClick={() => issueMutation.mutate()}>
                {issueMutation.isPending ? 'Issuing…' : 'Issue'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

const BorrowTable = ({
  isLoading,
  rows,
  badgeForStatus,
  onReturn,
  returning
}: {
  isLoading: boolean
  rows: BorrowRecord[]
  badgeForStatus: (s: string) => React.ReactNode
  onReturn: (id: number) => void
  returning: boolean
}) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-slate-700">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-slate-200">Book</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-slate-200">Member</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-slate-200">Dates</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-slate-200">Status</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-slate-200">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {isLoading ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No records.</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-white">{r.book_title}</div>
                  <div className="text-xs text-muted-foreground">#{r.book_id}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-white">{r.member_name}</div>
                  <div className="text-xs text-muted-foreground">{r.member_code} • {r.member_type}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="h-4 w-4" />
                    <span>Borrowed: {r.borrow_date?.slice(0, 10) || '—'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Due: {r.due_date?.slice(0, 10) || '—'}</div>
                  {r.return_date ? <div className="text-xs text-muted-foreground mt-1">Returned: {r.return_date.slice(0, 10)}</div> : null}
                </td>
                <td className="px-4 py-3">
                  {badgeForStatus(r.status)}
                  {r.fine > 0 ? <div className="text-xs text-rose-600 mt-1">Fine: {r.fine}</div> : null}
                </td>
                <td className="px-4 py-3 text-right">
                  {(r.status || '').toLowerCase() === 'active' || (r.status || '').toLowerCase() === 'overdue' ? (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={returning}
                      onClick={() => onReturn(r.id)}
                    >
                      Return
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default BorrowingSystem
