from app.extensions import db
from app.models.finance import FeeCategory, FeeStructure, FeeDiscount, StudentFee, Payment, PaymentAllocation
from app.models.student import Student
from app.models.academic_calendar import AcademicYear, Term
from sqlalchemy import func, or_
import uuid
from datetime import datetime
import structlog

logger = structlog.get_logger()

class FeeService:
    @staticmethod
    def normalize_term(term):
        value = str(term or '').strip().lower()
        mapping = {
            'term1': 'Term 1',
            'term 1': 'Term 1',
            'first term': 'Term 1',
            'first': 'Term 1',
            '1': 'Term 1',
            'term2': 'Term 2',
            'term 2': 'Term 2',
            'second term': 'Term 2',
            'second': 'Term 2',
            '2': 'Term 2',
            'term3': 'Term 3',
            'term 3': 'Term 3',
            'third term': 'Term 3',
            'third': 'Term 3',
            '3': 'Term 3',
        }
        return mapping.get(value, str(term or '').strip())

    @staticmethod
    def get_term_aliases(term):
        canonical = FeeService.normalize_term(term)
        aliases = {canonical}
        if canonical == 'Term 1':
            aliases.update({'First Term', '1'})
        elif canonical == 'Term 2':
            aliases.update({'Second Term', '2'})
        elif canonical == 'Term 3':
            aliases.update({'Third Term', '3'})
        return [item for item in aliases if item]

    @staticmethod
    def get_current_fee_period():
        current_year = AcademicYear.query.filter_by(is_current=True).first()
        if current_year is None:
            current_year = AcademicYear.query.order_by(
                AcademicYear.end_date.desc(),
                AcademicYear.id.desc()
            ).first()

        current_term = Term.query.filter_by(is_current=True).first()
        if current_term is None and current_year is not None:
            current_term = Term.query.filter_by(academic_year_id=current_year.id).order_by(
                Term.start_date.asc(),
                Term.id.asc()
            ).first()
        if current_term is None:
            current_term = Term.query.order_by(
                Term.end_date.desc(),
                Term.id.desc()
            ).first()

        academic_year = getattr(current_year, 'name', None)
        term = getattr(current_term, 'name', None) or 'Term 1'
        return {
            'academic_year': str(academic_year or '').strip(),
            'term': FeeService.normalize_term(term or 'Term 1')
        }

    @staticmethod
    def student_requires_manual_fee_assignment(student):
        fee_category = str(getattr(student, 'fee_category', '') or '').strip().lower()
        scholarship_details = str(getattr(student, 'scholarship_details', '') or '').strip()
        scholarship_markers = ('scholarship', 'bursary', 'waiver', 'sponsored', 'grant')
        return any(marker in fee_category for marker in scholarship_markers) or bool(scholarship_details)

    @staticmethod
    def _build_student_fee(structure, student):
        amount = float(structure.amount or 0)
        branch_id = getattr(student, 'branch_id', None)
        if branch_id is None and getattr(student, 'class_', None):
            branch_id = getattr(student.class_, 'branch_id', None)
        return StudentFee(
            student_id=student.id,
            fee_structure_id=structure.id,
            original_amount=amount,
            discount_amount=0.0,
            final_amount=amount,
            paid_amount=0.0,
            balance=amount,
            status='pending',
            branch_id=branch_id,
        )

    @staticmethod
    def assign_fee_structures_to_students(structures, students, commit=True):
        created_count = 0
        for student in students:
            for structure in structures:
                existing = StudentFee.query.filter_by(
                    student_id=student.id,
                    fee_structure_id=structure.id
                ).first()
                if existing:
                    continue
                db.session.add(FeeService._build_student_fee(structure, student))
                created_count += 1

        if commit:
            db.session.commit()
        return created_count

    @staticmethod
    def auto_apply_current_fee_templates(student, commit=True):
        if not student or not getattr(student, 'id', None) or not getattr(student, 'class_id', None):
            return 0
        if FeeService.student_requires_manual_fee_assignment(student):
            return 0

        period = FeeService.get_current_fee_period()
        academic_year = period.get('academic_year')
        term_aliases = FeeService.get_term_aliases(period.get('term'))
        if not academic_year or not term_aliases:
            return 0

        structures = FeeStructure.query.filter(
            FeeStructure.academic_year == academic_year,
            FeeStructure.term.in_(term_aliases),
            or_(FeeStructure.class_id == student.class_id, FeeStructure.class_id.is_(None))
        ).all()
        if not structures:
            return 0

        return FeeService.assign_fee_structures_to_students(structures, [student], commit=commit)

    @staticmethod
    def create_fee_structure(data):
        """Create a new fee structure."""
        try:
            structure = FeeStructure(**data)
            db.session.add(structure)
            db.session.commit()
            return structure, None
        except Exception as e:
            db.session.rollback()
            logger.error("Error creating fee structure", error=str(e))
            return None, str(e)

    @staticmethod
    def assign_fees_to_students(fee_structure_id):
        """
        Generate StudentFee records for all eligible students for a given structure.
        """
        try:
            structure = FeeStructure.query.get(fee_structure_id)
            if not structure:
                return None, "Fee structure not found"
            
            # Find eligible students
            query = Student.query.filter_by(is_active=True)
            if structure.class_id:
                query = query.filter_by(class_id=structure.class_id)
            # Add educational_level filter logic if needed
            
            students = query.all()
            count = 0
            
            for student in students:
                # Check if already assigned
                existing = StudentFee.query.filter_by(
                    student_id=student.id,
                    fee_structure_id=structure.id
                ).first()
                
                if not existing:
                    db.session.add(FeeService._build_student_fee(structure, student))
                    count += 1
            
            db.session.commit()
            return count, None
        except Exception as e:
            db.session.rollback()
            logger.error("Error assigning fees", error=str(e))
            return None, str(e)

    @staticmethod
    def record_payment(data, user_id=None):
        """Record a payment and allocate it to outstanding fees."""
        try:
            # 1. Create Payment Record
            payment = Payment(
                transaction_id=data.get('transaction_id', str(uuid.uuid4())),
                student_id=data['student_id'],
                amount=data['amount'],
                payment_method=data['payment_method'],
                payment_provider=data.get('payment_provider', 'manual'),
                external_reference=data.get('external_reference'),
                recorded_by=user_id,
                status='completed' # Assuming direct recording means completed
            )
            db.session.add(payment)
            db.session.flush() # Get ID
            
            # 2. Allocate to StudentFees (FIFO - Oldest first)
            remaining_amount = float(data['amount'])
            
            # Get outstanding fees ordered by due date/creation
            outstanding_fees = StudentFee.query.filter(
                StudentFee.student_id == data['student_id'],
                StudentFee.balance > 0
            ).join(FeeStructure).order_by(FeeStructure.due_date.asc(), StudentFee.created_at.asc()).all()
            
            for fee in outstanding_fees:
                if remaining_amount <= 0:
                    break
                
                amount_to_pay = min(float(fee.balance), remaining_amount)
                
                # Create allocation
                allocation = PaymentAllocation(
                    payment_id=payment.id,
                    student_fee_id=fee.id,
                    amount_allocated=amount_to_pay
                )
                db.session.add(allocation)
                
                # Update fee balance
                fee.paid_amount = float(fee.paid_amount) + amount_to_pay
                fee.update_balance()
                
                remaining_amount -= amount_to_pay
            
            # If remaining amount > 0, it's a credit (store in wallet? For now just log)
            if remaining_amount > 0:
                logger.info("Payment has excess amount", excess=remaining_amount, student_id=data['student_id'])
                # TODO: Add logic for wallet/credit
            
            db.session.commit()
            return payment, None
        except Exception as e:
            db.session.rollback()
            logger.error("Error recording payment", error=str(e))
            return None, str(e)

    @staticmethod
    def get_student_balance(student_id):
        """Get total outstanding balance for a student."""
        total_balance = db.session.query(func.sum(StudentFee.balance))\
            .filter(StudentFee.student_id == student_id).scalar()
        return float(total_balance) if total_balance else 0.00
