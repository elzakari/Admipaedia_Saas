from marshmallow import Schema, fields, validate, validates, ValidationError, pre_load
from datetime import datetime
from decimal import Decimal

class BudgetSchema(Schema):
    """Schema for serializing and deserializing Budget objects"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(validate=validate.Length(max=500), allow_none=True)
    total_amount = fields.Decimal(required=True, places=2, validate=validate.Range(min=0))
    allocated_amount = fields.Decimal(dump_only=True, places=2)
    remaining_amount = fields.Decimal(dump_only=True, places=2)
    budget_year = fields.Integer(required=True, validate=validate.Range(min=2020, max=2050))
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    status = fields.String(validate=validate.OneOf(['draft', 'active', 'completed', 'cancelled']), load_default='draft')
    created_by = fields.Integer(required=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    @validates('end_date')
    def validate_end_date(self, value, **kwargs):
        if hasattr(self, 'start_date') and self.start_date and value <= self.start_date:
            raise ValidationError('End date must be after start date')

class BudgetCreateSchema(Schema):
    """Schema for creating Budget objects"""
    name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(validate=validate.Length(max=500), allow_none=True)
    total_amount = fields.Decimal(required=True, places=2, validate=validate.Range(min=0))
    budget_year = fields.Integer(required=True, validate=validate.Range(min=2020, max=2050))
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    status = fields.String(validate=validate.OneOf(['draft', 'active', 'completed', 'cancelled']), load_default='draft')
    created_by = fields.Integer(required=True)
    
    @validates('end_date')
    def validate_end_date(self, value, **kwargs):
        if hasattr(self, 'start_date') and self.start_date and value <= self.start_date:
            raise ValidationError('End date must be after start date')

class BudgetUpdateSchema(Schema):
    """Schema for updating Budget objects"""
    name = fields.String(validate=validate.Length(min=1, max=200))
    description = fields.String(validate=validate.Length(max=500), allow_none=True)
    total_amount = fields.Decimal(places=2, validate=validate.Range(min=0))
    budget_year = fields.Integer(validate=validate.Range(min=2020, max=2050))
    start_date = fields.Date()
    end_date = fields.Date()
    status = fields.String(validate=validate.OneOf(['draft', 'active', 'completed', 'cancelled']))

class TransactionSchema(Schema):
    """Schema for serializing and deserializing Transaction objects"""
    id = fields.Integer(dump_only=True)
    reference_number = fields.String(dump_only=True)
    description = fields.String(required=True, validate=validate.Length(min=1, max=500))
    amount = fields.Decimal(required=True, places=2, validate=validate.Range(min=0))
    transaction_type = fields.String(required=True, validate=validate.OneOf(['income', 'expense']))
    category = fields.String(required=True, validate=validate.Length(min=1, max=100))
    payment_method = fields.String(validate=validate.OneOf(['cash', 'bank_transfer', 'cheque', 'mobile_money', 'card']), load_default='cash')
    transaction_date = fields.Date(required=True)
    budget_id = fields.Integer(allow_none=True)
    created_by = fields.Integer(required=True)
    approved_by = fields.Integer(allow_none=True)
    approved_at = fields.DateTime(allow_none=True)
    status = fields.String(validate=validate.OneOf(['pending', 'approved', 'rejected']), load_default='pending')
    notes = fields.String(validate=validate.Length(max=1000), allow_none=True)
    receipt_url = fields.String(validate=validate.Length(max=500), allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class TransactionCreateSchema(Schema):
    """Schema for creating Transaction objects"""
    description = fields.String(required=True, validate=validate.Length(min=1, max=500))
    amount = fields.Decimal(required=True, places=2, validate=validate.Range(min=0))
    transaction_type = fields.String(required=True, validate=validate.OneOf(['income', 'expense']))
    category = fields.String(required=True, validate=validate.Length(min=1, max=100))
    payment_method = fields.String(validate=validate.OneOf(['cash', 'bank_transfer', 'cheque', 'mobile_money', 'card']), load_default='cash')
    transaction_date = fields.Date(required=True)
    budget_id = fields.Integer(allow_none=True)
    created_by = fields.Integer(required=True)
    notes = fields.String(validate=validate.Length(max=1000), allow_none=True)
    receipt_url = fields.String(validate=validate.Length(max=500), allow_none=True)

class TransactionUpdateSchema(Schema):
    """Schema for updating Transaction objects"""
    description = fields.String(validate=validate.Length(min=1, max=500))
    amount = fields.Decimal(places=2, validate=validate.Range(min=0))
    transaction_type = fields.String(validate=validate.OneOf(['income', 'expense']))
    category = fields.String(validate=validate.Length(min=1, max=100))
    payment_method = fields.String(validate=validate.OneOf(['cash', 'bank_transfer', 'cheque', 'mobile_money', 'card']))
    transaction_date = fields.Date()
    budget_id = fields.Integer(allow_none=True)
    notes = fields.String(validate=validate.Length(max=1000), allow_none=True)
    receipt_url = fields.String(validate=validate.Length(max=500), allow_none=True)
    status = fields.String(validate=validate.OneOf(['pending', 'approved', 'rejected']))
    approved_by = fields.Integer(allow_none=True)

class FeeStructureSchema(Schema):
    """Schema for serializing and deserializing FeeStructure objects"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(validate=validate.Length(max=500), allow_none=True)
    class_id = fields.Integer(allow_none=True)
    academic_year = fields.String(required=True, validate=validate.Length(min=1, max=20))
    tuition_fee = fields.Decimal(required=True, places=2, validate=validate.Range(min=0))
    transport_fee = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    meal_fee = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    activity_fee = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    library_fee = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    technology_fee = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    other_fees = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    total_fee = fields.Decimal(dump_only=True, places=2)
    is_active = fields.Boolean(load_default=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class FeeStructureCreateSchema(Schema):
    """Schema for creating FeeStructure objects"""
    name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(validate=validate.Length(max=500), allow_none=True)
    class_id = fields.Integer(allow_none=True)
    academic_year = fields.String(required=True, validate=validate.Length(min=1, max=20))
    tuition_fee = fields.Decimal(required=True, places=2, validate=validate.Range(min=0))
    transport_fee = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    meal_fee = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    activity_fee = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    library_fee = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    technology_fee = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    other_fees = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    is_active = fields.Boolean(load_default=True)

class FeeStructureUpdateSchema(Schema):
    """Schema for updating FeeStructure objects"""
    name = fields.String(validate=validate.Length(min=1, max=200))
    description = fields.String(validate=validate.Length(max=500), allow_none=True)
    class_id = fields.Integer(allow_none=True)
    academic_year = fields.String(validate=validate.Length(min=1, max=20))
    tuition_fee = fields.Decimal(places=2, validate=validate.Range(min=0))
    transport_fee = fields.Decimal(places=2, validate=validate.Range(min=0))
    meal_fee = fields.Decimal(places=2, validate=validate.Range(min=0))
    activity_fee = fields.Decimal(places=2, validate=validate.Range(min=0))
    library_fee = fields.Decimal(places=2, validate=validate.Range(min=0))
    technology_fee = fields.Decimal(places=2, validate=validate.Range(min=0))
    other_fees = fields.Decimal(places=2, validate=validate.Range(min=0))
    is_active = fields.Boolean()

class FeeRecordSchema(Schema):
    """Schema for serializing and deserializing FeeRecord objects"""
    id = fields.Integer(dump_only=True)
    student_id = fields.Integer(required=True)
    fee_structure_id = fields.Integer(required=True)
    academic_year = fields.String(required=True, validate=validate.Length(min=1, max=20))
    term = fields.String(validate=validate.OneOf(['term_1', 'term_2', 'term_3', 'annual']), load_default='term_1')
    total_amount = fields.Decimal(required=True, places=2, validate=validate.Range(min=0))
    paid_amount = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    balance = fields.Decimal(dump_only=True, places=2)
    due_date = fields.Date(required=True)
    status = fields.String(validate=validate.OneOf(['pending', 'partial', 'paid', 'overdue']), load_default='pending')
    discount_amount = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    discount_reason = fields.String(validate=validate.Length(max=200), allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Nested relationships
    student = fields.Nested('StudentSchema', dump_only=True, exclude=['fee_records'])
    fee_structure = fields.Nested('FeeStructureSchema', dump_only=True)
    payments = fields.Nested('FeePaymentSchema', many=True, dump_only=True)

class FeeRecordCreateSchema(Schema):
    """Schema for creating FeeRecord objects"""
    student_id = fields.Integer(required=True)
    fee_structure_id = fields.Integer(required=True)
    academic_year = fields.String(required=True, validate=validate.Length(min=1, max=20))
    term = fields.String(validate=validate.OneOf(['term_1', 'term_2', 'term_3', 'annual']), load_default='term_1')
    total_amount = fields.Decimal(required=True, places=2, validate=validate.Range(min=0))
    due_date = fields.Date(required=True)
    discount_amount = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    discount_reason = fields.String(validate=validate.Length(max=200), allow_none=True)

class FeeRecordUpdateSchema(Schema):
    """Schema for updating FeeRecord objects"""
    fee_structure_id = fields.Integer()
    total_amount = fields.Decimal(places=2, validate=validate.Range(min=0))
    due_date = fields.Date()
    status = fields.String(validate=validate.OneOf(['pending', 'partial', 'paid', 'overdue']))
    discount_amount = fields.Decimal(places=2, validate=validate.Range(min=0))
    discount_reason = fields.String(validate=validate.Length(max=200), allow_none=True)

class FeePaymentSchema(Schema):
    """Schema for serializing and deserializing FeePayment objects"""
    id = fields.Integer(dump_only=True)
    fee_record_id = fields.Integer(required=True)
    receipt_number = fields.String(dump_only=True)
    amount = fields.Decimal(required=True, places=2, validate=validate.Range(min=0))
    payment_method = fields.String(required=True, validate=validate.OneOf(['cash', 'bank_transfer', 'cheque', 'mobile_money', 'card']))
    payment_date = fields.Date(required=True)
    reference_number = fields.String(validate=validate.Length(max=100), allow_none=True)
    bank_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    cheque_number = fields.String(validate=validate.Length(max=50), allow_none=True)
    mobile_money_number = fields.String(validate=validate.Length(max=20), allow_none=True)
    notes = fields.String(validate=validate.Length(max=500), allow_none=True)
    received_by = fields.Integer(required=True)
    verified_by = fields.Integer(allow_none=True)
    verified_at = fields.DateTime(allow_none=True)
    status = fields.String(validate=validate.OneOf(['pending', 'verified', 'cancelled']), load_default='pending')
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class FeePaymentCreateSchema(Schema):
    """Schema for creating FeePayment objects"""
    student_id = fields.Integer(required=True)
    fee_structure_id = fields.Integer(required=True)
    term = fields.String(validate=validate.OneOf(['term_1', 'term_2', 'term_3', 'annual']), load_default='term_1')
    amount_paid = fields.Decimal(required=True, places=2, validate=validate.Range(min=0))
    paid_amount = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    payment_date = fields.Date(required=True)
    payment_method = fields.String(required=True, validate=validate.OneOf(['cash', 'bank_transfer', 'cheque', 'mobile_money', 'card']))
    status = fields.String(validate=validate.OneOf(['pending', 'partial', 'paid', 'overdue']), load_default='pending')
    discount_amount = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    receipt_number = fields.String(validate=validate.Length(max=100))
    notes = fields.String(validate=validate.Length(max=500))

class FeePaymentUpdateSchema(Schema):
    """Schema for updating FeePayment objects"""
    student_id = fields.Integer()
    fee_structure_id = fields.Integer()
    term = fields.String(validate=validate.OneOf(['term_1', 'term_2', 'term_3', 'annual']), load_default='term_1')
    amount_paid = fields.Decimal(places=2, validate=validate.Range(min=0))
    payment_date = fields.Date()
    payment_method = fields.String()
    discount_amount = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    receipt_number = fields.String(validate=validate.Length(max=100))
    notes = fields.String(validate=validate.Length(max=500))
    status = fields.String(validate=validate.OneOf(['pending', 'verified', 'cancelled']))
    verified_by = fields.Integer(allow_none=True)

class PaymentVerificationSchema(Schema):
    """Schema for serializing and deserializing PaymentVerification objects"""
    id = fields.Integer(dump_only=True)
    payment_id = fields.Integer(required=True)
    verified_by = fields.Integer(required=True)
    verification_date = fields.DateTime(required=True)
    status = fields.String(validate=validate.OneOf(['pending', 'verified', 'cancelled']), load_default='pending')
    notes = fields.String(validate=validate.Length(max=500))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class InventoryItemSchema(Schema):
    """Schema for serializing and deserializing InventoryItem objects"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    category = fields.String(required=True, validate=validate.Length(min=1, max=100))
    description = fields.String(validate=validate.Length(max=500))
    quantity = fields.Integer(required=True, validate=validate.Range(min=0))
    unit_price = fields.Decimal(places=2, validate=validate.Range(min=0))
    supplier = fields.String(validate=validate.Length(max=200), allow_none=True)
    location = fields.String(validate=validate.Length(max=200), allow_none=True)
    minimum_stock_level = fields.Integer(validate=validate.Range(min=0), allow_none=True)
    barcode = fields.String(validate=validate.Length(max=100), allow_none=True)
    expiry_date = fields.Date(allow_none=True)
    purchase_date = fields.Date(allow_none=True)
    warranty_expiry = fields.Date(allow_none=True)
    status = fields.String(validate=validate.OneOf([
        'active', 'inactive', 'discontinued', 'out_of_stock'
    ]), load_default='active')
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class MaintenanceRequestSchema(Schema):
    """Schema for serializing and deserializing MaintenanceRequest objects"""
    id = fields.Integer(dump_only=True)
    facility_id = fields.Integer(required=True)
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(required=True)
    priority = fields.String(validate=validate.OneOf(['low', 'medium', 'high', 'urgent']), load_default='medium')
    status = fields.String(validate=validate.OneOf(['pending', 'in_progress', 'completed', 'cancelled']), load_default='pending')
    
    # Request details
    reported_date = fields.Date(required=True)
    scheduled_date = fields.Date(allow_none=True)
    completed_date = fields.Date(allow_none=True)
    estimated_cost = fields.Decimal(places=2, validate=validate.Range(min=0), allow_none=True)
    actual_cost = fields.Decimal(places=2, validate=validate.Range(min=0), allow_none=True)
    
    # Personnel
    reported_by = fields.Integer(required=True)
    assigned_to = fields.Integer(allow_none=True)
    contractor_name = fields.String(validate=validate.Length(max=255), allow_none=True)
    contractor_contact = fields.String(validate=validate.Length(max=50), allow_none=True)
    
    # Additional info
    notes = fields.String(allow_none=True)
    completion_notes = fields.String(allow_none=True)
    
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Nested fields for related data
    facility = fields.Nested('FacilitySchema', only=('id', 'name', 'facility_type', 'location'), dump_only=True)
    reporter = fields.Nested('UserSchema', only=('id', 'username', 'email', 'first_name', 'last_name'), dump_only=True)
    assignee = fields.Nested('UserSchema', only=('id', 'username', 'email', 'first_name', 'last_name'), dump_only=True)
    is_overdue = fields.Method('get_is_overdue', dump_only=True)
    
    def get_is_overdue(self, obj):
        return obj.is_overdue if hasattr(obj, 'is_overdue') else False
    
    @validates('completed_date')
    def validate_completed_date(self, value, **kwargs):
        if hasattr(self, 'reported_date') and self.reported_date and value < self.reported_date:
            raise ValidationError('Completed date cannot be before reported date')
    
    @validates('scheduled_date')
    def validate_scheduled_date(self, value, **kwargs):
        if hasattr(self, 'reported_date') and self.reported_date and value < self.reported_date:
            raise ValidationError('Scheduled date cannot be before reported date')

class AssetSchema(Schema):
    """Schema for serializing and deserializing Asset objects"""
    id = fields.Integer(dump_only=True)
    facility_id = fields.Integer(allow_none=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    asset_tag = fields.String(required=True, validate=validate.Length(min=1, max=50))
    category = fields.String(required=True, validate=validate.Length(min=1, max=100))
    description = fields.String(allow_none=True)
    
    # Asset details
    brand = fields.String(validate=validate.Length(max=100), allow_none=True)
    model = fields.String(validate=validate.Length(max=100), allow_none=True)
    serial_number = fields.String(validate=validate.Length(max=100), allow_none=True)
    purchase_date = fields.Date(allow_none=True)
    purchase_cost = fields.Decimal(places=2, validate=validate.Range(min=0), allow_none=True)
    current_value = fields.Decimal(places=2, validate=validate.Range(min=0), allow_none=True)
    
    # Status and condition
    condition = fields.String(validate=validate.OneOf(['excellent', 'good', 'fair', 'poor', 'damaged']), load_default='good')
    is_active = fields.Boolean(load_default=True)
    
    # Warranty and maintenance
    warranty_expiry = fields.Date(allow_none=True)
    last_service_date = fields.Date(allow_none=True)
    next_service_date = fields.Date(allow_none=True)
    
    # Supplier info
    supplier_name = fields.String(validate=validate.Length(max=255), allow_none=True)
    supplier_contact = fields.String(validate=validate.Length(max=100), allow_none=True)
    
    created_by = fields.Integer(required=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Nested fields for related data
    facility = fields.Nested('FacilitySchema', only=('id', 'name', 'facility_type', 'location'), dump_only=True)
    creator = fields.Nested('UserSchema', only=('id', 'full_name', 'email'), dump_only=True)
    is_warranty_expired = fields.Method('get_is_warranty_expired', dump_only=True)
    needs_service = fields.Method('get_needs_service', dump_only=True)
    
    def get_is_warranty_expired(self, obj):
        return obj.is_warranty_expired if hasattr(obj, 'is_warranty_expired') else False
    
    def get_needs_service(self, obj):
        return obj.needs_service if hasattr(obj, 'needs_service') else False
    
    @validates('current_value')
    def validate_current_value(self, value, **kwargs):
        if hasattr(self, 'purchase_cost') and self.purchase_cost and value > self.purchase_cost:
            raise ValidationError('Current value cannot exceed purchase cost')

class InfrastructureSummarySchema(Schema):
    """Schema for infrastructure summary data"""
    total_facilities = fields.Integer()
    active_facilities = fields.Integer()
    facilities_under_maintenance = fields.Integer()
    total_maintenance_requests = fields.Integer()
    pending_maintenance_requests = fields.Integer()
    overdue_maintenance_requests = fields.Integer()
    total_assets = fields.Integer()
    assets_needing_service = fields.Integer()
    assets_with_expired_warranty = fields.Integer()
    total_asset_value = fields.Decimal(places=2)

class FinancialSummarySchema(Schema):
    """Schema for financial summary data"""
    total_income = fields.Decimal(places=2)
    total_expenses = fields.Decimal(places=2)
    net_balance = fields.Decimal(places=2)
    pending_transactions = fields.Integer()
    total_fee_collections = fields.Decimal(places=2)
    outstanding_fees = fields.Decimal(places=2)
    budget_utilization = fields.Decimal(places=2)

class FacilitySchema(Schema):
    """Schema for facility data"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    facility_type = fields.String(required=True, validate=validate.OneOf([
        'classroom', 'laboratory', 'library', 'office', 'auditorium', 
        'gymnasium', 'cafeteria', 'dormitory', 'playground', 'parking', 'other'
    ]))
    location = fields.String(validate=validate.Length(max=200), allow_none=True)
    capacity = fields.Integer(validate=validate.Range(min=0), allow_none=True)
    description = fields.String(validate=validate.Length(max=500), allow_none=True)
    is_active = fields.Method('get_is_active', deserialize='load_is_active', load_default=True)
    maintenance_schedule = fields.String(validate=validate.OneOf([
        'daily', 'weekly', 'monthly', 'quarterly', 'annually', 'as_needed'
    ]), load_default='monthly')
    last_maintenance_date = fields.Date(allow_none=True)
    next_maintenance_date = fields.Date(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Nested relationships
    maintenance_requests = fields.Nested('MaintenanceRequestSchema', many=True, dump_only=True, exclude=['facility'])
    assets = fields.Nested('AssetSchema', many=True, dump_only=True, exclude=['facility'])

    def get_is_active(self, obj):
        status = getattr(obj, 'status', None)
        if hasattr(status, 'value'):
            status = status.value
        return str(status or '').lower() == 'active'

    def load_is_active(self, value):
        return bool(value)

class SystemSettingSchema(Schema):
    """Schema for serializing and deserializing SystemSetting objects"""
    id = fields.Integer(dump_only=True)
    key = fields.String(required=True, validate=validate.Length(min=1, max=100))
    value = fields.String(required=True, validate=validate.Length(min=1, max=255))
    description = fields.String(validate=validate.Length(max=500), allow_none=True)
    setting_type = fields.String(validate=validate.OneOf(['string', 'int', 'float', 'boolean', 'json']), load_default='string')
    updated_at = fields.DateTime(dump_only=True)
