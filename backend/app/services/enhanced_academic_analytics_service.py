from sqlalchemy import func, and_, or_, desc, case, text
from datetime import datetime, timedelta, date
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.exam import Exam
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.assignment import Assignment
from app.models.assignment_submission import AssignmentSubmission
from app.extensions import db
import logging

logger = logging.getLogger(__name__)

class EnhancedAcademicAnalyticsService:
    """Enhanced service for comprehensive academic analytics with GES compliance."""
    
    # GES Grade Boundaries
    GES_BOUNDARIES = {
        'A': {'min': 80, 'max': 100, 'description': 'Excellent'},
        'B': {'min': 70, 'max': 79, 'description': 'Very Good'},
        'C': {'min': 60, 'max': 69, 'description': 'Good'},
        'D': {'min': 50, 'max': 59, 'description': 'Satisfactory'},
        'E': {'min': 40, 'max': 49, 'description': 'Pass'},
        'F': {'min': 0, 'max': 39, 'description': 'Fail'}
    }
    
    @staticmethod
    def get_comprehensive_dashboard_analytics(
        user_id: int, 
        user_role: str, 
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        class_id: Optional[int] = None,
        subject_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive dashboard analytics based on user role and filters.
        """
        try:
            # Parse date filters
            if date_from:
                date_from = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            else:
                date_from = datetime.now() - timedelta(days=90)
                
            if date_to:
                date_to = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            else:
                date_to = datetime.now()
            
            analytics_data = {}
            
            if user_role == 'admin':
                analytics_data = EnhancedAcademicAnalyticsService._get_admin_analytics(
                    date_from, date_to, class_id, subject_id
                )
            elif user_role == 'teacher':
                analytics_data = EnhancedAcademicAnalyticsService._get_teacher_analytics(
                    user_id, date_from, date_to, class_id, subject_id
                )
            elif user_role == 'student':
                analytics_data = EnhancedAcademicAnalyticsService._get_student_analytics(
                    user_id, date_from, date_to
                )
            elif user_role == 'parent':
                analytics_data = EnhancedAcademicAnalyticsService._get_parent_analytics(
                    user_id, date_from, date_to
                )
            
            # Add common analytics
            analytics_data.update({
                'period': {
                    'from': date_from.isoformat(),
                    'to': date_to.isoformat()
                },
                'generated_at': datetime.now().isoformat(),
                'ges_compliance': True
            })
            
            return analytics_data
            
        except Exception as e:
            logger.error(f"Error generating comprehensive analytics: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def _get_admin_analytics(date_from: datetime, date_to: datetime, 
                           class_id: Optional[int], subject_id: Optional[int]) -> Dict[str, Any]:
        """Generate comprehensive analytics for admin dashboard."""
        try:
            # School-wide performance overview
            performance_overview = EnhancedAcademicAnalyticsService._get_school_performance_overview(
                date_from, date_to, class_id, subject_id
            )
            
            # Attendance analytics
            attendance_analytics = EnhancedAcademicAnalyticsService._get_attendance_analytics(
                date_from, date_to, class_id
            )
            
            # Grade distribution analytics
            grade_distribution = EnhancedAcademicAnalyticsService._get_grade_distribution_analytics(
                date_from, date_to, class_id, subject_id
            )
            
            # Teacher performance analytics
            teacher_performance = EnhancedAcademicAnalyticsService._get_teacher_performance_analytics(
                date_from, date_to, class_id, subject_id
            )
            
            # Class comparison analytics
            class_comparison = EnhancedAcademicAnalyticsService._get_class_comparison_analytics(
                date_from, date_to, subject_id
            )
            
            # Risk assessment
            risk_assessment = EnhancedAcademicAnalyticsService._get_risk_assessment(
                date_from, date_to, class_id
            )
            
            # Predictive insights
            predictive_insights = EnhancedAcademicAnalyticsService._get_predictive_insights(
                date_from, date_to, class_id, subject_id
            )
            
            return {
                'role': 'admin',
                'performance_overview': performance_overview,
                'attendance_analytics': attendance_analytics,
                'grade_distribution': grade_distribution,
                'teacher_performance': teacher_performance,
                'class_comparison': class_comparison,
                'risk_assessment': risk_assessment,
                'predictive_insights': predictive_insights,
                'recommendations': EnhancedAcademicAnalyticsService._generate_admin_recommendations(
                    performance_overview, attendance_analytics, risk_assessment
                )
            }
            
        except Exception as e:
            logger.error(f"Error generating admin analytics: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def _get_school_performance_overview(date_from: datetime, date_to: datetime,
                                       class_id: Optional[int], subject_id: Optional[int]) -> Dict[str, Any]:
        """Get comprehensive school performance overview."""
        try:
            # Base query for grades
            grade_query = db.session.query(Grade).filter(
                Grade.created_at.between(date_from, date_to)
            )
            
            if class_id:
                grade_query = grade_query.filter(Grade.class_id == class_id)
            if subject_id:
                grade_query = grade_query.filter(Grade.subject_id == subject_id)
            
            grades = grade_query.all()
            
            if not grades:
                return {
                    'total_students': 0,
                    'total_assessments': 0,
                    'overall_average': 0,
                    'pass_rate': 0,
                    'grade_distribution': {},
                    'subject_performance': [],
                    'trends': []
                }
            
            # Calculate overall statistics
            scores = [g.score for g in grades if g.score is not None]
            total_students = len(set(g.student_id for g in grades))
            total_assessments = len(grades)
            overall_average = sum(scores) / len(scores) if scores else 0
            
            # Calculate pass rate (40% and above for GES)
            passing_scores = [s for s in scores if s >= 40]
            pass_rate = (len(passing_scores) / len(scores) * 100) if scores else 0
            
            # GES Grade distribution
            grade_distribution = {}
            for grade_letter, boundaries in EnhancedAcademicAnalyticsService.GES_BOUNDARIES.items():
                count = len([s for s in scores if boundaries['min'] <= s <= boundaries['max']])
                percentage = (count / len(scores) * 100) if scores else 0
                grade_distribution[grade_letter] = {
                    'count': count,
                    'percentage': round(percentage, 2),
                    'description': boundaries['description']
                }
            
            # Subject performance analysis
            subject_performance = []
            subject_grades = {}
            for grade in grades:
                if grade.subject_id not in subject_grades:
                    subject_grades[grade.subject_id] = []
                subject_grades[grade.subject_id].append(grade.score)
            
            for subject_id, subject_scores in subject_grades.items():
                subject = Subject.query.get(subject_id)
                if subject and subject_scores:
                    avg_score = sum(s for s in subject_scores if s is not None) / len([s for s in subject_scores if s is not None])
                    subject_pass_rate = len([s for s in subject_scores if s and s >= 40]) / len([s for s in subject_scores if s is not None]) * 100
                    
                    subject_performance.append({
                        'subject_id': subject_id,
                        'subject_name': subject.name,
                        'average_score': round(avg_score, 2),
                        'pass_rate': round(subject_pass_rate, 2),
                        'total_assessments': len(subject_scores),
                        'grade_distribution': EnhancedAcademicAnalyticsService._calculate_subject_grade_distribution(subject_scores)
                    })
            
            # Performance trends (monthly)
            trends = EnhancedAcademicAnalyticsService._calculate_performance_trends(grades, date_from, date_to)
            
            return {
                'total_students': total_students,
                'total_assessments': total_assessments,
                'overall_average': round(overall_average, 2),
                'pass_rate': round(pass_rate, 2),
                'grade_distribution': grade_distribution,
                'subject_performance': sorted(subject_performance, key=lambda x: x['average_score'], reverse=True),
                'trends': trends,
                'performance_indicators': {
                    'excellent_rate': grade_distribution.get('A', {}).get('percentage', 0),
                    'good_rate': grade_distribution.get('B', {}).get('percentage', 0) + grade_distribution.get('C', {}).get('percentage', 0),
                    'at_risk_rate': grade_distribution.get('F', {}).get('percentage', 0)
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating school performance overview: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def _get_attendance_analytics(date_from: datetime, date_to: datetime, 
                                class_id: Optional[int]) -> Dict[str, Any]:
        """Get comprehensive attendance analytics."""
        try:
            # Base query for attendance
            attendance_query = db.session.query(Attendance).filter(
                Attendance.date.between(date_from.date(), date_to.date())
            )
            
            if class_id:
                attendance_query = attendance_query.filter(Attendance.class_id == class_id)
            
            attendance_records = attendance_query.all()
            
            if not attendance_records:
                return {
                    'overall_rate': 0,
                    'total_sessions': 0,
                    'trends': [],
                    'class_comparison': [],
                    'risk_students': []
                }
            
            # Calculate overall attendance rate
            present_count = len([a for a in attendance_records if a.status == 'present'])
            total_sessions = len(attendance_records)
            overall_rate = (present_count / total_sessions * 100) if total_sessions > 0 else 0
            
            # Daily trends
            daily_attendance = {}
            for record in attendance_records:
                date_str = record.date.strftime('%Y-%m-%d')
                if date_str not in daily_attendance:
                    daily_attendance[date_str] = {'present': 0, 'total': 0}
                
                daily_attendance[date_str]['total'] += 1
                if record.status == 'present':
                    daily_attendance[date_str]['present'] += 1
            
            trends = []
            for date_str, data in sorted(daily_attendance.items()):
                rate = (data['present'] / data['total'] * 100) if data['total'] > 0 else 0
                trends.append({
                    'date': date_str,
                    'rate': round(rate, 2),
                    'present': data['present'],
                    'total': data['total']
                })
            
            # Class comparison (if not filtered by class)
            class_comparison = []
            if not class_id:
                class_attendance = {}
                for record in attendance_records:
                    if record.class_id not in class_attendance:
                        class_attendance[record.class_id] = {'present': 0, 'total': 0}
                    
                    class_attendance[record.class_id]['total'] += 1
                    if record.status == 'present':
                        class_attendance[record.class_id]['present'] += 1
                
                for class_id_key, data in class_attendance.items():
                    class_obj = Class.query.get(class_id_key)
                    if class_obj:
                        rate = (data['present'] / data['total'] * 100) if data['total'] > 0 else 0
                        class_comparison.append({
                            'class_id': class_id_key,
                            'class_name': class_obj.name,
                            'attendance_rate': round(rate, 2),
                            'total_sessions': data['total']
                        })
            
            # Identify at-risk students (attendance < 75%)
            student_attendance = {}
            for record in attendance_records:
                if record.student_id not in student_attendance:
                    student_attendance[record.student_id] = {'present': 0, 'total': 0}
                
                student_attendance[record.student_id]['total'] += 1
                if record.status == 'present':
                    student_attendance[record.student_id]['present'] += 1
            
            risk_students = []
            for student_id, data in student_attendance.items():
                rate = (data['present'] / data['total'] * 100) if data['total'] > 0 else 0
                if rate < 75:  # Below 75% attendance threshold
                    student = Student.query.get(student_id)
                    if student:
                        risk_students.append({
                            'student_id': student_id,
                            'student_name': f"{student.first_name} {student.last_name}",
                            'attendance_rate': round(rate, 2),
                            'total_sessions': data['total'],
                            'absent_sessions': data['total'] - data['present'],
                            'risk_level': 'high' if rate < 60 else 'medium'
                        })
            
            return {
                'overall_rate': round(overall_rate, 2),
                'total_sessions': total_sessions,
                'trends': trends[-30:],  # Last 30 days
                'class_comparison': sorted(class_comparison, key=lambda x: x['attendance_rate'], reverse=True),
                'risk_students': sorted(risk_students, key=lambda x: x['attendance_rate']),
                'status_breakdown': {
                    'present': len([a for a in attendance_records if a.status == 'present']),
                    'absent': len([a for a in attendance_records if a.status == 'absent']),
                    'late': len([a for a in attendance_records if a.status == 'late']),
                    'excused': len([a for a in attendance_records if a.status == 'excused'])
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating attendance analytics: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def _get_grade_distribution_analytics(date_from: datetime, date_to: datetime,
                                        class_id: Optional[int], subject_id: Optional[int]) -> Dict[str, Any]:
        """Get detailed grade distribution analytics with GES compliance."""
        try:
            # Base query for grades
            grade_query = db.session.query(Grade).filter(
                Grade.created_at.between(date_from, date_to)
            )
            
            if class_id:
                grade_query = grade_query.filter(Grade.class_id == class_id)
            if subject_id:
                grade_query = grade_query.filter(Grade.subject_id == subject_id)
            
            grades = grade_query.all()
            scores = [g.score for g in grades if g.score is not None]
            
            if not scores:
                return {
                    'ges_distribution': {},
                    'statistical_analysis': {},
                    'performance_bands': {},
                    'improvement_areas': []
                }
            
            # GES Grade distribution
            ges_distribution = {}
            for grade_letter, boundaries in EnhancedAcademicAnalyticsService.GES_BOUNDARIES.items():
                count = len([s for s in scores if boundaries['min'] <= s <= boundaries['max']])
                percentage = (count / len(scores) * 100) if scores else 0
                ges_distribution[grade_letter] = {
                    'count': count,
                    'percentage': round(percentage, 2),
                    'description': boundaries['description'],
                    'range': f"{boundaries['min']}-{boundaries['max']}"
                }
            
            # Statistical analysis
            statistical_analysis = {
                'mean': round(np.mean(scores), 2),
                'median': round(np.median(scores), 2),
                'mode': round(float(pd.Series(scores).mode().iloc[0]), 2) if len(pd.Series(scores).mode()) > 0 else 0,
                'std_deviation': round(np.std(scores), 2),
                'variance': round(np.var(scores), 2),
                'range': {
                    'min': min(scores),
                    'max': max(scores),
                    'span': max(scores) - min(scores)
                },
                'quartiles': {
                    'q1': round(np.percentile(scores, 25), 2),
                    'q2': round(np.percentile(scores, 50), 2),
                    'q3': round(np.percentile(scores, 75), 2),
                    'iqr': round(np.percentile(scores, 75) - np.percentile(scores, 25), 2)
                }
            }
            
            # Performance bands analysis
            performance_bands = {
                'excellent': {'min': 80, 'count': len([s for s in scores if s >= 80]), 'percentage': 0},
                'good': {'min': 60, 'max': 79, 'count': len([s for s in scores if 60 <= s < 80]), 'percentage': 0},
                'satisfactory': {'min': 40, 'max': 59, 'count': len([s for s in scores if 40 <= s < 60]), 'percentage': 0},
                'needs_improvement': {'max': 39, 'count': len([s for s in scores if s < 40]), 'percentage': 0}
            }
            
            for band in performance_bands.values():
                band['percentage'] = round((band['count'] / len(scores) * 100), 2)
            
            # Identify improvement areas
            improvement_areas = []
            if performance_bands['needs_improvement']['percentage'] > 20:
                improvement_areas.append({
                    'area': 'High failure rate',
                    'description': f"{performance_bands['needs_improvement']['percentage']}% of students scoring below 40%",
                    'priority': 'high',
                    'recommendation': 'Implement remedial programs and additional support'
                })
            
            if statistical_analysis['mean'] < 60:
                improvement_areas.append({
                    'area': 'Low average performance',
                    'description': f"Class average of {statistical_analysis['mean']}% is below good standard",
                    'priority': 'medium',
                    'recommendation': 'Review teaching methods and curriculum delivery'
                })
            
            if statistical_analysis['std_deviation'] > 20:
                improvement_areas.append({
                    'area': 'High performance variation',
                    'description': f"Standard deviation of {statistical_analysis['std_deviation']} indicates inconsistent performance",
                    'priority': 'medium',
                    'recommendation': 'Provide differentiated instruction to address varying ability levels'
                })
            
            return {
                'ges_distribution': ges_distribution,
                'statistical_analysis': statistical_analysis,
                'performance_bands': performance_bands,
                'improvement_areas': improvement_areas,
                'total_assessments': len(scores),
                'grade_trends': EnhancedAcademicAnalyticsService._calculate_grade_trends(grades, date_from, date_to)
            }
            
        except Exception as e:
            logger.error(f"Error calculating grade distribution analytics: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def _calculate_subject_grade_distribution(scores: List[float]) -> Dict[str, Dict[str, Any]]:
        """Calculate GES grade distribution for a subject."""
        if not scores:
            return {}
        
        distribution = {}
        valid_scores = [s for s in scores if s is not None]
        
        for grade_letter, boundaries in EnhancedAcademicAnalyticsService.GES_BOUNDARIES.items():
            count = len([s for s in valid_scores if boundaries['min'] <= s <= boundaries['max']])
            percentage = (count / len(valid_scores) * 100) if valid_scores else 0
            distribution[grade_letter] = {
                'count': count,
                'percentage': round(percentage, 2)
            }
        
        return distribution
    
    @staticmethod
    def _calculate_performance_trends(grades: List[Grade], date_from: datetime, date_to: datetime) -> List[Dict[str, Any]]:
        """Calculate monthly performance trends."""
        try:
            # Group grades by month
            monthly_grades = {}
            for grade in grades:
                if grade.score is not None and grade.created_at:
                    month_key = grade.created_at.strftime('%Y-%m')
                    if month_key not in monthly_grades:
                        monthly_grades[month_key] = []
                    monthly_grades[month_key].append(grade.score)
            
            trends = []
            for month_key in sorted(monthly_grades.keys()):
                scores = monthly_grades[month_key]
                if scores:
                    avg_score = sum(scores) / len(scores)
                    pass_rate = len([s for s in scores if s >= 40]) / len(scores) * 100
                    
                    trends.append({
                        'month': month_key,
                        'average_score': round(avg_score, 2),
                        'pass_rate': round(pass_rate, 2),
                        'total_assessments': len(scores),
                        'grade_distribution': EnhancedAcademicAnalyticsService._calculate_subject_grade_distribution(scores)
                    })
            
            return trends
            
        except Exception as e:
            logger.error(f"Error calculating performance trends: {str(e)}")
            return []
    
    @staticmethod
    def _calculate_grade_trends(grades: List[Grade], date_from: datetime, date_to: datetime) -> List[Dict[str, Any]]:
        """Calculate grade trends over time."""
        return EnhancedAcademicAnalyticsService._calculate_performance_trends(grades, date_from, date_to)
    
    @staticmethod
    def _get_teacher_performance_analytics(date_from: datetime, date_to: datetime,
                                         class_id: Optional[int], subject_id: Optional[int]) -> Dict[str, Any]:
        """Get teacher performance analytics."""
        try:
            # Get teachers and their performance metrics
            teacher_query = db.session.query(Teacher)
            
            if class_id:
                teacher_query = teacher_query.join(Class).filter(Class.id == class_id)
            
            teachers = teacher_query.all()
            teacher_performance = []
            
            for teacher in teachers:
                # Get classes taught by teacher
                teacher_classes = Class.query.filter(Class.teacher_id == teacher.id).all()
                class_ids = [c.id for c in teacher_classes]
                
                if not class_ids:
                    continue
                
                # Get grades for teacher's classes
                grade_query = db.session.query(Grade).filter(
                    Grade.class_id.in_(class_ids),
                    Grade.created_at.between(date_from, date_to)
                )
                
                if subject_id:
                    grade_query = grade_query.filter(Grade.subject_id == subject_id)
                
                grades = grade_query.all()
                scores = [g.score for g in grades if g.score is not None]
                
                if scores:
                    avg_score = sum(scores) / len(scores)
                    pass_rate = len([s for s in scores if s >= 40]) / len(scores) * 100
                    
                    # Get attendance for teacher's classes
                    attendance_records = Attendance.query.filter(
                        Attendance.class_id.in_(class_ids),
                        Attendance.date.between(date_from.date(), date_to.date())
                    ).all()
                    
                    present_count = len([a for a in attendance_records if a.status == 'present'])
                    attendance_rate = (present_count / len(attendance_records) * 100) if attendance_records else 0
                    
                    teacher_performance.append({
                        'teacher_id': teacher.id,
                        'teacher_name': f"{teacher.first_name} {teacher.last_name}",
                        'classes_taught': len(teacher_classes),
                        'total_students': len(set(g.student_id for g in grades)),
                        'average_score': round(avg_score, 2),
                        'pass_rate': round(pass_rate, 2),
                        'attendance_rate': round(attendance_rate, 2),
                        'total_assessments': len(scores),
                        'grade_distribution': EnhancedAcademicAnalyticsService._calculate_subject_grade_distribution(scores),
                        'performance_rating': EnhancedAcademicAnalyticsService._calculate_teacher_rating(avg_score, pass_rate, attendance_rate)
                    })
            
            return {
                'teachers': sorted(teacher_performance, key=lambda x: x['performance_rating'], reverse=True),
                'summary': {
                    'total_teachers': len(teacher_performance),
                    'average_class_score': round(sum(t['average_score'] for t in teacher_performance) / len(teacher_performance), 2) if teacher_performance else 0,
                    'average_pass_rate': round(sum(t['pass_rate'] for t in teacher_performance) / len(teacher_performance), 2) if teacher_performance else 0,
                    'top_performers': sorted(teacher_performance, key=lambda x: x['performance_rating'], reverse=True)[:5],
                    'needs_support': [t for t in teacher_performance if t['performance_rating'] < 3.0]
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating teacher performance analytics: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def _calculate_teacher_rating(avg_score: float, pass_rate: float, attendance_rate: float) -> float:
        """Calculate teacher performance rating (1-5 scale)."""
        # Weighted scoring: 40% avg_score, 35% pass_rate, 25% attendance_rate
        score_weight = (avg_score / 100) * 0.4
        pass_weight = (pass_rate / 100) * 0.35
        attendance_weight = (attendance_rate / 100) * 0.25
        
        total_score = (score_weight + pass_weight + attendance_weight) * 5
        return round(min(5.0, max(1.0, total_score)), 2)
    
    @staticmethod
    def _get_class_comparison_analytics(date_from: datetime, date_to: datetime,
                                      subject_id: Optional[int]) -> Dict[str, Any]:
        """Get class comparison analytics."""
        try:
            classes = Class.query.all()
            class_performance = []
            
            for class_obj in classes:
                # Get grades for this class
                grade_query = db.session.query(Grade).filter(
                    Grade.class_id == class_obj.id,
                    Grade.created_at.between(date_from, date_to)
                )
                
                if subject_id:
                    grade_query = grade_query.filter(Grade.subject_id == subject_id)
                
                grades = grade_query.all()
                scores = [g.score for g in grades if g.score is not None]
                
                if scores:
                    avg_score = sum(scores) / len(scores)
                    pass_rate = len([s for s in scores if s >= 40]) / len(scores) * 100
                    
                    # Get attendance for this class
                    attendance_records = Attendance.query.filter(
                        Attendance.class_id == class_obj.id,
                        Attendance.date.between(date_from.date(), date_to.date())
                    ).all()
                    
                    present_count = len([a for a in attendance_records if a.status == 'present'])
                    attendance_rate = (present_count / len(attendance_records) * 100) if attendance_records else 0
                    
                    class_performance.append({
                        'class_id': class_obj.id,
                        'class_name': class_obj.name,
                        'total_students': len(set(g.student_id for g in grades)),
                        'average_score': round(avg_score, 2),
                        'pass_rate': round(pass_rate, 2),
                        'attendance_rate': round(attendance_rate, 2),
                        'total_assessments': len(scores),
                        'grade_distribution': EnhancedAcademicAnalyticsService._calculate_subject_grade_distribution(scores),
                        'teacher_name': f"{class_obj.teacher.first_name} {class_obj.teacher.last_name}" if class_obj.teacher else "Not Assigned"
                    })
            
            # Calculate rankings
            performance_ranking = sorted(class_performance, key=lambda x: x['average_score'], reverse=True)
            attendance_ranking = sorted(class_performance, key=lambda x: x['attendance_rate'], reverse=True)
            
            return {
                'classes': class_performance,
                'rankings': {
                    'by_performance': performance_ranking,
                    'by_attendance': attendance_ranking
                },
                'summary': {
                    'total_classes': len(class_performance),
                    'school_average': round(sum(c['average_score'] for c in class_performance) / len(class_performance), 2) if class_performance else 0,
                    'best_performing': performance_ranking[0] if performance_ranking else None,
                    'needs_attention': [c for c in class_performance if c['average_score'] < 50 or c['attendance_rate'] < 75]
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating class comparison analytics: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def _get_risk_assessment(date_from: datetime, date_to: datetime, 
                           class_id: Optional[int]) -> Dict[str, Any]:
        """Get comprehensive risk assessment for students."""
        try:
            # Base query for students
            student_query = db.session.query(Student).filter(Student.is_active == True)
            
            if class_id:
                student_query = student_query.filter(Student.class_id == class_id)
            
            students = student_query.all()
            risk_assessment = []
            
            for student in students:
                # Get student's grades
                grades = Grade.query.filter(
                    Grade.student_id == student.id,
                    Grade.created_at.between(date_from, date_to)
                ).all()
                
                scores = [g.score for g in grades if g.score is not None]
                avg_score = sum(scores) / len(scores) if scores else 0
                
                # Get student's attendance
                attendance_records = Attendance.query.filter(
                    Attendance.student_id == student.id,
                    Attendance.date.between(date_from.date(), date_to.date())
                ).all()
                
                present_count = len([a for a in attendance_records if a.status == 'present'])
                attendance_rate = (present_count / len(attendance_records) * 100) if attendance_records else 0
                
                # Calculate risk factors
                risk_factors = []
                risk_score = 0
                
                # Academic risk
                if avg_score < 40:
                    risk_factors.append("Failing grades")
                    risk_score += 3
                elif avg_score < 50:
                    risk_factors.append("Below average performance")
                    risk_score += 2
                
                # Attendance risk
                if attendance_rate < 60:
                    risk_factors.append("Poor attendance")
                    risk_score += 3
                elif attendance_rate < 75:
                    risk_factors.append("Irregular attendance")
                    risk_score += 2
                
                # Trend analysis
                if len(scores) >= 3:
                    recent_scores = scores[-3:]
                    earlier_scores = scores[:-3] if len(scores) > 3 else scores[:1]
                    
                    if earlier_scores:
                        recent_avg = sum(recent_scores) / len(recent_scores)
                        earlier_avg = sum(earlier_scores) / len(earlier_scores)
                        
                        if recent_avg < earlier_avg - 10:
                            risk_factors.append("Declining performance")
                            risk_score += 2
                
                # Determine risk level
                if risk_score >= 5:
                    risk_level = "high"
                elif risk_score >= 3:
                    risk_level = "medium"
                elif risk_score >= 1:
                    risk_level = "low"
                else:
                    risk_level = "none"
                
                if risk_level != "none":
                    risk_assessment.append({
                        'student_id': student.id,
                        'student_name': f"{student.first_name} {student.last_name}",
                        'class_name': student.class_.name if student.class_ else "Not Assigned",
                        'risk_level': risk_level,
                        'risk_score': risk_score,
                        'risk_factors': risk_factors,
                        'average_score': round(avg_score, 2),
                        'attendance_rate': round(attendance_rate, 2),
                        'total_assessments': len(scores),
                        'recommendations': EnhancedAcademicAnalyticsService._generate_student_recommendations(
                            risk_factors, avg_score, attendance_rate
                        )
                    })
            
            # Categorize by risk level
            high_risk = [s for s in risk_assessment if s['risk_level'] == 'high']
            medium_risk = [s for s in risk_assessment if s['risk_level'] == 'medium']
            low_risk = [s for s in risk_assessment if s['risk_level'] == 'low']
            
            return {
                'total_students_assessed': len(students),
                'students_at_risk': len(risk_assessment),
                'risk_distribution': {
                    'high': len(high_risk),
                    'medium': len(medium_risk),
                    'low': len(low_risk)
                },
                'high_risk_students': sorted(high_risk, key=lambda x: x['risk_score'], reverse=True),
                'medium_risk_students': sorted(medium_risk, key=lambda x: x['risk_score'], reverse=True),
                'low_risk_students': sorted(low_risk, key=lambda x: x['risk_score'], reverse=True),
                'summary': {
                    'percentage_at_risk': round((len(risk_assessment) / len(students) * 100), 2) if students else 0,
                    'most_common_factors': EnhancedAcademicAnalyticsService._get_common_risk_factors(risk_assessment),
                    'intervention_priority': high_risk[:10]  # Top 10 highest risk students
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating risk assessment: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def _generate_student_recommendations(risk_factors: List[str], avg_score: float, attendance_rate: float) -> List[str]:
        """Generate recommendations for at-risk students."""
        recommendations = []
        
        if "Failing grades" in risk_factors:
            recommendations.append("Immediate academic intervention required")
            recommendations.append("Consider one-on-one tutoring sessions")
            recommendations.append("Review learning style and adjust teaching approach")
        
        if "Below average performance" in risk_factors:
            recommendations.append("Additional practice sessions recommended")
            recommendations.append("Peer tutoring or study groups")
        
        if "Poor attendance" in risk_factors:
            recommendations.append("Urgent meeting with parents/guardians")
            recommendations.append("Investigate underlying causes of absenteeism")
            recommendations.append("Develop attendance improvement plan")
        
        if "Irregular attendance" in risk_factors:
            recommendations.append("Monitor attendance closely")
            recommendations.append("Provide make-up sessions for missed classes")
        
        if "Declining performance" in risk_factors:
            recommendations.append("Investigate recent changes affecting performance")
            recommendations.append("Provide additional support and encouragement")
        
        return recommendations
    
    @staticmethod
    def _get_common_risk_factors(risk_assessment: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Get most common risk factors across students."""
        factor_counts = {}
        
        for student in risk_assessment:
            for factor in student['risk_factors']:
                factor_counts[factor] = factor_counts.get(factor, 0) + 1
        
        common_factors = []
        for factor, count in sorted(factor_counts.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / len(risk_assessment) * 100) if risk_assessment else 0
            common_factors.append({
                'factor': factor,
                'count': count,
                'percentage': round(percentage, 2)
            })
        
        return common_factors
    
    @staticmethod
    def _get_predictive_insights(date_from: datetime, date_to: datetime,
                               class_id: Optional[int], subject_id: Optional[int]) -> Dict[str, Any]:
        """Generate predictive insights using historical data."""
        try:
            # This is a simplified predictive model
            # In a real implementation, you would use machine learning algorithms
            
            # Get historical performance data
            grade_query = db.session.query(Grade).filter(
                Grade.created_at.between(date_from, date_to)
            )
            
            if class_id:
                grade_query = grade_query.filter(Grade.class_id == class_id)
            if subject_id:
                grade_query = grade_query.filter(Grade.subject_id == subject_id)
            
            grades = grade_query.all()
            
            if len(grades) < 10:  # Need minimum data for predictions
                return {
                    'predictions': [],
                    'trends': [],
                    'recommendations': ["Insufficient data for reliable predictions"]
                }
            
            # Analyze trends
            monthly_performance = {}
            for grade in grades:
                if grade.score is not None and grade.created_at:
                    month_key = grade.created_at.strftime('%Y-%m')
                    if month_key not in monthly_performance:
                        monthly_performance[month_key] = []
                    monthly_performance[month_key].append(grade.score)
            
            # Calculate trend direction
            monthly_averages = []
            for month in sorted(monthly_performance.keys()):
                scores = monthly_performance[month]
                avg = sum(scores) / len(scores)
                monthly_averages.append(avg)
            
            # Simple linear trend analysis
            if len(monthly_averages) >= 3:
                recent_trend = monthly_averages[-3:]
                trend_direction = "stable"
                
                if recent_trend[-1] > recent_trend[0] + 5:
                    trend_direction = "improving"
                elif recent_trend[-1] < recent_trend[0] - 5:
                    trend_direction = "declining"
            else:
                trend_direction = "insufficient_data"
            
            # Generate predictions
            predictions = []
            if trend_direction == "improving":
                predictions.append({
                    'type': 'performance',
                    'prediction': 'Performance is likely to continue improving',
                    'confidence': 'medium',
                    'timeframe': 'next_month',
                    'expected_change': '+3-5%'
                })
            elif trend_direction == "declining":
                predictions.append({
                    'type': 'performance',
                    'prediction': 'Performance may continue to decline without intervention',
                    'confidence': 'medium',
                    'timeframe': 'next_month',
                    'expected_change': '-3-5%'
                })
            
            # Risk predictions
            current_avg = monthly_averages[-1] if monthly_averages else 0
            if current_avg < 50:
                predictions.append({
                    'type': 'risk',
                    'prediction': 'High risk of increased failure rates',
                    'confidence': 'high',
                    'timeframe': 'immediate',
                    'action_required': True
                })
            
            # Generate recommendations based on predictions
            recommendations = []
            if trend_direction == "declining":
                recommendations.extend([
                    "Implement immediate intervention strategies",
                    "Review and adjust teaching methods",
                    "Increase student support services"
                ])
            elif trend_direction == "improving":
                recommendations.extend([
                    "Continue current successful strategies",
                    "Consider expanding successful programs",
                    "Monitor to maintain positive trend"
                ])
            
            return {
                'predictions': predictions,
                'trend_analysis': {
                    'direction': trend_direction,
                    'monthly_averages': monthly_averages,
                    'data_points': len(grades)
                },
                'recommendations': recommendations,
                'confidence_note': "Predictions based on historical data analysis. Actual results may vary."
            }
            
        except Exception as e:
            logger.error(f"Error generating predictive insights: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def _generate_admin_recommendations(performance_overview: Dict[str, Any], 
                                      attendance_analytics: Dict[str, Any],
                                      risk_assessment: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate actionable recommendations for administrators."""
        recommendations = []
        
        # Performance-based recommendations
        if performance_overview.get('pass_rate', 0) < 70:
            recommendations.append({
                'category': 'Academic Performance',
                'priority': 'high',
                'title': 'Improve Overall Pass Rate',
                'description': f"Current pass rate of {performance_overview.get('pass_rate', 0)}% is below target",
                'actions': [
                    "Review curriculum and teaching methods",
                    "Implement remedial programs",
                    "Provide additional teacher training"
                ]
            })
        
        # Attendance-based recommendations
        if attendance_analytics.get('overall_rate', 0) < 85:
            recommendations.append({
                'category': 'Attendance',
                'priority': 'high',
                'title': 'Address Attendance Issues',
                'description': f"School attendance rate of {attendance_analytics.get('overall_rate', 0)}% needs improvement",
                'actions': [
                    "Investigate causes of absenteeism",
                    "Implement attendance incentive programs",
                    "Engage with parents and community"
                ]
            })
        
        # Risk-based recommendations
        risk_percentage = risk_assessment.get('summary', {}).get('percentage_at_risk', 0)
        if risk_percentage > 25:
            recommendations.append({
                'category': 'Student Support',
                'priority': 'high',
                'title': 'Expand Student Support Services',
                'description': f"{risk_percentage}% of students are at academic or attendance risk",
                'actions': [
                    "Establish early warning system",
                    "Increase counseling services",
                    "Develop targeted intervention programs"
                ]
            })
        
        return recommendations
    
    @staticmethod
    def _get_teacher_analytics(user_id: int, date_from: datetime, date_to: datetime,
                             class_id: Optional[int], subject_id: Optional[int]) -> Dict[str, Any]:
        """Generate analytics for teacher dashboard."""
        try:
            # Get teacher record
            teacher = Teacher.query.filter_by(user_id=user_id).first()
            if not teacher:
                return {'error': 'Teacher profile not found'}
            
            # Get teacher's classes
            teacher_classes = Class.query.filter(Class.teacher_id == teacher.id).all()
            if class_id:
                teacher_classes = [c for c in teacher_classes if c.id == class_id]
            
            class_ids = [c.id for c in teacher_classes]
            
            if not class_ids:
                return {
                    'role': 'teacher',
                    'classes': [],
                    'performance_summary': {},
                    'student_progress': [],
                    'recommendations': []
                }
            
            # Get performance data for teacher's classes
            performance_summary = EnhancedAcademicAnalyticsService._get_teacher_class_performance(
                class_ids, date_from, date_to, subject_id
            )
            
            # Get student progress data
            student_progress = EnhancedAcademicAnalyticsService._get_teacher_student_progress(
                class_ids, date_from, date_to, subject_id
            )
            
            # Get class-specific analytics
            class_analytics = []
            for class_obj in teacher_classes:
                class_data = EnhancedAcademicAnalyticsService._get_single_class_analytics(
                    class_obj.id, date_from, date_to, subject_id
                )
                class_data['class_name'] = class_obj.name
                class_analytics.append(class_data)
            
            return {
                'role': 'teacher',
                'teacher_id': teacher.id,
                'teacher_name': f"{teacher.first_name} {teacher.last_name}",
                'classes': class_analytics,
                'performance_summary': performance_summary,
                'student_progress': student_progress,
                'recommendations': EnhancedAcademicAnalyticsService._generate_teacher_recommendations(
                    performance_summary, student_progress
                )
            }
            
        except Exception as e:
            logger.error(f"Error generating teacher analytics: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def _get_teacher_class_performance(class_ids: List[int], date_from: datetime, 
                                     date_to: datetime, subject_id: Optional[int]) -> Dict[str, Any]:
        """Get performance summary for teacher's classes."""
        try:
            # Get grades for teacher's classes
            grade_query = db.session.query(Grade).filter(
                Grade.class_id.in_(class_ids),
                Grade.created_at.between(date_from, date_to)
            )
            
            if subject_id:
                grade_query = grade_query.filter(Grade.subject_id == subject_id)
            
            grades = grade_query.all()
            scores = [g.score for g in grades if g.score is not None]
            
            if not scores:
                return {
                    'total_students': 0,
                    'total_assessments': 0,
                    'average_score': 0,
                    'pass_rate': 0,
                    'grade_distribution': {}
                }
            
            total_students = len(set(g.student_id for g in grades))
            average_score = sum(scores) / len(scores)
            pass_rate = len([s for s in scores if s >= 40]) / len(scores) * 100
            
            return {
                'total_students': total_students,
                'total_assessments': len(scores),
                'average_score': round(average_score, 2),
                'pass_rate': round(pass_rate, 2),
                'grade_distribution': EnhancedAcademicAnalyticsService._calculate_subject_grade_distribution(scores),
                'performance_trend': EnhancedAcademicAnalyticsService._calculate_performance_trends(grades, date_from, date_to)
            }
            
        except Exception as e:
            logger.error(f"Error calculating teacher class performance: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def _get_teacher_student_progress(class_ids: List[int], date_from: datetime,
                                    date_to: datetime, subject_id: Optional[int]) -> List[Dict[str, Any]]:
        """Get individual student progress for teacher's classes."""
        try:
            # Get students in teacher's classes
            students = Student.query.filter(
                Student.class_id.in_(class_ids),
                Student.is_active == True
            ).all()
            
            student_progress = []
            
            for student in students:
                # Get student's grades
                grade_query = db.session.query(Grade).filter(
                    Grade.student_id == student.id,
                    Grade.created_at.between(date_from, date_to)
                )
                
                if subject_id:
                    grade_query = grade_query.filter(Grade.subject_id == subject_id)
                
                grades = grade_query.all()
                scores = [g.score for g in grades if g.score is not None]
                
                if scores:
                    avg_score = sum(scores) / len(scores)
                    
                    # Calculate trend
                    trend = "stable"
                    if len(scores) >= 3:
                        recent_avg = sum(scores[-2:]) / len(scores[-2:])
                        earlier_avg = sum(scores[:-2]) / len(scores[:-2])
                        
                        if recent_avg > earlier_avg + 5:
                            trend = "improving"
                        elif recent_avg < earlier_avg - 5:
                            trend = "declining"
                    
                    # Get attendance
                    attendance_records = Attendance.query.filter(
                        Attendance.student_id == student.id,
                        Attendance.date.between(date_from.date(), date_to.date())
                    ).all()
                    
                    present_count = len([a for a in attendance_records if a.status == 'present'])
                    attendance_rate = (present_count / len(attendance_records) * 100) if attendance_records else 0
                    
                    student_progress.append({
                        'student_id': student.id,
                        'student_name': f"{student.first_name} {student.last_name}",
                        'class_name': student.class_.name if student.class_ else "Not Assigned",
                        'average_score': round(avg_score, 2),
                        'attendance_rate': round(attendance_rate, 2),
                        'total_assessments': len(scores),
                        'trend': trend,
                        'current_grade': EnhancedAcademicAnalyticsService._get_ges_grade(avg_score),
                        'needs_attention': avg_score < 50 or attendance_rate < 75
                    })
            
            return sorted(student_progress, key=lambda x: x['average_score'])
            
        except Exception as e:
            logger.error(f"Error calculating teacher student progress: {str(e)}")
            return []
    
    @staticmethod
    def _get_single_class_analytics(class_id: int, date_from: datetime, 
                                  date_to: datetime, subject_id: Optional[int]) -> Dict[str, Any]:
        """Get analytics for a single class."""
        try:
            # Get class grades
            grade_query = db.session.query(Grade).filter(
                Grade.class_id == class_id,
                Grade.created_at.between(date_from, date_to)
            )
            
            if subject_id:
                grade_query = grade_query.filter(Grade.subject_id == subject_id)
            
            grades = grade_query.all()
            scores = [g.score for g in grades if g.score is not None]
            
            # Get class attendance
            attendance_records = Attendance.query.filter(
                Attendance.class_id == class_id,
                Attendance.date.between(date_from.date(), date_to.date())
            ).all()
            
            present_count = len([a for a in attendance_records if a.status == 'present'])
            attendance_rate = (present_count / len(attendance_records) * 100) if attendance_records else 0
            
            if not scores:
                return {
                    'class_id': class_id,
                    'total_students': 0,
                    'average_score': 0,
                    'pass_rate': 0,
                    'attendance_rate': round(attendance_rate, 2),
                    'grade_distribution': {},
                    'top_performers': [],
                    'needs_attention': []
                }
            
            total_students = len(set(g.student_id for g in grades))
            average_score = sum(scores) / len(scores)
            pass_rate = len([s for s in scores if s >= 40]) / len(scores) * 100
            
            # Get top performers and students needing attention
            student_scores = {}
            for grade in grades:
                if grade.student_id not in student_scores:
                    student_scores[grade.student_id] = []
                student_scores[grade.student_id].append(grade.score)
            
            student_averages = []
            for student_id, student_grade_scores in student_scores.items():
                valid_scores = [s for s in student_grade_scores if s is not None]
                if valid_scores:
                    student = Student.query.get(student_id)
                    if student:
                        avg = sum(valid_scores) / len(valid_scores)
                        student_averages.append({
                            'student_id': student_id,
                            'student_name': f"{student.first_name} {student.last_name}",
                            'average_score': round(avg, 2)
                        })
            
            student_averages.sort(key=lambda x: x['average_score'], reverse=True)
            
            return {
                'class_id': class_id,
                'total_students': total_students,
                'average_score': round(average_score, 2),
                'pass_rate': round(pass_rate, 2),
                'attendance_rate': round(attendance_rate, 2),
                'grade_distribution': EnhancedAcademicAnalyticsService._calculate_subject_grade_distribution(scores),
                'top_performers': student_averages[:5],
                'needs_attention': [s for s in student_averages if s['average_score'] < 50]
            }
            
        except Exception as e:
            logger.error(f"Error calculating single class analytics: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def _generate_teacher_recommendations(performance_summary: Dict[str, Any],
                                        student_progress: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate recommendations for teachers."""
        recommendations = []
        
        # Performance-based recommendations
        avg_score = performance_summary.get('average_score', 0)
        pass_rate = performance_summary.get('pass_rate', 0)
        
        if pass_rate < 70:
            recommendations.append({
                'category': 'Academic Performance',
                'priority': 'high',
                'title': 'Improve Class Pass Rate',
                'description': f"Current pass rate of {pass_rate}% needs improvement",
                'actions': [
                    "Identify struggling students for extra support",
                    "Review teaching methods and materials",
                    "Consider additional practice sessions"
                ]
            })
        
        # Student-specific recommendations
        needs_attention = [s for s in student_progress if s.get('needs_attention', False)]
        if len(needs_attention) > 0:
            recommendations.append({
                'category': 'Student Support',
                'priority': 'medium',
                'title': 'Support Struggling Students',
                'description': f"{len(needs_attention)} students need additional attention",
                'actions': [
                    "Schedule one-on-one sessions with struggling students",
                    "Contact parents for students with poor attendance",
                    "Implement differentiated instruction strategies"
                ]
            })
        
        return recommendations
    
    @staticmethod
    def _get_student_analytics(user_id: int, date_from: datetime, date_to: datetime) -> Dict[str, Any]:
        """Generate analytics for student dashboard."""
        try:
            # Get student record
            student = Student.query.filter_by(user_id=user_id).first()
            if not student:
                return {'error': 'Student profile not found'}
            
            # Get student's grades
            grades = Grade.query.filter(
                Grade.student_id == student.id,
                Grade.created_at.between(date_from, date_to)
            ).all()
            
            scores = [g.score for g in grades if g.score is not None]
            
            # Get student's attendance
            attendance_records = Attendance.query.filter(
                Attendance.student_id == student.id,
                Attendance.date.between(date_from.date(), date_to.date())
            ).all()
            
            present_count = len([a for a in attendance_records if a.status == 'present'])
            attendance_rate = (present_count / len(attendance_records) * 100) if attendance_records else 0
            
            # Calculate performance metrics
            if scores:
                average_score = sum(scores) / len(scores)
                current_grade = EnhancedAcademicAnalyticsService._get_ges_grade(average_score)
                
                # Subject-wise performance
                subject_performance = {}
                for grade in grades:
                    if grade.subject_id not in subject_performance:
                        subject_performance[grade.subject_id] = []
                    subject_performance[grade.subject_id].append(grade.score)
                
                subjects = []
                for subject_id, subject_scores in subject_performance.items():
                    subject = Subject.query.get(subject_id)
                    if subject:
                        valid_scores = [s for s in subject_scores if s is not None]
                        if valid_scores:
                            avg = sum(valid_scores) / len(valid_scores)
                            subjects.append({
                                'subject_id': subject_id,
                                'subject_name': subject.name,
                                'average_score': round(avg, 2),
                                'current_grade': EnhancedAcademicAnalyticsService._get_ges_grade(avg),
                                'total_assessments': len(valid_scores),
                                'trend': EnhancedAcademicAnalyticsService._calculate_subject_trend(valid_scores)
                            })
                
                # Performance trend
                performance_trend = EnhancedAcademicAnalyticsService._calculate_student_performance_trend(grades)
                
            else:
                average_score = 0
                current_grade = 'F'
                subjects = []
                performance_trend = []
            
            return {
                'role': 'student',
                'student_id': student.id,
                'student_name': f"{student.first_name} {student.last_name}",
                'class_name': student.class_.name if student.class_ else "Not Assigned",
                'performance_summary': {
                    'average_score': round(average_score, 2),
                    'current_grade': current_grade,
                    'attendance_rate': round(attendance_rate, 2),
                    'total_assessments': len(scores)
                },
                'subject_performance': sorted(subjects, key=lambda x: x['average_score'], reverse=True),
                'performance_trend': performance_trend,
                'attendance_summary': {
                    'total_sessions': len(attendance_records),
                    'present': len([a for a in attendance_records if a.status == 'present']),
                    'absent': len([a for a in attendance_records if a.status == 'absent']),
                    'late': len([a for a in attendance_records if a.status == 'late']),
                    'rate': round(attendance_rate, 2)
                },
                'recommendations': EnhancedAcademicAnalyticsService._generate_student_recommendations(
                    [], average_score, attendance_rate
                )
            }
        except Exception as e:
            logger.error(f"Error getting student analytics: {str(e)}")
            return {'error': 'Failed to retrieve student analytics'}

    @staticmethod
    def _get_parent_analytics(user_id: int, date_from: datetime, date_to: datetime) -> Dict[str, Any]:
        """Generate analytics for parent dashboard."""
        try:
            # Get all children for this parent
            from app.models.user import User
            parent_user = User.query.get(user_id)
            if not parent_user:
                return {'error': 'Parent profile not found'}

            # Assuming parent-student relationship exists in the database
            # This would need to be implemented based on your specific model structure
            children = Student.query.filter_by(parent_id=user_id).all()
            
            if not children:
                return {
                    'role': 'parent',
                    'children_count': 0,
                    'children_analytics': [],
                    'overall_summary': {
                        'average_performance': 0,
                        'attendance_rate': 0,
                        'at_risk_children': 0
                    }
                }

            children_analytics = []
            total_performance = 0
            total_attendance = 0
            at_risk_count = 0

            for child in children:
                # Get child's performance
                grades = Grade.query.filter(
                    Grade.student_id == child.id,
                    Grade.created_at.between(date_from, date_to)
                ).all()

                attendance_records = Attendance.query.filter(
                    Attendance.student_id == child.id,
                    Attendance.date.between(date_from.date(), date_to.date())
                ).all()

                scores = [g.score for g in grades if g.score is not None]
                avg_score = sum(scores) / len(scores) if scores else 0
                
                present_count = len([a for a in attendance_records if a.status == 'present'])
                attendance_rate = (present_count / len(attendance_records) * 100) if attendance_records else 0

                # Check if child is at risk
                is_at_risk = avg_score < 50 or attendance_rate < 75

                child_analytics = {
                    'student_id': child.id,
                    'student_name': f"{child.first_name} {child.last_name}",
                    'class_name': child.class_.name if child.class_ else "Not Assigned",
                    'average_score': round(avg_score, 2),
                    'current_grade': EnhancedAcademicAnalyticsService._get_ges_grade(avg_score),
                    'attendance_rate': round(attendance_rate, 2),
                    'total_assessments': len(scores),
                    'is_at_risk': is_at_risk,
                    'risk_factors': []
                }

                if avg_score < 50:
                    child_analytics['risk_factors'].append('Low Academic Performance')
                if attendance_rate < 75:
                    child_analytics['risk_factors'].append('Poor Attendance')

                children_analytics.append(child_analytics)
                total_performance += avg_score
                total_attendance += attendance_rate
                if is_at_risk:
                    at_risk_count += 1

            return {
                'role': 'parent',
                'children_count': len(children),
                'children_analytics': children_analytics,
                'overall_summary': {
                    'average_performance': round(total_performance / len(children), 2) if children else 0,
                    'attendance_rate': round(total_attendance / len(children), 2) if children else 0,
                    'at_risk_children': at_risk_count
                },
                'recommendations': EnhancedAcademicAnalyticsService._generate_parent_recommendations(children_analytics)
            }
        except Exception as e:
            logger.error(f"Error getting parent analytics: {str(e)}")
            return {'error': 'Failed to retrieve parent analytics'}

    @staticmethod
    def _generate_parent_recommendations(children_analytics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate recommendations for parents based on children's performance."""
        recommendations = []
        
        for child in children_analytics:
            if child['is_at_risk']:
                if 'Low Academic Performance' in child['risk_factors']:
                    recommendations.append({
                        'type': 'academic_support',
                        'priority': 'high',
                        'title': f"Academic Support for {child['student_name']}",
                        'description': f"Consider additional tutoring or study support for {child['student_name']} who is currently performing below expectations.",
                        'student_id': child['student_id']
                    })
                
                if 'Poor Attendance' in child['risk_factors']:
                    recommendations.append({
                        'type': 'attendance_improvement',
                        'priority': 'high',
                        'title': f"Improve Attendance for {child['student_name']}",
                        'description': f"Work with school to improve {child['student_name']}'s attendance rate which is currently {child['attendance_rate']}%.",
                        'student_id': child['student_id']
                    })

        return recommendations

    @staticmethod
    def _get_ges_grade(score: float) -> str:
        """Convert numerical score to GES grade."""
        for grade, boundaries in EnhancedAcademicAnalyticsService.GES_BOUNDARIES.items():
            if boundaries['min'] <= score <= boundaries['max']:
                return grade
        return 'F'

    @staticmethod
    def _calculate_subject_trend(scores: List[float]) -> str:
        """Calculate trend for subject performance."""
        if len(scores) < 2:
            return 'stable'
        
        recent_avg = sum(scores[-3:]) / len(scores[-3:]) if len(scores) >= 3 else scores[-1]
        earlier_avg = sum(scores[:-3]) / len(scores[:-3]) if len(scores) > 3 else scores[0]
        
        if recent_avg > earlier_avg + 5:
            return 'improving'
        elif recent_avg < earlier_avg - 5:
            return 'declining'
        else:
            return 'stable'

    @staticmethod
    def _calculate_student_performance_trend(grades: List[Grade]) -> List[Dict[str, Any]]:
        """Calculate student performance trend over time."""
        if not grades:
            return []

        # Group grades by month
        monthly_performance = {}
        for grade in grades:
            month_key = grade.created_at.strftime('%Y-%m')
            if month_key not in monthly_performance:
                monthly_performance[month_key] = []
            monthly_performance[month_key].append(grade.score)

        trend_data = []
        for month, scores in sorted(monthly_performance.items()):
            valid_scores = [s for s in scores if s is not None]
            if valid_scores:
                avg_score = sum(valid_scores) / len(valid_scores)
                trend_data.append({
                    'month': month,
                    'average_score': round(avg_score, 2),
                    'grade': EnhancedAcademicAnalyticsService._get_ges_grade(avg_score),
                    'assessment_count': len(valid_scores)
                })

        return trend_data