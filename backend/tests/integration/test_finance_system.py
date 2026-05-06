import pytest
from datetime import date
from app.models.finance import FeeCategory, FeeStructure, StudentFee, Payment
from app.models.student import Student
from app.models.class_ import Class
from app.extensions import db

class TestFinanceSystem:
    def test_create_fee_structure(self, auth_client, db):
        category = FeeCategory(name='Tuition')
        db.session.add(category)
        db.session.commit()
        
        data = {
            'fee_category_id': category.id,
            'academic_year': '2024',
            'term': 'Term 1',
            'amount': 500.00,
            'currency': 'GHS'
        }
        
        response = auth_client.post('/api/v1/finance/structures', json=data)
        assert response.status_code == 201
        assert response.json['success'] is True
        
    def test_assign_fees(self, auth_client, db):
        class_obj = Class(name='Grade 1', grade_level='1', academic_year='2024')
        db.session.add(class_obj)
        db.session.commit()
        
        student = Student(first_name='Fee', last_name='Student', student_id='FEE001', class_id=class_obj.id)
        db.session.add(student)
        
        category = FeeCategory(name='Transport')
        db.session.add(category)
        db.session.commit()
        
        structure = FeeStructure(
            fee_category_id=category.id, class_id=class_obj.id, 
            academic_year='2024', term='Term 1', amount=200.00
        )
        db.session.add(structure)
        db.session.commit()
        
        response = auth_client.post(f'/api/v1/finance/structures/{structure.id}/assign')
        assert response.status_code == 200
        
        fee = StudentFee.query.filter_by(student_id=student.id).first()
        assert fee is not None
        assert float(fee.final_amount) == 200.00
        
    def test_record_payment(self, auth_client, db):
        # Setup student with fee
        student = Student(first_name='Pay', last_name='Ment', student_id='PAY001')
        db.session.add(student)
        category = FeeCategory(name='Books')
        db.session.add(category)
        db.session.commit()
        
        structure = FeeStructure(fee_category_id=category.id, academic_year='2024', term='1', amount=100)
        db.session.add(structure)
        db.session.commit()
        
        fee = StudentFee(
            student_id=student.id, fee_structure_id=structure.id, 
            original_amount=100, final_amount=100, balance=100
        )
        db.session.add(fee)
        db.session.commit()
        
        payment_data = {
            'student_id': student.id,
            'amount': 60.00,
            'payment_method': 'cash'
        }
        
        response = auth_client.post('/api/v1/finance/payments', json=payment_data)
        assert response.status_code == 201
        
        # Verify allocation
        db.session.refresh(fee)
        assert float(fee.paid_amount) == 60.00
        assert float(fee.balance) == 40.00
