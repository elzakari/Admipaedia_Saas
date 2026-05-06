from app.extensions import db
from app.models.grading_system import EnhancedGrade, FinalGrade, GradingScheme
from app.models.student import Student
from app.models.subject import Subject
from app.models.class_ import Class
from sqlalchemy import func
import structlog

logger = structlog.get_logger()

class GradingService:
    @staticmethod
    def enter_grade(data):
        """Enter a grade for a single student assessment."""
        try:
            # Check if grade exists
            existing_grade = EnhancedGrade.query.filter_by(
                student_id=data['student_id'],
                subject_id=data['subject_id'],
                class_id=data['class_id'],
                assessment_type_id=data['assessment_type_id'],
                term=data['term'],
                academic_year=data['academic_year'],
                assessment_name=data['assessment_name']
            ).first()

            if existing_grade:
                # Update existing
                for key, value in data.items():
                    setattr(existing_grade, key, value)
                grade = existing_grade
            else:
                # Create new
                grade = EnhancedGrade(**data)
                db.session.add(grade)
            
            # Calculate grade symbol/points
            # Need to fetch the grading scheme for this class/level
            # For now, assuming grading_scheme_id is passed or derived
            if grade.grading_scheme_id:
                grade.calculate_grade()
                
            db.session.commit()
            return grade, None
        except Exception as e:
            db.session.rollback()
            logger.error("Error entering grade", error=str(e))
            return None, str(e)

    @staticmethod
    def bulk_enter_grades(grades_data):
        """Bulk enter grades for a class."""
        try:
            results = []
            for grade_data in grades_data:
                grade, error = GradingService.enter_grade(grade_data)
                if error:
                    logger.error("Failed to enter grade in bulk", error=error, data=grade_data)
                else:
                    results.append(grade)
            return results, None
        except Exception as e:
            return None, str(e)

    @staticmethod
    def get_gradebook(class_id, subject_id, term, academic_year):
        """Fetch the gradebook for a specific class and subject."""
        grades = EnhancedGrade.query.filter_by(
            class_id=class_id,
            subject_id=subject_id,
            term=term,
            academic_year=academic_year
        ).all()
        
        # Structure for frontend: {student_id: {assessment_name: score, ...}}
        gradebook = {}
        assessments = set()
        
        for grade in grades:
            if grade.student_id not in gradebook:
                student = Student.query.get(grade.student_id)
                gradebook[grade.student_id] = {
                    'student_name': f"{student.first_name} {student.last_name}",
                    'admission_number': student.admission_number,
                    'grades': {}
                }
            
            gradebook[grade.student_id]['grades'][grade.assessment_name] = {
                'score': grade.raw_score,
                'total': grade.total_marks,
                'percentage': grade.percentage,
                'grade': grade.grade_symbol
            }
            assessments.add(grade.assessment_name)
            
        return {
            'students': gradebook,
            'assessments': list(assessments)
        }, None

    @staticmethod
    def calculate_final_grades(class_id, subject_id, term, academic_year):
        """Compute final grades for a class/subject."""
        # Get all students in class
        students = Student.query.filter_by(class_id=class_id).all()
        
        for student in students:
            # Fetch all grades
            grades = EnhancedGrade.query.filter_by(
                student_id=student.id,
                class_id=class_id,
                subject_id=subject_id,
                term=term,
                academic_year=academic_year
            ).all()
            
            if not grades:
                continue
                
            # Aggregate Class Score (Continuous Assessment)
            class_score_total = 0
            class_score_max = 0
            
            external_score = 0
            external_max = 0
            
            for grade in grades:
                if grade.is_class_score:
                    class_score_total += grade.percentage * grade.weight # Simplified weighting
                    class_score_max += 100 * grade.weight
                elif grade.is_external_exam:
                    external_score = grade.percentage
                    external_max = 100
            
            # Normalize Class Score to 100%
            class_score_avg = (class_score_total / class_score_max * 100) if class_score_max > 0 else 0
            
            # Create/Update FinalGrade
            # Assuming GradingScheme is linked to Class or Subject (simplified lookup)
            grading_scheme = GradingScheme.query.first() # Placeholder: Needs proper lookup logic
            
            final_grade = FinalGrade.query.filter_by(
                student_id=student.id,
                subject_id=subject_id,
                term=term,
                academic_year=academic_year
            ).first()
            
            if not final_grade:
                final_grade = FinalGrade(
                    student_id=student.id,
                    subject_id=subject_id,
                    class_id=class_id,
                    grading_scheme_id=grading_scheme.id if grading_scheme else 1, # Fallback
                    term=term,
                    academic_year=academic_year,
                    computed_by=1 # System/Admin user
                )
                db.session.add(final_grade)
            
            final_grade.class_score_average = class_score_avg
            final_grade.external_exam_score = external_score
            final_grade.compute_final_grade()
            
        db.session.commit()
        return True, None

    @staticmethod
    def generate_broadsheet(class_id, term, academic_year):
        """Generate a broadsheet (pivot table) for the class."""
        # Get all final grades
        final_grades = FinalGrade.query.filter_by(
            class_id=class_id,
            term=term,
            academic_year=academic_year
        ).all()
        
        # Pivot: Rows=Students, Cols=Subjects
        broadsheet = {}
        subjects = set()
        
        for fg in final_grades:
            if fg.student_id not in broadsheet:
                student = Student.query.get(fg.student_id)
                broadsheet[fg.student_id] = {
                    'student_info': {
                        'name': f"{student.first_name} {student.last_name}",
                        'admission_number': student.admission_number
                    },
                    'results': {}
                }
            
            subject = Subject.query.get(fg.subject_id)
            subjects.add(subject.name)
            
            broadsheet[fg.student_id]['results'][subject.name] = {
                'score': fg.final_percentage,
                'grade': fg.final_grade_symbol,
                'position': fg.class_rank
            }
            
        return {
            'broadsheet': broadsheet,
            'subjects': sorted(list(subjects))
        }, None
