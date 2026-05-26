import io
import datetime
import uuid
from decimal import Decimal
from collections import defaultdict
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.units import inch, mm

from app.extensions import db
from app.models.student import Student
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.grade import Grade
from app.models.academic_cycle import AcademicCycle
from app.models.educational_system import GradeLevel
from app.models.polymorphic_grading_scale import PolymorphicGradingScale
from app.services.grading_engine import PolymorphicGradingEngine

class ReportCardGenerator:
    @staticmethod
    def generate_report_card_pdf(student_id: int, academic_cycle_id: str) -> io.BytesIO:
        """
        Generates an in-memory PDF stream of a student's report card.
        Uses query_scoped() to enforce row-level branch security isolation.
        Loads dynamic grading scale parameters and maps scores via PolymorphicGradingEngine.
        """
        # 1. Row-Level Security scoped loading
        student = Student.query_scoped().filter_by(id=student_id).first()
        if not student:
            raise ValueError("Student not found or unauthorized access in active branch context.")
            
        clazz = Class.query_scoped().filter_by(id=student.class_id).first()
        if not clazz:
            raise ValueError("Class not found or unauthorized access in active branch context.")
            
        # Parse academic_cycle_id safely as a uuid.UUID object
        resolved_cycle_id = academic_cycle_id
        if isinstance(academic_cycle_id, str):
            try:
                resolved_cycle_id = uuid.UUID(academic_cycle_id.strip())
            except ValueError:
                raise ValueError("Invalid academic_cycle_id format.")
                
        cycle = AcademicCycle.query.filter_by(id=resolved_cycle_id, tenant_id=student.tenant_id).first()
        if not cycle:
            raise ValueError("Academic cycle not found.")
            
        # 2. Fetch and aggregate student grades for the given term/cycle
        grades = Grade.query.filter_by(student_id=student.id, term=cycle.name).all()
        
        # Group grades by subject to separate class_score and exam_score
        subject_scores = defaultdict(lambda: {"class_scores": [], "exam_scores": []})
        for g in grades:
            if g.assessment_type == 'exam':
                subject_scores[g.subject_id]["exam_scores"].append(g.marks_obtained)
            else:
                subject_scores[g.subject_id]["class_scores"].append(g.marks_obtained)
                
        # 3. Resolve grading scale and Schemes dynamically (No Hardcoding)
        grade_level = GradeLevel.query.filter(
            GradeLevel.tenant_id == student.tenant_id,
            GradeLevel.name.in_([clazz.grade_level, clazz.grade_level_name])
        ).first()
        
        scale = None
        if grade_level and grade_level.track_id:
            scale = PolymorphicGradingScale.query.filter_by(
                tenant_id=student.tenant_id,
                track_id=grade_level.track_id
            ).first()
            
        if not scale:
            scale = PolymorphicGradingScale.query.filter_by(tenant_id=student.tenant_id).first()
            
        if not scale:
            raise ValueError("No polymorphic grading scale configured for this tenant.")

        # 4. Generate A4 PDF buffer using ReportLab Flowables
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            leftMargin=10*mm, rightMargin=10*mm,
            topMargin=10*mm, bottomMargin=10*mm
        )
        
        styles = getSampleStyleSheet()
        
        # Curated Harmony Palette (Dark Teal Theme)
        primary_color = colors.HexColor('#0d5c52')
        secondary_color = colors.HexColor('#138a7c')
        light_bg = colors.HexColor('#f0f7f6')
        border_color = colors.HexColor('#c2e0dc')
        
        title_style = ParagraphStyle('DocTitle', parent=styles['Title'], fontSize=20, textColor=primary_color, fontName='Helvetica-Bold', alignment=TA_CENTER)
        label_style = ParagraphStyle('Lbl', parent=styles['Normal'], fontSize=8.5, fontName='Helvetica-Bold', textColor=colors.HexColor('#555555'))
        val_style = ParagraphStyle('Val', parent=styles['Normal'], fontSize=9, fontName='Helvetica')
        th_style = ParagraphStyle('TH', parent=styles['Normal'], fontSize=8.5, fontName='Helvetica-Bold', textColor=colors.white, alignment=TA_CENTER)
        tb_style = ParagraphStyle('TB', parent=styles['Normal'], fontSize=8.5, fontName='Helvetica')
        
        elements = []
        
        # A. Header Section
        elements.append(Paragraph("ADMIPAEDIA ACADEMY", title_style))
        elements.append(Paragraph("OFFICIAL STUDENT PROGRESS REPORT CARD", ParagraphStyle('Sub', parent=styles['Normal'], alignment=TA_CENTER, fontSize=9, tracking=2, textColor=secondary_color)))
        elements.append(Spacer(1, 15))
        
        # B. Student Info Panel Table
        info_data = [
            [
                Paragraph("Student Name:", label_style), Paragraph(f"{student.first_name} {student.last_name}", val_style),
                Paragraph("Admission Number:", label_style), Paragraph(student.admission_number, val_style)
            ],
            [
                Paragraph("Classroom:", label_style), Paragraph(clazz.name, val_style),
                Paragraph("Academic Cycle:", label_style), Paragraph(cycle.name, val_style)
            ]
        ]
        info_table = Table(info_data, colWidths=[1.5*inch, 2.0*inch, 1.5*inch, 2.0*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), light_bg),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOX', (0,0), (-1,-1), 1, border_color),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e0efed')),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 20))
        
        # C. Grades & Scores Table
        grades_table_data = [
            [
                Paragraph("SUBJECT", th_style),
                Paragraph(f"CLASS WORK ({scale.class_weight}%)", th_style),
                Paragraph(f"EXAMS ({scale.exam_weight}%)", th_style),
                Paragraph("FINAL SCORE", th_style),
                Paragraph("GRADE MARK", th_style),
                Paragraph("STATUS", th_style)
            ]
        ]
        
        for subject_id, scores in subject_scores.items():
            subject = Subject.query.filter_by(id=subject_id).first()
            sub_name = subject.name if subject else f"Subject #{subject_id}"
            
            c_score = sum(scores["class_scores"]) / len(scores["class_scores"]) if scores["class_scores"] else 0.0
            e_score = sum(scores["exam_scores"]) / len(scores["exam_scores"]) if scores["exam_scores"] else 0.0
            
            # Weighted precision scoring via grading engine
            res = PolymorphicGradingEngine.calculate_final_score(clazz.id, c_score, e_score)
            
            status_text = "PASS" if res["passing"] else "FAIL"
            status_color = colors.HexColor('#138a7c') if res["passing"] else colors.HexColor('#d9534f')
            
            grades_table_data.append([
                Paragraph(sub_name, ParagraphStyle('SN', parent=tb_style, fontName='Helvetica-Bold')),
                Paragraph(f"{c_score:.1f}", ParagraphStyle('C', parent=tb_style, alignment=TA_CENTER)),
                Paragraph(f"{e_score:.1f}", ParagraphStyle('E', parent=tb_style, alignment=TA_CENTER)),
                Paragraph(f"{res['final_score']:.2f}", ParagraphStyle('FS', parent=tb_style, alignment=TA_CENTER, fontName='Helvetica-Bold')),
                Paragraph(res["mark"] or "N/A", ParagraphStyle('GM', parent=tb_style, alignment=TA_CENTER, fontName='Helvetica-Bold', textColor=secondary_color)),
                Paragraph(status_text, ParagraphStyle('ST', parent=tb_style, alignment=TA_CENTER, fontName='Helvetica-Bold', textColor=status_color))
            ])
            
        grades_table = Table(grades_table_data, colWidths=[2.2*inch, 1.2*inch, 1.2*inch, 1.2*inch, 1.0*inch, 1.0*inch])
        grades_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), primary_color),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, border_color),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ]))
        elements.append(grades_table)
        elements.append(Spacer(1, 20))
        
        # D. Dynamic Grading Scale Legend (Strictly Dynamic - No Hardcoded Values)
        elements.append(Paragraph("GRADING SCALE LEGEND", ParagraphStyle('LH', parent=styles['Normal'], fontSize=8.5, fontName='Helvetica-Bold', textColor=primary_color, tracking=1)))
        elements.append(Spacer(1, 5))
        
        legend_headers = [Paragraph("RANGE", th_style), Paragraph("GRADE MARK", th_style), Paragraph("CLASSIFICATION", th_style)]
        legend_rows = [legend_headers]
        
        for scheme in scale.schemes or []:
            s_min = float(scheme.get('min', 0.0))
            s_max = float(scheme.get('max', 0.0))
            g_mark = scheme.get('name', 'N/A')
            g_point = scheme.get('point', '')
            pt_suffix = f" ({g_point} Points)" if g_point != '' else ""
            
            legend_rows.append([
                Paragraph(f"{s_min:.2f}% - {s_max:.2f}%", ParagraphStyle('L', parent=tb_style, alignment=TA_CENTER)),
                Paragraph(g_mark, ParagraphStyle('L', parent=tb_style, alignment=TA_CENTER, fontName='Helvetica-Bold', textColor=secondary_color)),
                Paragraph(f"Academic Standing{pt_suffix}", ParagraphStyle('L', parent=tb_style, alignment=TA_CENTER))
            ])
            
        legend_table = Table(legend_rows, colWidths=[2.5*inch, 2.0*inch, 3.5*inch])
        legend_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), secondary_color),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, border_color),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        elements.append(legend_table)
        elements.append(Spacer(1, 30))
        
        # E. Signatures Row
        sig_data = [
            [
                Paragraph("________________________<br/>Class Teacher", ParagraphStyle('S', alignment=TA_CENTER, fontSize=8.5)),
                Paragraph("________________________<br/>Principal / Headmaster", ParagraphStyle('S', alignment=TA_CENTER, fontSize=8.5))
            ]
        ]
        sig_table = Table(sig_data, colWidths=[4.0*inch, 4.0*inch])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP')
        ]))
        elements.append(sig_table)
        
        # Build document and finalise pointer streams
        doc.build(elements)
        buffer.seek(0)
        return buffer
