"use client";

import React, { useState } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  BookOpen,
  FileText,
  BarChart4,
  Users,
  Calendar,
  GraduationCap,
  Search,
  Filter,
  Download,
  Plus,
  Menu,
  Grid,
  List
} from 'lucide-react';

// UI Components
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { TouchFriendlyButton } from '../../components/common/TouchFriendlyButton';

// Academic Components
import ClassRecords from '../../components/academics/ClassRecords';
import ExamManagement from '../../components/academics/ExamManagement';
import ScoresDashboard from '../../components/academics/ScoresDashboard';

export function AcademicsPage() {
  // === State Management ===
  const [activeTab, setActiveTab] = useState('class-records');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // === Responsive Design ===
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1023px)');
  const isSmallMobile = useMediaQuery('(max-width: 480px)');

  // === Render Functions ===
  const renderActions = () => (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search academics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <TouchFriendlyButton
          variant="outline"
          size={isMobile ? "sm" : "md"}
          onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
        >
          {viewMode === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
          {!isSmallMobile && <span className="ml-2">{viewMode === 'list' ? 'Grid' : 'List'}</span>}
        </TouchFriendlyButton>
        
        <TouchFriendlyButton
          variant="outline"
          size={isMobile ? "sm" : "md"}
        >
          <Filter className="h-4 w-4" />
          {!isSmallMobile && <span className="ml-2">Filter</span>}
        </TouchFriendlyButton>
        
        <TouchFriendlyButton
          variant="primary"
          size={isMobile ? "sm" : "md"}
        >
          <Download className="h-4 w-4" />
          {!isSmallMobile && <span className="ml-2">Export</span>}
        </TouchFriendlyButton>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academics</h1>
          <p className="text-gray-600">Manage academic records, exams, and performance analytics</p>
        </div>
        {renderActions()}
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Academic Management</CardTitle>
            <CardDescription>
              Comprehensive academic management system for classes, exams, and student performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full ${
                isMobile ? 'grid-cols-1 h-auto' : 'grid-cols-3'
              }`}>
                <TabsTrigger 
                  value="class-records" 
                  className={`${isMobile ? 'justify-start py-3' : 'min-w-[140px]'}`}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Class Records
                </TabsTrigger>
                <TabsTrigger 
                  value="exam-management" 
                  className={`${isMobile ? 'justify-start py-3' : 'min-w-[140px]'}`}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Exam Management
                </TabsTrigger>
                <TabsTrigger 
                  value="scores-dashboard" 
                  className={`${isMobile ? 'justify-start py-3' : 'min-w-[140px]'}`}
                >
                  <BarChart4 className="h-4 w-4 mr-2" />
                  Scores Dashboard
                </TabsTrigger>
              </TabsList>

              <TabsContent value="class-records" className="mt-6">
                <ClassRecords />
              </TabsContent>

              <TabsContent value="exam-management" className="mt-6">
                <ExamManagement />
              </TabsContent>

              <TabsContent value="scores-dashboard" className="mt-6">
                <ScoresDashboard />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AcademicsPage;