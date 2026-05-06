import React, { useState } from 'react';
import { ClassList } from '../components/classes/ClassList';
import { ClassDetails } from '../components/classes/ClassDetails';
import { ClassFilters } from '../components/classes/ClassFilters';
import { ClassAttendance } from '../components/classes/ClassAttendance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ClassAttendanceAnalytics } from '../components/classes/ClassAttendanceAnalytics';
import { AttendanceCalendar } from '../components/classes/AttendanceCalendar';
import ResponsiveLayout from '../components/layout/ResponsiveLayout';
import Header from '../components/layout/Header';
import SidebarNav from '../components/layout/Sidebar';
import Footer from '../components/layout/Footer';
import { TouchFriendlyButton } from '../components/common/TouchFriendlyButton';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function ClassesPage() {
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [gradeLevel, setGradeLevel] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const isMobile = useMediaQuery('(max-width: 640px)');

  const handleClassSelected = (classId: number) => {
    setSelectedClassId(classId);
    setActiveTab('details');
  };

  return (
    <ResponsiveLayout
      headerContent={<Header />}
      sidebarContent={<SidebarNav isOpen={false} toggleSidebar={function (): void {
        throw new Error('Function not implemented.');
      } } />}
      footerContent={<Footer />}
      showResponsiveHelper={process.env.NODE_ENV === 'development'}
    >
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold">Class Management</h1>
          
          <TouchFriendlyButton 
            variant="primary" 
            size={isMobile ? "lg" : "md"}
            onClick={() => {/* Add class action */}}
          >
            Add Class
          </TouchFriendlyButton>
        </div>
        
        <ClassFilters
          gradeLevel={gradeLevel}
          academicYear={academicYear}
          onGradeLevelChange={setGradeLevel}
          onAcademicYearChange={setAcademicYear}
        />
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="list">Class List</TabsTrigger>
            {selectedClassId && (
              <>
                <TabsTrigger value="details">Class Details</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
              </>
            )}
          </TabsList>
          
          <TabsContent value="list" className="space-y-4">
            <ClassList
              gradeFilter={gradeLevel}
              academicYearFilter={academicYear}
              onClassSelected={handleClassSelected}
            />
          </TabsContent>
          
          {selectedClassId && (
            <>
              <TabsContent value="details">
                <ClassDetails classId={selectedClassId} />
              </TabsContent>
              <TabsContent value="attendance">
                <ClassAttendance classId={selectedClassId} />
              </TabsContent>
              <TabsContent value="analytics">
                <ClassAttendanceAnalytics classId={selectedClassId} />
              </TabsContent>
              <TabsContent value="calendar">
                <AttendanceCalendar classId={selectedClassId} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
}
