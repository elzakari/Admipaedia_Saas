import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "../../components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { 
  BookOpen, 
  Search, 
  PlusCircle, 
  Download,
  ArrowRight,
  User,
  Calendar,
  BookMarked,
} from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import libraryService from '@/services/libraryService'

const LibraryManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('books');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const { data: booksResp, isLoading: booksLoading } = useQuery({
    queryKey: ['library-books', searchTerm, categoryFilter],
    queryFn: () =>
      libraryService.getBooks({
        page: 1,
        per_page: 100,
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(categoryFilter !== 'All' ? { category: categoryFilter } : {}),
      }),
  })

  const books = booksResp?.books || []

  const { data: borrowResp, isLoading: borrowersLoading } = useQuery({
    queryKey: ['library-borrow-records'],
    queryFn: () => libraryService.getBorrowRecords({ page: 1, per_page: 50 }),
  })

  const borrowRecords = borrowResp?.borrow_records || []

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['library-stats'],
    queryFn: () => libraryService.getLibraryStats(),
  })

  const { data: popularBooks = [], isLoading: popularLoading } = useQuery({
    queryKey: ['library-popular-books'],
    queryFn: () => libraryService.getPopularBooks(10),
  })

  const exportCsv = (filename: string, rows: Array<Record<string, any>>) => {
    const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const escape = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      const needs = /[",\n]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needs ? `"${escaped}"` : escaped;
    };
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const derivedCategories = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of books) {
      const key = (b.category || 'Uncategorized').trim() || 'Uncategorized'
      map.set(key, (map.get(key) || 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, count], idx) => ({ id: idx + 1, name, books: count }))
      .sort((a, b) => b.books - a.books)
  }, [books])

  const availableBooksCount = useMemo(() => {
    return books.reduce((sum, b) => sum + Number(b.available_copies || 0), 0)
  }, [books])

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="books">{t('admin_library.books_tab', 'Books')}</TabsTrigger>
          <TabsTrigger value="borrowers">{t('admin_library.borrowers_tab', 'Borrowers')}</TabsTrigger>
          <TabsTrigger value="categories">{t('admin_library.categories_tab', 'Categories')}</TabsTrigger>
          <TabsTrigger value="statistics">{t('admin_library.statistics_tab', 'Statistics')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="books" className="space-y-4">
          {/* Books controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder={t('admin_library.search_books_placeholder', 'Search books...')}
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[220px] bg-white">
                  <SelectValue placeholder={t('admin_library.all_categories', 'All Categories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t('admin_library.all_categories', 'All Categories')}</SelectItem>
                  {derivedCategories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={() => navigate('/library')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('admin_library.add_book', 'Add Book')}
            </Button>
          </div>
          
          {/* Books table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin_library.table_title', 'Title')}</TableHead>
                    <TableHead>{t('admin_library.table_author', 'Author')}</TableHead>
                    <TableHead>{t('admin_library.table_category', 'Category')}</TableHead>
                    <TableHead>{t('admin_library.table_isbn', 'ISBN')}</TableHead>
                    <TableHead>{t('admin_library.table_copies', 'Copies')}</TableHead>
                    <TableHead>{t('admin_library.table_available', 'Available')}</TableHead>
                    <TableHead>{t('admin_library.table_location', 'Location')}</TableHead>
                    <TableHead className="text-right">{t('admin_library.table_actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {booksLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">{t('admin_library.loading', 'Loading...')}</TableCell>
                    </TableRow>
                  ) : books.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">{t('admin_library.no_books_found', 'No books found.')}</TableCell>
                    </TableRow>
                  ) : books.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell className="font-medium">{book.title}</TableCell>
                      <TableCell>{book.author}</TableCell>
                      <TableCell>{book.category || '—'}</TableCell>
                      <TableCell>{book.isbn || '—'}</TableCell>
                      <TableCell>{book.total_copies ?? '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (book.available_copies || 0) === 0
                              ? 'destructive'
                              : (book.total_copies || 0) > 0 && (book.available_copies || 0) < (book.total_copies || 0) / 2
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {book.available_copies ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell>{book.shelf_location || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigate('/library');
                            }}
                          >
                            {t('admin_library.open_library', 'Open Library')}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="borrowers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{t('admin_library.book_borrowers_title', 'Book Borrowers')}</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  exportCsv('library_borrowers.csv', borrowRecords as any);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                {t('admin_library.export', 'Export')}
              </Button>
              <Button onClick={() => navigate('/library')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('admin_library.issue_book', 'Issue Book')}
              </Button>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin_library.table_student', 'Student')}</TableHead>
                    <TableHead>{t('admin_library.table_grade', 'Grade')}</TableHead>
                    <TableHead>{t('admin_library.table_book', 'Book')}</TableHead>
                    <TableHead>{t('admin_library.table_borrow_date', 'Borrow Date')}</TableHead>
                    <TableHead>{t('admin_library.table_due_date', 'Due Date')}</TableHead>
                    <TableHead>{t('admin_library.table_status', 'Status')}</TableHead>
                    <TableHead className="text-right">{t('admin_library.table_actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {borrowersLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">{t('admin_library.loading', 'Loading...')}</TableCell>
                    </TableRow>
                  ) : borrowRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">{t('admin_library.no_borrow_records', 'No borrow records.')}</TableCell>
                    </TableRow>
                  ) : borrowRecords.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.member_name || r.member_code}</TableCell>
                      <TableCell>{r.member_type || '—'}</TableCell>
                      <TableCell>{r.book_title}</TableCell>
                      <TableCell>{r.borrow_date ? r.borrow_date.slice(0, 10) : '—'}</TableCell>
                      <TableCell>{r.due_date ? r.due_date.slice(0, 10) : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'overdue' ? 'destructive' : r.status === 'returned' ? 'success' : 'default'}>
                          {r.status === 'returned' ? t('admin_library.status_returned', 'returned') : r.status === 'overdue' ? t('admin_library.status_overdue', 'overdue') : t('admin_library.status_issued', 'issued')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {r.status !== 'returned' && (
                            <Button variant="outline" size="sm" onClick={() => navigate('/library')}>
                              {t('admin_library.return_action', 'Return')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsConten        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{t('admin_library.book_categories', 'Book Categories')}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {booksLoading ? (
              <div className="text-sm text-gray-500">{t('admin_library.loading', 'Loading...')}</div>
            ) : derivedCategories.length === 0 ? (
              <div className="text-sm text-gray-500">{t('admin_library.no_categories_yet', 'No categories yet (add books to create categories).')}</div>
            ) : derivedCategories.map((category) => (
              <Card key={category.id}>
                <CardHeader className="pb-2">
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription>{t('admin_library.derived_from_inventory', 'Derived from book inventory')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-500">{t('admin_library.books_count', '{{count}} books', { count: category.books })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="statistics" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium">{t('admin_library.library_statistics_title', 'Library Statistics')}</h3>
              <p className="text-sm text-gray-500">{t('admin_library.statistics_desc', 'Live overview aligned with the main Library workspace.')}</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/library')}>
              {t('admin_library.open_full_library', 'Open Full Library')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-blue-100 p-3 mb-4">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold">{statsLoading ? '—' : (stats?.totalBooks ?? 0)}</h3>
                  <p className="text-sm text-gray-500">{t('admin_library.total_books', 'Total Books')}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-green-100 p-3 mb-4">
                    <BookMarked className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold">{statsLoading ? '—' : availableBooksCount}</h3>
                  <p className="text-sm text-gray-500">{t('admin_library.available_books', 'Available Books')}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-amber-100 p-3 mb-4">
                    <User className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-bold">{statsLoading ? '—' : (stats?.totalMembers ?? 0)}</h3>
                  <p className="text-sm text-gray-500">{t('admin_library.registered_members', 'Registered Members')}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-red-100 p-3 mb-4">
                    <Calendar className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold">{statsLoading ? '—' : (stats?.totalOverdue ?? 0)}</h3>
                  <p className="text-sm text-gray-500">{t('admin_library.overdue_books_stat', 'Overdue Books')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin_library.recent_borrowing_activity', 'Recent Borrowing Activity')}</CardTitle>
                <CardDescription>{t('admin_library.recent_borrowing_desc', 'Latest member transactions from the live library ledger')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {borrowRecords.slice(0, 6).map((record) => (
                    <div key={record.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-900">{record.book_title}</div>
                          <div className="text-sm text-slate-500">{record.member_name || record.member_code}</div>
                        </div>
                        <Badge variant={record.status === 'overdue' ? 'destructive' : record.status === 'returned' ? 'success' : 'default'}>
                          {record.status === 'returned' ? t('admin_library.status_returned', 'returned') : record.status === 'overdue' ? t('admin_library.status_overdue', 'overdue') : t('admin_library.status_issued', 'issued')}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {t('admin_library.borrowed_due_label', 'Borrowed {{borrowDate}} • Due {{dueDate}}', {
                          borrowDate: record.borrow_date ? record.borrow_date.slice(0, 10) : '—',
                          dueDate: record.due_date ? record.due_date.slice(0, 10) : '—'
                        })}
                      </div>
                    </div>
                  ))}
                  {borrowRecords.length === 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                      {t('admin_library.no_recent_borrowing_activity', 'Borrowing activity will appear here after books are issued.')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{t('admin_library.inventory_by_category', 'Inventory by Category')}</CardTitle>
                <CardDescription>{t('admin_library.inventory_by_category_desc', 'Derived from the current admin book inventory')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {derivedCategories.slice(0, 6).map((category) => {
                    const ratio = books.length > 0 ? Math.round((category.books / books.length) * 100) : 0;
                    return (
                      <div key={category.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-900">{category.name}</span>
                          <span className="text-slate-500">{t('admin_library.books_count', '{{count}} books', { count: category.books })}</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${Math.max(ratio, category.books ? 8 : 0)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {derivedCategories.length === 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                      {t('admin_library.no_categories_invent', 'Categories will appear after books are added to inventory.')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_library.popular_books_title', 'Most Popular Books')}</CardTitle>
              <CardDescription>{t('admin_library.popular_books_circ_desc', 'Books with highest circulation')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin_library.table_title', 'Title')}</TableHead>
                    <TableHead>{t('admin_library.table_author', 'Author')}</TableHead>
                    <TableHead>{t('admin_library.table_category', 'Category')}</TableHead>
                    <TableHead>{t('admin_library.table_times_borrowed', 'Times Borrowed')}</TableHead>
                    <TableHead>{t('admin_library.table_last_borrowed', 'Last Borrowed')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {popularLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">{t('admin_library.loading', 'Loading...')}</TableCell>
                    </TableRow>
                  ) : popularBooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">{t('admin_library.no_circulation_data', 'No circulation data yet.')}</TableCell>
                    </TableRow>
                  ) : popularBooks.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.title}</TableCell>
                      <TableCell>{b.author}</TableCell>
                      <TableCell>{b.category}</TableCell>
                      <TableCell>{b.borrowCount}</TableCell>
                      <TableCell>—</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LibraryManagement;
