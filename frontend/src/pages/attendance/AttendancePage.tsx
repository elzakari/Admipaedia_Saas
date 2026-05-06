import React, { useState } from 'react';
import { ClassList } from '../../components/classes/ClassList';
import { ClassAttendance } from '../../components/classes/ClassAttendance';
import { ClassFilters } from '../../components/classes/ClassFilters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AttendancePage() {
  const { t } = useTranslation();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [gradeLevel, setGradeLevel] = useState('');
  const [academicYear, setAcademicYear] = useState('');

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
        <ClassAttendance classId={selectedClassId} />
      )}
    </div>
  );
}
