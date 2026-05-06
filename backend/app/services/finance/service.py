from app.extensions import db
from app.models.finance import FeeCategory, FeeStructure, FeeDiscount, StudentFee, Payment, PaymentAllocation
from app.models.student import Student
from sqlalchemy import func
import uuid
from datetime import datetime
import structlog

logger = structlog.get_logger()

class FeeService:
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
                    # Check for applicable discounts
                    discount_amount = 0
                    applied_discount_id = None
                    
                    # Logic to find best discount (simplified)
                    # In real app, check FeeDiscount rules against student properties
                    
                    student_fee = StudentFee(
                        student_id=student.id,
                        fee_structure_id=structure.id,
                        original_amount=structure.amount,
                        discount_amount=discount_amount,
                        final_amount=structure.amount - discount_amount,
                        balance=structure.amount - discount_amount,
                        applied_discount_id=applied_discount_id
                    )
                    db.session.add(student_fee)
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
