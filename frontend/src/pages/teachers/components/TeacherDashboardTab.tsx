import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Teacher } from "../../../types/teacher.types";
import { TeacherStats } from "./TeacherStats";
import { TeacherDashboardAnalytics } from "../../../components/teachers/TeacherDashboardAnalytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Calendar, Clock, FileText, Users, BookOpen, TrendingUp, AlertCircle } from "lucide-react";
import teacherService from "@/services/teacherService";
import { AITeacherService } from "../../../services/aiTeacherService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { AssignmentManagement } from "../../../components/teachers/AssignmentManagement";

interface TeacherDashboardTabProps {
  teacher: Teacher;
  classesCount: number;
}

export function TeacherDashboardTab({ teacher, classesCount }: TeacherDashboardTabProps) {
  const { t } = useTranslation();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setInsightsError(null);
        const data = await teacherService.getTeacherDashboardAnalytics(teacher.id);
        setAnalyticsData(data);
        
        // Also fetch AI insights
        setInsightsLoading(true);
        try {
          const insights = await AITeacherService.generateTeacherInsights(teacher.id);
          setAiInsights(insights);
        } catch (error: any) {
          console.error("Error fetching teacher insights:", error);
          if (error.response && error.response.status === 403) {
            setInsightsError(t("teachers_page.dashboard.insights_forbidden", "You don't have permission to access these analytics. Please contact an administrator."));
          } else {
            setInsightsError(t("teachers_page.dashboard.insights_failed", "Failed to load AI insights. Please try again later."));
          }
        }
      } catch (error) {
        console.error("Error fetching teacher analytics:", error);
      } finally {
        setLoading(false);
        setInsightsLoading(false);
      }
    };
    
    if (teacher?.id) {
      fetchAnalytics();
    }
  }, [teacher?.id]);
  
  return (
    <div className="space-y-6">
      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t("teachers_page.dashboard.overview_tab", "Overview")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("navigation.analytics", "Analytics")}</TabsTrigger>
          <TabsTrigger value="assignments">{t("navigation.assignments", "Assignments")}</TabsTrigger>
          <TabsTrigger value="ai-insights">{t("teachers_page.dashboard.ai_insights_tab", "AI Insights")}</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats cards */}
          <TeacherStats teacher={teacher} classesCount={classesCount} />
          
          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{t("teachers_page.dashboard.upcoming_classes", "Upcoming Classes")}</h3>
                    <p className="text-sm text-gray-500">
                      {analyticsData?.upcomingLessons?.[0]?.subject 
                        ? t("teachers_page.dashboard.next_class", "Next: {{subject}}", { subject: analyticsData.upcomingLessons[0].subject }) 
                        : t("teachers_page.dashboard.no_upcoming_classes", "No upcoming classes")}
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">{t("teachers_page.actions.view_schedule", "View Schedule")}</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{t("teachers_page.dashboard.pending_tasks", "Pending Tasks")}</h3>
                    <p className="text-sm text-gray-500">{t("teachers_page.dashboard.tasks_need_attention", "{{count}} tasks need attention", { count: analyticsData?.pendingTasks || 0 })}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">{t("teachers_page.dashboard.view_tasks", "View Tasks")}</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{t("teachers_page.dashboard.recent_activities", "Recent Activities")}</h3>
                    <p className="text-sm text-gray-500">{t("teachers_page.dashboard.new_activities_count", "{{count}} new activities", { count: analyticsData?.recentActivities?.length || 0 })}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">{t("common.show_all", "View All")}</Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Activity Feed */}
          {analyticsData?.recentActivities && analyticsData.recentActivities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("teachers_page.dashboard.recent_activity_title", "Recent Activity")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.recentActivities.slice(0, 5).map((activity: any, index: number) => (
                    <div key={index} className="flex items-start space-x-4 p-3 rounded-lg bg-gray-50">
                      <div className="p-2 rounded-full bg-indigo-100">
                        {activity.icon || <FileText className="h-5 w-5 text-indigo-600" />}
                      </div>
                      <div>
                        <p className="font-medium">{activity.title || t("teachers_page.dashboard.activity", "Activity")}</p>
                        <p className="text-sm text-gray-500">{activity.description || t("teachers_page.dashboard.no_description", "No description")}</p>
                        <p className="text-xs text-gray-400 mt-1">{activity.timestamp || ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* At-Risk Students Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{t("teachers_page.dashboard.at_risk_students", "At-Risk Students")}</CardTitle>
              <CardDescription>{t("teachers_page.dashboard.at_risk_description", "Students who may need additional support")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.atRiskStudents ? (
                  analyticsData.atRiskStudents.slice(0, 3).map((student: any, index: number) => (
                    <div key={index} className="flex items-start space-x-4 p-3 rounded-lg border">
                      <div className={`p-2 rounded-full ${student.risk === 'high' ? 'bg-red-100' : 'bg-amber-100'}`}>
                        <AlertCircle className={`h-5 w-5 ${student.risk === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{student.name}</h4>
                        <p className="text-sm text-muted-foreground">{student.reason}</p>
                      </div>
                      <Button variant="outline" size="sm">{t("teachers_page.dashboard.view_details", "View Details")}</Button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">{t("teachers_page.dashboard.no_at_risk_students", "No at-risk students identified")}</p>
                )}
                {analyticsData?.atRiskStudents?.length > 3 && (
                  <Button variant="outline" className="w-full">{t("teachers_page.dashboard.view_all_at_risk", "View All At-Risk Students")}</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>{t("teachers_page.dashboard.performance_analytics", "Performance Analytics")}</CardTitle>
              <CardDescription>{t("teachers_page.dashboard.performance_description", "Comprehensive view of your teaching performance and student outcomes")}</CardDescription>
            </CardHeader>
            <CardContent>
              <TeacherDashboardAnalytics 
                teacherId={teacher.id} 
                classData={analyticsData?.classData} 
                attendanceData={analyticsData?.attendance} 
                performanceData={analyticsData?.performance} 
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <AssignmentManagement />
        </TabsContent>
        
        {/* AI Insights Tab */}
        <TabsContent value="ai-insights">
          <Card>
            <CardHeader>
              <CardTitle>{t("teachers_page.dashboard.ai_insights_title", "AI-Powered Teaching Insights")}</CardTitle>
              <CardDescription>{t("teachers_page.dashboard.ai_insights_desc", "Personalized recommendations and analytics to enhance your teaching effectiveness")}</CardDescription>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="flex justify-center items-center h-40">
                  <p>{t("teachers_page.dashboard.loading_insights", "Loading AI insights...")}</p>
                </div>
              ) : insightsError ? (
                <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-center">
                  <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                  <p className="text-red-700">{insightsError}</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setInsightsLoading(true);
                      setInsightsError(null);
                      AITeacherService.generateTeacherInsights(teacher.id)
                        .then(setAiInsights)
                        .catch(error => {
                          if (error.response && error.response.status === 403) {
                            setInsightsError(t("teachers_page.dashboard.insights_forbidden", "You don't have permission to access these analytics. Please contact an administrator."));
                          } else {
                            setInsightsError(t("teachers_page.dashboard.insights_failed", "Failed to load AI insights. Please try again later."));
                          }
                        })
                        .finally(() => setInsightsLoading(false));
                    }}
                  >
                    {t("teachers_page.dashboard.retry", "Retry")}
                  </Button>
                </div>
              ) : aiInsights ? (
                <div className="space-y-6">
                  {/* Performance Prediction */}
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                    <h3 className="text-lg font-medium flex items-center text-blue-700">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      {t("teachers_page.dashboard.performance_prediction", "Performance Prediction")}
                    </h3>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="text-3xl font-bold text-blue-800">{aiInsights.performancePrediction.score}%</div>
                      <Badge variant="outline" className={`capitalize ${
                        aiInsights.performancePrediction.trend === 'improving' ? 'bg-green-100 text-green-800 border-green-200' : 
                        aiInsights.performancePrediction.trend === 'declining' ? 'bg-red-100 text-red-800 border-red-200' : 
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {t(`teachers_page.dashboard.trend.${aiInsights.performancePrediction.trend}`, aiInsights.performancePrediction.trend)}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium text-blue-700">{t("teachers_page.dashboard.key_factors", "Key Factors:")}</p>
                      <ul className="mt-1 list-disc list-inside text-sm text-blue-600">
                        {aiInsights.performancePrediction.factors.map((factor: string, i: number) => (
                          <li key={i}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {/* Workload Analysis */}
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                    <h3 className="text-lg font-medium flex items-center text-purple-700">
                      <Clock className="h-5 w-5 mr-2" />
                      {t("teachers_page.dashboard.workload_analysis", "Workload Analysis")}
                    </h3>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="text-3xl font-bold text-purple-800">{aiInsights.workloadAnalysis.currentLoad}%</div>
                      <div className="text-sm text-purple-600">
                        {t("teachers_page.dashboard.recommended_load", "Current load vs {{recommended}}% recommended", { recommended: aiInsights.workloadAnalysis.recommendedLoad })}
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium text-purple-700">{t("teachers_page.dashboard.suggestions", "Suggestions:")}</p>
                      <ul className="mt-1 list-disc list-inside text-sm text-purple-600">
                        {aiInsights.workloadAnalysis.suggestions.map((suggestion: string, i: number) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {/* Student Engagement */}
                  <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                    <h3 className="text-lg font-medium flex items-center text-green-700">
                      <Users className="h-5 w-5 mr-2" />
                      {t("teachers_page.dashboard.student_engagement", "Student Engagement")}
                    </h3>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="text-3xl font-bold text-green-800">{aiInsights.studentEngagement.averageScore}/5</div>
                      <div className="text-sm text-green-600">{t("teachers_page.dashboard.average_engagement", "Average engagement score")}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-sm font-medium text-green-700">{t("teachers_page.dashboard.top_strengths", "Top Strengths:")}</p>
                        <ul className="mt-1 list-disc list-inside text-sm text-green-600">
                          {aiInsights.studentEngagement.topStrengths.map((strength: string, i: number) => (
                            <li key={i}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-700">{t("teachers_page.dashboard.improvement_areas", "Improvement Areas:")}</p>
                        <ul className="mt-1 list-disc list-inside text-sm text-green-600">
                          {aiInsights.studentEngagement.improvementAreas.map((area: string, i: number) => (
                            <li key={i}>{area}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {/* Professional Development */}
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                    <h3 className="text-lg font-medium flex items-center text-amber-700">
                      <BookOpen className="h-5 w-5 mr-2" />
                      {t("teachers_page.dashboard.professional_development", "Professional Development")}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-amber-800">{t("teachers_page.dashboard.career_path", "Career Path")}: <span className="font-bold">{aiInsights.professionalDevelopment.careerPath}</span></p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-sm font-medium text-amber-700">{t("teachers_page.dashboard.recommended_courses", "Recommended Courses:")}</p>
                        <ul className="mt-1 list-disc list-inside text-sm text-amber-600">
                          {aiInsights.professionalDevelopment.recommendedCourses.map((course: string, i: number) => (
                            <li key={i}>{course}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-700">{t("teachers_page.dashboard.skill_gaps", "Skill Gaps:")}</p>
                        <ul className="mt-1 list-disc list-inside text-sm text-amber-600">
                          {aiInsights.professionalDevelopment.skillGaps.map((gap: string, i: number) => (
                            <li key={i}>{gap}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="text-muted-foreground">{t("teachers_page.dashboard.insights_unable", "Unable to load AI insights. Please try again later.")}</p>
                  <Button variant="outline" className="mt-4" onClick={() => {
                    setInsightsLoading(true);
                    AITeacherService.generateTeacherInsights(teacher.id)
                      .then(setAiInsights)
                      .catch(console.error)
                      .finally(() => setInsightsLoading(false));
                  }}>
                    {t("teachers_page.dashboard.retry", "Retry")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}