from app.extensions import db
from datetime import datetime
from enum import Enum

class TransactionType(Enum):
    INCOME = "income"
    EXPENSE = "expense"

class PaymentStatus(Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class FeeType(Enum):
    TUITION = "tuition"
    REGISTRATION = "registration"
    LIBRARY = "library"
    LABORATORY = "laboratory"
    SPORTS = "sports"
    TRANSPORT = "transport"
    UNIFORM = "uniform"
    EXAMINATION = "examination"
    MISCELLANEOUS = "miscellaneous"

class BudgetCategory(Enum):
    SALARIES = "salaries"
    UTILITIES = "utilities"
    MAINTENANCE = "maintenance"
    SUPPLIES = "supplies"
    EQUIPMENT = "equipment"
    TRANSPORTATION = "transportation"
    OTHER = "other"

class Budget(db.Model):
    """Budget management model."""
    __tablename__ = 'budgets'
    
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.Enum(BudgetCategory), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    allocated_amount = db.Column(db.Numeric(10, 2), nullable=False)
    spent_amount = db.Column(db.Numeric(10, 2), default=0.00)
    remaining_amount = db.Column(db.Numeric(10, 2), nullable=False)
    fiscal_year = db.Column(db.String(10), nullable=False)  # e.g., "2024-2025"
    quarter = db.Column(db.String(10), nullable=True)  # Q1, Q2, Q3, Q4
    department = db.Column(db.String(100), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', backref='created_budgets')
    transactions = db.relationship('Transaction', backref='budget', cascade='all, delete-orphan')
    
    @property
    def utilization_percentage(self):
        """Calculate budget utilization percentage."""
        if self.allocated_amount == 0:
            return 0
        return float((self.spent_amount / self.allocated_amount) * 100)
    
    def __repr__(self):
        return f'<Budget {self.category.value} - {self.fiscal_year}>'

class Transaction(db.Model):
    """Financial transaction model."""
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    transaction_type = db.Column(db.Enum(TransactionType), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    transaction_date = db.Column(db.Date, nullable=False)
    reference_number = db.Column(db.String(50), unique=True, nullable=False)
    payment_method = db.Column(db.String(50), nullable=True)  # cash, bank_transfer, cheque
    vendor_supplier = db.Column(db.String(255), nullable=True)
    receipt_number = db.Column(db.String(100), nullable=True)
    budget_id = db.Column(db.Integer, db.ForeignKey('budgets.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_transactions')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='approved_transactions')
    
    # ... existing code ...

# Fee models have been moved to app.models.finance
# FeeStructure, FeeRecord, FeePayment are deprecated here.

class FacilityType(Enum):
    CLASSROOM = "classroom"
    LABORATORY = "laboratory"
    LIBRARY = "library"
    OFFICE = "office"
    AUDITORIUM = "auditorium"
    GYMNASIUM = "gymnasium"
    CAFETERIA = "cafeteria"
    PLAYGROUND = "playground"
    PARKING = "parking"
    STORAGE = "storage"
    OTHER = "other"

class FacilityStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNDER_MAINTENANCE = "under_maintenance"
    UNDER_CONSTRUCTION = "under_construction"

class MaintenanceStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class MaintenancePriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class AssetCondition(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    DAMAGED = "damaged"

class AssetStatus(Enum):
    IN_USE = "in_use"
    IN_STORAGE = "in_storage"
    UNDER_MAINTENANCE = "under_maintenance"
    RETIRED = "retired"
    DISPOSED = "disposed"

class Facility(db.Model):
    """School facility management model."""
    __tablename__ = 'facilities'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    facility_type = db.Column(db.Enum(FacilityType), nullable=False)
    location = db.Column(db.String(255), nullable=False)
    capacity = db.Column(db.Integer, nullable=True)
    area_sqm = db.Column(db.Numeric(10, 2), nullable=True)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.Enum(FacilityStatus), default=FacilityStatus.ACTIVE)
    
    # Facility details
    floor_number = db.Column(db.String(10), nullable=True)
    building_name = db.Column(db.String(100), nullable=True)
    room_number = db.Column(db.String(20), nullable=True)
    
    # Maintenance info
    last_maintenance_date = db.Column(db.Date, nullable=True)
    next_maintenance_date = db.Column(db.Date, nullable=True)
    
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', backref='created_facilities')
    maintenance_requests = db.relationship('MaintenanceRequest', backref='facility', cascade='all, delete-orphan')
    assets = db.relationship('Asset', backref='facility', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Facility {self.name} - {self.facility_type.value}>'

class MaintenanceRequest(db.Model):
    """Facility maintenance request model."""
    __tablename__ = 'maintenance_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.Enum(MaintenancePriority), default=MaintenancePriority.MEDIUM)
    status = db.Column(db.Enum(MaintenanceStatus), default=MaintenanceStatus.PENDING)
    
    # Dates and costs
    reported_date = db.Column(db.Date, nullable=False)
    scheduled_date = db.Column(db.Date, nullable=True)
    completed_date = db.Column(db.Date, nullable=True)
    estimated_cost = db.Column(db.Numeric(10, 2), nullable=True)
    actual_cost = db.Column(db.Numeric(10, 2), nullable=True)
    
    # Personnel
    reported_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    contractor_name = db.Column(db.String(255), nullable=True)
    contractor_contact = db.Column(db.String(50), nullable=True)
    
    # Additional info
    notes = db.Column(db.Text, nullable=True)
    completion_notes = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    reporter = db.relationship('User', foreign_keys=[reported_by], backref='reported_maintenance')
    assignee = db.relationship('User', foreign_keys=[assigned_to], backref='assigned_maintenance')
    
    @property
    def is_overdue(self):
        """Check if maintenance request is overdue."""
        from datetime import date
        return (self.scheduled_date and 
                self.scheduled_date < date.today() and 
                self.status != MaintenanceStatus.COMPLETED)
    
    def __repr__(self):
        return f'<MaintenanceRequest {self.title} - {self.status.value}>'

class Asset(db.Model):
    """School asset management model."""
    __tablename__ = 'assets'
    
    id = db.Column(db.Integer, primary_key=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    asset_tag = db.Column(db.String(50), unique=True, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Asset details
    brand = db.Column(db.String(100), nullable=True)
    model = db.Column(db.String(100), nullable=True)
    serial_number = db.Column(db.String(100), nullable=True)
    purchase_date = db.Column(db.Date, nullable=True)
    purchase_cost = db.Column(db.Numeric(10, 2), nullable=True)
    current_value = db.Column(db.Numeric(10, 2), nullable=True)
    
    # Status and condition
    condition = db.Column(db.Enum(AssetCondition), default=AssetCondition.GOOD)
    is_active = db.Column(db.Boolean, default=True)
    
    # Warranty and maintenance
    warranty_expiry = db.Column(db.Date, nullable=True)
    last_service_date = db.Column(db.Date, nullable=True)
    next_service_date = db.Column(db.Date, nullable=True)
    
    # Supplier info
    supplier_name = db.Column(db.String(255), nullable=True)
    supplier_contact = db.Column(db.String(100), nullable=True)
    
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', backref='created_assets')
    
    @property
    def is_warranty_expired(self):
        """Check if asset warranty has expired."""
        from datetime import date
        return self.warranty_expiry and self.warranty_expiry < date.today()
    
    @property
    def needs_service(self):
        """Check if asset needs service."""
        from datetime import date
        return self.next_service_date and self.next_service_date <= date.today()
    
    def __repr__(self):
        return f'<Asset {self.name} - {self.asset_tag}>'
