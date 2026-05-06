import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Badge,
} from '@/components/ui/badge';
import {
  Button,
} from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Target,
  Download,
  RefreshCw,
  Lightbulb,
  Shield,
  Award,
} from 'lucide-react';

// Types for AI Analytics
interface StudentPrediction {
  student_id: number;
  student_name: string;
  predicted_score: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  current_average: number;
  recommendations: Recommendation[];
}

interface RiskAssessment {
  student_id: number;
  student_name: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  risk_factors: {
    attendance_risk: number;
    performance_risk: number;
    engagement_risk: number;
    consistency_risk: number;
  };
  interventions: Recommendation[];
  early_warning_indicators: {
    attendance_decline: boolean;
    performance_decline: boolean;
    engagement_issues: boolean;
    inconsistent_performance: boolean;
  };
}

interface Recommendation {
  category: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actions: string[];
}

interface ClassPerformancePattern {
  class_id: number;
  class_name: string;
  performance_patterns: {
    average_score: number;
    trend: string;
    consistency: number;
    improvement_rate: number;
  };
  struggling_students: Array<{
    student_id: number;
    student_name: string;
    current_score: number;
    risk_level: string;
  }>;
  recommendations: Recommendation[];
}

interface SchoolWideInsights {
  overall_performance_trend: string;
  risk_summary: {
    high_risk_students: number;
    medium_risk_students: number;
    low_risk_students: number;
  };
  predicted_outcomes: {
    pass_rate_prediction: number;
    attendance_trend: string;
    performance_trend: string;
  };
  recommendations: Recommendation[];
}

const AIAnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('predictions');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // State for different analytics data
  const [studentPredictions, setStudentPredictions] = useState<StudentPrediction[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [schoolInsights, setSchoolInsights] = useState<SchoolWideInsights | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    loadMockData();
  }, [selectedPeriod]);

  const loadMockData = () => {
    setLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      // Mock student predictions
      setStudentPredictions([
        {
          student_id: 1,
          student_name: 'John Doe',
          predicted_score: 78.5,
          confidence: 85.2,
          trend: 'improving',
          risk_level: 'low',
          current_average: 75.0,
          recommendations: [
            {
              category: 'Study Enhancement',
              priority: 'medium',
              title: 'Focus on Mathematics',
              description: 'Strengthen algebra concepts',
              actions: ['Practice daily problems', 'Seek peer tutoring']
            }
          ]
        },
        {
          student_id: 2,
          student_name: 'Jane Smith',
          predicted_score: 45.2,
          confidence: 78.9,
          trend: 'declining',
          risk_level: 'high',
          current_average: 52.0,
          recommendations: [
            {
              category: 'Immediate Intervention',
              priority: 'high',
              title: 'Academic Support Required',
              description: 'Student at risk of failing',
              actions: ['One-on-one tutoring', 'Parent conference', 'Study plan review']
            }
          ]
        }
      ]);

      // Mock risk assessments
      setRiskAssessments([
        {
          student_id: 1,
          student_name: 'John Doe',
          risk_level: 'low',
          risk_score: 25.5,
          risk_factors: {
            attendance_risk: 15,
            performance_risk: 25,
            engagement_risk: 30,
            consistency_risk: 20
          },
          interventions: [],
          early_warning_indicators: {
            attendance_decline: false,
            performance_decline: false,
            engagement_issues: false,
            inconsistent_performance: false
          }
        },
        {
          student_id: 2,
          student_name: 'Jane Smith',
          risk_level: 'high',
          risk_score: 78.3,
          risk_factors: {
            attendance_risk: 65,
            performance_risk: 85,
            engagement_risk: 70,
            consistency_risk: 90
          },
          interventions: [
            {
              category: 'Attendance',
              priority: 'high',
              title: 'Improve Attendance',
              description: 'Student has concerning attendance patterns',
              actions: ['Contact parents', 'Investigate barriers', 'Flexible scheduling']
            }
          ],
          early_warning_indicators: {
            attendance_decline: true,
            performance_decline: true,
            engagement_issues: true,
            inconsistent_performance: true
          }
        }
      ]);

      // Mock school insights
      setSchoolInsights({
        overall_performance_trend: 'improving',
        risk_summary: {
          high_risk_students: 12,
          medium_risk_students: 28,
          low_risk_students: 145
        },
        predicted_outcomes: {
          pass_rate_prediction: 87.5,
          attendance_trend: 'stable',
          performance_trend: 'improving'
        },
        recommendations: [
          {
            category: 'Academic Support',
            priority: 'high',
            title: 'Increase Support for At-Risk Students',
            description: '12 students identified as high-risk for dropout',
            actions: [
              'Implement targeted intervention programs',
              'Increase counseling support',
              'Engage parents/guardians more actively'
            ]
          }
        ]
      });

      setLoading(false);
    }, 1000);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Target className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  // Chart data preparation
  const riskDistributionData = schoolInsights ? [
    { name: 'Low Risk', value: schoolInsights.risk_summary.low_risk_students, color: '#10B981' },
    { name: 'Medium Risk', value: schoolInsights.risk_summary.medium_risk_students, color: '#F59E0B' },
    { name: 'High Risk', value: schoolInsights.risk_summary.high_risk_students, color: '#EF4444' }
  ] : [];

  const performanceTrendData = [
    { month: 'Jan', predicted: 75, actual: 73 },
    { month: 'Feb', predicted: 77, actual: 76 },
    { month: 'Mar', predicted: 79, actual: 78 },
    { month: 'Apr', predicted: 81, actual: 80 },
    { month: 'May', predicted: 83, actual: 82 },
    { month: 'Jun', predicted: 85, actual: null }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            AI Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Advanced insights powered by artificial intelligence
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="term">This Term</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={loadMockData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold">185</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Risk</p>
                <p className="text-2xl font-bold text-red-500">12</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Predicted Pass Rate</p>
                <p className="text-2xl font-bold text-green-500">87.5%</p>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Confidence</p>
                <p className="text-2xl font-bold text-blue-500">92.3%</p>
              </div>
              <Brain className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="predictions">Performance Predictions</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="patterns">Class Patterns</TabsTrigger>
          <TabsTrigger value="insights">School Insights</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
        </TabsList>

        {/* Performance Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Trend Prediction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name="Actual Performance"
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#10B981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="AI Prediction"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Student Predictions List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Individual Student Predictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentPredictions.map((prediction) => (
                    <div key={prediction.student_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{prediction.student_name}</h4>
                          <p className="text-sm text-gray-600">
                            Current: {prediction.current_average}% → Predicted: {prediction.predicted_score}%
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(prediction.trend)}
                          <Badge className={getRiskColor(prediction.risk_level)}>
                            {prediction.risk_level}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Confidence: {prediction.confidence}%
                        </span>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Assessment Tab */}
        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {riskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* At-Risk Students List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  High-Risk Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {riskAssessments
                    .filter(assessment => assessment.risk_level === 'high' || assessment.risk_level === 'critical')
                    .map((assessment) => (
                      <div key={assessment.student_id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold">{assessment.student_name}</h4>
                          <Badge className={getRiskColor(assessment.risk_level)}>
                            {assessment.risk_level}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Risk Score: {assessment.risk_score.toFixed(1)}%</div>
                          <div className="flex gap-2 flex-wrap mt-2">
                            {assessment.early_warning_indicators.attendance_decline && (
                              <Badge variant="outline" className="text-xs">Attendance ⚠️</Badge>
                            )}
                            {assessment.early_warning_indicators.performance_decline && (
                              <Badge variant="outline" className="text-xs">Performance ⚠️</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* School Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>School-Wide Performance Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>AI-Powered Insights</AlertTitle>
                  <AlertDescription>
                    Based on current data, the overall performance trend is {schoolInsights?.overall_performance_trend}.
                    Predicted pass rate: {schoolInsights?.predicted_outcomes.pass_rate_prediction}%
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schoolInsights?.recommendations.map((rec, index) => (
                  <Alert key={index}>
                    <AlertTitle className="flex items-center gap-2">
                      <Badge variant={getPriorityColor(rec.priority) as any}>
                        {rec.priority} priority
                      </Badge>
                      {rec.title}
                    </AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">{rec.description}</p>
                      <ul className="list-disc list-inside space-y-1">
                        {rec.actions.map((action, idx) => (
                          <li key={idx} className="text-sm">{action}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};