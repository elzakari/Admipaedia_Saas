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
        
        # Structure for frontend: keyed by a stable assessment identity so
        # duplicate names across categories can still round-trip correctly.
        gradebook = {}
        assessments = {}
        
        for grade in grades:
            if grade.student_id not in gradebook:
                student = Student.query.get(grade.student_id)
                gradebook[grade.student_id] = {
                    'student_name': f"{student.first_name} {student.last_name}",
                    'admission_number': student.admission_number,
                    'grades': {}
                }
            assessment_key = f"{grade.assessment_type_id}:{grade.assessment_name}"
            assessments[assessment_key] = {
                'assessment_key': assessment_key,
                'assessment_name': grade.assessment_name,
                'assessment_type_id': grade.assessment_type_id,
                'total_marks': grade.total_marks,
                'assessment_date': grade.assessment_date.isoformat() if grade.assessment_date else None,
            }

            gradebook[grade.student_id]['grades'][assessment_key] = {
                'score': grade.raw_score,
                'total': grade.total_marks,
                'percentage': grade.percentage,
                'grade': grade.grade_symbol,
                'remark': grade.teacher_comments,
                'assessment_name': grade.assessment_name,
                'assessment_type_id': grade.assessment_type_id,
                'assessment_date': grade.assessment_date.isoformat() if grade.assessment_date else None,
            }

        return {
            'students': gradebook,
            'assessments': sorted(
                assessments.values(),
                key=lambda item: (
                    item.get('assessment_date') or '',
                    item.get('assessment_name') or '',
                    item.get('assessment_type_id') or 0,
                ),
            )
        }, None

    @staticmethod
    def calculate_final_grades(class_id, subject_id, term, academic_year):
        """Compute final grades for a class/subject dynamically based on active categories."""
        from flask import g
        from app.services.academic_configuration_service import AcademicConfigurationService
        from app.models.exam import Exam
        from app.models.grade import Grade

        tenant_id = getattr(g, 'tenant_id', None)
        if not tenant_id:
            cls_obj = Class.query.get(class_id)
            tenant_id = cls_obj.tenant_id if cls_obj else None

        config = AcademicConfigurationService.build_harmonized_config(tenant_id)
        assessment_types = config.get('assessmentTypes') or []
        active_categories = {str(t['id']): t for t in assessment_types if isinstance(t, dict) and t.get('isActive', True)}
        active_categories_by_name = {t['name'].strip().lower(): t for t in assessment_types if isinstance(t, dict) and t.get('isActive', True)}

        is_apc = False
        from app.models.tenant import Tenant
        tenant_obj = Tenant.query.get(tenant_id) if tenant_id else None
        if tenant_obj and tenant_obj.education_system == 'APC':
            is_apc = True

        # Get all students in class
        students = Student.query.filter_by(class_id=class_id).all()
        
        for student in students:
            category_scores = {}
            
            # 1. Fetch EnhancedGrade records
            enhanced_grades = EnhancedGrade.query.filter_by(
                student_id=student.id,
                class_id=class_id,
                subject_id=subject_id,
                term=term,
                academic_year=academic_year
            ).all()
            
            for eg in enhanced_grades:
                cat_id = str(eg.assessment_type_id)
                matched_cat = None
                if cat_id in active_categories:
                    matched_cat = active_categories[cat_id]
                else:
                    for c_id, c in active_categories.items():
                        if c['name'].strip().lower() == str(eg.assessment_type_id).strip().lower():
                            matched_cat = c
                            break
                
                if matched_cat:
                    cat_key = matched_cat['id']
                    if cat_key not in category_scores:
                        category_scores[cat_key] = []
                    category_scores[cat_key].append(eg.percentage)
            
            # 2. Fetch regular Grade records
            regular_grades = Grade.query.filter_by(
                student_id=student.id,
                class_id=class_id,
                subject_id=subject_id,
                term=term,
                academic_year=academic_year
            ).all()
            
            for rg in regular_grades:
                exam_obj = rg.exam
                exam_type = exam_obj.assessment_type or rg.assessment_type if exam_obj else rg.assessment_type
                
                if exam_type:
                    exam_type_str = str(exam_type).strip().lower()
                    matched_cat = None
                    if exam_type_str in active_categories:
                        matched_cat = active_categories[exam_type_str]
                    elif exam_type_str in active_categories_by_name:
                        matched_cat = active_categories_by_name[exam_type_str]
                    
                    if matched_cat:
                        cat_key = matched_cat['id']
                        if cat_key not in category_scores:
                            category_scores[cat_key] = []
                        category_scores[cat_key].append(rg.percentage)

            if not category_scores:
                continue

            if is_apc:
                all_scores = []
                for cat_id, scores in category_scores.items():
                    for s in scores:
                        if s > 20.0:
                            all_scores.append(s * 0.20)
                        else:
                            all_scores.append(s)
                if all_scores:
                    final_percentage = sum(all_scores) / len(all_scores)
                else:
                    final_percentage = 0.0
            else:
                final_percentage = 0.0
                for cat_id, cat in active_categories.items():
                    scores = category_scores.get(cat_id, [])
                    if scores:
                        category_avg = sum(scores) / len(scores)
                    else:
                        category_avg = 0.0
                    weight = float(cat.get('weight', 0))
                    final_percentage += category_avg * (weight / 100.0)

            # Create/Update FinalGrade
            grading_scheme = GradingScheme.query.filter_by(tenant_id=tenant_id, is_active=True, is_default=True).first()
            if not grading_scheme:
                grading_scheme = GradingScheme.query.filter_by(tenant_id=tenant_id, is_active=True).first()
            if not grading_scheme:
                grading_scheme = GradingScheme.query.first() # Fallback grading scheme
            
            final_grade = FinalGrade.query.filter_by(
                student_id=student.id,
                subject_id=subject_id,
                term=term,
                academic_year=academic_year
            ).first()
            
            is_new_grade = False
            if not final_grade:
                is_new_grade = True
                final_grade = FinalGrade(
                    student_id=student.id,
                    subject_id=subject_id,
                    class_id=class_id,
                    grading_scheme_id=grading_scheme.id if grading_scheme else 1,
                    term=term,
                    academic_year=academic_year,
                    computed_by=1
                )
            
            final_grade.final_percentage = final_percentage
            final_grade.class_score_average = final_percentage  # Map final percentage
            
            # Determine final grade symbol
            scheme_to_use = grading_scheme or final_grade.grading_scheme
            if scheme_to_use:
                for boundary in sorted(scheme_to_use.grade_boundaries, 
                                     key=lambda x: x.sequence_order):
                    if boundary.min_score <= final_percentage <= boundary.max_score:
                        final_grade.final_grade_symbol = boundary.grade_symbol
                        final_grade.final_grade_points = boundary.grade_points
                        final_grade.is_passing = boundary.is_passing
                        break
            else:
                # Simple fallback grading scale
                if final_percentage >= 80:
                    final_grade.final_grade_symbol, final_grade.is_passing = 'A', True
                elif final_percentage >= 70:
                    final_grade.final_grade_symbol, final_grade.is_passing = 'B', True
                elif final_percentage >= 60:
                    final_grade.final_grade_symbol, final_grade.is_passing = 'C', True
                elif final_percentage >= 50:
                    final_grade.final_grade_symbol, final_grade.is_passing = 'D', True
                elif final_percentage >= 40:
                    final_grade.final_grade_symbol, final_grade.is_passing = 'E', True
                else:
                    final_grade.final_grade_symbol, final_grade.is_passing = 'F', False
            
            if is_new_grade:
                db.session.add(final_grade)
            
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
