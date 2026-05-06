import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Clock,
  Target,
  Brain,
  Lightbulb,
  AlertCircle
} from 'lucide-react';
import { AITeacherService, TeacherAIInsights } from '../../../services/aiTeacherService';

interface TeacherAnalyticsDashboardProps {
  teacherId: number;
}

export function TeacherAnalyticsDashboard({ teacherId }: TeacherAnalyticsDashboardProps) {
  const [insights, setInsights] = useState<TeacherAIInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        setError(null);
        const data = await AITeacherService.generateTeacherInsights(teacherId);
        setInsights(data);
      } catch (error: any) {
        console.error('Failed to load AI insights:', error);
        if (error.response && error.response.status === 403) {
          setError("You don't have permission to access these analytics. Please contact an administrator.");
        } else {
          setError("Failed to load AI insights. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, [teacherId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-center">
        <p className="text-red-700">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => {
            setLoading(true);
            setError(null);
            AITeacherService.generateTeacherInsights(teacherId)
              .then(setInsights)
              .catch(error => {
                if (error.response && error.response.status === 403) {
                  setError("You don't have permission to access these analytics. Please contact an administrator.");
                } else {
                  setError("Failed to load AI insights. Please try again later.");
                }
              })
              .finally(() => setLoading(false));
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="text-center p-8">
        <p>Unable to load AI insights. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Performance Score</p>
                <p className="text-2xl font-bold text-indigo-900">{insights.performancePrediction.score}</p>
              </div>
              <div className={`p-2 rounded-full ${
                insights.performancePrediction.trend === 'improving' ? 'bg-green-100' :
                insights.performancePrediction.trend === 'declining' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                {insights.performancePrediction.trend === 'improving' ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : insights.performancePrediction.trend === 'declining' ? (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                ) : (
                  <Target className="h-6 w-6 text-yellow-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Workload</p>
                <p className="text-2xl font-bold text-indigo-900">{insights.workloadAnalysis.currentLoad}%</p>
              </div>
              <Clock className="h-8 w-8 text-indigo-600" />
            </div>
            <Progress value={insights.workloadAnalysis.currentLoad} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Student Engagement</p>
                <p className="text-2xl font-bold text-indigo-900">{insights.studentEngagement.averageScore}/5</p>
              </div>
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Recommendations</p>
                <p className="text-2xl font-bold text-indigo-900">{insights.professionalDevelopment.recommendedCourses.length}</p>
              </div>
              <Brain className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="glass-tabs">
          <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          <TabsTrigger value="workload">Workload Management</TabsTrigger>
          <TabsTrigger value="development">Professional Development</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Performance Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.performancePrediction.factors.map((factor, index) => (
                  <div key={index} className="flex items-center">
                    <Badge variant="outline" className="mr-2">✓</Badge>
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Student Engagement Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">Top Strengths</h4>
                  <ul className="space-y-1">
                    {insights.studentEngagement.topStrengths.map((strength, index) => (
                      <li key={index} className="flex items-center">
                        <Badge variant="outline" className="mr-2 bg-green-50">+</Badge>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">Improvement Areas</h4>
                  <ul className="space-y-1">
                    {insights.studentEngagement.improvementAreas.map((area, index) => (
                      <li key={index} className="flex items-center">
                        <Badge variant="outline" className="mr-2 bg-orange-50">!</Badge>
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workload" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Workload Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Current Workload</span>
                  <span className="font-semibold">{insights.workloadAnalysis.currentLoad}%</span>
                </div>
                <Progress value={insights.workloadAnalysis.currentLoad} />
                
                <div className="flex justify-between items-center">
                  <span>Recommended Workload</span>
                  <span className="font-semibold text-green-600">{insights.workloadAnalysis.recommendedLoad}%</span>
                </div>
                <Progress value={insights.workloadAnalysis.recommendedLoad} className="bg-green-100" />
                
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Optimization Suggestions</h4>
                  <ul className="space-y-2">
                    {insights.workloadAnalysis.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start">
                        <Lightbulb className="h-4 w-4 mr-2 mt-1 text-yellow-500" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="development" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Professional Development Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Recommended Courses</h4>
                  <div className="space-y-2">
                    {insights.professionalDevelopment.recommendedCourses.map((course, index) => (
                      <div key={index} className="p-3 bg-indigo-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{course}</span>
                          <Button size="sm" variant="outline">Enroll</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Skill Development Areas</h4>
                  <div className="space-y-2">
                    {insights.professionalDevelopment.skillGaps.map((skill, index) => (
                      <div key={index} className="p-3 bg-orange-50 rounded-lg">
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <h5 className="font-semibold text-green-800">Career Path Suggestion</h5>
                    <p className="text-green-700">{insights.professionalDevelopment.careerPath}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                AI-Powered Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Based on your teaching patterns, student feedback, and performance data, here are personalized recommendations:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Teaching Strategies</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Implement flipped classroom</li>
                    <li>• Use gamification techniques</li>
                    <li>• Increase interactive elements</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Resource Suggestions</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Interactive simulations</li>
                    <li>• Virtual lab experiments</li>
                    <li>• Collaborative templates</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Growth Opportunities</h4>
                  <ul className="text-sm space-y-1">
                    <li>• EdTech conference</li>
                    <li>• Teacher community</li>
                    <li>• Advanced certification</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}