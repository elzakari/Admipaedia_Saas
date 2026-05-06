from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date
import csv
import io
import json
from sqlalchemy import and_, or_

from app.models import (
    ExternalExamination, ExternalExamRegistration, ExternalExamResult, 
    ExternalExamImportLog, ExternalExamType, ExamSession, ResultStatus,
    Student, Subject, EnhancedGrade, GradingScheme, GradeBoundary
)
from app.extensions import db
from sqlalchemy.exc import IntegrityError
from . import external_exams_bp

@external_exams_bp.route('/examinations', methods=['GET'])
@jwt_required()
def get_examinations():
    """Get all external examinations"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        exam_type = request.args.get('exam_type')
        exam_year = request.args.get('exam_year', type=int)
        
        query = ExternalExamination.query
        
        if exam_type:
            query = query.filter(ExternalExamination.exam_type == ExternalExamType(exam_type))
        if exam_year:
            query = query.filter(ExternalExamination.exam_year == exam_year)
            
        examinations = query.order_by(ExternalExamination.exam_year.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        result = []
        for exam in examinations.items:
            result.append({
                'id': exam.id,
                'exam_type': exam.exam_type.value,
                'exam_year': exam.exam_year,
                'exam_session': exam.exam_session.value,
                'exam_name': exam.exam_name,
                'exam_code': exam.exam_code,
                'exam_start_date': exam.exam_start_date.isoformat() if exam.exam_start_date else None,
                'exam_end_date': exam.exam_end_date.isoformat() if exam.exam_end_date else None,
                'result_status': exam.result_status.value,
                'result_release_date': exam.result_release_date.isoformat() if exam.result_release_date else None,
                'total_registrations': len(exam.student_registrations),
                'total_results': len(exam.results),
                'auto_import_enabled': exam.auto_import_enabled,
                'last_import_date': exam.last_import_date.isoformat() if exam.last_import_date else None
            })
        
        return jsonify({
            'success': True,
            'data': result,
            'pagination': {
                'page': examinations.page,
                'pages': examinations.pages,
                'per_page': examinations.per_page,
                'total': examinations.total
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving examinations: {str(e)}'
        }), 500

@external_exams_bp.route('/examinations', methods=['POST'])
@jwt_required()
def create_examination():
    """Create a new external examination"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['exam_type', 'exam_year', 'exam_session', 'exam_name', 'exam_start_date', 'exam_end_date']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Generate exam code
        exam_code = f"{data['exam_type'].upper()}{data['exam_year']}"
        
        examination = ExternalExamination(
            exam_type=ExternalExamType(data['exam_type']),
            exam_year=data['exam_year'],
            exam_session=ExamSession(data['exam_session']),
            exam_name=data['exam_name'],
            exam_code=exam_code,
            registration_start_date=datetime.strptime(data.get('registration_start_date'), '%Y-%m-%d').date() if data.get('registration_start_date') else None,
            registration_end_date=datetime.strptime(data.get('registration_end_date'), '%Y-%m-%d').date() if data.get('registration_end_date') else None,
            exam_start_date=datetime.strptime(data['exam_start_date'], '%Y-%m-%d').date(),
            exam_end_date=datetime.strptime(data['exam_end_date'], '%Y-%m-%d').date(),
            result_release_date=datetime.strptime(data.get('result_release_date'), '%Y-%m-%d').date() if data.get('result_release_date') else None,
            auto_import_enabled=data.get('auto_import_enabled', False),
            import_source=data.get('import_source'),
            created_by=current_user_id
        )
        
        try:
            db.session.add(examination)
            db.session.commit()
        except IntegrityError as ie:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'Duplicate examination detected',
                'error': str(ie)
            }), 409
        
        return jsonify({
            'success': True,
            'message': 'External examination created successfully',
            'data': {
                'id': examination.id,
                'exam_code': examination.exam_code,
                'exam_name': examination.exam_name
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error creating examination: {str(e)}'
        }), 500

@external_exams_bp.route('/examinations/<int:exam_id>/register-student', methods=['POST'])
@jwt_required()
def register_student_for_exam(exam_id):
    """Register a student for external examination"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['student_id', 'index_number', 'center_number', 'center_name', 'registered_subjects']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Check if student is already registered
        existing_registration = ExternalExamRegistration.query.filter_by(
            examination_id=exam_id,
            student_id=data['student_id']
        ).first()
        
        if existing_registration:
            return jsonify({
                'success': False,
                'message': 'Student is already registered for this examination'
            }), 400
        
        registration = ExternalExamRegistration(
            examination_id=exam_id,
            student_id=data['student_id'],
            index_number=data['index_number'],
            center_number=data['center_number'],
            center_name=data['center_name'],
            registration_date=datetime.strptime(data.get('registration_date', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d').date(),
            registered_subjects=data['registered_subjects'],
            is_private_candidate=data.get('is_private_candidate', False),
            registration_fee=data.get('registration_fee'),
            payment_status=data.get('payment_status', 'pending')
        )
        
        try:
            db.session.add(registration)
            db.session.commit()
        except IntegrityError as ie:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'Duplicate registration detected (index_number)',
                'error': str(ie)
            }), 409
        
        return jsonify({
            'success': True,
            'message': 'Student registered successfully',
            'data': {
                'id': registration.id,
                'index_number': registration.index_number
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error registering student: {str(e)}'
        }), 500

@external_exams_bp.route('/examinations/<int:exam_id>/import-results', methods=['POST'])
@jwt_required()
def import_exam_results(exam_id):
    """Import external examination results"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if file is uploaded
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file uploaded'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        # Generate batch ID
        batch_id = f"IMPORT_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create import log
        import_log = ExternalExamImportLog(
            examination_id=exam_id,
            import_type='csv',
            import_source=file.filename,
            batch_id=batch_id,
            start_time=datetime.utcnow(),
            created_by=current_user_id
        )
        db.session.add(import_log)
        db.session.flush()
        
        # Process CSV file
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.DictReader(stream)
        
        total_records = 0
        successful_imports = 0
        failed_imports = 0
        duplicate_records = 0
        errors = []
        
        for row in csv_input:
            total_records += 1
            
            try:
                # Validate required CSV columns
                required_columns = ['index_number', 'subject_code', 'grade_symbol']
                for col in required_columns:
                    if col not in row or not row[col]:
                        raise ValueError(f"Missing required column: {col}")
                
                # Find registration
                registration = ExternalExamRegistration.query.filter_by(
                    examination_id=exam_id,
                    index_number=row['index_number']
                ).first()
                
                if not registration:
                    raise ValueError(f"No registration found for index number: {row['index_number']}")
                
                # Find subject
                subject = Subject.query.filter_by(code=row['subject_code']).first()
                if not subject:
                    raise ValueError(f"Subject not found: {row['subject_code']}")
                
                # Check for duplicate result
                existing_result = ExternalExamResult.query.filter_by(
                    examination_id=exam_id,
                    registration_id=registration.id,
                    subject_id=subject.id
                ).first()
                
                if existing_result:
                    duplicate_records += 1
                    continue
                
                # Create result record
                result = ExternalExamResult(
                    examination_id=exam_id,
                    registration_id=registration.id,
                    student_id=registration.student_id,
                    subject_id=subject.id,
                    subject_code=row['subject_code'],
                    raw_score=float(row.get('raw_score', 0)) if row.get('raw_score') else None,
                    percentage_score=float(row.get('percentage_score', 0)) if row.get('percentage_score') else None,
                    grade_symbol=row['grade_symbol'],
                    grade_points=float(row.get('grade_points', 0)) if row.get('grade_points') else None,
                    result_status=row.get('result_status', 'provisional'),
                    remarks=row.get('remarks'),
                    import_source=file.filename,
                    import_date=datetime.utcnow(),
                    import_batch_id=batch_id
                )
                
                db.session.add(result)
                successful_imports += 1
                
            except Exception as row_error:
                failed_imports += 1
                errors.append({
                    'row': total_records,
                    'index_number': row.get('index_number', 'Unknown'),
                    'error': str(row_error)
                })
        
        # Update import log
        import_log.total_records = total_records
        import_log.successful_imports = successful_imports
        import_log.failed_imports = failed_imports
        import_log.duplicate_records = duplicate_records
        import_log.end_time = datetime.utcnow()
        import_log.import_status = 'completed' if failed_imports == 0 else 'completed_with_errors'
        import_log.error_summary = {'errors': errors[:10]}  # Store first 10 errors
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Results import completed',
            'data': {
                'batch_id': batch_id,
                'total_records': total_records,
                'successful_imports': successful_imports,
                'failed_imports': failed_imports,
                'duplicate_records': duplicate_records,
                'errors': errors[:5]  # Return first 5 errors in response
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error importing results: {str(e)}'
        }), 500

@external_exams_bp.route('/students/<int:student_id>/results', methods=['GET'])
@jwt_required()
def get_student_external_results(student_id):
    """Get external examination results for a student"""
    try:
        exam_type = request.args.get('exam_type')
        exam_year = request.args.get('exam_year', type=int)
        
        query = ExternalExamResult.query.filter_by(student_id=student_id)
        
        if exam_type:
            query = query.join(ExternalExamination).filter(
                ExternalExamination.exam_type == ExternalExamType(exam_type)
            )
        if exam_year:
            query = query.join(ExternalExamination).filter(
                ExternalExamination.exam_year == exam_year
            )
        
        results = query.all()
        
        result_data = []
        for result in results:
            result_data.append({
                'id': result.id,
                'examination': {
                    'exam_type': result.examination.exam_type.value,
                    'exam_year': result.examination.exam_year,
                    'exam_name': result.examination.exam_name,
                    'exam_code': result.examination.exam_code
                },
                'subject': {
                    'id': result.subject.id,
                    'name': result.subject.name,
                    'code': result.subject.code
                },
                'subject_code': result.subject_code,
                'raw_score': result.raw_score,
                'percentage_score': result.percentage_score,
                'grade_symbol': result.grade_symbol,
                'grade_points': result.grade_points,
                'result_status': result.result_status,
                'is_verified': result.is_verified,
                'is_integrated': result.is_integrated,
                'remarks': result.remarks
            })
        
        return jsonify({
            'success': True,
            'data': result_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving student results: {str(e)}'
        }), 500

@external_exams_bp.route('/results/<int:result_id>/integrate', methods=['POST'])
@jwt_required()
def integrate_external_result(result_id):
    """Integrate external exam result with internal grading system"""
    try:
        current_user_id = get_jwt_identity()
        
        external_result = ExternalExamResult.query.get_or_404(result_id)
        
        if external_result.is_integrated:
            return jsonify({
                'success': False,
                'message': 'Result is already integrated'
            }), 400
        
        # Get appropriate grading scheme
        examination = external_result.examination
        grading_scheme = None
        
        if examination.exam_type == ExternalExamType.BECE:
            grading_scheme = GradingScheme.query.filter_by(
                standard=GradingStandard.BECE,
                is_active=True
            ).first()
        elif examination.exam_type == ExternalExamType.WASSCE:
            grading_scheme = GradingScheme.query.filter_by(
                standard=GradingStandard.WASSCE,
                is_active=True
            ).first()
        
        if not grading_scheme:
            return jsonify({
                'success': False,
                'message': f'No grading scheme found for {examination.exam_type.value}'
            }), 400
        
        # Create enhanced grade record
        enhanced_grade = EnhancedGrade(
            student_id=external_result.student_id,
            subject_id=external_result.subject_id,
            class_id=external_result.registration.student.current_class_id,
            grading_scheme_id=grading_scheme.id,
            assessment_type=AssessmentType.EXTERNAL_EXAM,
            assessment_name=f"{examination.exam_name} - {external_result.subject_code}",
            assessment_date=examination.exam_end_date,
            term='Term 3',  # External exams typically at end of academic year
            academic_year=str(examination.exam_year),
            raw_score=external_result.percentage_score or 0,
            total_marks=100,
            percentage=external_result.percentage_score or 0,
            grade_symbol=external_result.grade_symbol,
            grade_points=external_result.grade_points,
            is_passing=external_result.grade_points >= 5.0 if external_result.grade_points else False,
            is_class_score=False,
            is_external_exam=True,
            graded_by=current_user_id
        )
        
        db.session.add(enhanced_grade)
        db.session.flush()
        
        # Update external result
        external_result.internal_grade_id = enhanced_grade.id
        external_result.is_integrated = True
        external_result.integration_date = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'External result integrated successfully',
            'data': {
                'internal_grade_id': enhanced_grade.id,
                'grade_symbol': enhanced_grade.grade_symbol,
                'grade_points': enhanced_grade.grade_points
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error integrating result: {str(e)}'
        }), 500

@external_exams_bp.route('/analytics/performance-comparison', methods=['GET'])
@jwt_required()
def get_performance_comparison():
    """Compare internal vs external exam performance"""
    try:
        exam_type = request.args.get('exam_type')
        exam_year = request.args.get('exam_year', type=int)
        class_id = request.args.get('class_id', type=int)
        
        # Build query for external results
        external_query = ExternalExamResult.query.join(ExternalExamination)
        
        if exam_type:
            external_query = external_query.filter(
                ExternalExamination.exam_type == ExternalExamType(exam_type)
            )
        if exam_year:
            external_query = external_query.filter(
                ExternalExamination.exam_year == exam_year
            )
        if class_id:
            external_query = external_query.join(Student).filter(
                Student.current_class_id == class_id
            )
        
        external_results = external_query.all()
        
        # Analyze performance comparison
        comparison_data = {
            'total_students': len(set(result.student_id for result in external_results)),
            'subjects_analyzed': len(set(result.subject_id for result in external_results)),
            'average_external_performance': 0,
            'average_internal_performance': 0,
            'performance_correlation': 0,
            'subject_breakdown': [],
            'grade_distribution': {
                'external': {},
                'internal': {}
            }
        }
        
        # Calculate averages and correlations
        if external_results:
            external_scores = [r.percentage_score for r in external_results if r.percentage_score]
            comparison_data['average_external_performance'] = sum(external_scores) / len(external_scores) if external_scores else 0
            
            # Get corresponding internal grades
            internal_grades = EnhancedGrade.query.filter(
                EnhancedGrade.student_id.in_([r.student_id for r in external_results]),
                EnhancedGrade.subject_id.in_([r.subject_id for r in external_results]),
                EnhancedGrade.is_external_exam == False
            ).all()
            
            if internal_grades:
                internal_scores = [g.percentage for g in internal_grades]
                comparison_data['average_internal_performance'] = sum(internal_scores) / len(internal_scores)
        
        return jsonify({
            'success': True,
            'data': comparison_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error generating performance comparison: {str(e)}'
        }), 500
