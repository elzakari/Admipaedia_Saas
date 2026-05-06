from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, date
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import joinedload
import logging

from app.extensions import db
from app.models.grading_system import (
    GradingStandard, GradingScheme, GradeBoundary, 
    EnhancedGrade, FinalGrade, AssessmentType
)
from app.models.student import Student
from app.models.subject import Subject
from app.models.class_ import Class

logger = logging.getLogger(__name__)

class EnhancedGradingService:
    """Enhanced grading service implementing GES-compliant grading system"""
    
    # GES Grade Boundaries (BECE/WASSCE Standard)
    GES_GRADE_BOUNDARIES = {
        'A1': {'min': 80, 'max': 100, 'points': 1, 'interpretation': 'Excellent'},
        'B2': {'min': 70, 'max': 79, 'points': 2, 'interpretation': 'Very Good'},
        'B3': {'min': 65, 'max': 69, 'points': 3, 'interpretation': 'Good'},
        'C4': {'min': 60, 'max': 64, 'points': 4, 'interpretation': 'Credit'},
        'C5': {'min': 55, 'max': 59, 'points': 5, 'interpretation': 'Credit'},
        'C6': {'min': 50, 'max': 54, 'points': 6, 'interpretation': 'Credit'},
        'D7': {'min': 45, 'max': 49, 'points': 7, 'interpretation': 'Pass'},
        'E8': {'min': 40, 'max': 44, 'points': 8, 'interpretation': 'Pass'},
        'F9': {'min': 0, 'max': 39, 'points': 9, 'interpretation': 'Fail'}
    }
    
    @staticmethod
    def calculate_ges_grade(percentage: float) -> Dict[str, any]:
        """Calculate GES-compliant grade from percentage"""
        for grade_symbol, boundary in EnhancedGradingService.GES_GRADE_BOUNDARIES.items():
            if boundary['min'] <= percentage <= boundary['max']:
                return {
                    'grade_symbol': grade_symbol,
                    'grade_points': boundary['points'],
                    'interpretation': boundary['interpretation'],
                    'is_passing': boundary['points'] <= 8
                }
        return {
            'grade_symbol': 'F9',
            'grade_points': 9,
            'interpretation': 'Fail',
            'is_passing': False
        }
    
    @staticmethod
    def create_enhanced_grade(
        student_id: int,
        subject_id: int,
        class_id: int,
        assessment_type_id: int,
        grading_scheme_id: int,
        raw_score: float,
        total_marks: float,
        assessment_name: str,
        assessment_date: date,
        term: str,
        academic_year: str,
        teacher_id: int,
        weight: float = 1.0,
        teacher_comments: Optional[str] = None
    ) -> Tuple[Optional[EnhancedGrade], Optional[str]]:
        """Create an enhanced grade record with GES compliance"""
        try:
            # Validate inputs
            if raw_score < 0 or raw_score > total_marks:
                return None, "Raw score must be between 0 and total marks"
            
            if total_marks <= 0:
                return None, "Total marks must be greater than 0"
            
            # Calculate percentage
            percentage = (raw_score / total_marks) * 100

            scheme = GradingScheme.query.get(grading_scheme_id)
            if not scheme:
                return None, "Invalid grading scheme"
            
            # Create enhanced grade record
            enhanced_grade = EnhancedGrade(
                student_id=student_id,
                subject_id=subject_id,
                class_id=class_id,
                grading_scheme_id=grading_scheme_id,
                assessment_type_id=assessment_type_id,
                assessment_name=assessment_name,
                assessment_date=assessment_date,
                term=term,
                academic_year=academic_year,
                raw_score=raw_score,
                total_marks=total_marks,
                percentage=percentage,
                weight=weight,
                teacher_comments=teacher_comments,
                created_at=datetime.utcnow()
            )
            enhanced_grade.grading_scheme = scheme
            
            # Calculate grade automatically
            enhanced_grade.calculate_grade()
            
            db.session.add(enhanced_grade)
            db.session.commit()
            
            logger.info(f"Enhanced grade created for student {student_id}, subject {subject_id}")
            return enhanced_grade, None
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating enhanced grade: {str(e)}")
            return None, f"Failed to create enhanced grade: {str(e)}"
    
    @staticmethod
    def calculate_continuous_assessment_average(
        student_id: int,
        subject_id: int,
        class_id: int,
        term: str,
        academic_year: str
    ) -> Tuple[Optional[float], Optional[str]]:
        """Calculate weighted average of continuous assessments"""
        try:
            # Get all continuous assessment grades
            grades = EnhancedGrade.query.filter(
                and_(
                    EnhancedGrade.student_id == student_id,
                    EnhancedGrade.subject_id == subject_id,
                    EnhancedGrade.class_id == class_id,
                    EnhancedGrade.term == term,
                    EnhancedGrade.academic_year == academic_year,
                    EnhancedGrade.is_class_score == True
                )
            ).all()
            
            if not grades:
                return None, "No continuous assessment grades found"
            
            # Calculate weighted average
            total_weighted_score = sum(grade.percentage * grade.weight for grade in grades)
            total_weight = sum(grade.weight for grade in grades)
            
            if total_weight == 0:
                return None, "Total weight cannot be zero"
            
            average = total_weighted_score / total_weight
            return average, None
            
        except Exception as e:
            logger.error(f"Error calculating continuous assessment average: {str(e)}")
            return None, f"Failed to calculate average: {str(e)}"
    
    @staticmethod
    def calculate_final_grade(
        student_id: int,
        subject_id: int,
        class_id: int,
        term: str,
        academic_year: str,
        external_exam_score: Optional[float] = None,
        grading_scheme_id: int = 1,
        computed_by: int = None
    ) -> Tuple[Optional[FinalGrade], Optional[str]]:
        """Calculate final grade using grading scheme weights"""
        try:
            # Get continuous assessment average
            class_average, error = EnhancedGradingService.calculate_continuous_assessment_average(
                student_id, subject_id, class_id, term, academic_year
            )
            
            if error and not external_exam_score:
                return None, error

            scheme = GradingScheme.query.get(grading_scheme_id)
            if not scheme:
                return None, "Invalid grading scheme"

            class_weight = float(scheme.class_score_weight or 0) / 100.0
            external_weight = float(scheme.external_exam_weight or 0) / 100.0
            
            final_percentage = 0
            if class_average is not None:
                final_percentage += class_average * class_weight
            if external_exam_score is not None:
                final_percentage += external_exam_score * external_weight
            
            # Create or update final grade record
            existing_final = FinalGrade.query.filter(
                and_(
                    FinalGrade.student_id == student_id,
                    FinalGrade.subject_id == subject_id,
                    FinalGrade.class_id == class_id,
                    FinalGrade.term == term,
                    FinalGrade.academic_year == academic_year
                )
            ).first()
            
            if existing_final:
                # Update existing record
                existing_final.class_score_average = class_average
                existing_final.external_exam_score = external_exam_score
                existing_final.final_percentage = final_percentage
                existing_final.computed_at = datetime.utcnow()
                existing_final.computed_by = computed_by
                
                final_grade = existing_final
            else:
                # Create new record
                final_grade = FinalGrade(
                    student_id=student_id,
                    subject_id=subject_id,
                    class_id=class_id,
                    grading_scheme_id=grading_scheme_id,
                    term=term,
                    academic_year=academic_year,
                    class_score_average=class_average,
                    external_exam_score=external_exam_score,
                    final_percentage=final_percentage,
                    computed_at=datetime.utcnow(),
                    computed_by=computed_by
                )
                db.session.add(final_grade)
            final_grade.grading_scheme = scheme
            
            # Compute final grade using model method
            final_grade.compute_final_grade()
            
            db.session.commit()
            
            logger.info(f"Final grade calculated for student {student_id}, subject {subject_id}")
            return final_grade, None
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error calculating final grade: {str(e)}")
            return None, f"Failed to calculate final grade: {str(e)}"
    
    @staticmethod
    def get_student_performance_analytics(
        student_id: int,
        academic_year: str,
        term: Optional[str] = None
    ) -> Dict[str, any]:
        """Get comprehensive performance analytics for a student"""
        try:
            # Build base query
            query = EnhancedGrade.query.filter(
                and_(
                    EnhancedGrade.student_id == student_id,
                    EnhancedGrade.academic_year == academic_year
                )
            )
            
            if term:
                query = query.filter(EnhancedGrade.term == term)
            
            grades = query.all()
            
            if not grades:
                return {
                    'student_id': student_id,
                    'academic_year': academic_year,
                    'term': term,
                    'total_assessments': 0,
                    'average_percentage': 0,
                    'grade_distribution': {},
                    'subject_performance': {},
                    'performance_trend': [],
                    'strengths': [],
                    'areas_for_improvement': []
                }
            
            # Calculate overall statistics
            total_assessments = len(grades)
            average_percentage = sum(grade.percentage for grade in grades) / total_assessments
            
            # Grade distribution
            grade_distribution = {}
            for grade in grades:
                symbol = grade.grade_symbol
                grade_distribution[symbol] = grade_distribution.get(symbol, 0) + 1
            
            # Subject performance
            subject_performance = {}
            subjects = {}
            for grade in grades:
                if grade.subject_id not in subjects:
                    subjects[grade.subject_id] = []
                subjects[grade.subject_id].append(grade)
            
            for subject_id, subject_grades in subjects.items():
                subject_avg = sum(g.percentage for g in subject_grades) / len(subject_grades)
                subject_name = subject_grades[0].subject.name if subject_grades[0].subject else f"Subject {subject_id}"
                
                subject_performance[subject_name] = {
                    'average_percentage': round(subject_avg, 2),
                    'total_assessments': len(subject_grades),
                    'best_grade': max(subject_grades, key=lambda x: x.percentage).grade_symbol,
                    'latest_grade': sorted(subject_grades, key=lambda x: x.assessment_date)[-1].grade_symbol
                }
            
            # Performance trend (last 10 assessments)
            recent_grades = sorted(grades, key=lambda x: x.assessment_date)[-10:]
            performance_trend = [
                {
                    'date': grade.assessment_date.isoformat(),
                    'percentage': grade.percentage,
                    'grade_symbol': grade.grade_symbol,
                    'subject': grade.subject.name if grade.subject else 'Unknown'
                }
                for grade in recent_grades
            ]
            
            # Identify strengths and areas for improvement
            strengths = []
            areas_for_improvement = []
            
            for subject_name, performance in subject_performance.items():
                if performance['average_percentage'] >= 70:
                    strengths.append(subject_name)
                elif performance['average_percentage'] < 50:
                    areas_for_improvement.append(subject_name)
            
            return {
                'student_id': student_id,
                'academic_year': academic_year,
                'term': term,
                'total_assessments': total_assessments,
                'average_percentage': round(average_percentage, 2),
                'overall_grade': EnhancedGradingService.calculate_ges_grade(average_percentage)['grade_symbol'],
                'grade_distribution': grade_distribution,
                'subject_performance': subject_performance,
                'performance_trend': performance_trend,
                'strengths': strengths,
                'areas_for_improvement': areas_for_improvement,
                'passing_rate': len([g for g in grades if g.is_passing]) / total_assessments * 100
            }
            
        except Exception as e:
            logger.error(f"Error getting student performance analytics: {str(e)}")
            return {'error': f"Failed to get analytics: {str(e)}"}
    
    @staticmethod
    def get_class_performance_analytics(
        class_id: int,
        subject_id: Optional[int] = None,
        term: Optional[str] = None,
        academic_year: str = None
    ) -> Dict[str, any]:
        """Get comprehensive performance analytics for a class"""
        try:
            # Build base query
            query = EnhancedGrade.query.filter(EnhancedGrade.class_id == class_id)
            
            if subject_id:
                query = query.filter(EnhancedGrade.subject_id == subject_id)
            if term:
                query = query.filter(EnhancedGrade.term == term)
            if academic_year:
                query = query.filter(EnhancedGrade.academic_year == academic_year)
            
            grades = query.all()
            
            if not grades:
                return {
                    'class_id': class_id,
                    'subject_id': subject_id,
                    'term': term,
                    'academic_year': academic_year,
                    'total_students': 0,
                    'total_assessments': 0,
                    'class_average': 0,
                    'performance_distribution': {},
                    'top_performers': [],
                    'students_needing_support': []
                }
            
            # Get unique students
            unique_students = list(set(grade.student_id for grade in grades))
            total_students = len(unique_students)
            
            # Calculate class statistics
            total_assessments = len(grades)
            class_average = sum(grade.percentage for grade in grades) / total_assessments
            
            # Performance distribution
            performance_distribution = {
                'excellent': 0,  # 80-100%
                'very_good': 0,  # 70-79%
                'good': 0,       # 60-69%
                'average': 0,    # 50-59%
                'below_average': 0  # <50%
            }
            
            for grade in grades:
                if grade.percentage >= 80:
                    performance_distribution['excellent'] += 1
                elif grade.percentage >= 70:
                    performance_distribution['very_good'] += 1
                elif grade.percentage >= 60:
                    performance_distribution['good'] += 1
                elif grade.percentage >= 50:
                    performance_distribution['average'] += 1
                else:
                    performance_distribution['below_average'] += 1
            
            # Student performance summary
            student_performance = {}
            for grade in grades:
                if grade.student_id not in student_performance:
                    student_performance[grade.student_id] = {
                        'grades': [],
                        'student_name': f"{grade.student.first_name} {grade.student.last_name}" if grade.student else f"Student {grade.student_id}"
                    }
                student_performance[grade.student_id]['grades'].append(grade)
            
            # Calculate individual student averages
            for student_id, data in student_performance.items():
                student_grades = data['grades']
                data['average'] = sum(g.percentage for g in student_grades) / len(student_grades)
                data['total_assessments'] = len(student_grades)
            
            # Top performers (top 5)
            top_performers = sorted(
                student_performance.items(),
                key=lambda x: x[1]['average'],
                reverse=True
            )[:5]
            
            top_performers_list = [
                {
                    'student_id': student_id,
                    'student_name': data['student_name'],
                    'average_percentage': round(data['average'], 2),
                    'grade_symbol': EnhancedGradingService.calculate_ges_grade(data['average'])['grade_symbol']
                }
                for student_id, data in top_performers
            ]
            
            # Students needing support (bottom 5 or those with average < 50%)
            students_needing_support = [
                {
                    'student_id': student_id,
                    'student_name': data['student_name'],
                    'average_percentage': round(data['average'], 2),
                    'grade_symbol': EnhancedGradingService.calculate_ges_grade(data['average'])['grade_symbol']
                }
                for student_id, data in student_performance.items()
                if data['average'] < 50
            ]
            
            return {
                'class_id': class_id,
                'subject_id': subject_id,
                'term': term,
                'academic_year': academic_year,
                'total_students': total_students,
                'total_assessments': total_assessments,
                'class_average': round(class_average, 2),
                'overall_grade': EnhancedGradingService.calculate_ges_grade(class_average)['grade_symbol'],
                'performance_distribution': performance_distribution,
                'top_performers': top_performers_list,
                'students_needing_support': students_needing_support,
                'passing_rate': len([g for g in grades if g.is_passing]) / total_assessments * 100
            }
            
        except Exception as e:
            logger.error(f"Error getting class performance analytics: {str(e)}")
            return {'error': f"Failed to get analytics: {str(e)}"}
    
    @staticmethod
    def bulk_calculate_final_grades(
        class_id: int,
        term: str,
        academic_year: str,
        computed_by: int
    ) -> Tuple[List[FinalGrade], Optional[str]]:
        """Bulk calculate final grades for all students in a class"""
        try:
            # Get all students in the class
            students = Student.query.filter(Student.class_id == class_id).all()
            
            if not students:
                return [], "No students found in the class"
            
            # Get all subjects for the class
            subjects = Subject.query.join(
                EnhancedGrade, Subject.id == EnhancedGrade.subject_id
            ).filter(
                and_(
                    EnhancedGrade.class_id == class_id,
                    EnhancedGrade.term == term,
                    EnhancedGrade.academic_year == academic_year
                )
            ).distinct().all()
            
            final_grades = []
            errors = []
            
            for student in students:
                for subject in subjects:
                    final_grade, error = EnhancedGradingService.calculate_final_grade(
                        student_id=student.id,
                        subject_id=subject.id,
                        class_id=class_id,
                        term=term,
                        academic_year=academic_year,
                        computed_by=computed_by
                    )
                    
                    if final_grade:
                        final_grades.append(final_grade)
                    else:
                        errors.append(f"Student {student.id}, Subject {subject.id}: {error}")
            
            if errors:
                logger.warning(f"Some final grades could not be calculated: {errors}")
            
            logger.info(f"Bulk calculated {len(final_grades)} final grades for class {class_id}")
            return final_grades, None if not errors else f"Some calculations failed: {'; '.join(errors[:5])}"
            
        except Exception as e:
            logger.error(f"Error in bulk final grade calculation: {str(e)}")
            return [], f"Failed to bulk calculate final grades: {str(e)}"
