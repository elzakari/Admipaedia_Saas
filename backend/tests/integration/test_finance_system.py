import pytest
from datetime import date
from app.models.finance import FeeCategory, FeeStructure, StudentFee, Payment
from app.models.student import Student
from app.models.class_ import Class
from app.extensions import db
from app.services.finance.service import FeeService

class TestFinanceSystem:
    def test_create_fee_structure(self, tenant_auth_client, db):
        category = FeeCategory(name='Tuition', tenant_id=tenant_auth_client.test_tenant_id)
        db.session.add(category)
        db.session.commit()
        
        data = {
            'fee_category_id': category.id,
            'academic_year': '2024',
            'term': 'Term 1',
            'amount': 500.00,
            'currency': 'GHS'
        }
        
        response = tenant_auth_client.post('/api/v1/finance/structures', json=data)
        assert response.status_code == 201
        assert response.json['success'] is True
        
    def test_assign_fees(self, tenant_branch_auth_client, db, student_factory):
        class_obj = Class(name='Grade 1', grade_level='1', academic_year='2024', tenant_id=tenant_branch_auth_client.test_tenant_id, branch_id=tenant_branch_auth_client.test_branch_id)
        db.session.add(class_obj)
        db.session.commit()
        
        student = student_factory(class_id=class_obj.id, tenant_id=tenant_branch_auth_client.test_tenant_id, branch_id=tenant_branch_auth_client.test_branch_id)
        student.first_name = 'Fee'
        student.last_name = 'Student'
        student.student_id_number = 'FEE001'
        db.session.add(student)
        
        category = FeeCategory(name='Transport', tenant_id=tenant_branch_auth_client.test_tenant_id)
        db.session.add(category)
        db.session.commit()
        
        structure = FeeStructure(
            fee_category_id=category.id, class_id=class_obj.id, 
            academic_year='2024', term='Term 1', amount=200.00
        , tenant_id=tenant_branch_auth_client.test_tenant_id)
        db.session.add(structure)
        db.session.commit()
        
        response = tenant_branch_auth_client.post(f'/api/v1/finance/structures/{structure.id}/assign')
        assert response.status_code == 200
        
        fee = StudentFee.query.filter_by(student_id=student.id).first()
        assert fee is not None
        assert float(fee.final_amount) == 200.00
        
    def test_record_payment(self, school_finance_auth_client, db, student_factory):
        # Setup student with fee
        student = student_factory(tenant_id=school_finance_auth_client.test_tenant_id, branch_id=school_finance_auth_client.test_branch_id)
        student.first_name = 'Pay'
        student.last_name = 'Ment'
        student.student_id_number = 'PAY001'
        db.session.add(student)
        category = FeeCategory(name='Books', tenant_id=school_finance_auth_client.test_tenant_id)
        db.session.add(category)
        db.session.commit()
        
        structure = FeeStructure(fee_category_id=category.id, academic_year='2024', term='1', amount=100, tenant_id=school_finance_auth_client.test_tenant_id)
        db.session.add(structure)
        db.session.commit()
        
        fee = FeeService._build_student_fee(structure, student)
        db.session.add(fee)
        db.session.commit()
        
        payment_data = {
            'student_id': student.id,
            'amount': 60.00,
            'payment_method': 'cash'
        }
        
        response = school_finance_auth_client.post('/api/v1/finance/payments', json=payment_data)
        assert response.status_code == 201
        
        # Verify allocation
        db.session.refresh(fee)
        assert float(fee.paid_amount) == 60.00
        assert float(fee.balance) == 40.00
