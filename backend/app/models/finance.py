from app.extensions import db
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import JSON
from sqlalchemy.sql import func
import uuid
from datetime import datetime

class FeeCategory(db.Model):
    """
    Categories of fees (e.g., Tuition, Transport, Boarding, ICT).
    """
    __tablename__ = 'fee_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    is_optional = db.Column(db.Boolean, default=False) # e.g., Transport might be optional
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<FeeCategory {self.name}>'

class FeeStructure(db.Model):
    """
    Defines the amount to be charged for a category for a specific class/level in a session.
    """
    __tablename__ = 'fee_structures'
    
    id = db.Column(db.Integer, primary_key=True)
    fee_category_id = db.Column(db.Integer, db.ForeignKey('fee_categories.id'), nullable=False)
    
    # Target audience (can be entire level or specific class)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=True)
    educational_level_id = db.Column(db.Integer, db.ForeignKey('educational_levels.id'), nullable=True)
    
    # Period
    academic_year = db.Column(db.String(20), nullable=False)
    term = db.Column(db.String(20), nullable=False)
    
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='GHS')
    
    due_date = db.Column(db.Date, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    category = db.relationship('FeeCategory', backref='structures')
    class_ = db.relationship('Class', backref='fee_structures')
    educational_level = db.relationship('EducationalLevel', backref='fee_structures')

    def __repr__(self):
        return f'<FeeStructure {self.amount} for {self.academic_year} {self.term}>'

class FeeDiscount(db.Model):
    """
    Discount rules that can be applied to students.
    """
    __tablename__ = 'fee_discounts'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False) # e.g., "Staff Child", "Scholarship"
    description = db.Column(db.Text, nullable=True)
    
    discount_type = db.Column(db.String(20), default='percentage') # percentage or fixed_amount
    value = db.Column(db.Numeric(10, 2), nullable=False)
    
    # Applicability
    fee_category_id = db.Column(db.Integer, db.ForeignKey('fee_categories.id'), nullable=True) # If None, applies to total
    
    is_active = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<FeeDiscount {self.name} - {self.value}>'

class StudentFee(db.Model):
    """
    Ledger entry for a student. Represents an invoice/bill.
    """
    __tablename__ = 'student_fees'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    fee_structure_id = db.Column(db.Integer, db.ForeignKey('fee_structures.id'), nullable=False)
    
    # Calculated amounts
    original_amount = db.Column(db.Numeric(10, 2), nullable=False)
    discount_amount = db.Column(db.Numeric(10, 2), default=0.00)
    final_amount = db.Column(db.Numeric(10, 2), nullable=False)
    
    paid_amount = db.Column(db.Numeric(10, 2), default=0.00)
    balance = db.Column(db.Numeric(10, 2), nullable=False)
    
    status = db.Column(db.String(20), default='pending') # pending, partial, paid, overdue
    
    # Discount applied
    applied_discount_id = db.Column(db.Integer, db.ForeignKey('fee_discounts.id'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = db.relationship('Student', backref='fees')
    structure = db.relationship('FeeStructure', backref='student_fees')
    discount = db.relationship('FeeDiscount')

    def update_balance(self):
        self.balance = self.final_amount - self.paid_amount
        if self.balance <= 0:
            self.status = 'paid'
            self.balance = 0
        elif self.paid_amount > 0:
            self.status = 'partial'
        else:
            self.status = 'pending'

    def __repr__(self):
        return f'<StudentFee {self.student_id}: {self.balance} pending>'

class Payment(db.Model):
    """
    Record of a payment transaction.
    """
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.String(100), unique=True, nullable=False) # Unique Ref
    
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='GHS')
    
    payment_method = db.Column(db.String(50), nullable=False) # cash, mobile_money, card, bank_transfer
    payment_provider = db.Column(db.String(50), nullable=True) # paystack, stripe, manual
    external_reference = db.Column(db.String(100), nullable=True) # Gateway ref
    
    status = db.Column(db.String(20), default='completed') # pending, completed, failed, refunded
    
    paid_at = db.Column(db.DateTime, default=datetime.utcnow)
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # If manual
    
    receipt_number = db.Column(db.String(50), unique=True, nullable=True)
    
    # Metadata for reconciliation
    meta_data = db.Column(JSON().with_variant(JSONB(), 'postgresql'), nullable=True)
    
    # Relationships
    student = db.relationship('Student', backref='payments')
    recorder = db.relationship('User')

    def __repr__(self):
        return f'<Payment {self.transaction_id}: {self.amount}>'

class PaymentAllocation(db.Model):
    """
    Links a Payment to specific StudentFee items (One payment can cover multiple fees).
    """
    __tablename__ = 'payment_allocations'
    
    id = db.Column(db.Integer, primary_key=True)
    payment_id = db.Column(db.Integer, db.ForeignKey('payments.id'), nullable=False)
    student_fee_id = db.Column(db.Integer, db.ForeignKey('student_fees.id'), nullable=False)
    
    amount_allocated = db.Column(db.Numeric(10, 2), nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    payment = db.relationship('Payment', backref='allocations')
    student_fee = db.relationship('StudentFee', backref='allocations')
