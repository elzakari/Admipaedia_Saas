import React, { useState } from 'react';
import { useClassAttendanceSummary } from '../../hooks/useClassAttendance';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ShadcnCalendar } from "../ui/shadcn-calendar";
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { DayClickEventHandler, Matcher } from 'react-day-picker';

interface AttendanceCalendarProps {
  classId: number;
}

export function AttendanceCalendar({ classId }: AttendanceCalendarProps) {
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
  const { data: attendanceSummary, isLoading } = useClassAttendanceSummary(classId, {
    year: month.getFullYear(),
    month: month.getMonth() + 1
  });
  
  // Generate calendar day modifiers based on attendance data
  const getDayClassNames = (day: Date) => {
    if (!attendanceSummary?.daily) return "";
    
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayData = attendanceSummary.daily[dateStr];
    
    if (!dayData) return "";
    
    // Calculate which status has the highest count
    const { present = 0, absent = 0, late = 0 } = dayData;
    const total = present + absent + late;
    
    if (total === 0) return "";
    
    if (absent > present && absent > late) {
      return "bg-red-100 text-red-800";
    } else if (late > present && late > absent) {
      return "bg-yellow-100 text-yellow-800";
    } else {
      return "bg-green-100 text-green-800";
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">Loading calendar...</div>
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
                customDay: (date) => true
              }}
              modifiersClassNames={{
                // Fix: Call the function with the date parameter
                customDay: (date) => getDayClassNames(date)
              }}
            />
            
            {selectedDate && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="mt-4">
                    View Details for {format(selectedDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">Attendance Summary</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-green-100 rounded">
                        <div className="font-bold text-green-800">
                          {attendanceSummary?.daily?.[format(selectedDate, 'yyyy-MM-dd')]?.present || 0}
                        </div>
                        <div className="text-xs">Present</div>
                      </div>
                      <div className="text-center p-2 bg-red-100 rounded">
                        <div className="font-bold text-red-800">
                          {attendanceSummary?.daily?.[format(selectedDate, 'yyyy-MM-dd')]?.absent || 0}
                        </div>
                        <div className="text-xs">Absent</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-100 rounded">
                        <div className="font-bold text-yellow-800">
                          {attendanceSummary?.daily?.[format(selectedDate, 'yyyy-MM-dd')]?.late || 0}
                        </div>
                        <div className="text-xs">Late</div>
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