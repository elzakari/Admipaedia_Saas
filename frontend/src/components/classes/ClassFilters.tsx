import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useTranslation } from 'react-i18next';

interface ClassFiltersProps {
  gradeLevel: string;
  academicYear: string;
  onGradeLevelChange: (value: string) => void;
  onAcademicYearChange: (value: string) => void;
}

export function ClassFilters({
  gradeLevel,
  academicYear,
  onGradeLevelChange,
  onAcademicYearChange,
}: ClassFiltersProps) {
  const { t } = useTranslation();
  // Generate academic years (current year - 5 to current year + 5)
  const currentYear = new Date().getFullYear();
  const academicYears = Array.from({ length: 11 }, (_, i) => {
    const year = currentYear - 5 + i;
    return `${year}-${year + 1}`;
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="grade-level">{t('admin_academic.grade_level', 'Grade Level')}</Label>
            <Select value={gradeLevel || "all"} onValueChange={(val) => onGradeLevelChange(val === "all" ? "" : val)}>
              <SelectTrigger id="grade-level">
                <SelectValue placeholder={t('attendance_page.all_grades', 'All Grades')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('attendance_page.all_grades', 'All Grades')}</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {t('attendance_page.grade_num', 'Grade {{num}}', { num: i + 1 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="academic-year">{t('admin_academic.academic_year', 'Academic Year')}</Label>
            <Select value={academicYear || "all"} onValueChange={(val) => onAcademicYearChange(val === "all" ? "" : val)}>
              <SelectTrigger id="academic-year">
                <SelectValue placeholder={t('attendance_page.all_years', 'All Years')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('attendance_page.all_years', 'All Years')}</SelectItem>
                {academicYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}