import io
import csv
import json
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy import func, and_
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.graphics.shapes import Drawing, Rect, String, Group, Ellipse
from reportlab.graphics.charts.spider import SpiderChart
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from flask import current_app

from app.extensions import db
from app.models.student import Student
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.administration import Transaction, Facility, MaintenanceRequest, Asset, FacilityStatus, MaintenanceStatus
from app.models.finance import StudentFee, Payment, FeeStructure
from app.models.user import User, Role
from app.models.system_setting import SystemSetting


class ReportService:
    """Service for generating various reports in ADMIPAEDIA."""

    # Default Theme Colors
    NAVY = colors.HexColor('#0b1e35')
    GREEN = colors.HexColor('#27774a')
    GREEN_ACCENT = colors.HexColor('#2fa05e')
    LIGHT_GREEN = colors.HexColor('#eaf6f1')
    BLUE = colors.HexColor('#1a5eb8')
    ORANGE = colors.HexColor('#c97a0a')
    GOLD = colors.HexColor('#dfa832')
    BORDER_COLOR = colors.HexColor('#b8dece')

    @staticmethod
    def _resolve_student_photo_for_pdf(photo_value: Optional[str]) -> Optional[str]:
        if not photo_value:
            return None

        normalized = str(photo_value).replace('\\', '/').strip()
        if not normalized:
            return None

        if normalized.startswith('uploads/profile_pictures/'):
            candidate = os.path.join(current_app.root_path, normalized.replace('/', os.sep))
            return candidate if os.path.isfile(candidate) else None

        if normalized.startswith('/api/v1/enhanced-students/profile-picture/'):
            filename = normalized.split('/api/v1/enhanced-students/profile-picture/', 1)[1]
            candidate = os.path.join(current_app.root_path, 'uploads', 'profile_pictures', filename)
            return candidate if os.path.isfile(candidate) else None

        if os.path.isabs(normalized) and os.path.isfile(normalized):
            return normalized

        return None
    TEXT_COLOR = colors.HexColor('#17202a')
    MUTED_COLOR = colors.HexColor('#52626f')
    WHITE = colors.whitesmoke
    LIGHT_BG = colors.HexColor('#f3faf7')

    @staticmethod
    def get_theme_colors(theme_name='navy'):
        themes = {
            'navy': {
                'primary': colors.HexColor('#0b1e35'),
                'secondary': colors.HexColor('#27774a'),
                'accent': colors.HexColor('#2fa05e'),
                'light': colors.HexColor('#eaf6f1'),
            },
            'emerald': {
                'primary': colors.HexColor('#064e3b'),
                'secondary': colors.HexColor('#059669'),
                'accent': colors.HexColor('#10b981'),
                'light': colors.HexColor('#ecfdf5'),
            },
            'royal': {
                'primary': colors.HexColor('#1e3a8a'),
                'secondary': colors.HexColor('#2563eb'),
                'accent': colors.HexColor('#3b82f6'),
                'light': colors.HexColor('#eff6ff'),
            },
            'sunset': {
                'primary': colors.HexColor('#7c2d12'),
                'secondary': colors.HexColor('#ea580c'),
                'accent': colors.HexColor('#f97316'),
                'light': colors.HexColor('#fff7ed'),
            }
        }
        return themes.get(theme_name, themes['navy'])

    @staticmethod
    def generate_custom_report_data(config: Dict[str, Any]) -> Dict[str, Any]:
        """Aggregates data based on the provided configuration."""
        report_type = config.get('type', 'custom')
        date_range = config.get('dateRange', {})
        filters = config.get('filters', {})
        visualizations = config.get('visualizations', {})

        start_date = date_range.get('from')
        end_date = date_range.get('to')
        
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date.split('T')[0]).date()
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date.split('T')[0]).date()

        report_data = {
            'config': config,
            'generated_at': datetime.now().isoformat(),
            'sections': []
        }

        if report_type == 'academic':
            report_data['sections'] = ReportService._get_academic_data(filters, start_date, end_date, visualizations)
        elif report_type == 'attendance':
            report_data['sections'] = ReportService._get_attendance_data(filters, start_date, end_date, visualizations)
        elif report_type == 'financial':
            report_data['data'] = ReportService.get_financial_report_data(start_date, end_date)
        elif report_type == 'administrative':
            report_data['data'] = ReportService.get_administrative_report_data(start_date, end_date)
        
        return report_data

    @staticmethod
    def get_administrative_report_data(start_date: Optional[date] = None, end_date: Optional[date] = None) -> Dict[str, Any]:
        """Fetches administrative data for reports."""
        # Enrollment Stats
        total_students = db.session.query(func.count(Student.id)).scalar() or 0
        active_students = db.session.query(func.count(Student.id)).filter(Student.status == 'active').scalar() or 0
        new_enrollments = 0
        if start_date:
            new_enrollments = db.session.query(func.count(Student.id)).filter(Student.created_at >= start_date).scalar() or 0
        
        # Staff Stats
        total_staff = db.session.query(func.count(User.id)).filter(User.role.in_(['admin', 'teacher', 'staff'])).scalar() or 0
        active_staff = db.session.query(func.count(User.id)).filter(User.role.in_(['admin', 'teacher', 'staff']), User.status == 'active').scalar() or 0
        
        # Facilities Stats
        total_facilities = db.session.query(func.count(Facility.id)).scalar() or 0
        facilities_under_maintenance = db.session.query(func.count(Facility.id)).filter(Facility.status == FacilityStatus.UNDER_MAINTENANCE).scalar() or 0
        
        # Maintenance Stats
        pending_maintenance = db.session.query(func.count(MaintenanceRequest.id)).filter(MaintenanceRequest.status == MaintenanceStatus.PENDING).scalar() or 0
        completed_maintenance = 0
        if start_date:
            completed_maintenance = db.session.query(func.count(MaintenanceRequest.id)).filter(
                MaintenanceRequest.status == MaintenanceStatus.COMPLETED,
                MaintenanceRequest.completed_date >= start_date
            ).scalar() or 0

        return {
            'statistics': {
                'total_students': total_students,
                'active_students': active_students,
                'total_staff': total_staff,
                'active_staff': active_staff,
                'total_facilities': total_facilities,
                'maintenance_requests': pending_maintenance
            },
            'enrollment': {
                'total': total_students,
                'active': active_students,
                'new_this_period': new_enrollments,
                'growth_rate': (new_enrollments / total_students * 100) if total_students > 0 else 0
            },
            'staff': {
                'total': total_staff,
                'active': active_staff,
                'teachers': db.session.query(func.count(User.id)).filter(User.role == 'teacher').scalar() or 0,
                'admin': db.session.query(func.count(User.id)).filter(User.role == 'admin').scalar() or 0
            },
            'facilities': {
                'total': total_facilities,
                'operational': total_facilities - facilities_under_maintenance,
                'under_maintenance': facilities_under_maintenance,
                'pending_requests': pending_maintenance,
                'completed_requests': completed_maintenance
            }
        }

    @staticmethod
    def get_financial_report_data(start_date: Optional[date] = None, end_date: Optional[date] = None) -> Dict[str, Any]:
        """Fetches financial data for reports."""
        # Total Fees Collection
        total_fees = db.session.query(func.sum(StudentFee.final_amount)).scalar() or 0
        collected_fees = db.session.query(func.sum(StudentFee.paid_amount)).scalar() or 0
        pending_fees = total_fees - collected_fees
        
        # Overdue Fees (Simplified: balance > 0 and past due date)
        today = date.today()
        overdue_fees = db.session.query(func.sum(StudentFee.balance))\
            .join(StudentFee.structure)\
            .filter(StudentFee.balance > 0, FeeStructure.due_date < today).scalar() or 0
            
        # Trends (Last 6 months)
        trends = []
        for i in range(5, -1, -1):
            month_date = today - timedelta(days=i*30)
            month_start = month_date.replace(day=1)
            month_name = month_start.strftime('%b')
            
            monthly_collected = db.session.query(func.sum(Payment.amount))\
                .filter(func.extract('month', Payment.paid_at) == month_start.month,
                        func.extract('year', Payment.paid_at) == month_start.year).scalar() or 0
            
            trends.append({
                'month': month_name,
                'collected': float(monthly_collected),
                'pending': float(pending_fees / 6) # Placeholder logic for pending trends
            })
            
        # Class Breakdown
        class_breakdown = []
        classes = Class.query.all()
        for cls in classes:
            cls_total = db.session.query(func.sum(StudentFee.final_amount))\
                .join(Student, StudentFee.student_id == Student.id)\
                .filter(Student.class_id == cls.id).scalar() or 0
            cls_collected = db.session.query(func.sum(StudentFee.paid_amount))\
                .join(Student, StudentFee.student_id == Student.id)\
                .filter(Student.class_id == cls.id).scalar() or 0
            
            if cls_total > 0:
                class_breakdown.append({
                    'className': cls.name,
                    'totalFees': float(cls_total),
                    'collectedFees': float(cls_collected),
                    'pendingFees': float(cls_total - cls_collected)
                })

        return {
            'feeCollection': {
                'total': float(total_fees),
                'collected': float(collected_fees),
                'pending': float(pending_fees),
                'overdue': float(overdue_fees)
            },
            'trends': trends,
            'classBreakdown': class_breakdown
        }

    @staticmethod
    def _get_academic_data(filters, start_date, end_date, visualizations):
        sections = []
        class_ids = filters.get('classes', [])
        query = db.session.query(Grade).join(Student)
        if class_ids:
            query = query.filter(Student.class_id.in_(class_ids))
        if start_date:
            query = query.filter(Grade.created_at >= start_date)
        if end_date:
            query = query.filter(Grade.created_at <= end_date)
        
        grades = query.all()

        if 'average_grade' in visualizations.get('metrics', []):
            avg_score = db.session.query(func.avg(Grade.marks_obtained)).filter(Grade.id.in_([g.id for g in grades])).scalar()
            sections.append({
                'type': 'metric',
                'title': 'Average Grade',
                'value': round(avg_score, 2) if avg_score else 0
            })

        if 'student_grades' in visualizations.get('tables', []):
            table_data = []
            for g in grades:
                table_data.append({
                    'student': f"{g.student.first_name} {g.student.last_name}",
                    'subject': g.subject.name if g.subject else 'N/A',
                    'score': g.marks_obtained,
                    'grade': g.grade_letter or 'N/A'
                })
            sections.append({
                'type': 'table',
                'title': 'Student Grades',
                'data': table_data
            })
        return sections

    @staticmethod
    def _get_attendance_data(filters, start_date, end_date, visualizations):
        sections = []
        class_ids = filters.get('classes', [])
        query = db.session.query(Attendance).join(Student)
        if class_ids:
            query = query.filter(Student.class_id.in_(class_ids))
        if start_date:
            query = query.filter(Attendance.date >= start_date)
        if end_date:
            query = query.filter(Attendance.date <= end_date)
            
        records = query.all()
        
        if 'attendance_rate' in visualizations.get('metrics', []):
            total = len(records)
            present = len([r for r in records if r.status == 'present'])
            rate = (present / total * 100) if total > 0 else 0
            sections.append({
                'type': 'metric',
                'title': 'Attendance Rate',
                'value': f"{round(rate, 1)}%"
            })
        return sections

    @staticmethod
    def _get_financial_data(filters, start_date, end_date, visualizations):
        sections = []
        # Logic for financial data could be added here
        return sections

    @staticmethod
    def generate_pdf(report_data: Dict[str, Any]) -> io.BytesIO:
        """Generates a PDF using reportlab."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []

        # Title
        title = report_data.get('config', {}).get('name', 'Custom Report')
        elements.append(Paragraph(title, styles['Title']))
        elements.append(Spacer(1, 0.2 * inch))

        # Metadata
        meta = f"Generated on: {report_data.get('generated_at')} | Type: {report_data.get('config', {}).get('type')}"
        elements.append(Paragraph(meta, styles['Normal']))
        elements.append(Spacer(1, 0.4 * inch))

        for section in report_data.get('sections', []):
            elements.append(Paragraph(section['title'], styles['Heading2']))
            
            if section['type'] == 'metric':
                elements.append(Paragraph(str(section['value']), styles['Normal']))
            elif section['type'] == 'table':
                data = section['data']
                if not data:
                    elements.append(Paragraph("No data available", styles['Italic']))
                else:
                    headers = list(data[0].keys())
                    table_rows = [headers]
                    for item in data:
                        table_rows.append([str(item.get(h, '')) for h in headers])
                    
                    t = Table(table_rows)
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black)
                    ]))
                    elements.append(t)
            elements.append(Spacer(1, 0.3 * inch))

        doc.build(elements)
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_student_report_card_pdf(report_data: Dict[str, Any]) -> io.BytesIO:
        """Generates a professional student report card PDF with dynamic theme and school info."""
        # Get Dynamic School Settings
        school_name = SystemSetting.get_value('school_name', 'ADMIPAEDIA ACADEMY')
        school_tagline = SystemSetting.get_value('school_tagline', 'Nurturing Minds. Building Futures.')
        school_address = SystemSetting.get_value('school_address', 'Accra, Ghana')
        school_website = SystemSetting.get_value('school_website', 'www.admipaedia.edu')
        school_phone = SystemSetting.get_value('school_phone', '+233 24 000 0000')
        
        # Get Theme
        theme_name = report_data.get('theme', SystemSetting.get_value('report_card_theme', 'navy'))
        theme = ReportService.get_theme_colors(theme_name)
        
        primary_color = theme['primary']
        secondary_color = theme['secondary']
        accent_color = theme['accent']
        light_color = theme['light']

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4, 
            leftMargin=8*mm, rightMargin=8*mm, 
            topMargin=5*mm, bottomMargin=5*mm
        )
        
        styles = getSampleStyleSheet()
        
        # Typography Styles
        title_style = ParagraphStyle('TitleStyle', parent=styles['Title'], fontSize=22, fontName='Helvetica-Bold', textColor=colors.white, alignment=TA_LEFT, leftIndent=10)
        tagline_style = ParagraphStyle('TaglineStyle', parent=styles['Normal'], fontSize=8, fontName='Helvetica-Bold', textColor=accent_color, alignment=TA_LEFT, leftIndent=10, leading=10)
        contact_style = ParagraphStyle('ContactStyle', parent=styles['Normal'], fontSize=7.5, textColor=colors.white, alignment=TA_LEFT, fontName='Helvetica')
        pill_badge_style = ParagraphStyle('PillBadgeStyle', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', textColor=colors.white, alignment=TA_CENTER, tracking=1.5)
        label_style = ParagraphStyle('LabelStyle', parent=styles['Normal'], fontSize=8, textColor=ReportService.MUTED_COLOR, fontName='Helvetica-Bold')
        value_style = ParagraphStyle('ValueStyle', parent=styles['Normal'], fontSize=9, fontName='Helvetica', textColor=ReportService.TEXT_COLOR)
        section_header_style = ParagraphStyle('SectionHeaderStyle', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', textColor=primary_color, tracking=1)
        
        elements = []

        # 1. CURVY HEADER
        header_height = 1.1 * inch
        w = A4[0] - 16*mm
        header_drawing = Drawing(w, header_height)
        header_drawing.add(Rect(0, 0, w, header_height, fillColor=primary_color, strokeColor=None))
        accent_ry = header_height * 1.1
        accent_rx = w * 0.65
        header_drawing.add(Ellipse(w/2, header_height, accent_rx, accent_ry, fillColor=colors.Color(accent_color.red, accent_color.green, accent_color.blue, alpha=0.15), strokeColor=None))
        main_rx = w * 0.55
        main_ry = header_height * 0.95
        header_drawing.add(Ellipse(w/2, header_height, main_rx, main_ry, fillColor=primary_color, strokeColor=None))
        header_drawing.add(Rect(20, header_height - 50, 40, 40, fillColor=ReportService.WHITE, strokeColor=ReportService.GOLD, strokeWidth=1, rx=4, ry=4))
        
        elements.append(header_drawing)
        elements.append(Spacer(1, -0.95*inch))
        
        header_text_table = Table([[Spacer(1, 40), ""], [Paragraph(school_name.upper(), ParagraphStyle('H', parent=title_style, fontSize=18)), ""], [Paragraph(school_tagline, ParagraphStyle('T', parent=tagline_style, fontSize=8)), ""]], colWidths=[w*0.7, w*0.3])
        header_text_table.setStyle(TableStyle([('LEFTPADDING', (0, 0), (-1, -1), 65), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
        elements.append(header_text_table)
        
        contact_drawing = Drawing(w, 0.2*inch)
        contact_drawing.add(Rect(0, 0, w, 0.2*inch, fillColor=secondary_color, strokeColor=None))
        elements.append(Spacer(1, 0.1*inch))
        elements.append(contact_drawing)
        elements.append(Spacer(1, -0.18*inch))
        
        contact_table = Table([[Paragraph(school_address, ParagraphStyle('C', parent=contact_style, fontSize=7.5)), Paragraph(school_website, ParagraphStyle('C', parent=contact_style, fontSize=7.5)), Paragraph(school_phone, ParagraphStyle('C', parent=contact_style, fontSize=7.5))]], colWidths=[w/3, w/3, w/3])
        contact_table.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
        elements.append(contact_table)
        elements.append(Spacer(1, 0.1*inch))

        # 3. STUDENT INFO PANEL
        info = report_data.get('student_info', {})
        perf = report_data.get('academic_performance', {})
        
        report_title_bar = Drawing(w, 0.2*inch)
        report_title_bar.add(Rect(0, 0, w, 0.2*inch, fillColor=primary_color, strokeColor=None, rx=4, ry=4))
        elements.append(report_title_bar)
        elements.append(Spacer(1, -0.18*inch))
        elements.append(Paragraph("STUDENT PROGRESS REPORT", ParagraphStyle('RT', parent=pill_badge_style, fontSize=7, tracking=1.5)))
        elements.append(Spacer(1, 0.05*inch))
        
        photo_path = ReportService._resolve_student_photo_for_pdf(info.get('profile_picture'))
        photo_cell = (
            Image(photo_path, width=0.85 * inch, height=0.95 * inch)
            if photo_path
            else Table([[Paragraph("PHOTO", ParagraphStyle('PS', fontSize=5.5, alignment=TA_CENTER, fontName='Helvetica-Bold'))]],
                colWidths=[0.85*inch], rowHeights=[0.95*inch],
                style=[('BOX', (0,0), (-1,-1), 1, ReportService.BORDER_COLOR), ('BACKGROUND', (0,0), (-1,-1), ReportService.LIGHT_BG), ('VALIGN', (0,0), (-1,-1), 'MIDDLE')])
        )

        student_panel_data = [
            [
                Table([
                    [Paragraph("STUDENT NAME:", ParagraphStyle('SL', fontSize=6.5, fontName='Helvetica-Bold', textColor=ReportService.MUTED_COLOR)), 
                     Paragraph("CLASS:", ParagraphStyle('SL', fontSize=6.5, fontName='Helvetica-Bold', textColor=ReportService.MUTED_COLOR))],
                    [Paragraph(info.get('name', 'N/A'), ParagraphStyle('SV', fontSize=9.5, fontName='Helvetica-Bold')), 
                     Paragraph(info.get('class', 'N/A'), ParagraphStyle('SV', fontSize=9.5, fontName='Helvetica-Bold'))],
                    [Spacer(1, 3), Spacer(1, 3)],
                    [Paragraph("ACADEMIC YEAR:", ParagraphStyle('SL', fontSize=6.5, fontName='Helvetica-Bold', textColor=ReportService.MUTED_COLOR)), 
                     Paragraph("TERM:", ParagraphStyle('SL', fontSize=6.5, fontName='Helvetica-Bold', textColor=ReportService.MUTED_COLOR))],
                    [Paragraph(info.get('academic_year', 'N/A'), ParagraphStyle('SV', fontSize=8.5, fontName='Helvetica-Bold')), 
                     Paragraph(info.get('term', 'N/A'), ParagraphStyle('SV', fontSize=8.5, fontName='Helvetica-Bold'))]
                ], colWidths=[1.6*inch, 1.2*inch]),
                photo_cell,
                Table([
                    [Paragraph("LEVEL:", ParagraphStyle('SL', fontSize=6.5, fontName='Helvetica-Bold', textColor=ReportService.MUTED_COLOR)), 
                     Paragraph("ADM NO:", ParagraphStyle('SL', fontSize=6.5, fontName='Helvetica-Bold', textColor=ReportService.MUTED_COLOR, alignment=TA_RIGHT))],
                    [Paragraph(info.get('educational_level', 'N/A'), ParagraphStyle('SV', fontSize=8.5, fontName='Helvetica-Bold')), 
                     Paragraph(info.get('admission_number', 'N/A'), ParagraphStyle('SV', fontSize=8.5, fontName='Helvetica-Bold', alignment=TA_RIGHT))],
                    [Spacer(1, 6), ""],
                    [Table([[Paragraph("OVERALL PERFORMANCE", ParagraphStyle('Pill', fontSize=7, fontName='Helvetica-Bold', textColor=colors.white, alignment=TA_CENTER))]], 
                           colWidths=[2.3*inch], style=[('BACKGROUND', (0,0), (-1,-1), primary_color), ('ROUNDRECT', (0,0), (-1,-1), 8, primary_color)]), ""],
                    [Spacer(1, 2), ""],
                    [Table([[Paragraph(f"GPA: {perf.get('overall_gpa', '0.00')} / 4.00", 
                                     ParagraphStyle('GPA', fontSize=15, fontName='Helvetica-Bold', textColor=secondary_color, alignment=TA_CENTER))]], 
                           colWidths=[2.3*inch], rowHeights=[0.35*inch],
                           style=[('BACKGROUND', (0,0), (-1,-1), colors.white), ('BOX', (0,0), (-1,-1), 2, secondary_color), ('VALIGN', (0,0), (-1,-1), 'MIDDLE')]), ""]
                ], colWidths=[1.15*inch, 1.15*inch])
            ]
        ]
        
        student_table = Table(student_panel_data, colWidths=[3.0*inch, 1.1*inch, 2.8*inch])
        student_table.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 1, ReportService.BORDER_COLOR), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 10)]))
        elements.append(student_table)
        elements.append(Spacer(1, 0.15*inch))

        # 4. SUBJECTS TABLE
        table_header_style = ParagraphStyle('TH', parent=styles['Normal'], fontSize=8, fontName='Helvetica-Bold', textColor=colors.white)
        academic_data = [[Paragraph("SUBJECT", table_header_style), Paragraph("SCORE", table_header_style), Paragraph("GRADE", table_header_style), Paragraph("REMARKS", table_header_style)]]
        subjects = perf.get('subjects', [])
        for s in subjects:
            academic_data.append([
                Paragraph(s.get('name'), ParagraphStyle('SubName', fontSize=8.5, fontName='Helvetica-Bold')),
                Paragraph(str(s.get('score')), ParagraphStyle('Score', alignment=TA_CENTER, fontSize=8.5)),
                Paragraph(s.get('grade'), ParagraphStyle('Grade', alignment=TA_CENTER, fontSize=10, fontName='Helvetica-Bold', textColor=secondary_color)),
                Paragraph(s.get('remarks'), ParagraphStyle('Rem', fontSize=7.5, leading=9, textColor=ReportService.MUTED_COLOR))
            ])
            
        academic_table = Table(academic_data, colWidths=[1.8*inch, 0.7*inch, 0.7*inch, 3.8*inch])
        academic_table.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), primary_color), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('GRID', (0, 0), (-1, -1), 0.5, ReportService.BORDER_COLOR)]))
        elements.append(academic_table)
        elements.append(Spacer(1, 0.15*inch))

        # 5. GENERAL ASSESSMENT & ATTENDANCE
        gen_header_data = [[Paragraph("GENERAL ASSESSMENT", section_header_style)]]
        gen_header = Table(gen_header_data, colWidths=[w], rowHeights=[0.25*inch])
        gen_header.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), light_color), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('BOX', (0,0), (-1,-1), 0.5, ReportService.BORDER_COLOR)]))
        elements.append(gen_header)
        
        att = report_data.get('attendance', {})
        att_metrics = [[
            Paragraph("ATTENDANCE", ParagraphStyle('AL', fontSize=8, fontName='Helvetica-Bold', textColor=primary_color)),
            Paragraph(f"TOTAL DAYS<br/><font size=12>{att.get('total_days', 0)}</font>", ParagraphStyle('AS', alignment=TA_CENTER, fontSize=7, leading=10)),
            Paragraph(f"PRESENT<br/><font size=12>{att.get('present_days', 0)}</font>", ParagraphStyle('AS', alignment=TA_CENTER, fontSize=7, leading=10)),
            Paragraph(f"RATE<br/><font size=12>{att.get('attendance_rate', 0.0)}%</font>", ParagraphStyle('AS', alignment=TA_CENTER, fontSize=7, leading=10))
        ]]
        att_table = Table(att_metrics, colWidths=[1.8*inch, 1.6*inch, 1.6*inch, 2.0*inch])
        att_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('BOX', (0,0), (-1,-1), 0.5, ReportService.BORDER_COLOR)]))
        elements.append(att_table)
        elements.append(Spacer(1, 0.15*inch))

        # 6. PSYCHOLOGICAL AND SOCIAL
        soc_header_data = [[Paragraph("PSYCHOLOGICAL AND SOCIAL PERSPECTIVE", section_header_style)]]
        soc_header = Table(soc_header_data, colWidths=[w], rowHeights=[0.25*inch])
        soc_header.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), light_color), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('BOX', (0,0), (-1,-1), 0.5, ReportService.BORDER_COLOR)]))
        elements.append(soc_header)
        
        comp = report_data.get('core_competencies', [])
        def create_comp_card(title, desc, border_color):
            card_data = [[Paragraph(title, ParagraphStyle('CT', fontSize=8, fontName='Helvetica-Bold', textColor=border_color))], [Paragraph(desc, ParagraphStyle('CD', fontSize=7.5, leading=10, textColor=ReportService.MUTED_COLOR))]]
            t = Table(card_data, colWidths=[2.2*inch])
            t.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 1, border_color), ('LEFTPADDING', (0, 0), (-1, -1), 10)]))
            return t

        comp_cards = [[create_comp_card("ATTITUDE", "Positive attitude.", secondary_color), create_comp_card("CONDUCT", "Respectful.", ReportService.BLUE), create_comp_card("INTEREST", "Keen interest.", ReportService.ORANGE)]]
        elements.append(Table(comp_cards, colWidths=[2.33*inch, 2.33*inch, 2.33*inch]))
        elements.append(Spacer(1, 0.1*inch))

        # Remarks
        remarks_data = [[
            Table([[Paragraph("TEACHER REMARKS", pill_badge_style)], [Paragraph(report_data.get('teacher_comments', 'A hardworking student.'), ParagraphStyle('RemText', fontSize=8, leading=10, italic=True))]], colWidths=[3.45*inch], style=[('BOX', (0,0), (-1,-1), 0.5, ReportService.BORDER_COLOR), ('BACKGROUND', (0,0), (0,0), primary_color)]),
            Table([[Paragraph("PARENT REMARKS", pill_badge_style)], [Paragraph("<br/><br/>", styles['Normal'])]], colWidths=[3.45*inch], style=[('BOX', (0,0), (-1,-1), 0.5, ReportService.BORDER_COLOR), ('BACKGROUND', (0,0), (0,0), primary_color)])
        ]]
        elements.append(Table(remarks_data, colWidths=[3.5*inch, 3.5*inch]))
        elements.append(Spacer(1, 0.15*inch))

        # 7. LEARNING ANALYTICS
        ana_header_data = [[Paragraph("LEARNING ANALYTICS", section_header_style)]]
        ana_header = Table(ana_header_data, colWidths=[w], rowHeights=[0.25*inch])
        ana_header.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), light_color), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('BOX', (0,0), (-1,-1), 0.5, ReportService.BORDER_COLOR)]))
        elements.append(ana_header)
        
        chart_drawing = Drawing(w, 1.6*inch)
        radar = SpiderChart()
        radar.x, radar.y, radar.width, radar.height = 10, 20, 1.2*inch, 1.2*inch
        if subjects:
            radar.labels, radar.data = [s.get('name')[:8] for s in subjects[:5]], [[s.get('score', 0) for s in subjects[:5]]]
            radar.strands.strokeColor, radar.strands.fillColor = secondary_color, light_color
            chart_drawing.add(radar)
        
        bc = VerticalBarChart()
        bc.x, bc.y, bc.width, bc.height = 360, 25, 1.4*inch, 1.1*inch
        bc.data = [perf.get('historical_gpas', [3.65, 3.78, 3.85])[:3]]
        bc.categoryAxis.categoryNames = ['Term 1', 'Term 2', 'Term 3']
        bc.valueAxis.valueMin, bc.valueAxis.valueMax = 0, 4.0
        bc.bars[0].fillColor = secondary_color
        chart_drawing.add(bc)
        
        elements.append(Table([[chart_drawing]], colWidths=[w], style=[('BOX', (0,0), (-1,-1), 0.5, ReportService.BORDER_COLOR)]))
        elements.append(Spacer(1, 0.2*inch))

        # 8. SIGNATURES
        sig_data = [[Paragraph("_________________<br/>Teacher's Signature", ParagraphStyle('S', alignment=TA_CENTER, fontSize=8)), Paragraph("_________________<br/>Parent / Guardian", ParagraphStyle('S', alignment=TA_CENTER, fontSize=8)), Paragraph("_________________<br/>Principal's Signature", ParagraphStyle('S', alignment=TA_CENTER, fontSize=8))]]
        elements.append(Table(sig_data, colWidths=[w/3, w/3, w/3]))

        doc.build(elements)
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_excel(report_data: Dict[str, Any]) -> io.BytesIO:
        """Generates an Excel file representing the report data."""
        import pandas as pd
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            for section in report_data.get('sections', []):
                title = section['title'][:31] # Excel sheet name limit
                if section['type'] == 'metric':
                    df = pd.DataFrame([{'Metric': section['title'], 'Value': section['value']}])
                    df.to_excel(writer, sheet_name=title, index=False)
                elif section['type'] == 'table':
                    data = section['data']
                    if data:
                        df = pd.DataFrame(data)
                        df.to_excel(writer, sheet_name=title, index=False)
            
            # If no sections, create a summary sheet
            if not report_data.get('sections'):
                # Handle cases like administrative/financial which have 'data' instead of 'sections'
                data = report_data.get('data', {})
                if data:
                    # Flatten the dictionary for a simple summary sheet
                    flat_data = []
                    def flatten(d, prefix=''):
                        for k, v in d.items():
                            if isinstance(v, dict):
                                flatten(v, f"{prefix}{k}_")
                            elif isinstance(v, list):
                                flat_data.append({f"{prefix}{k}": f"List of {len(v)} items"})
                            else:
                                flat_data.append({f"{prefix}{k}": v})
                    
                    flatten(data)
                    df = pd.DataFrame(flat_data)
                    df.to_excel(writer, sheet_name='Summary', index=False)
                else:
                    df = pd.DataFrame([{'Message': 'No data available'}])
                    df.to_excel(writer, sheet_name='Sheet1', index=False)
                    
        output.seek(0)
        return output

    @staticmethod
    def generate_csv(report_data: Dict[str, Any]) -> str:
        """Generates a CSV string representing the report data."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['ADMIPAEDIA Custom Report'])
        writer.writerow(['Name', report_data.get('config', {}).get('name')])
        writer.writerow(['Generated At', report_data.get('generated_at')])
        writer.writerow([])
        for section in report_data.get('sections', []):
            writer.writerow([section['title']])
            if section['type'] == 'metric':
                writer.writerow(['Value', section['value']])
            elif section['type'] == 'table':
                data = section['data']
                if data:
                    headers = list(data[0].keys())
                    writer.writerow(headers)
                    for item in data:
                        writer.writerow([item.get(h) for h in headers])
            writer.writerow([])
        return output.getvalue()
