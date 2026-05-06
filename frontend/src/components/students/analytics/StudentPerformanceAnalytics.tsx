import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Award, AlertTriangle, Target } from 'lucide-react';
import studentAnalyticsService, { StudentPerformanceMetrics } from '../../../services/studentAnalyticsService';
import { useApiCall } from '../../../hooks/useApiCall';

interface StudentPerformanceAnalyticsProps {
  studentId: number;
}

const StudentPerformanceAnalytics: React.FC<StudentPerformanceAnalyticsProps> = ({ studentId }) => {
  const [dateRange, setDateRange] = useState('current_term');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  
  const { data: performanceData, isLoading, error, execute: fetchPerformanceData } = useApiCall(
    () => {
      const range = dateRange === 'current_term' ? undefined : {
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      };
      return studentAnalyticsService.getStudentPerformanceMetrics(studentId, range);
    },
    { immediate: true }
  );

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 80) return 'text-green-600 bg-green-100';
    if (grade >= 70) return 'text-blue-600 bg-blue-100';
    if (grade >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const filteredGradeTrends = selectedSubject === 'all' 
    ? performanceData?.grade_trends || []
    : performanceData?.grade_trends.filter(trend => trend.subject === selectedSubject) || [];

  const radarData = performanceData?.subject_performance.map(subject => ({
    subject: subject.subject,
    current: subject.current_grade,
    previous: subject.previous_grade,
    class_average: 75 // This would come from API
  })) || [];

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading performance analytics...</div>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load performance analytics</p>
            <Button onClick={fetchPerformanceData} className="mt-2">Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_term">Current Term</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            <SelectItem value="current_year">Current Year</SelectItem>
            <SelectItem value="all_time">All Time</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {performanceData?.subject_performance.map(subject => (
              <SelectItem key={subject.subject} value={subject.subject}>
                {subject.subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overall Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Grade</p>
                <p className="text-2xl font-bold">{performanceData?.overall_grade}%</p>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Predicted Final</p>
                <p className="text-2xl font-bold">{performanceData?.performance_prediction.predicted_final_grade}%</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Confidence Level</p>
              <div className="flex items-center mt-1">
                <Progress value={performanceData?.performance_prediction.confidence || 0} className="flex-1" />
                <span className="ml-2 text-sm font-medium">{performanceData?.performance_prediction.confidence}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Subjects</p>
              <p className="text-2xl font-bold">{performanceData?.subject_performance.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredGradeTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="grade" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Subject Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceData?.subject_performance.map((subject, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{subject.subject}</span>
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(subject.trend)}
                        <Badge className={getGradeColor(subject.current_grade)}>
                          {subject.current_grade}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Rank: #{subject.rank_in_class}</span>
                      <span>Previous: {subject.previous_grade}%</span>
                    </div>
                    <Progress value={subject.current_grade} className="mt-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Current" dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Previous" dataKey="previous" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Improvement Areas */}
      {performanceData?.performance_prediction.improvement_areas && performanceData.performance_prediction.improvement_areas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Areas for Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {performanceData.performance_prediction.improvement_areas.map((area, index) => (
                <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-yellow-800">{area}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentPerformanceAnalytics;