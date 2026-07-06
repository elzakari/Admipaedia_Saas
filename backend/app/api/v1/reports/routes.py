from flask import request, jsonify, send_file, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.auth_utils import admin_required, teacher_required
from app.utils.tenant_context import tenant_required
from app.models import (
    Student, Subject, Grade, EnhancedGrade, FinalGrade, GradingScheme, 
    EducationalLevel, StudentProgression, CoreCompetency,
    StudentCompetencyAssessment, Attendance, Term
)
from app.models.academic_calendar import AcademicYear
from app.models.academic_term import AcademicTerm
from app.extensions import db
from . import reports_bp
from datetime import datetime, timedelta
from sqlalchemy import func, and_
import io
import csv
import json
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from app.services.report_service import ReportService
from app.services.enhanced_student_service import EnhancedStudentService
from app.services.email_service import send_email


def _get_report_card_subject_results(student_id, term, academic_year):
    """Return one subject outcome per term, preferring computed FinalGrade rows."""
    final_grades = db.session.query(
        Subject.name.label('subject_name'),
        FinalGrade.final_percentage.label('average_score'),
        FinalGrade.final_grade_symbol.label('grade'),
        FinalGrade.final_grade_points.label('grade_point'),
        FinalGrade.teacher_remarks.label('remarks')
    ).join(
        FinalGrade, Subject.id == FinalGrade.subject_id
    ).filter(
        FinalGrade.student_id == student_id,
        FinalGrade.term == term,
        FinalGrade.academic_year == academic_year
    ).order_by(Subject.name.asc()).all()

    if final_grades:
        return final_grades

    enhanced_grades = db.session.query(
        Subject.name.label('subject_name'),
        func.avg(EnhancedGrade.raw_score).label('average_score'),
        func.max(EnhancedGrade.grade_symbol).label('grade'),
        func.avg(EnhancedGrade.grade_points).label('grade_point'),
        func.max(EnhancedGrade.teacher_comments).label('remarks')
    ).join(
        EnhancedGrade, Subject.id == EnhancedGrade.subject_id
    ).filter(
        EnhancedGrade.student_id == student_id,
        EnhancedGrade.term == term,
        EnhancedGrade.academic_year == academic_year
    ).group_by(Subject.id, Subject.name).all()

    if enhanced_grades:
        return enhanced_grades

    return db.session.query(
        Subject.name.label('subject_name'),
        func.avg(Grade.percentage).label('average_score'),
        func.max(Grade.grade_letter).label('grade'),
        func.avg(Grade.percentage / 25).label('grade_point'),
        func.max(Grade.remarks).label('remarks')
    ).join(
        Grade, Subject.id == Grade.subject_id
    ).filter(
        Grade.student_id == student_id,
        Grade.term == term,
        Grade.academic_year == academic_year
    ).group_by(Subject.id, Subject.name).all()


def _get_term_gpa(student_id, term, academic_year):
    final_gpa = db.session.query(
        func.avg(FinalGrade.final_grade_points)
    ).filter(
        FinalGrade.student_id == student_id,
        FinalGrade.term == term,
        FinalGrade.academic_year == academic_year
    ).scalar()
    if final_gpa is not None:
        return round(final_gpa, 2)

    enhanced_gpa = db.session.query(
        func.avg(EnhancedGrade.grade_points)
    ).filter(
        EnhancedGrade.student_id == student_id,
        EnhancedGrade.term == term,
        EnhancedGrade.academic_year == academic_year
    ).scalar()
    if enhanced_gpa is not None:
        return round(enhanced_gpa, 2)

    grade_gpa = db.session.query(
        func.avg(Grade.percentage / 25)
    ).filter(
        Grade.student_id == student_id,
        Grade.term == term,
        Grade.academic_year == academic_year
    ).scalar()
    return round(grade_gpa, 2) if grade_gpa is not None else 0.0


def _get_transcript_year_subject_results(student_id, academic_year):
    """Return yearly transcript subject outcomes, preferring FinalGrade."""
    final_grades = db.session.query(
        Subject.name.label('subject_name'),
        Subject.code.label('subject_code'),
        func.avg(FinalGrade.final_percentage).label('average_score'),
        func.max(FinalGrade.final_grade_symbol).label('grade'),
        func.avg(FinalGrade.final_grade_points).label('grade_point')
    ).join(
        FinalGrade, Subject.id == FinalGrade.subject_id
    ).filter(
        FinalGrade.student_id == student_id,
        FinalGrade.academic_year == academic_year
    ).group_by(Subject.id, Subject.name, Subject.code).all()

    if final_grades:
        return final_grades

    enhanced_grades = db.session.query(
        Subject.name.label('subject_name'),
        Subject.code.label('subject_code'),
        func.avg(EnhancedGrade.raw_score).label('average_score'),
        func.max(EnhancedGrade.grade_symbol).label('grade'),
        func.avg(EnhancedGrade.grade_points).label('grade_point')
    ).join(
        EnhancedGrade, Subject.id == EnhancedGrade.subject_id
    ).filter(
        EnhancedGrade.student_id == student_id,
        EnhancedGrade.academic_year == academic_year
    ).group_by(Subject.id, Subject.name, Subject.code).all()

    if enhanced_grades:
        return enhanced_grades

    return db.session.query(
        Subject.name.label('subject_name'),
        Subject.code.label('subject_code'),
        func.avg(Grade.percentage).label('average_score'),
        func.max(Grade.grade_letter).label('grade'),
        func.avg(Grade.percentage / 25).label('grade_point')
    ).join(
        Grade, Subject.id == Grade.subject_id
    ).filter(
        Grade.student_id == student_id,
        Grade.academic_year == academic_year
    ).group_by(Subject.id, Subject.name, Subject.code).all()


def _get_class_subject_performance(class_id, term, academic_year):
    final_grades = db.session.query(
        Subject.name.label('subject_name'),
        func.avg(FinalGrade.final_percentage).label('class_average'),
        func.max(FinalGrade.final_percentage).label('highest_score'),
        func.min(FinalGrade.final_percentage).label('lowest_score'),
        func.count(FinalGrade.id).label('student_count')
    ).join(
        FinalGrade, Subject.id == FinalGrade.subject_id
    ).filter(
        FinalGrade.class_id == class_id,
        FinalGrade.term == term,
        FinalGrade.academic_year == academic_year
    ).group_by(Subject.id, Subject.name).all()

    if final_grades:
        return final_grades

    return db.session.query(
        Subject.name.label('subject_name'),
        func.avg(EnhancedGrade.raw_score).label('class_average'),
        func.max(EnhancedGrade.raw_score).label('highest_score'),
        func.min(EnhancedGrade.raw_score).label('lowest_score'),
        func.count(EnhancedGrade.id).label('student_count')
    ).join(
        EnhancedGrade, Subject.id == EnhancedGrade.subject_id
    ).join(
        Student, EnhancedGrade.student_id == Student.id
    ).filter(
        Student.class_id == class_id,
        EnhancedGrade.term == term,
        EnhancedGrade.academic_year == academic_year
    ).group_by(Subject.id, Subject.name).all()


@reports_bp.route('/academic-years', methods=['GET'])
@jwt_required()
@teacher_required
def get_academic_years():
    years = AcademicYear.query.order_by(AcademicYear.start_date.desc()).all()
    return jsonify({
        'success': True,
        'data': [y.name for y in years]
    }), 200

@reports_bp.route('/student/<int:student_id>/send-report', methods=['POST'])
@jwt_required()
def send_student_report_email(student_id):
    """Send student report card via email."""
    try:
        data = request.get_json()
        report_data = data.get('report_data')
        recipient_email = data.get('email')
        
        if not report_data or not recipient_email:
            return jsonify({'success': False, 'message': 'Missing report data or email'}), 400
            
        # Generate PDF
        pdf_buffer = ReportService.generate_student_report_card_pdf(report_data)
        
        # Prepare email
        subject = f"Academic Report Card - {report_data['student_info']['name']} ({report_data['student_info']['term']})"
        text_body = f"Please find attached the academic report card for {report_data['student_info']['name']} for {report_data['student_info']['term']} ({report_data['student_info']['academic_year']})."
        
        # Attachments: (filename, mimetype, data)
        attachments = [(f"report_card_{student_id}.pdf", 'application/pdf', pdf_buffer.getvalue())]
        
        success = send_email(subject, [recipient_email], text_body, attachments=attachments)
        
        if success:
            return jsonify({'success': True, 'message': 'Report card sent successfully'}), 200
        else:
            return jsonify({'success': False, 'message': 'Failed to send email'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@reports_bp.route('/administrative', methods=['GET'])
@jwt_required()
@admin_required
def get_administrative_report():
    """Generates administrative report data."""
    try:
        date_from_str = request.args.get('date_from')
        date_to_str = request.args.get('date_to')
        
        date_from = None
        date_to = None
        
        if date_from_str:
            date_from = datetime.fromisoformat(date_from_str.split('T')[0]).date()
        if date_to_str:
            date_to = datetime.fromisoformat(date_to_str.split('T')[0]).date()
            
        data = ReportService.get_administrative_report_data(date_from, date_to)
        
        return jsonify({
            'success': True,
            'data': json.loads(json.dumps(data, default=str)),
            'generatedAt': datetime.now().isoformat()
        }), 200
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        current_app.logger.error(f"Error generating administrative report: {error_details}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@reports_bp.route('/financial', methods=['GET'])
@jwt_required()
@admin_required
def get_financial_report():
    """Generates financial report data."""
    try:
        date_from_str = request.args.get('date_from')
        date_to_str = request.args.get('date_to')
        
        date_from = None
        date_to = None
        
        if date_from_str:
            date_from = datetime.fromisoformat(date_from_str.split('T')[0]).date()
        if date_to_str:
            date_to = datetime.fromisoformat(date_to_str.split('T')[0]).date()
            
        data = ReportService.get_financial_report_data(date_from, date_to)
        
        return jsonify({
            'success': True,
            'data': json.loads(json.dumps(data, default=str)),
            'generatedAt': datetime.now().isoformat()
        }), 200
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        current_app.logger.error(f"Error generating financial report: {error_details}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@reports_bp.route('/custom', methods=['POST'])
@jwt_required()
def generate_custom_report():
    """Generate a custom report based on JSON configuration."""
    try:
        config = request.get_json()
        if not config:
            return jsonify({'success': False, 'message': 'No configuration provided'}), 400
            
        report_data = ReportService.generate_custom_report_data(config)
        
        # Save report configuration/results if needed (placeholder for now)
        # In a real app, we might store this in a 'generated_reports' table
        
        return jsonify({
            'success': True,
            'data': report_data
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@reports_bp.route('/export', methods=['POST'])
@jwt_required()
def export_report():
    """Export report data to PDF or CSV."""
    try:
        data = request.get_json()
        report_data = data.get('report_data')
        format_type = data.get('format', 'pdf').lower()
        
        if not report_data:
            return jsonify({'success': False, 'message': 'No report data provided'}), 400
            
        if format_type == 'pdf':
            buffer = ReportService.generate_pdf(report_data)
            return send_file(
                buffer,
                as_attachment=True,
                download_name=f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                mimetype='application/pdf'
            )
        elif format_type == 'csv':
            csv_content = ReportService.generate_csv(report_data)
            buffer = io.BytesIO(csv_content.encode('utf-8'))
            return send_file(
                buffer,
                as_attachment=True,
                download_name=f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mimetype='text/csv'
            )
        elif format_type == 'excel':
            buffer = ReportService.generate_excel(report_data)
            return send_file(
                buffer,
                as_attachment=True,
                download_name=f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        else:
            return jsonify({'success': False, 'message': f'Unsupported format: {format_type}'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@reports_bp.route('/student/<int:student_id>/report-card', methods=['GET'])
@jwt_required()
@tenant_required
def generate_student_report_card(student_id):
    """Generate comprehensive student report card with enhanced metrics."""
    try:
        # Get query parameters
        term = request.args.get('term', 'First Term')
        academic_year = request.args.get('academic_year')
        format_type = request.args.get('format', 'json')  # json, pdf, html
        
        # Get student information
        student = Student.query.filter_by(id=student_id, tenant_id=g.tenant_id).first()
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        
        # If academic year not provided, get the latest one from progression records
        if not academic_year:
            latest_progression = StudentProgression.query.filter_by(
                student_id=student_id
            ).order_by(StudentProgression.academic_year.desc()).first()
            if latest_progression:
                academic_year = latest_progression.academic_year
            else:
                # Fallback to current year if no progression records at all
                academic_year = '2024/2025'
        
        # Get student's educational level and grading scheme
        progression = StudentProgression.query.filter_by(
            student_id=student_id,
            academic_year=academic_year
        ).first()
        
        if not progression:
            return jsonify({
                'success': False,
                'message': 'No progression record found for this academic year'
            }), 404
        
        educational_level = EducationalLevel.query.get(progression.current_level_id)
        grading_scheme = GradingScheme.query.filter_by(
            tenant_id=g.tenant_id,
            is_active=True,
            is_default=True
        ).first()

        if not grading_scheme and educational_level:
            grading_scheme = GradingScheme.query.filter_by(
                educational_level_id=educational_level.id,
                is_active=True
            ).first()
        
        grades = _get_report_card_subject_results(student_id, term, academic_year)
        
        # Get attendance data
        # Handle different academic year formats (e.g., '2024/2025' or '2024-2025')
        year_sep = '/' if '/' in academic_year else '-'
        try:
            start_year = academic_year.split(year_sep)[0]
            end_year = academic_year.split(year_sep)[1]
            # Ensure 4-digit years
            if len(end_year) == 2:
                end_year = f"{start_year[:2]}{end_year}"
                
            start_date = datetime.strptime(f'{start_year}-09-01', '%Y-%m-%d').date()
            end_date = datetime.strptime(f'{end_year}-07-31', '%Y-%m-%d').date()
        except (IndexError, ValueError):
            # Fallback if format is unexpected
            start_date = datetime.utcnow().date() - timedelta(days=365)
            end_date = datetime.utcnow().date()

        # Get term dates for accurate attendance calculation
        tenant_term = AcademicTerm.query.filter_by(tenant_id=g.tenant_id, name=term).first()
        if tenant_term:
            attendance_start = tenant_term.start_date
            attendance_end = tenant_term.end_date
        else:
            term_obj = db.session.query(Term).filter(Term.name == term).first()
            attendance_start = term_obj.start_date if term_obj else start_date
            attendance_end = term_obj.end_date if term_obj else end_date

        # 4. Fetch Attendance Stats for the specific term
        attendance_stats = db.session.query(
            func.count(Attendance.id).label('total_days'),
            func.sum(func.cast(Attendance.status == 'present', db.Integer)).label('present_days'),
            func.sum(func.cast(Attendance.status == 'absent', db.Integer)).label('absent_days'),
            func.sum(func.cast(Attendance.status == 'late', db.Integer)).label('late_days')
        ).filter(
            Attendance.student_id == student_id,
            Attendance.date >= attendance_start,
            Attendance.date <= attendance_end
        ).first()
        
        # Calculate attendance rate safely
        total_days = attendance_stats.total_days or 0
        present_days = attendance_stats.present_days or 0
        late_days = attendance_stats.late_days or 0
        
        # Effective presence includes late arrivals
        effective_present = present_days + late_days
        attendance_rate = round(effective_present / total_days * 100, 1) if total_days > 0 else 0.0
        
        # Get core competencies assessment
        competencies = db.session.query(
            CoreCompetency.name.label('competency_name'),
            func.avg(StudentCompetencyAssessment.level_achieved).label('average_level')
        ).join(
            StudentCompetencyAssessment, CoreCompetency.id == StudentCompetencyAssessment.competency_id
        ).filter(
            StudentCompetencyAssessment.student_id == student_id,
            StudentCompetencyAssessment.academic_year == academic_year
        ).group_by(CoreCompetency.id, CoreCompetency.name).all()
        
        # If no competencies found, provide default placeholders for the new template
        if not competencies:
            report_competencies = [
                {'name': 'Attitude', 'level': 4.0, 'description': 'Shows a positive attitude towards learning. Accepts feedback well and strives to improve.'},
                {'name': 'Conduct', 'level': 4.0, 'description': 'Respects teachers and classmates. Follows school rules and is responsible.'},
                {'name': 'Interest', 'level': 4.0, 'description': 'Shows keen interest in technology, science projects, and reading.'}
            ]
        else:
            report_competencies = [{
                'name': comp.competency_name,
                'level': round(comp.average_level, 1) if comp.average_level else 0,
                'description': _get_competency_description(comp.average_level)
            } for comp in competencies]

        # Calculate overall performance
        total_grade_points = sum([grade.grade_point or 0 for grade in grades])
        subject_count = len(grades)
        gpa = round(total_grade_points / subject_count, 2) if subject_count > 0 else 0.0
        
        # Get historical GPAs for the bar chart (last 3 terms if possible)
        historical_gpas = []
        all_terms = ['First Term', 'Second Term', 'Third Term']
        for t in all_terms:
            if t == term:
                historical_gpas.append(gpa)
                continue
            
            historical_gpas.append(_get_term_gpa(student_id, t, academic_year))

        # Determine class position (simplified)
        class_students = Student.query.filter_by(class_id=student.class_id).count()
        position = 1  # This would need proper ranking logic
        
        # Build report card data
        report_data = {
            'student_info': {
                'name': f'{student.first_name} {student.last_name}',
                'admission_number': student.admission_number,
                'class': getattr(student.class_, 'display_name', None) or (student.class_.name if student.class_ else 'N/A'),
                'educational_level': educational_level.level_name,
                'academic_year': academic_year,
                'term': term,
                'profile_picture': EnhancedStudentService.build_profile_picture_url(student.profile_picture),
            },
            'academic_performance': {
                'subjects': [{
                    'name': grade.subject_name,
                    'score': round(grade.average_score, 1) if grade.average_score else 0,
                    'grade': grade.grade or 'N/A',
                    'grade_point': round(grade.grade_point, 2) if grade.grade_point else 0.0,
                    'remarks': getattr(grade, 'remarks', None) or _get_grade_remarks(grade.grade)
                } for grade in grades],
                'overall_gpa': gpa,
                'historical_gpas': historical_gpas,
                'class_position': f'{position}/{class_students}',
                'total_subjects': subject_count
            },
            'attendance': {
                'total_days': total_days,
                'present_days': present_days,
                'absent_days': attendance_stats.absent_days or 0,
                'late_days': attendance_stats.late_days or 0,
                'attendance_rate': attendance_rate
            },
            'core_competencies': report_competencies,
            'progression_status': {
                'meets_academic_threshold': progression.meets_academic_threshold,
                'meets_attendance_threshold': progression.meets_attendance_threshold,
                'promotion_status': 'Promoted' if progression.meets_academic_threshold and progression.meets_attendance_threshold else 'Repeat',
                'next_level': progression.next_level.level_name if progression.next_level else 'N/A'
            },
            'teacher_comments': _generate_teacher_comments(gpa, attendance_rate),
            'principal_comments': _generate_principal_comments(gpa),
            'grading_scheme': {
                'name': grading_scheme.name if grading_scheme else 'Standard',
                'scale': grading_scheme.standard.value if grading_scheme and grading_scheme.standard else 'Ghana Education Service'
            }
        }
        
        if format_type == 'pdf':
            return _generate_pdf_report_card(report_data)
        elif format_type == 'html':
            return _generate_html_report_card(report_data)
        else:
            return jsonify({
                'success': True,
                'data': report_data
            }), 200
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error generating report card: {str(e)}'
        }), 500

@reports_bp.route('/student/<int:student_id>/transcript', methods=['GET'])
@jwt_required()
@tenant_required
def generate_student_transcript(student_id):
    """Generate official academic transcript"""
    try:
        format_type = request.args.get('format', 'json')
        
        # Get student information
        student = Student.query.filter_by(id=student_id, tenant_id=g.tenant_id).first()
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        
        # Get all academic years for the student
        progressions = StudentProgression.query.filter_by(
            student_id=student_id
        ).order_by(StudentProgression.academic_year).all()
        
        transcript_data = {
            'student_info': {
                'name': f'{student.first_name} {student.last_name}',
                'admission_number': student.admission_number,
                'date_of_birth': student.date_of_birth.strftime('%Y-%m-%d') if student.date_of_birth else 'N/A',
                'gender': student.gender,
                'entry_date': student.created_at.strftime('%Y-%m-%d'),
                'graduation_date': progressions[-1].academic_year if progressions else 'In Progress'
            },
            'academic_record': [],
            'overall_performance': {
                'cumulative_gpa': 0.0,
                'total_credits': 0,
                'academic_standing': 'Good Standing'
            }
        }
        
        total_gpa_points = 0
        total_years = 0
        
        for progression in progressions:
            # Get grades for this academic year
            year_grades = _get_transcript_year_subject_results(student_id, progression.academic_year)
            
            year_gpa = sum([grade.grade_point or 0 for grade in year_grades]) / len(year_grades) if year_grades else 0
            total_gpa_points += year_gpa
            total_years += 1
            
            transcript_data['academic_record'].append({
                'academic_year': progression.academic_year,
                'educational_level': progression.current_level.name,
                'subjects': [{
                    'name': grade.subject_name,
                    'code': grade.subject_code or 'N/A',
                    'score': round(grade.average_score, 1) if grade.average_score else 0,
                    'grade': grade.grade or 'N/A',
                    'grade_point': round(grade.grade_point, 2) if grade.grade_point else 0.0,
                    'credits': 1  # Simplified credit system
                } for grade in year_grades],
                'year_gpa': round(year_gpa, 2),
                'promotion_status': 'Promoted' if progression.meets_academic_threshold else 'Repeat'
            })
        
        # Calculate cumulative GPA
        transcript_data['overall_performance']['cumulative_gpa'] = round(total_gpa_points / total_years, 2) if total_years > 0 else 0.0
        transcript_data['overall_performance']['total_credits'] = sum([len(year['subjects']) for year in transcript_data['academic_record']])
        
        if format_type == 'pdf':
            return _generate_pdf_transcript(transcript_data)
        else:
            return jsonify({
                'success': True,
                'data': transcript_data
            }), 200
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error generating transcript: {str(e)}'
        }), 500

@reports_bp.route('/class/<int:class_id>/performance-summary', methods=['GET'])
@jwt_required()
def generate_class_performance_summary(class_id):
    """Generate class performance summary report"""
    try:
        term = request.args.get('term', 'Term 1')
        academic_year = request.args.get('academic_year', '2024/2025')
        
        # Get class students
        students = Student.query.filter_by(class_id=class_id).all()
        
        if not students:
            return jsonify({
                'success': False,
                'message': 'No students found in this class'
            }), 404
        
        # Get class performance data
        class_grades = _get_class_subject_performance(class_id, term, academic_year)
        
        # Get attendance summary
        attendance_summary = db.session.query(
            func.avg(func.cast(Attendance.status == 'present', db.Integer) * 100).label('average_attendance')
        ).join(
            Student, Attendance.student_id == Student.id
        ).filter(
            Student.class_id == class_id
        ).first()
        
        summary_data = {
            'class_info': {
                'class_id': class_id,
                'total_students': len(students),
                'term': term,
                'academic_year': academic_year
            },
            'subject_performance': [{
                'subject': grade.subject_name,
                'class_average': round(grade.class_average, 1) if grade.class_average else 0,
                'highest_score': grade.highest_score or 0,
                'lowest_score': grade.lowest_score or 0,
                'student_count': grade.student_count
            } for grade in class_grades],
            'attendance_summary': {
                'average_attendance_rate': round(attendance_summary.average_attendance, 1) if attendance_summary.average_attendance else 0
            }
        }
        
        return jsonify({
            'success': True,
            'data': summary_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error generating class performance summary: {str(e)}'
        }), 500

# Helper functions
def _get_grade_remarks(grade):
    """Get remarks based on grade"""
    remarks_map = {
        'A1': 'Excellent performance',
        'A2': 'Very good performance', 
        'B3': 'Good performance',
        'B4': 'Credit performance',
        'C5': 'Pass performance',
        'C6': 'Pass performance',
        'D7': 'Weak pass',
        'E8': 'Poor performance',
        'F9': 'Fail'
    }
    return remarks_map.get(grade, 'No remarks')

def _get_competency_description(level):
    """Get competency description based on level"""
    if level >= 3.5:
        return 'Highly Proficient'
    elif level >= 2.5:
        return 'Proficient'
    elif level >= 1.5:
        return 'Developing'
    else:
        return 'Beginning'

def _generate_teacher_comments(gpa, attendance_rate):
    """Generate automated teacher comments"""
    if gpa >= 3.5 and attendance_rate >= 90:
        return "Excellent academic performance with outstanding attendance. Keep up the good work!"
    elif gpa >= 2.5 and attendance_rate >= 80:
        return "Good academic progress with satisfactory attendance. Continue to strive for excellence."
    elif gpa >= 1.5:
        return "Shows potential but needs improvement in academic performance and attendance."
    else:
        return "Requires significant improvement in both academic performance and attendance."

def _generate_principal_comments(gpa):
    """Generate automated principal comments"""
    if gpa >= 3.5:
        return "Commendable performance. Well done!"
    elif gpa >= 2.5:
        return "Satisfactory progress. Keep working hard."
    else:
        return "Needs improvement. Seek additional support."

def _generate_pdf_report_card(report_data):
    """Generate PDF report card"""
    try:
        buffer = ReportService.generate_student_report_card_pdf(report_data)
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"report_card_{report_data['student_info']['admission_number']}.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

def _generate_html_report_card(report_data):
    """Generate HTML report card"""
    # This would implement HTML template rendering
    # For now, return a placeholder response
    return jsonify({
        'success': True,
        'message': 'HTML generation not yet implemented',
        'data': report_data
    }), 200

def _generate_pdf_transcript(transcript_data):
    """Generate PDF transcript"""
    # This would implement PDF transcript generation
    # For now, return a placeholder response
    return jsonify({
        'success': True,
        'message': 'PDF transcript generation not yet implemented',
        'data': transcript_data
    }), 200
