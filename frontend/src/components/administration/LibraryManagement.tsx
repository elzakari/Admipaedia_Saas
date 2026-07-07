import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query'
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
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="borrowers">Borrowers</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="books" className="space-y-4">
          {/* Books controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search books..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[220px] bg-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {derivedCategories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={() => navigate('/library')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Book
            </Button>
          </div>
          
          {/* Books table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>ISBN</TableHead>
                    <TableHead>Copies</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {booksLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">Loading…</TableCell>
                    </TableRow>
                  ) : books.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">No books found.</TableCell>
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
                            Open Library
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
            <h3 className="text-lg font-medium">Book Borrowers</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  exportCsv('library_borrowers.csv', borrowRecords as any);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => navigate('/library')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Issue Book
              </Button>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Borrow Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {borrowersLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">Loading…</TableCell>
                    </TableRow>
                  ) : borrowRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">No borrow records.</TableCell>
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
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {r.status !== 'returned' && (
                            <Button variant="outline" size="sm" onClick={() => navigate('/library')}>
                              Return
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
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Book Categories</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {booksLoading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : derivedCategories.length === 0 ? (
              <div className="text-sm text-gray-500">No categories yet (add books to create categories).</div>
            ) : derivedCategories.map((category) => (
              <Card key={category.id}>
                <CardHeader className="pb-2">
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription>Derived from book inventory</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-500">{category.books} books</span>
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
              <h3 className="text-lg font-medium">Library Statistics</h3>
              <p className="text-sm text-gray-500">Live overview aligned with the main Library workspace.</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/library')}>
              Open Full Library
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
                  <p className="text-sm text-gray-500">Total Books</p>
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
                  <p className="text-sm text-gray-500">Available Books</p>
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
                  <p className="text-sm text-gray-500">Registered Members</p>
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
                  <p className="text-sm text-gray-500">Overdue Books</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Borrowing Activity</CardTitle>
                <CardDescription>Latest member transactions from the live library ledger</CardDescription>
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
                          {record.status}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Borrowed {record.borrow_date ? record.borrow_date.slice(0, 10) : '—'} • Due {record.due_date ? record.due_date.slice(0, 10) : '—'}
                      </div>
                    </div>
                  ))}
                  {borrowRecords.length === 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                      Borrowing activity will appear here after books are issued.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Inventory by Category</CardTitle>
                <CardDescription>Derived from the current admin book inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {derivedCategories.slice(0, 6).map((category) => {
                    const ratio = books.length > 0 ? Math.round((category.books / books.length) * 100) : 0;
                    return (
                      <div key={category.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-900">{category.name}</span>
                          <span className="text-slate-500">{category.books} books</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${Math.max(ratio, category.books ? 8 : 0)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {derivedCategories.length === 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                      Categories will appear after books are added to inventory.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Books</CardTitle>
              <CardDescription>Books with highest circulation</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Times Borrowed</TableHead>
                    <TableHead>Last Borrowed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {popularLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">Loading…</TableCell>
                    </TableRow>
                  ) : popularBooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">No circulation data yet.</TableCell>
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
