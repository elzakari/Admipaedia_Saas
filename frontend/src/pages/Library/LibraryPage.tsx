import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Search, Book, BookOpen, Library, FileText, BarChart2, Plus, Download, Upload, QrCode } from 'lucide-react';
import BookInventory from '../../components/library/BookInventory';
import BorrowingSystem from '../../components/library/BorrowingSystem';
import DigitalLibrary from '../../components/library/DigitalLibrary';
import LibraryReports from '../../components/library/LibraryReports';
import PageHeader from '../../components/common/PageHeader';
import libraryService from '../../services/libraryService';
import { toast } from 'sonner';

const LibraryPage = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['library', 'stats'],
    queryFn: () => libraryService.getLibraryStats()
  });

  const formatNumber = (v: any) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return '—'
    return n.toLocaleString()
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <PageHeader 
        title="Library Management" 
        description="Manage physical and digital library resources, track borrowing, and generate reports"
        icon={<Library className="h-6 w-6 text-primary" />}
      />

      <div className="mt-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Books</p>
                <h3 className="text-2xl font-bold">{formatNumber(stats?.totalBooks)}</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-full">
                <Book className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Books Borrowed</p>
                <h3 className="text-2xl font-bold">{formatNumber(stats?.totalBorrowed)}</h3>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <BookOpen className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Library Members</p>
                <h3 className="text-2xl font-bold">{formatNumber(stats?.totalMembers)}</h3>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Books</p>
                <h3 className="text-2xl font-bold">{formatNumber(stats?.totalOverdue)}</h3>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <BarChart2 className="h-6 w-6 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="inventory" className="flex items-center">
                <Book className="mr-2 h-4 w-4" />
                Book Inventory
              </TabsTrigger>
              <TabsTrigger value="borrowing" className="flex items-center">
                <BookOpen className="mr-2 h-4 w-4" />
                Borrowing System
              </TabsTrigger>
              <TabsTrigger value="digital" className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                Digital Library
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center">
                <BarChart2 className="mr-2 h-4 w-4" />
                Reports
              </TabsTrigger>
            </TabsList>

            <div className="flex w-full md:w-auto gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search library..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {activeTab === 'inventory' && (
                <Button
                  className="glass-button"
                  onClick={() => {
                    setActiveTab('inventory');
                    window.dispatchEvent(new CustomEvent('library:addBook'));
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Book
                </Button>
              )}
              {activeTab === 'digital' && (
                <Button className="glass-button" onClick={() => toast.info('Digital library upload is not connected yet')}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Resource
                </Button>
              )}
              {activeTab === 'inventory' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const v = prompt('Scan/enter ISBN or keyword');
                    if (!v) return;
                    setSearchTerm(v);
                  }}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan
                </Button>
              )}
              {activeTab === 'borrowing' && (
                <Button
                  className="glass-button"
                  onClick={() => window.dispatchEvent(new CustomEvent('library:issueBook'))}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Issue Book
                </Button>
              )}
              {activeTab === 'reports' && (
                <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('library:exportReport'))}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="inventory" className="space-y-4">
            <BookInventory searchTerm={searchTerm} />
          </TabsContent>
          
          <TabsContent value="borrowing" className="space-y-4">
            <BorrowingSystem searchTerm={searchTerm} />
          </TabsContent>
          
          <TabsContent value="digital" className="space-y-4">
            <DigitalLibrary searchTerm={searchTerm} />
          </TabsContent>
          
          <TabsContent value="reports" className="space-y-4">
            <LibraryReports />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LibraryPage;
