"""
Enhanced Exam Service for Advanced Exam Management
Provides conflict detection, analytics, automated calculations, and scheduling optimization
"""

from app.models.exam import Exam
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.student import Student
from app.models.grade import Grade
from app.models.teacher import Teacher
from app.extensions import db
from datetime import datetime, timedelta, date
from sqlalchemy import and_, or_, func, text
from typing import List, Dict, Optional, Tuple, Any
import logging
from collections import defaultdict
import statistics

logger = logging.getLogger(__name__)

class EnhancedExamService:
    """Enhanced exam service with advanced features for GES compliance"""
    
    @staticmethod
    def detect_exam_conflicts(class_id: int, exam_date: datetime, duration: int, 
                            exam_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Advanced conflict detection for exam scheduling
        Returns detailed conflict analysis including:
        - Time conflicts
        - Resource conflicts (teachers, rooms)
        - Student workload analysis
        - Recommendations
        """
        try:
            conflicts = {
                'has_conflicts': False,
                'time_conflicts': [],
                'teacher_conflicts': [],
                'student_workload': {},
                'recommendations': [],
                'severity': 'low'  # low, medium, high, critical
            }
            
            # Calculate exam end time
            exam_end = exam_date + timedelta(minutes=duration)
            
            # Check for time conflicts in the same class
            time_conflict_query = Exam.query.filter(
                Exam.class_id == class_id,
                Exam.status.in_(['scheduled', 'ongoing']),
                or_(
                    # New exam starts during existing exam
                    and_(
                        Exam.exam_date <= exam_date,
                        func.datetime(Exam.exam_date, '+' + func.cast(Exam.duration, db.String) + ' minutes') > exam_date
                    ),
                    # New exam ends during existing exam
                    and_(
                        Exam.exam_date < exam_end,
                        func.datetime(Exam.exam_date, '+' + func.cast(Exam.duration, db.String) + ' minutes') >= exam_end
                    ),
                    # Existing exam is completely within new exam
                    and_(
                        Exam.exam_date >= exam_date,
                        func.datetime(Exam.exam_date, '+' + func.cast(Exam.duration, db.String) + ' minutes') <= exam_end
                    )
                )
            )
            
            if exam_id:
                time_conflict_query = time_conflict_query.filter(Exam.id != exam_id)
            
            time_conflicts = time_conflict_query.all()
            
            if time_conflicts:
                conflicts['has_conflicts'] = True
                conflicts['time_conflicts'] = [
                    {
                        'exam_id': exam.id,
                        'title': exam.title,
                        'subject': exam.subject.name,
                        'exam_date': exam.exam_date.isoformat(),
                        'duration': exam.duration,
                        'conflict_type': 'time_overlap'
                    }
                    for exam in time_conflicts
                ]
                conflicts['severity'] = 'critical'
            
            # Check student workload (exams on same day)
            same_day_start = exam_date.replace(hour=0, minute=0, second=0, microsecond=0)
            same_day_end = same_day_start + timedelta(days=1)
            
            same_day_exams = Exam.query.filter(
                Exam.class_id == class_id,
                Exam.exam_date >= same_day_start,
                Exam.exam_date < same_day_end,
                Exam.status.in_(['scheduled', 'ongoing'])
            )
            
            if exam_id:
                same_day_exams = same_day_exams.filter(Exam.id != exam_id)
            
            same_day_count = same_day_exams.count()
            
            if same_day_count >= 2:
                conflicts['has_conflicts'] = True
                conflicts['student_workload'] = {
                    'same_day_exams': same_day_count + 1,  # +1 for the new exam
                    'warning': 'High exam load on this day',
                    'exams': [
                        {
                            'title': exam.title,
                            'subject': exam.subject.name,
                            'time': exam.exam_date.strftime('%H:%M')
                        }
                        for exam in same_day_exams.all()
                    ]
                }
                if conflicts['severity'] == 'low':
                    conflicts['severity'] = 'medium'
            
            # Generate recommendations
            if conflicts['has_conflicts']:
                if time_conflicts:
                    conflicts['recommendations'].append(
                        "Reschedule to avoid time conflicts with existing exams"
                    )
                
                if same_day_count >= 2:
                    conflicts['recommendations'].append(
                        f"Consider spreading exams across multiple days (currently {same_day_count + 1} exams on same day)"
                    )
                    
                    # Suggest alternative dates
                    alternative_dates = EnhancedExamService._suggest_alternative_dates(
                        class_id, exam_date, duration
                    )
                    if alternative_dates:
                        conflicts['recommendations'].append(
                            f"Suggested alternative dates: {', '.join([d.strftime('%Y-%m-%d') for d in alternative_dates[:3]])}"
                        )
            
            return conflicts
            
        except Exception as e:
            logger.error(f"Error detecting exam conflicts: {str(e)}")
            return {
                'has_conflicts': False,
                'error': 'Failed to check conflicts',
                'severity': 'unknown'
            }
    
    @staticmethod
    def _suggest_alternative_dates(class_id: int, original_date: datetime, 
                                 duration: int, days_range: int = 14) -> List[datetime]:
        """Suggest alternative dates for exam scheduling"""
        try:
            suggestions = []
            
            # Check dates within range
            for i in range(1, days_range + 1):
                # Check dates before and after
                for date_offset in [-i, i]:
                    candidate_date = original_date + timedelta(days=date_offset)
                    
                    # Skip weekends (assuming Monday=0, Sunday=6)
                    if candidate_date.weekday() >= 5:
                        continue
                    
                    # Check if this date has conflicts
                    conflicts = EnhancedExamService.detect_exam_conflicts(
                        class_id, candidate_date, duration
                    )
                    
                    if not conflicts['has_conflicts']:
                        suggestions.append(candidate_date)
                        
                    if len(suggestions) >= 5:  # Limit suggestions
                        break
                
                if len(suggestions) >= 5:
                    break
            
            return sorted(suggestions)
            
        except Exception as e:
            logger.error(f"Error suggesting alternative dates: {str(e)}")
            return []
    
    @staticmethod
    def get_exam_analytics(exam_id: int) -> Dict[str, Any]:
        """
        Get comprehensive analytics for an exam
        """
        try:
            exam = Exam.query.get(exam_id)
            if not exam:
                return {'error': 'Exam not found'}
            
            # Get all grades for this exam
            grades = Grade.query.filter_by(exam_id=exam_id).all()
            
            if not grades:
                return {
                    'exam_id': exam_id,
                    'title': exam.title,
                    'total_students': 0,
                    'statistics': {},
                    'grade_distribution': {},
                    'performance_insights': []
                }
            
            # Calculate statistics
            percentages = [grade.percentage for grade in grades if grade.percentage is not None]
            marks = [grade.marks_obtained for grade in grades if grade.marks_obtained is not None]
            
            statistics_data = {}
            if percentages:
                statistics_data = {
                    'mean': round(statistics.mean(percentages), 2),
                    'median': round(statistics.median(percentages), 2),
                    'mode': round(statistics.mode(percentages), 2) if len(set(percentages)) < len(percentages) else None,
                    'std_dev': round(statistics.stdev(percentages), 2) if len(percentages) > 1 else 0,
                    'min': min(percentages),
                    'max': max(percentages),
                    'range': max(percentages) - min(percentages),
                    'pass_rate': round((len([p for p in percentages if p >= 50]) / len(percentages)) * 100, 2)
                }
            
            # Grade distribution
            grade_distribution = EnhancedExamService._calculate_grade_distribution(percentages)
            
            # Performance insights
            insights = EnhancedExamService._generate_performance_insights(
                statistics_data, grade_distribution, len(grades)
            )
            
            return {
                'exam_id': exam_id,
                'title': exam.title,
                'subject': exam.subject.name,
                'class': exam.class_.name,
                'exam_date': exam.exam_date.isoformat(),
                'total_students': len(grades),
                'total_marks': exam.total_marks,
                'passing_marks': exam.passing_marks,
                'statistics': statistics_data,
                'grade_distribution': grade_distribution,
                'performance_insights': insights,
                'difficulty_analysis': EnhancedExamService._analyze_difficulty(statistics_data)
            }
            
        except Exception as e:
            logger.error(f"Error getting exam analytics: {str(e)}")
            return {'error': f'Failed to get analytics: {str(e)}'}
    
    @staticmethod
    def _calculate_grade_distribution(percentages: List[float]) -> Dict[str, Any]:
        """Calculate grade distribution based on GES standards"""
        if not percentages:
            return {}
        
        # GES Grade boundaries
        grade_boundaries = {
            'A+': (90, 100),
            'A': (80, 89),
            'B+': (75, 79),
            'B': (70, 74),
            'C+': (65, 69),
            'C': (60, 64),
            'D+': (55, 59),
            'D': (50, 54),
            'E': (45, 49),
            'F': (0, 44)
        }
        
        distribution = {}
        total = len(percentages)
        
        for grade, (min_score, max_score) in grade_boundaries.items():
            count = len([p for p in percentages if min_score <= p <= max_score])
            percentage = round((count / total) * 100, 1) if total > 0 else 0
            
            distribution[grade] = {
                'count': count,
                'percentage': percentage,
                'range': f"{min_score}-{max_score}%"
            }
        
        return distribution
    
    @staticmethod
    def _generate_performance_insights(stats: Dict, distribution: Dict, total_students: int) -> List[str]:
        """Generate performance insights based on statistics"""
        insights = []
        
        if not stats:
            return insights
        
        # Pass rate insights
        if stats['pass_rate'] >= 80:
            insights.append("Excellent performance - High pass rate indicates good understanding")
        elif stats['pass_rate'] >= 60:
            insights.append("Good performance - Most students achieved passing grades")
        elif stats['pass_rate'] >= 40:
            insights.append("Average performance - Consider reviewing difficult topics")
        else:
            insights.append("Poor performance - Significant remedial work needed")
        
        # Standard deviation insights
        if stats['std_dev'] > 20:
            insights.append("High variation in performance - Consider differentiated instruction")
        elif stats['std_dev'] < 10:
            insights.append("Consistent performance across students")
        
        # Mean vs median insights
        if abs(stats['mean'] - stats['median']) > 5:
            if stats['mean'] > stats['median']:
                insights.append("Performance skewed by high achievers")
            else:
                insights.append("Performance affected by struggling students")
        
        # Grade distribution insights
        if distribution:
            a_grades = distribution.get('A+', {}).get('count', 0) + distribution.get('A', {}).get('count', 0)
            f_grades = distribution.get('F', {}).get('count', 0)
            
            if a_grades > total_students * 0.3:
                insights.append("High number of A grades - Excellent preparation or easy exam")
            
            if f_grades > total_students * 0.2:
                insights.append("High failure rate - Review teaching methods and exam difficulty")
        
        return insights
    
    @staticmethod
    def _analyze_difficulty(stats: Dict) -> Dict[str, Any]:
        """Analyze exam difficulty based on performance statistics"""
        if not stats:
            return {}
        
        mean_score = stats.get('mean', 0)
        pass_rate = stats.get('pass_rate', 0)
        std_dev = stats.get('std_dev', 0)
        
        # Determine difficulty level
        if mean_score >= 80 and pass_rate >= 90:
            difficulty = "Easy"
            recommendation = "Consider increasing difficulty for better discrimination"
        elif mean_score >= 70 and pass_rate >= 75:
            difficulty = "Appropriate"
            recommendation = "Good balance of difficulty"
        elif mean_score >= 60 and pass_rate >= 60:
            difficulty = "Moderate"
            recommendation = "Acceptable difficulty level"
        elif mean_score >= 50 and pass_rate >= 40:
            difficulty = "Challenging"
            recommendation = "Review difficult topics with students"
        else:
            difficulty = "Very Difficult"
            recommendation = "Consider remedial teaching and exam review"
        
        return {
            'level': difficulty,
            'recommendation': recommendation,
            'discrimination_index': round(std_dev / 25, 2),  # Normalized discrimination
            'reliability_indicator': 'High' if std_dev > 15 else 'Moderate' if std_dev > 10 else 'Low'
        }
    
    @staticmethod
    def get_class_exam_schedule(class_id: int, date_from: Optional[date] = None, 
                              date_to: Optional[date] = None) -> Dict[str, Any]:
        """
        Get comprehensive exam schedule for a class with conflict analysis
        """
        try:
            query = Exam.query.filter_by(class_id=class_id)
            
            if date_from:
                query = query.filter(Exam.exam_date >= date_from)
            if date_to:
                query = query.filter(Exam.exam_date <= date_to)
            
            exams = query.order_by(Exam.exam_date).all()
            
            # Group exams by date
            schedule = defaultdict(list)
            conflicts = []
            
            for exam in exams:
                exam_date = exam.exam_date.date()
                exam_info = {
                    'id': exam.id,
                    'title': exam.title,
                    'subject': exam.subject.name,
                    'time': exam.exam_date.strftime('%H:%M'),
                    'duration': exam.duration,
                    'total_marks': exam.total_marks,
                    'status': exam.status
                }
                
                schedule[exam_date.isoformat()].append(exam_info)
                
                # Check for conflicts on this date
                if len(schedule[exam_date.isoformat()]) > 1:
                    day_conflicts = EnhancedExamService.detect_exam_conflicts(
                        class_id, exam.exam_date, exam.duration, exam.id
                    )
                    if day_conflicts['has_conflicts']:
                        conflicts.append({
                            'date': exam_date.isoformat(),
                            'exam_id': exam.id,
                            'conflicts': day_conflicts
                        })
            
            # Calculate workload statistics
            workload_stats = {
                'total_exams': len(exams),
                'days_with_exams': len(schedule),
                'max_exams_per_day': max([len(day_exams) for day_exams in schedule.values()]) if schedule else 0,
                'avg_exams_per_day': round(len(exams) / len(schedule), 1) if schedule else 0
            }
            
            return {
                'class_id': class_id,
                'schedule': dict(schedule),
                'conflicts': conflicts,
                'workload_stats': workload_stats,
                'recommendations': EnhancedExamService._generate_schedule_recommendations(workload_stats, conflicts)
            }
            
        except Exception as e:
            logger.error(f"Error getting class exam schedule: {str(e)}")
            return {'error': f'Failed to get schedule: {str(e)}'}
    
    @staticmethod
    def _generate_schedule_recommendations(workload_stats: Dict, conflicts: List) -> List[str]:
        """Generate recommendations for exam scheduling"""
        recommendations = []
        
        if workload_stats['max_exams_per_day'] > 2:
            recommendations.append(
                f"High exam load detected ({workload_stats['max_exams_per_day']} exams in one day). "
                "Consider spreading exams across more days."
            )
        
        if conflicts:
            recommendations.append(
                f"{len(conflicts)} scheduling conflicts detected. Review and reschedule conflicting exams."
            )
        
        if workload_stats['avg_exams_per_day'] > 1.5:
            recommendations.append(
                "Consider extending the exam period to reduce daily workload on students."
            )
        
        if not recommendations:
            recommendations.append("Exam schedule appears well-balanced.")
        
        return recommendations
    
    @staticmethod
    def calculate_optimal_exam_duration(subject_id: int, total_marks: float, 
                                      exam_type: str = 'regular') -> Dict[str, Any]:
        """
        Calculate optimal exam duration based on subject, marks, and historical data
        """
        try:
            # Base duration calculations (minutes per mark)
            duration_factors = {
                'Mathematics': 1.5,
                'English': 2.0,
                'Science': 1.8,
                'Social Studies': 2.2,
                'default': 1.8
            }
            
            # Exam type multipliers
            type_multipliers = {
                'quiz': 0.8,
                'midterm': 1.0,
                'final': 1.2,
                'regular': 1.0
            }
            
            # Get subject name
            subject = Subject.query.get(subject_id)
            subject_name = subject.name if subject else 'default'
            
            # Find matching factor
            factor = duration_factors.get(subject_name, duration_factors['default'])
            multiplier = type_multipliers.get(exam_type, 1.0)
            
            # Calculate base duration
            base_duration = total_marks * factor * multiplier
            
            # Add buffer time (10-15 minutes)
            buffer_time = min(15, max(10, base_duration * 0.1))
            
            # Calculate final duration
            optimal_duration = int(base_duration + buffer_time)
            
            # Ensure minimum and maximum bounds
            optimal_duration = max(30, min(180, optimal_duration))  # 30 min to 3 hours
            
            return {
                'optimal_duration': optimal_duration,
                'base_calculation': int(base_duration),
                'buffer_time': int(buffer_time),
                'factors_used': {
                    'subject_factor': factor,
                    'type_multiplier': multiplier,
                    'total_marks': total_marks
                },
                'recommendations': [
                    f"Recommended duration: {optimal_duration} minutes",
                    f"Based on {total_marks} marks for {subject_name}",
                    f"Includes {int(buffer_time)} minutes buffer time"
                ]
            }
            
        except Exception as e:
            logger.error(f"Error calculating optimal duration: {str(e)}")
            return {
                'optimal_duration': 60,  # Default fallback
                'error': f'Calculation failed: {str(e)}'
            }