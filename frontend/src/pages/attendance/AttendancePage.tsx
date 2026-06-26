import React, { useState } from 'react';
import { ClassList } from '../../components/classes/ClassList';
import { ClassAttendance } from '../../components/classes/ClassAttendance';
import { ClassAttendanceAnalytics } from '../../components/classes/ClassAttendanceAnalytics';
import { AttendanceCalendar } from '../../components/classes/AttendanceCalendar';
import { ClassFilters } from '../../components/classes/ClassFilters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useClass } from '../../hooks/useClasses';
import { CalendarDays, ChevronLeft, ClipboardCheck, LineChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AttendancePage() {
  const { t } = useTranslation();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [gradeLevel, setGradeLevel] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const { data: selectedClass } = useClass(selectedClassId || 0);

  const handleClassSelected = (classId: number) => {
    setSelectedClassId(classId);
  };

  const handleBackToList = () => {
    setSelectedClassId(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-4">
          {selectedClassId && (
            <Button variant="ghost" size="icon" onClick={handleBackToList}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-2xl font-bold">{t('navigation.attendance')}</h1>
        </div>
      </div>

      {!selectedClassId ? (
        <div className="space-y-6">
          <ClassFilters
            gradeLevel={gradeLevel}
            academicYear={academicYear}
            onGradeLevelChange={setGradeLevel}
            onAcademicYearChange={setAcademicYear}
          />
          <Card>
            <CardHeader>
              <CardTitle>{t('classes.select_class_title', 'Select a Class')}</CardTitle>
              <CardDescription>
                {t('classes.select_class_description', 'Choose a class to manage daily attendance records.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClassList
                gradeFilter={gradeLevel}
                academicYearFilter={academicYear}
                onClassSelected={handleClassSelected}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedClass?.name || t('navigation.attendance')}</CardTitle>
              <CardDescription>
                Refined attendance workflow for daily registers, saved history review, and class-wide attendance insights.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                    Daily Register
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mark every student explicitly, reload saved attendance by date, and update the same register safely.
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <LineChart className="h-4 w-4 text-indigo-600" />
                    Analytics
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Review attendance patterns and identify absences, lateness, and recovery trends for the selected class.
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <CalendarDays className="h-4 w-4 text-indigo-600" />
                    Calendar Review
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Inspect saved attendance activity across the month before making adjustments to the daily register.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <ClassAttendance classId={selectedClassId} />

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <ClassAttendanceAnalytics classId={selectedClassId} />
            <AttendanceCalendar classId={selectedClassId} />
          </div>
        </div>
      )}
    </div>
  );
}
