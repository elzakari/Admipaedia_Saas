import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Calendar, TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import studentAnalyticsService, { AttendanceAnalytics } from '../../../services/studentAnalyticsService';
import { useApiCall } from '../../../hooks/useApiCall';

interface AttendanceHeatmapProps {
  studentId: number;
}

const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = ({ studentId }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const { data: attendanceData, isLoading, error, execute: fetchAttendanceData } = useApiCall(
    () => {
      const range = {
        from: new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0],
        to: new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]
      };
      return studentAnalyticsService.getStudentAttendanceAnalytics(studentId, range);
    },
    { immediate: true }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'late': return 'bg-yellow-500';
      case 'absent': return 'bg-red-500';
      case 'excused': return 'bg-blue-500';
      default: return 'bg-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const generateCalendarDays = () => {
    const year = selectedYear;
    const month = selectedMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const attendanceRecord = attendanceData?.heatmap_data.find(record => record.date === dateStr);
      days.push({
        day,
        date: dateStr,
        status: attendanceRecord?.status || null,
        isWeekend: new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6
      });
    }
    
    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading attendance data...</div>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load attendance data</p>
            <Button onClick={fetchAttendanceData} className="mt-2">Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const calendarDays = generateCalendarDays();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {monthNames.map((month, index) => (
              <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Attendance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Rate</p>
                <p className="text-2xl font-bold text-green-600">{attendanceData?.overall_rate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Punctuality</p>
                <p className="text-2xl font-bold text-blue-600">{attendanceData?.patterns.punctuality_score}%</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Consecutive Absences</p>
                <p className="text-2xl font-bold text-red-600">{attendanceData?.patterns.consecutive_absences}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold">
                {attendanceData?.monthly_breakdown.find(m => m.month.includes(monthNames[selectedMonth]))?.rate.toFixed(1) || 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Heatmap Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Attendance Calendar - {monthNames[selectedMonth]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
              <span>Present</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
              <span>Late</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
              <span>Absent</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
              <span>Excused</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
              <span>No School</span>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                {day}
              </div>
            ))}
            
            {calendarDays.map((day, index) => (
              <div key={index} className="aspect-square">
                {day ? (
                  <div 
                    className={`w-full h-full flex items-center justify-center text-sm font-medium rounded cursor-pointer transition-all hover:scale-105 ${
                      day.isWeekend 
                        ? 'bg-gray-100 text-gray-400'
                        : day.status 
                          ? `${getStatusColor(day.status)} text-white`
                          : 'bg-gray-200 text-gray-600'
                    }`}
                    title={day.status ? `${day.date}: ${day.status}` : day.date}
                  >
                    {day.day}
                  </div>
                ) : (
                  <div></div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Attendance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData?.monthly_breakdown || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="rate" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Patterns */}
      {attendanceData?.patterns.frequent_absence_days && attendanceData.patterns.frequent_absence_days.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Frequent Absence Days</h4>
                <div className="flex flex-wrap gap-2">
                  {attendanceData.patterns.frequent_absence_days.map((day, index) => (
                    <Badge key={index} variant="outline" className="bg-red-50 text-red-700">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceHeatmap;