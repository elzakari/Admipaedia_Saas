import React, { useState } from 'react';
import { useClassAttendanceSummary } from '../../hooks/useClassAttendance';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ShadcnCalendar } from "../ui/shadcn-calendar";
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface AttendanceCalendarProps {
  classId: number;
}

export function AttendanceCalendar({ classId }: AttendanceCalendarProps) {
  const { t } = useTranslation();
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
  const { data: attendanceSummary, isLoading } = useClassAttendanceSummary(classId, {
    year: month.getFullYear(),
    month: month.getMonth() + 1
  });
  
  // Determine the dominant status of a day
  const getDayStatus = (day: Date): 'present' | 'absent' | 'late' | null => {
    if (!attendanceSummary?.daily) return null;
    
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayData = attendanceSummary.daily[dateStr];
    
    if (!dayData) return null;
    
    const { present = 0, absent = 0, late = 0 } = dayData;
    const total = present + absent + late;
    
    if (total === 0) return null;
    
    if (absent > present && absent > late) {
      return 'absent';
    } else if (late > present && late > absent) {
      return 'late';
    } else {
      return 'present';
    }
  };

  const isPresentDay = (day: Date) => getDayStatus(day) === 'present';
  const isAbsentDay = (day: Date) => getDayStatus(day) === 'absent';
  const isLateDay = (day: Date) => getDayStatus(day) === 'late';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('attendance_page.calendar_title', 'Attendance Calendar')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">{t('attendance_page.loading_calendar', 'Loading calendar...')}</div>
        ) : (
          <>
            <ShadcnCalendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={month}
              onMonthChange={setMonth}
              className="rounded-md border"
              modifiers={{
                presentDay: isPresentDay,
                absentDay: isAbsentDay,
                lateDay: isLateDay
              }}
              modifiersClassNames={{
                presentDay: "bg-green-100 text-green-800 font-semibold",
                absentDay: "bg-red-100 text-red-800 font-semibold",
                lateDay: "bg-yellow-100 text-yellow-800 font-semibold"
              }}
            />
            
            {selectedDate && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="mt-4">
                    {t('attendance_page.view_details_for', 'View Details for {{date}}', { date: format(selectedDate, 'PPP') })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">{t('attendance_page.attendance_summary', 'Attendance Summary')}</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-green-100 rounded">
                        <div className="font-bold text-green-800">
                          {attendanceSummary?.daily?.[format(selectedDate, 'yyyy-MM-dd')]?.present || 0}
                        </div>
                        <div className="text-xs">{t('attendance_page.status_present', 'Present')}</div>
                      </div>
                      <div className="text-center p-2 bg-red-100 rounded">
                        <div className="font-bold text-red-800">
                          {attendanceSummary?.daily?.[format(selectedDate, 'yyyy-MM-dd')]?.absent || 0}
                        </div>
                        <div className="text-xs">{t('attendance_page.status_absent', 'Absent')}</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-100 rounded">
                        <div className="font-bold text-yellow-800">
                          {attendanceSummary?.daily?.[format(selectedDate, 'yyyy-MM-dd')]?.late || 0}
                        </div>
                        <div className="text-xs">{t('attendance_page.status_late', 'Late')}</div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}