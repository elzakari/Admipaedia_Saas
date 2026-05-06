import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { Alert, AlertDescription } from '../../ui/alert';
import { AlertTriangle, Shield, TrendingDown, Users, BookOpen, Clock, MessageSquare } from 'lucide-react';
import studentAnalyticsService, { StudentRiskAssessment as RiskAssessmentData } from '../../../services/studentAnalyticsService';
import { useApiCall } from '../../../hooks/useApiCall';

interface StudentRiskAssessmentProps {
  studentId: number;
}

const StudentRiskAssessment: React.FC<StudentRiskAssessmentProps> = ({ studentId }) => {
  const { data: riskData, isLoading, error, execute: fetchRiskData } = useApiCall(
    () => studentAnalyticsService.getStudentRiskAssessment(studentId),
    { immediate: true }
  );

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <Shield className="h-5 w-5" />;
      case 'medium': return <AlertTriangle className="h-5 w-5" />;
      case 'high': return <AlertTriangle className="h-5 w-5" />;
      case 'critical': return <AlertTriangle className="h-5 w-5" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getWarningIcon = (indicator: string) => {
    switch (indicator) {
      case 'attendance_decline': return <Clock className="h-4 w-4" />;
      case 'grade_decline': return <TrendingDown className="h-4 w-4" />;
      case 'behavioral_issues': return <Users className="h-4 w-4" />;
      case 'engagement_drop': return <BookOpen className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading risk assessment...</div>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load risk assessment</p>
            <Button onClick={fetchRiskData} className="mt-2">Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Level Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {getRiskIcon(riskData?.risk_level || 'low')}
            <span className="ml-2">Risk Assessment Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Risk Level</span>
                <Badge className={getRiskLevelColor(riskData?.risk_level || 'low')}>
                  {riskData?.risk_level?.toUpperCase()}
                </Badge>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Risk Score</span>
                  <span className="font-medium">{riskData?.risk_score}/100</span>
                </div>
                <Progress value={riskData?.risk_score || 0} className="h-2" />
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3">Early Warning Indicators</h4>
              <div className="grid grid-cols-2 gap-2">
                {riskData?.early_warning_indicators && Object.entries(riskData.early_warning_indicators).map(([key, value]) => (
                  <div key={key} className={`flex items-center p-2 rounded-lg border ${
                    value ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <div className={`mr-2 ${value ? 'text-red-500' : 'text-green-500'}`}>
                      {getWarningIcon(key)}
                    </div>
                    <span className={`text-xs font-medium ${
                      value ? 'text-red-700' : 'text-green-700'
                    }`}>
                      {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskData?.risk_factors.map((factor, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{factor.factor}</h4>
                  <Badge variant="outline" className={getSeverityColor(factor.severity)}>
                    {factor.severity}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">{factor.description}</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <MessageSquare className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Recommendation</p>
                      <p className="text-sm text-blue-700">{factor.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Intervention Recommendations */}
      {riskData?.intervention_recommendations && riskData.intervention_recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Intervention Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskData.intervention_recommendations.map((recommendation, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{recommendation}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Immediate Actions</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Schedule Parent Meeting
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Create Study Plan
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Teacher Consultation
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Long-term Support</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Academic Support Program
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Attendance Monitoring
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Counseling Services
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentRiskAssessment;