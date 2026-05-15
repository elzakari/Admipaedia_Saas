import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Progress } from "../../../components/ui/progress";
import { 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Users, 
  BookOpen,
  BarChart3,
  LineChart,
  PieChart
} from "lucide-react";
import { AITeacherService, TeacherAIInsights } from "../../../services/aiTeacherService";

interface AIAnalyticsTabProps {
  teacherId: number;
}

// Add these imports at the top of the file
import { 
  FileDown,
  Printer,
  Share2,
  RefreshCw
} from "lucide-react";
import { QuickActions } from "../../../components/common/quick-actions";
import { useToast } from "../../../components/ui/use-toast";

export function AIAnalyticsTab({ teacherId }: AIAnalyticsTabProps) {
  const [insights, setInsights] = useState<TeacherAIInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("performance");

  useEffect(() => {
    const loadInsights = async () => {
      try {
        setLoading(true);
        const data = await AITeacherService.generateTeacherInsights(teacherId);
        setInsights(data);
      } catch (error) {
        console.error('Failed to load AI insights:', error);
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

  if (!insights) {
    return (
      <div className="text-center p-8">
        <p>Unable to load AI insights. Please try again later.</p>
      </div>
    );
  }

  const { toast } = useToast();

  // Handle quick actions
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'refresh':
        toast({
          title: "Refreshing Insights",
          description: "Generating new AI insights..."
        });
        // Here you would typically call the loadInsights function again
        break;
      case 'export':
        // Generate and download CSV of analytics data
        const csvContent = "Metric,Value,Trend\n" +
          "Performance Score," + insights.performancePrediction.score + "," + insights.performancePrediction.trend + "\n" +
          "Student Engagement," + insights.studentEngagement.averageScore + "/5,Stable";
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "ai_analytics_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Export Successful",
          description: "AI Analytics data has been exported to CSV"
        });
        break;
      case 'print':
        // Print the current page
        window.print();
        toast({
          title: "Print Initiated",
          description: "Preparing AI insights for printing"
        });
        break;
      case 'share':
        // Copy the current URL to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "AI Analytics page URL copied to clipboard"
        });
        break;
      default:
        break;
    }
  };

  // Define quick actions
  const quickActions = [
    {
      icon: RefreshCw,
      label: "Refresh Insights",
      onClick: () => handleQuickAction('refresh')
    },
    {
      icon: FileDown,
      label: "Export Report",
      onClick: () => handleQuickAction('export')
    },
    {
      icon: Printer,
      label: "Print Insights",
      onClick: () => handleQuickAction('print')
    },
    {
      icon: Share2,
      label: "Share",
      onClick: () => handleQuickAction('share')
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-indigo-900">AI-Powered Analytics</h3>
        <Button className="glass-button">
          <Brain className="h-4 w-4 mr-2" />
          Generate New Insights
        </Button>
      </div>

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
                <p className="text-sm text-gray-600">Workload</p>
                <p className="text-2xl font-bold text-indigo-900">{insights.workloadAnalysis.currentLoad}%</p>
              </div>
              <div>
                <Progress value={insights.workloadAnalysis.currentLoad} className="w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Growth Potential</p>
                <p className="text-2xl font-bold text-indigo-900">High</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass-tabs">
          <TabsTrigger value="performance" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance Analysis
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Student Engagement
          </TabsTrigger>
          <TabsTrigger value="workload" className="flex items-center">
            <LineChart className="h-4 w-4 mr-2" />
            Workload Management
          </TabsTrigger>
          <TabsTrigger value="development" className="flex items-center">
            <PieChart className="h-4 w-4 mr-2" />
            Professional Development
          </TabsTrigger>
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
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-slate-100 rounded-md">
                <p className="text-gray-500">Performance trend visualization would appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
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
              <div className="mt-6 h-48 flex items-center justify-center bg-slate-100 rounded-md">
                <p className="text-gray-500">Student engagement visualization would appear here</p>
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
                <div className="mt-6 h-48 flex items-center justify-center bg-slate-100 rounded-md">
                  <p className="text-gray-500">Workload trend visualization would appear here</p>
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
      </Tabs>
      <QuickActions actions={quickActions} />
    </div>
  );
}
