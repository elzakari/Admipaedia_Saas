import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BookOpen, Download, Edit, Eye, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import libraryService, { LibraryBook } from '../../services/libraryService'

const categories = [
  'fiction',
  'non_fiction',
  'textbook',
  'reference',
  'biography',
  'science',
  'history',
  'mathematics',
  'literature',
  'children'
]

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

const formatCategory = (c?: string, t?: any) => {
  if (!c) return '—'
  if (t) {
    const fallback = c.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    return t(`admin_library.category_${c}`, fallback)
  }
  return c.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

const statusBadge = (b: LibraryBook, t: any) => {
  const a = Number(b.available_copies || 0)
  const total = Number(b.total_copies || 0)
  if (total > 0 && a <= 0) return <Badge className="bg-rose-100 text-rose-800">{t('admin_library.status_out', 'Out')}</Badge>
  if (total > 0 && a < total) return <Badge className="bg-amber-100 text-amber-800">{t('admin_library.status_low', 'Low')}</Badge>
  return <Badge className="bg-emerald-100 text-emerald-800">{t('admin_library.status_in', 'In')}</Badge>
}

const emptyBookForm = (): Partial<LibraryBook> => ({
  title: '',
  author: '',
  isbn: '',
  category: 'fiction',
  publisher: '',
  publication_year: undefined,
  edition: '',
  shelf_location: '',
  total_copies: 1,
  description: ''
})

const BookInventory: React.FC<{ searchTerm?: string }> = ({ searchTerm }) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [availability, setAvailability] = useState<'all' | 'available'>('all')

  const [editorOpen, setEditorOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selected, setSelected] = useState<LibraryBook | null>(null)
  const [form, setForm] = useState<Partial<LibraryBook>>(emptyBookForm())

  const { data, isLoading } = useQuery({
    queryKey: ['library', 'books', search, category, availability],
    queryFn: () =>
      libraryService.getBooks({
        page: 1,
        per_page: 200,
        search: search.trim() || undefined,
        category: category === 'all' ? undefined : category,
        available_only: availability === 'available'
      })
  })

  const books = (data?.books || []) as LibraryBook[]

  useEffect(() => {
    if (searchTerm === undefined) return
    setSearch(searchTerm)
  }, [searchTerm])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.title?.trim() || !form.author?.trim()) throw new Error(t('admin_library.error_title_author_required', 'Title and author are required'))
      const payload: any = {
        title: form.title?.trim(),
        author: form.author?.trim(),
        isbn: form.isbn || undefined,
        category: form.category || undefined,
        publisher: form.publisher || undefined,
        publication_year: form.publication_year ? Number(form.publication_year) : undefined,
        edition: form.edition || undefined,
        shelf_location: form.shelf_location || undefined,
        total_copies: Number(form.total_copies || 1),
        description: form.description || undefined
      }
      return libraryService.createBook(payload)
    },
    onSuccess: () => {
      toast.success(t('admin_library.book_added', 'Book added'))
      setEditorOpen(false)
      queryClient.invalidateQueries({ queryKey: ['library', 'books'] })
    },
    onError: (e: any) => toast.error(e?.message || e?.response?.data?.message || t('admin_library.failed_add_book', 'Failed to add book'))
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error(t('admin_library.error_no_book_selected', 'No book selected'))
      const payload: any = {
        title: form.title,
        author: form.author,
        isbn: form.isbn || undefined,
        category: form.category || undefined,
        publisher: form.publisher || undefined,
        publication_year: form.publication_year ? Number(form.publication_year) : undefined,
        edition: form.edition || undefined,
        shelf_location: form.shelf_location || undefined,
        total_copies: form.total_copies !== undefined ? Number(form.total_copies) : undefined,
        description: form.description || undefined
      }
      return libraryService.updateBook(selected.id, payload)
    },
    onSuccess: () => {
      toast.success(t('admin_library.book_updated', 'Book updated'))
      setEditorOpen(false)
      queryClient.invalidateQueries({ queryKey: ['library', 'books'] })
    },
    onError: (e: any) => toast.error(e?.message || e?.response?.data?.message || t('admin_library.failed_update_book', 'Failed to update book'))
  })

  const deleteMutation = useMutation({
    mutationFn: async (bookId: number) => {
      await libraryService.deleteBook(bookId)
    },
    onSuccess: () => {
      toast.success(t('admin_library.book_deleted', 'Book deleted'))
      queryClient.invalidateQueries({ queryKey: ['library', 'books'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('admin_library.failed_delete_book', 'Failed to delete book'))
  })

  const openCreate = () => {
    setSelected(null)
    setForm(emptyBookForm())
    setEditorOpen(true)
  }

  useEffect(() => {
    const handler = () => openCreate()
    window.addEventListener('library:addBook', handler)
    return () => window.removeEventListener('library:addBook', handler)
  }, [])

  const exportBooks = () => {
    downloadCsv('library_books.csv', books.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      isbn: b.isbn || '',
      category: b.category || '',
      total_copies: b.total_copies || 0,
      available_copies: b.available_copies || 0,
      shelf_location: b.shelf_location || ''
    })))
    toast.success(t('admin_library.exported_books', 'Exported books'))
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> {t('admin_library.book_inventory', 'Book Inventory')}</CardTitle>
            <CardDescription>{t('admin_library.inventory_desc', 'Manage books, copies and availability')}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportBooks}>
              <Download className="h-4 w-4 mr-2" /> {t('admin_library.export', 'Export')}
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> {t('admin_library.add_book', 'Add Book')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={t('admin_library.search_books_placeholder', 'Search title, author, ISBN')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder={t('admin_library.category', 'Category')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin_library.all_categories', 'All categories')}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{formatCategory(c, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={availability} onValueChange={(v) => setAvailability(v as any)}>
            <SelectTrigger><SelectValue placeholder={t('admin_library.availability', 'Availability')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin_library.all', 'All')}</SelectItem>
              <SelectItem value="available">{t('admin_library.available_only', 'Available only')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-slate-200">{t('admin_library.book', 'Book')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-slate-200">{t('admin_library.category', 'Category')}</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-slate-200">{t('admin_library.copies', 'Copies')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-slate-200">{t('admin_library.status', 'Status')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-slate-200">{t('admin_library.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t('admin_library.loading', 'Loading…')}</td></tr>
              ) : books.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t('admin_library.no_books_found', 'No books found.')}</td></tr>
              ) : (
                books.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{b.title}</div>
                      <div className="text-xs text-muted-foreground">{b.author}{b.isbn ? ` • ISBN ${b.isbn}` : ''}</div>
                    </td>
                    <td className="px-4 py-3">{formatCategory(b.category, t)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium">{b.available_copies ?? 0}</span>
                      <span className="text-muted-foreground">/{b.total_copies ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(b, t)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(b); setViewerOpen(true) }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelected(b)
                            setForm({
                              title: b.title,
                              author: b.author,
                              isbn: b.isbn || '',
                              category: b.category || 'fiction',
                              publisher: b.publisher || '',
                              publication_year: b.publication_year || undefined,
                              edition: b.edition || '',
                              shelf_location: b.shelf_location || '',
                              total_copies: b.total_copies || 1,
                              description: b.description || ''
                            })
                            setEditorOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-600 hover:text-rose-700"
                          onClick={() => {
                            if (!confirm(t('admin_library.confirm_delete_book', 'Delete this book?'))) return
                            deleteMutation.mutate(b.id)
                          }}
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

        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('admin_library.book_details', 'Book details')}</DialogTitle>
              <DialogDescription>{t('admin_library.view_book_info_desc', 'View full information for this book.')}</DialogDescription>
            </DialogHeader>
            {selected ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">{t('admin_library.title_label', 'Title')}</div>
                  <div className="font-medium">{selected.title}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('admin_library.author_label', 'Author')}</div>
                  <div className="font-medium">{selected.author}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('admin_library.category_label', 'Category')}</div>
                  <div className="font-medium">{formatCategory(selected.category, t)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('admin_library.shelf_label', 'Shelf')}</div>
                  <div className="font-medium">{selected.shelf_location || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('admin_library.copies_label', 'Copies')}</div>
                  <div className="font-medium">{selected.available_copies ?? 0}/{selected.total_copies ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('admin_library.isbn_label', 'ISBN')}</div>
                  <div className="font-medium">{selected.isbn || '—'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-muted-foreground">{t('admin_library.description_label', 'Description')}</div>
                  <div className="text-sm">{selected.description || '—'}</div>
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewerOpen(false)}>{t('admin_library.close', 'Close')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selected ? t('admin_library.edit_book', 'Edit book') : t('admin_library.add_book', 'Add book')}</DialogTitle>
              <DialogDescription>{t('admin_library.book_form_desc', 'Provide book details and save.')}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>{t('admin_library.title_label', 'Title')}</Label>
                <Input value={String(form.title || '')} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t('admin_library.author_label', 'Author')}</Label>
                <Input value={String(form.author || '')} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin_library.isbn_label', 'ISBN')}</Label>
                <Input value={String(form.isbn || '')} onChange={(e) => setForm((p) => ({ ...p, isbn: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin_library.category_label', 'Category')}</Label>
                <Select value={String(form.category || 'fiction')} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{formatCategory(c, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('admin_library.publisher_label', 'Publisher')}</Label>
                <Input value={String(form.publisher || '')} onChange={(e) => setForm((p) => ({ ...p, publisher: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin_library.publication_year_label', 'Publication year')}</Label>
                <Input
                  type="number"
                  value={form.publication_year === undefined ? '' : String(form.publication_year)}
                  onChange={(e) => setForm((p) => ({ ...p, publication_year: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin_library.edition_label', 'Edition')}</Label>
                <Input value={String(form.edition || '')} onChange={(e) => setForm((p) => ({ ...p, edition: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin_library.shelf_location_label', 'Shelf location')}</Label>
                <Input value={String(form.shelf_location || '')} onChange={(e) => setForm((p) => ({ ...p, shelf_location: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin_library.total_copies_label', 'Total copies')}</Label>
                <Input
                  type="number"
                  value={form.total_copies === undefined ? '' : String(form.total_copies)}
                  onChange={(e) => setForm((p) => ({ ...p, total_copies: e.target.value ? Number(e.target.value) : 1 }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t('admin_library.description_label', 'Description')}</Label>
                <Input value={String(form.description || '')} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>{t('admin_library.cancel', 'Cancel')}</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={createMutation.isPending || updateMutation.isPending}
                onClick={() => {
                  if (selected) updateMutation.mutate();
                  else createMutation.mutate();
                }}
              >
                {selected ? (updateMutation.isPending ? t('admin_library.saving', 'Saving…') : t('admin_library.save_changes', 'Save changes')) : (createMutation.isPending ? t('admin_library.saving', 'Saving…') : t('admin_library.add_book', 'Add book'))}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default BookInventory
