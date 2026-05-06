import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import {
  Brain, Target, TrendingUp, TrendingDown, Users, Award,
  BookOpen, MessageSquare, Lightbulb, Zap, Star, AlertCircle,
  Download, RefreshCw, Filter, Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import competencyService, {
  CompetencyDashboardData,
  StudentCompetencyProfile,
  CoreCompetency
} from '../../services/competencyService';

interface CompetencyDashboardProps {
  classId?: number;
  studentId?: number;
  academicYear?: string;
  viewMode?: 'class' | 'student' | 'school';
}

const CompetencyDashboard: React.FC<CompetencyDashboardProps> = ({
  classId,
  studentId,
  academicYear = new Date().getFullYear().toString(),
  viewMode = 'class'
}) => {
  const [dashboardData, setDashboardData] = useState<CompetencyDashboardData | null>(null);
  const [competencies, setCompetencies] = useState<CoreCompetency[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  // Competency domains mapping
  const competencyDomains = {
    communication_collaboration: 'Communication & Collaboration',
    critical_thinking: 'Critical Thinking & Problem Solving',
    creativity_innovation: 'Creativity & Innovation',
    cultural_identity: 'Cultural Identity & Global Citizenship',
    personal_development: 'Personal Development & Leadership',
    digital_literacy: 'Digital Literacy'
  };

  const proficiencyLevels = {
    1: { label: 'Beginning', color: '#ef4444', description: 'Needs significant support' },
    2: { label: 'Developing', color: '#f59e0b', description: 'Making progress with guidance' },
    3: { label: 'Proficient', color: '#10b981', description: 'Meets expectations independently' },
    4: { label: 'Excellent', color: '#3b82f6', description: 'Exceeds expectations consistently' }
  };

  useEffect(() => {
    fetchData();
  }, [classId, studentId, academicYear, viewMode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch core competencies
      const competenciesData = await competencyService.getCoreCompetencies();
      setCompetencies(competenciesData);

      // Fetch dashboard data based on view mode
      if (viewMode === 'class' && classId) {
        const data = await competencyService.getClassCompetencyDashboard(classId, academicYear);
        setDashboardData(data);
      } else if (viewMode === 'student' && studentId) {
        // For student view, create dashboard data from student profile
        const profile = await competencyService.getStudentCompetencyProfile(studentId, academicYear);
        const mockDashboardData: CompetencyDashboardData = {
          student_competencies: [profile],
          class_averages: {
            communication_collaboration: 2.8,
            critical_thinking: 2.6,
            creativity_innovation: 2.7,
            cultural_identity: 2.9,
            personal_development: 2.5,
            digital_literacy: 2.4
          },
          competency_trends: [],
          top_performers: [],
          improvement_needed: []
        };
        setDashboardData(mockDashboardData);
      }
    } catch (error) {
      console.error('Error fetching competency dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare radar chart data
  const radarData = useMemo(() => {
    if (!dashboardData?.student_competencies.length) return [];
    
    const profile = dashboardData.student_competencies[0];
    return Object.entries(competencyDomains).map(([key, label]) => ({
      domain: label.split(' & ')[0], // Shorten labels for radar
      student: profile[`${key}_score` as keyof StudentCompetencyProfile] as number || 0,
      classAvg: dashboardData.class_averages[key] || 0,
      target: 3.5
    }));
  }, [dashboardData]);

  // Prepare competency distribution data
  const distributionData = useMemo(() => {
    if (!dashboardData?.student_competencies.length) return [];
    
    const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    dashboardData.student_competencies.forEach(profile => {
      const avgScore = (
        profile.communication_collaboration_score +
        profile.critical_thinking_score +
        profile.creativity_innovation_score +
        profile.cultural_identity_score +
        profile.personal_development_score +
        profile.digital_literacy_score
      ) / 6;
      
      const level = Math.round(avgScore);
      if (level >= 1 && level <= 4) {
        levelCounts[level as keyof typeof levelCounts]++;
      }
    });
    
    return Object.entries(levelCounts).map(([level, count]) => ({
      level: proficiencyLevels[parseInt(level) as keyof typeof proficiencyLevels].label,
      count,
      percentage: (count / dashboardData.student_competencies.length) * 100
    }));
  }, [dashboardData]);

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(competencyDomains).slice(0, 4).map(([key, label], index) => {
          const score = dashboardData?.student_competencies[0]?.[`${key}_score` as keyof StudentCompetencyProfile] as number || 0;
          const level = Math.round(score);
          const levelInfo = proficiencyLevels[level as keyof typeof proficiencyLevels] || proficiencyLevels[1];
          
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
                      <div className="flex items-center gap-2">
                        <Badge 
                          style={{ backgroundColor: levelInfo.color }}
                          className="text-white"
                        >
                          {levelInfo.label}
                        </Badge>
                        <span className="text-lg font-bold">{score.toFixed(1)}/4.0</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{levelInfo.description}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full">
                      <Brain className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Competency Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Competency Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="domain" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 4]} 
                  tick={{ fontSize: 10 }}
                />
                <Radar
                  name="Student"
                  dataKey="student"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name="Class Average"
                  dataKey="classAvg"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.1}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                />
                <Radar
                  name="Target"
                  dataKey="target"
                  stroke="#f59e0b"
                  fill="none"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Proficiency Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Proficiency Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  label={({ level, percentage }) => `${level}: ${percentage.toFixed(1)}%`}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(proficiencyLevels)[index]?.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderProgressTab = () => (
    <div className="space-y-6">
      {/* Strengths and Areas for Improvement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Star className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboardData?.student_competencies[0]?.strengths?.map((strength, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{strength}</span>
                </div>
              )) || (
                <p className="text-gray-500 text-sm">No strengths recorded yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboardData?.student_competencies[0]?.areas_for_improvement?.map((area, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                  <Target className="h-4 w-4 text-orange-600" />
                  <span className="text-sm">{area}</span>
                </div>
              )) || (
                <p className="text-gray-500 text-sm">No improvement areas identified.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recommended Learning Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData?.student_competencies[0]?.recommended_activities?.map((activity, index) => (
              <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600 mt-1" />
                  <span className="text-sm">{activity}</span>
                </div>
              </div>
            )) || (
              <p className="text-gray-500 text-sm col-span-2">No activities recommended yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCommentsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Teacher Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData?.student_competencies[0]?.teacher_comments ? (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm">{dashboardData.student_competencies[0].teacher_comments}</p>
                <p className="text-xs text-gray-500 mt-2">Academic Year: {academicYear}</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No teacher comments available.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Competency Assessment Dashboard</h2>
          <p className="text-gray-600">Track progress across Ghana Education Service core competencies</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Term</SelectItem>
              <SelectItem value="previous">Previous Term</SelectItem>
              <SelectItem value="year">Full Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Progress & Goals</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="progress">
          {renderProgressTab()}
        </TabsContent>

        <TabsContent value="comments">
          {renderCommentsTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompetencyDashboard;