import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Target, Award, Users, BookOpen } from 'lucide-react';

interface MetricData {
  label: string;
  value: number;
  target: number;
  trend: { value: number; isPositive: boolean };
  color: string;
  icon: React.ReactNode;
}

interface PerformanceMetricsProps {
  className?: string;
  showTrends?: boolean;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  className = '',
  showTrends = true
}) => {
  const metrics: MetricData[] = [
    {
      label: 'Student Engagement',
      value: 87,
      target: 90,
      trend: { value: 5.2, isPositive: true },
      color: 'bg-blue-500',
      icon: <Users className="h-5 w-5" />
    },
    {
      label: 'Assignment Completion',
      value: 92,
      target: 95,
      trend: { value: 2.1, isPositive: true },
      color: 'bg-green-500',
      icon: <BookOpen className="h-5 w-5" />
    },
    {
      label: 'Average Test Scores',
      value: 78,
      target: 80,
      trend: { value: 1.8, isPositive: false },
      color: 'bg-yellow-500',
      icon: <Award className="h-5 w-5" />
    },
    {
      label: 'Learning Objectives Met',
      value: 85,
      target: 88,
      trend: { value: 3.4, isPositive: true },
      color: 'bg-purple-500',
      icon: <Target className="h-5 w-5" />
    }
  ];

  const getProgressColor = (value: number, target: number) => {
    const percentage = (value / target) * 100;
    if (percentage >= 95) return 'bg-green-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (value: number, target: number) => {
    const percentage = (value / target) * 100;
    if (percentage >= 95) return { text: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (percentage >= 80) return { text: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
        <CardDescription>Key performance indicators and progress tracking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.map((metric, index) => {
          const progressPercentage = (metric.value / metric.target) * 100;
          const status = getStatusBadge(metric.value, metric.target);
          
          return (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${metric.color} text-white`}>
                    {metric.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{metric.label}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-2xl font-bold text-gray-900">{metric.value}%</span>
                      <span className="text-sm text-gray-500">/ {metric.target}%</span>
                      {showTrends && (
                        <div className={`flex items-center text-sm ${
                          metric.trend.isPositive ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {metric.trend.isPositive ? (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 mr-1" />
                          )}
                          {metric.trend.value}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Badge className={status.color}>
                  {status.text}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress</span>
                  <span>{progressPercentage.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className="h-2"
                />
              </div>
            </div>
          );
        })}
        
        {/* Overall Performance Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Overall Performance</h4>
              <p className="text-sm text-gray-600">Based on all metrics</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(metrics.reduce((acc, m) => acc + (m.value / m.target) * 100, 0) / metrics.length)}%
              </p>
              <Badge className="bg-blue-100 text-blue-800">
                Above Average
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceMetrics;