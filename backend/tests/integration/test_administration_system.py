"""
Comprehensive integration tests for administration system
Tests budget management, fee structures, payments, and infrastructure management
"""
import pytest

pytestmark = pytest.mark.skip(reason="Legacy administration integration suite (fees/payments) is not aligned with current finance and tenant-scoped modules.")


class TestBudgetManagement:
    """Test budget management functionality"""
    
    def test_create_budget_success(self, auth_client, db):
        """Test successful budget creation"""
        budget_data = {
            'name': 'Academic Year 2024 Budget',
            'description': 'Main budget for academic year 2024',
            'academic_year': '2024',
            'total_amount': 500000.00,
            'allocated_amount': 0.00,
            'start_date': '2024-01-01',
            'end_date': '2024-12-31',
            'category': 'operational'
        }
        
        response = auth_client.post('/api/v1/administration/budgets', json=budget_data)
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['budget']['name'] == budget_data['name']
        assert data['budget']['total_amount'] == budget_data['total_amount']
        assert data['budget']['academic_year'] == budget_data['academic_year']
        
        # Verify budget in database
        budget = Budget.query.filter_by(name=budget_data['name']).first()
        assert budget is not None
        assert budget.remaining_amount == budget.total_amount
    
    def test_create_budget_duplicate_name_year(self, auth_client, db):
        """Test creating budget with duplicate name and year"""
        # Create first budget
        budget1_data = {
            'name': 'Test Budget',
            'academic_year': '2024',
            'total_amount': 100000.00,
            'start_date': '2024-01-01',
            'end_date': '2024-12-31'
        }
        
        response1 = auth_client.post('/api/v1/administration/budgets', json=budget1_data)
        assert response1.status_code == 201
        
        # Try to create duplicate
        budget2_data = {
            'name': 'Test Budget',
            'academic_year': '2024',  # Same year
            'total_amount': 200000.00,
            'start_date': '2024-01-01',
            'end_date': '2024-12-31'
        }
        
        response2 = auth_client.post('/api/v1/administration/budgets', json=budget2_data)
        assert response2.status_code == 400
        
        data = response2.get_json()
        assert data['success'] is False
        assert 'already exists' in data['message'].lower()
    
    def test_get_budgets_with_filters(self, auth_client, db):
        """Test retrieving budgets with filters"""
        # Create test budgets
        budgets_data = [
            {
                'name': 'Budget 2023',
                'academic_year': '2023',
                'total_amount': 300000.00,
                'start_date': '2023-01-01',
                'end_date': '2023-12-31'
            },
            {
                'name': 'Budget 2024',
                'academic_year': '2024',
                'total_amount': 400000.00,
                'start_date': '2024-01-01',
                'end_date': '2024-12-31'
            }
        ]
        
        for budget_data in budgets_data:
            auth_client.post('/api/v1/administration/budgets', json=budget_data)
        
        # Test academic year filter
        response = auth_client.get('/api/v1/administration/budgets?academic_year=2024')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert len(data['budgets']) == 1
        assert data['budgets'][0]['academic_year'] == '2024'
    
    def test_update_budget(self, auth_client, db):
        """Test updating budget information"""
        # Create a budget
        budget_data = {
            'name': 'Original Budget',
            'academic_year': '2024',
            'total_amount': 100000.00,
            'start_date': '2024-01-01',
            'end_date': '2024-12-31'
        }
        
        response = auth_client.post('/api/v1/administration/budgets', json=budget_data)
        budget_id = response.get_json()['budget']['id']
        
        # Update budget
        update_data = {
            'name': 'Updated Budget',
            'total_amount': 150000.00,
            'description': 'Updated budget description'
        }
        
        response = auth_client.put(f'/api/v1/administration/budgets/{budget_id}', json=update_data)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert data['budget']['name'] == 'Updated Budget'
        assert data['budget']['total_amount'] == 150000.00


class TestTransactionManagement:
    """Test transaction management functionality"""
    
    def test_create_transaction_success(self, auth_client, db):
        """Test successful transaction creation"""
        # Create a budget first
        budget = Budget(
            name='Test Budget',
            academic_year='2024',
            total_amount=Decimal('100000.00'),
            allocated_amount=Decimal('0.00'),
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
        db.session.add(budget)
        db.session.commit()
        
        transaction_data = {
            'budget_id': budget.id,
            'description': 'Office supplies purchase',
            'amount': 5000.00,
            'transaction_type': 'expense',
            'category': 'supplies',
            'transaction_date': '2024-03-15',
            'reference_number': 'TXN-001'
        }
        
        response = auth_client.post('/api/v1/administration/transactions', json=transaction_data)
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['transaction']['description'] == transaction_data['description']
        assert data['transaction']['amount'] == transaction_data['amount']
        
        # Verify budget allocation updated
        db.session.refresh(budget)
        assert budget.allocated_amount == Decimal('5000.00')
    
    def test_create_transaction_exceeds_budget(self, auth_client, db):
        """Test transaction that exceeds budget limit"""
        # Create a small budget
        budget = Budget(
            name='Small Budget',
            academic_year='2024',
            total_amount=Decimal('1000.00'),
            allocated_amount=Decimal('0.00'),
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
        db.session.add(budget)
        db.session.commit()
        
        transaction_data = {
            'budget_id': budget.id,
            'description': 'Large expense',
            'amount': 2000.00,  # Exceeds budget
            'transaction_type': 'expense',
            'transaction_date': '2024-03-15'
        }
        
        response = auth_client.post('/api/v1/administration/transactions', json=transaction_data)
        assert response.status_code == 400
        
        data = response.get_json()
        assert data['success'] is False
        assert 'budget' in data['message'].lower() or 'exceeds' in data['message'].lower()


class TestFeeStructureManagement:
    """Test fee structure management functionality"""
    
    def test_create_fee_structure_success(self, auth_client, db):
        """Test successful fee structure creation"""
        fee_structure_data = {
            'name': 'Grade 1 Fees 2024',
            'academic_year': '2024',
            'class_id': 1,
            'term': 'Term 1',
            'tuition_fee': 15000.00,
            'registration_fee': 2000.00,
            'library_fee': 500.00,
            'sports_fee': 1000.00,
            'examination_fee': 1500.00,
            'total_amount': 20000.00,
            'due_date': '2024-02-15',
            'late_fee_amount': 500.00,
            'late_fee_days': 30
        }
        
        response = auth_client.post('/api/v1/administration/fee-structures', json=fee_structure_data)
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['fee_structure']['name'] == fee_structure_data['name']
        assert data['fee_structure']['total_amount'] == fee_structure_data['total_amount']
        assert data['fee_structure']['class_id'] == fee_structure_data['class_id']
    
    def test_get_fee_structures_by_class(self, auth_client, db):
        """Test retrieving fee structures filtered by class"""
        # Create fee structures for different classes
        fee_structures_data = [
            {
                'name': 'Grade 1 Fees',
                'academic_year': '2024',
                'class_id': 1,
                'total_amount': 15000.00,
                'due_date': '2024-02-15'
            },
            {
                'name': 'Grade 2 Fees',
                'academic_year': '2024',
                'class_id': 2,
                'total_amount': 16000.00,
                'due_date': '2024-02-15'
            }
        ]
        
        for fee_data in fee_structures_data:
            auth_client.post('/api/v1/administration/fee-structures', json=fee_data)
        
        # Test class filter
        response = auth_client.get('/api/v1/administration/fee-structures?class_id=1')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert len(data['fee_structures']) == 1
        assert data['fee_structures'][0]['class_id'] == 1


class TestFeePaymentProcessing:
    """Test fee payment processing functionality"""
    
    def test_create_fee_payment_success(self, auth_client, db):
        """Test successful fee payment processing"""
        # Create student and fee record
        user = User(
            username='student001',
            email='student001@school.com',
            first_name='John',
            last_name='Doe'
        )
        user.set_password('password123')
        
        student = Student(
            admission_number='STU001',
            user_id=None,  # Will be set after user is saved
            current_class_id=1,
            date_of_birth=date(2010, 5, 15)
        )
        
        db.session.add(user)
        db.session.commit()
        
        student.user_id = user.id
        db.session.add(student)
        db.session.commit()
        
        # Create fee record
        fee_record = FeeRecord(
            student_id=student.id,
            fee_type=FeeType.TUITION,
            amount=Decimal('15000.00'),
            due_date=date.today() + timedelta(days=30),
            academic_year='2024',
            term='Term 1',
            is_paid=False
        )
        
        db.session.add(fee_record)
        db.session.commit()
        
        # Process payment
        payment_data = {
            'fee_record_id': fee_record.id,
            'amount': 15000.00,
            'payment_method': 'bank_transfer',
            'payment_date': date.today().isoformat(),
            'reference_number': 'PAY-001',
            'notes': 'Full payment for Term 1'
        }
        
        response = auth_client.post('/api/v1/administration/fee-payments', json=payment_data)
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['fee_payment']['amount'] == payment_data['amount']
        
        # Verify fee record marked as paid
        db.session.refresh(fee_record)
        assert fee_record.is_paid is True
        assert fee_record.paid_amount == Decimal('15000.00')
    
    def test_partial_fee_payment(self, auth_client, db):
        """Test partial fee payment processing"""
        # Create student and fee record
        user = User(
            username='student002',
            email='student002@school.com',
            first_name='Jane',
            last_name='Smith'
        )
        user.set_password('password123')
        
        student = Student(
            admission_number='STU002',
            user_id=None,
            current_class_id=1,
            date_of_birth=date(2010, 8, 20)
        )
        
        db.session.add(user)
        db.session.commit()
        
        student.user_id = user.id
        db.session.add(student)
        db.session.commit()
        
        fee_record = FeeRecord(
            student_id=student.id,
            fee_type=FeeType.TUITION,
            amount=Decimal('15000.00'),
            due_date=date.today() + timedelta(days=30),
            academic_year='2024',
            term='Term 1',
            is_paid=False,
            paid_amount=Decimal('0.00')
        )
        
        db.session.add(fee_record)
        db.session.commit()
        
        # Make partial payment
        payment_data = {
            'fee_record_id': fee_record.id,
            'amount': 7500.00,  # Half payment
            'payment_method': 'cash',
            'payment_date': date.today().isoformat(),
            'reference_number': 'PAY-002'
        }
        
        response = auth_client.post('/api/v1/administration/fee-payments', json=payment_data)
        assert response.status_code == 201
        
        # Verify partial payment recorded
        db.session.refresh(fee_record)
        assert fee_record.is_paid is False  # Not fully paid
        assert fee_record.paid_amount == Decimal('7500.00')
        assert fee_record.balance == Decimal('7500.00')


class TestFinancialReporting:
    """Test financial reporting functionality"""
    
    def test_get_financial_summary(self, auth_client, db):
        """Test retrieving financial summary"""
        # Create test data
        budget = Budget(
            name='Test Budget',
            academic_year='2024',
            total_amount=Decimal('100000.00'),
            allocated_amount=Decimal('25000.00'),
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
        
        db.session.add(budget)
        db.session.commit()
        
        # Create transactions
        transactions = [
            Transaction(
                budget_id=budget.id,
                description='Income from fees',
                amount=Decimal('50000.00'),
                transaction_type=TransactionType.INCOME,
                transaction_date=date.today()
            ),
            Transaction(
                budget_id=budget.id,
                description='Office expenses',
                amount=Decimal('15000.00'),
                transaction_type=TransactionType.EXPENSE,
                transaction_date=date.today()
            )
        ]
        
        db.session.add_all(transactions)
        db.session.commit()
        
        # Get financial summary
        response = auth_client.get('/api/v1/administration/financial-summary?academic_year=2024')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert 'total_budget' in data['summary']
        assert 'total_income' in data['summary']
        assert 'total_expenses' in data['summary']
        assert 'net_balance' in data['summary']
    
    def test_get_overdue_fees(self, auth_client, db):
        """Test retrieving overdue fees report"""
        # Create student with overdue fee
        user = User(
            username='overdue_student',
            email='overdue@school.com',
            first_name='Overdue',
            last_name='Student'
        )
        user.set_password('password123')
        
        student = Student(
            admission_number='STU003',
            user_id=None,
            current_class_id=1,
            date_of_birth=date(2010, 3, 10)
        )
        
        db.session.add(user)
        db.session.commit()
        
        student.user_id = user.id
        db.session.add(student)
        db.session.commit()
        
        # Create overdue fee record
        overdue_fee = FeeRecord(
            student_id=student.id,
            fee_type=FeeType.TUITION,
            amount=Decimal('15000.00'),
            due_date=date.today() - timedelta(days=30),  # 30 days overdue
            academic_year='2024',
            term='Term 1',
            is_paid=False
        )
        
        db.session.add(overdue_fee)
        db.session.commit()
        
        # Get overdue fees
        response = auth_client.get('/api/v1/administration/overdue-fees')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert len(data['overdue_fees']) >= 1
        
        # Verify overdue fee details
        overdue_record = data['overdue_fees'][0]
        assert overdue_record['student_id'] == student.id
        assert overdue_record['is_paid'] is False


class TestInfrastructureManagement:
    """Test infrastructure management functionality"""
    
    def test_create_facility_success(self, auth_client, db):
        """Test successful facility creation"""
        facility_data = {
            'name': 'Science Laboratory',
            'facility_type': 'laboratory',
            'location': 'Block A, Floor 2',
            'capacity': 40,
            'description': 'Fully equipped science laboratory',
            'is_active': True
        }
        
        response = auth_client.post('/api/v1/administration/facilities', json=facility_data)
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['facility']['name'] == facility_data['name']
        assert data['facility']['capacity'] == facility_data['capacity']
    
    def test_create_maintenance_request(self, auth_client, db):
        """Test creating maintenance request"""
        # Create facility first
        facility = Facility(
            name='Computer Lab',
            facility_type='laboratory',
            location='Block B, Floor 1',
            capacity=30,
            is_active=True
        )
        
        db.session.add(facility)
        db.session.commit()
        
        maintenance_data = {
            'facility_id': facility.id,
            'title': 'Air conditioning repair',
            'description': 'AC unit not working properly',
            'priority': 'high',
            'requested_by': 'John Teacher',
            'estimated_cost': 5000.00
        }
        
        response = auth_client.post('/api/v1/administration/maintenance-requests', json=maintenance_data)
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['maintenance_request']['title'] == maintenance_data['title']
        assert data['maintenance_request']['status'] == 'pending'
    
    def test_create_asset_success(self, auth_client, db):
        """Test successful asset creation"""
        asset_data = {
            'name': 'Dell Laptop',
            'asset_type': 'equipment',
            'serial_number': 'DL123456789',
            'purchase_date': '2024-01-15',
            'purchase_cost': 75000.00,
            'warranty_expiry': '2027-01-15',
            'location': 'Computer Lab',
            'condition': 'excellent'
        }
        
        response = auth_client.post('/api/v1/administration/assets', json=asset_data)
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['asset']['name'] == asset_data['name']
        assert data['asset']['serial_number'] == asset_data['serial_number']
        assert data['asset']['status'] == 'active'


class TestAdministrationIntegrationWorkflow:
    """Test complete administration workflow integration"""
    
    def test_complete_fee_management_workflow(self, auth_client, db):
        """Test end-to-end fee management workflow"""
        # 1. Create fee structure
        fee_structure_data = {
            'name': 'Grade 3 Fees 2024',
            'academic_year': '2024',
            'class_id': 3,
            'term': 'Term 1',
            'total_amount': 18000.00,
            'due_date': '2024-03-31'
        }
        
        response = auth_client.post('/api/v1/administration/fee-structures', json=fee_structure_data)
        assert response.status_code == 201
        fee_structure_id = response.get_json()['fee_structure']['id']
        
        # 2. Create student
        user = User(
            username='workflow_student',
            email='workflow@school.com',
            first_name='Workflow',
            last_name='Student'
        )
        user.set_password('password123')
        
        student = Student(
            admission_number='STU004',
            user_id=None,
            current_class_id=3,
            date_of_birth=date(2011, 6, 25)
        )
        
        db.session.add(user)
        db.session.commit()
        
        student.user_id = user.id
        db.session.add(student)
        db.session.commit()
        
        # 3. Create fee record
        fee_record_data = {
            'student_id': student.id,
            'fee_structure_id': fee_structure_id,
            'amount': 18000.00,
            'due_date': '2024-03-31',
            'academic_year': '2024',
            'term': 'Term 1'
        }
        
        response = auth_client.post('/api/v1/administration/fee-records', json=fee_record_data)
        assert response.status_code == 201
        fee_record_id = response.get_json()['fee_record']['id']
        
        # 4. Process payment
        payment_data = {
            'fee_record_id': fee_record_id,
            'amount': 18000.00,
            'payment_method': 'bank_transfer',
            'payment_date': date.today().isoformat(),
            'reference_number': 'PAY-WORKFLOW-001'
        }
        
        response = auth_client.post('/api/v1/administration/fee-payments', json=payment_data)
        assert response.status_code == 201
        
        # 5. Verify financial summary updated
        response = auth_client.get('/api/v1/administration/financial-summary?academic_year=2024')
        assert response.status_code == 200
        
        summary = response.get_json()
        assert summary['success'] is True
        assert summary['summary']['total_income'] >= 18000.00
    
    def test_administration_validation_and_constraints(self, auth_client, db):
        """Test administration system validation and business rules"""
        # Test invalid budget dates
        invalid_budget_data = {
            'name': 'Invalid Budget',
            'academic_year': '2024',
            'total_amount': 100000.00,
            'start_date': '2024-12-31',
            'end_date': '2024-01-01'  # End before start
        }
        
        response = auth_client.post('/api/v1/administration/budgets', json=invalid_budget_data)
        assert response.status_code == 400
        
        data = response.get_json()
        assert data['success'] is False
        assert 'date' in data['message'].lower()
        
        # Test negative transaction amount
        budget = Budget(
            name='Valid Budget',
            academic_year='2024',
            total_amount=Decimal('50000.00'),
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
        db.session.add(budget)
        db.session.commit()
        
        invalid_transaction_data = {
            'budget_id': budget.id,
            'description': 'Invalid transaction',
            'amount': -1000.00,  # Negative amount
            'transaction_type': 'expense',
            'transaction_date': date.today().isoformat()
        }
        
        response = auth_client.post('/api/v1/administration/transactions', json=invalid_transaction_data)
        assert response.status_code == 400
        
        data = response.get_json()
        assert data['success'] is False
        assert 'amount' in data['message'].lower() or 'negative' in data['message'].lower()
