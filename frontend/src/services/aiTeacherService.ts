import { Teacher } from '../types/teacher.types';
import api from '../lib';

export interface TeacherAIInsights {
  performancePrediction: {
    score: number;
    trend: 'improving' | 'stable' | 'declining';
    factors: string[];
  };
  workloadAnalysis: {
    currentLoad: number;
    recommendedLoad: number;
    suggestions: string[];
  };
  studentEngagement: {
    averageScore: number;
    topStrengths: string[];
    improvementAreas: string[];
  };
  professionalDevelopment: {
    recommendedCourses: string[];
    skillGaps: string[];
    careerPath: string;
  };
}

export interface TeacherStat {
  name: string;
  value: string;
  trend: string;
  trendDirection: 'up' | 'down';
}

export class AITeacherService {
  static async generateTeacherInsights(teacherId: number): Promise<TeacherAIInsights> {
    try {
      const response = await api.get(`/teachers/${teacherId}/ai-insights`);
      
      return {
        performancePrediction: {
          score: response.data.performance_score || 4.2,
          trend: this.determineTrend(response.data.trend_data),
          factors: this.extractPerformanceFactors(response.data.performance_data)
        },
        workloadAnalysis: {
          currentLoad: response.data.current_workload || 85,
          recommendedLoad: response.data.recommended_workload || 75,
          suggestions: response.data.workload_suggestions || [
            'Consider redistributing some administrative tasks',
            'Implement more efficient grading methods',
            'Use AI-assisted lesson planning'
          ]
        },
        studentEngagement: {
          averageScore: this.calculateEngagementScore(
            response.data.attendance_rate,
            response.data.participation_rate
          ),
          topStrengths: response.data.strengths || ['Interactive teaching', 'Clear explanations'],
          improvementAreas: response.data.improvement_areas || ['Technology integration']
        },
        professionalDevelopment: {
          recommendedCourses: response.data.recommended_courses || [
            'Advanced Classroom Technology',
            'Inclusive Education Strategies',
            'Assessment and Evaluation'
          ],
          skillGaps: response.data.skill_gaps || ['Digital literacy', 'Special needs education'],
          careerPath: response.data.career_path || 'Department Head'
        }
      };
    } catch (error: unknown) {
      console.error('Error fetching teacher insights:', error);
      
      // Handle 403 Forbidden errors specifically
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number } };
        if (axiosError.response && axiosError.response.status === 403) {
          console.warn('Access denied: You do not have permission to view these analytics');
        }
      }
      
      // Return fallback data if API fails
      return this.getFallbackInsights();
    }
  }

  // Helper methods to process the data
  private static determineTrend(trendData: Record<string, number> | undefined): 'improving' | 'stable' | 'declining' {
    if (!trendData) return 'stable';
    
    // Logic to determine trend based on data
    const recentValues = Object.values(trendData).slice(-3) as number[];
    const increasing = recentValues.every((val, i, arr) => i === 0 || val >= arr[i-1]);
    const decreasing = recentValues.every((val, i, arr) => i === 0 || val <= arr[i-1]);
    
    if (increasing) return 'improving';
    if (decreasing) return 'declining';
    return 'stable';
  }

  private static extractPerformanceFactors(performanceData: { factors?: string[] } | undefined): string[] {
    if (!performanceData || !performanceData.factors) {
      return ['Consistent attendance', 'Student engagement', 'Teaching methods'];
    }
    return performanceData.factors;
  }

  private static calculateEngagementScore(attendanceRate?: number, participation?: number): number {
    if (!attendanceRate && !participation) return 4.2;
    
    // Convert percentage to 5-point scale
    const attendanceScore = attendanceRate ? (attendanceRate / 20) : 0;
    const participationScore = participation ? (participation / 20) : 0;
    
    if (attendanceScore && participationScore) {
      return Number(((attendanceScore + participationScore) / 2).toFixed(1));
    }
    
    return attendanceScore || participationScore || 4.2;
  }

  private static getFallbackInsights(): TeacherAIInsights {
    // Return fallback data if API fails
    return {
      performancePrediction: {
        score: 85,
        trend: 'improving',
        factors: ['Consistent attendance', 'High student engagement', 'Innovative teaching methods']
      },
      workloadAnalysis: {
        currentLoad: 75,
        recommendedLoad: 70,
        suggestions: [
          'Consider redistributing Grade 12 Physics classes',
          'Delegate some administrative tasks',
          'Schedule more preparation time'
        ]
      },
      studentEngagement: {
        averageScore: 4.2,
        topStrengths: ['Clear explanations', 'Interactive lessons', 'Timely feedback'],
        improvementAreas: ['Technology integration', 'Differentiated instruction']
      },
      professionalDevelopment: {
        recommendedCourses: [
          'Advanced Classroom Technology',
          'Inclusive Education Strategies',
          'Assessment and Evaluation'
        ],
        skillGaps: ['Digital literacy', 'Special needs education'],
        careerPath: 'Department Head'
      }
    };
  }

  static async getTeacherStats(teacherId: number): Promise<TeacherStat[]> {
    try {
      const response = await api.get(`/teachers/${teacherId}/stats`);
      // The backend returns { success: true, stats: [...] } or just [...] depending on the route
      if (response.data && response.data.stats) {
        return response.data.stats;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error: unknown) {
      console.error(`Error fetching stats for teacher ${teacherId}:`, error);
      return [];
    }
  }

  static async predictStudentOutcomes(teacherId: number, classId: number) {
    try {
      const response = await api.get(`/ai/teacher/${teacherId}/predict-outcomes`, {
        params: { class_id: classId }
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Error predicting student outcomes:', error);
      throw error;
    }
  }

  static async generatePersonalizedRecommendations(teacherId: number) {
    return {
      teachingStrategies: [
        'Implement flipped classroom model for better engagement',
        'Use gamification for complex topics',
        'Incorporate real-world applications'
      ],
      resourceSuggestions: [
        'Interactive math simulations',
        'Virtual lab experiments',
        'Collaborative project templates'
      ],
      professionalGrowth: [
        'Attend upcoming EdTech conference',
        'Join subject-specific teacher community',
        'Pursue advanced certification'
      ]
    };
  }
}