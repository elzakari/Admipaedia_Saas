import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
            <Label htmlFor="grade-level">Grade Level</Label>
            <Select value={gradeLevel || "all"} onValueChange={(val) => onGradeLevelChange(val === "all" ? "" : val)}>
              <SelectTrigger id="grade-level">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    Grade {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="academic-year">Academic Year</Label>
            <Select value={academicYear || "all"} onValueChange={(val) => onAcademicYearChange(val === "all" ? "" : val)}>
              <SelectTrigger id="academic-year">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
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