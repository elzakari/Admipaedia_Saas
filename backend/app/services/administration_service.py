from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from flask_sqlalchemy.pagination import Pagination
from typing import Dict, Tuple, Optional, Union, Any, List
from datetime import datetime, date
from decimal import Decimal
from app.models.administration import Budget, Transaction, Facility, MaintenanceRequest, Asset
from app.models.finance import FeeStructure, StudentFee, Payment # Import from finance if needed for read-only or compatibility

from app.models.student import Student
from app.models.class_ import Class
from app.extensions import db
from structlog import get_logger

logger = get_logger()

class AdministrationService:
    """Service class for financial and administrative operations."""
    
    def __init__(self, db_session: Session):
        """Initialize the AdministrationService with a database session.
        
        Args:
            db_session: SQLAlchemy database session
        """
        self.db_session = db_session

    # Budget Management Methods
    def get_all_budgets(self, page: int = 1, per_page: int = 20, 
                       academic_year: Optional[str] = None) -> Pagination:
        """Get all budgets with optional filtering and pagination.
        
        Args:
            page: Page number (1-indexed)
            per_page: Number of items per page
            academic_year: Optional academic year to filter budgets
            
        Returns:
            Paginated list of budgets
        """
        query = Budget.query
        
        if academic_year:
            # Map incoming 'academic_year' filter to model's 'fiscal_year'
            query = query.filter(Budget.fiscal_year == academic_year)
            
        return query.order_by(Budget.created_at.desc()).paginate(page=page, per_page=per_page)
    
    def get_budget_by_id(self, budget_id: int) -> Optional[Budget]:
        """Get a budget by ID.
        
        Args:
            budget_id: The ID of the budget to retrieve
            
        Returns:
            Budget object if found, None otherwise
        """
        return Budget.query.get(budget_id)
    
    def create_budget(self, budget_data: Dict[str, Any]) -> Tuple[Optional[Budget], Optional[str]]:
        """Create a new budget.
        
        Args:
            budget_data: Dictionary containing budget data
            
        Returns:
            Tuple containing:
                - Budget object if created successfully, None otherwise
                - Error message if there was an error, None otherwise
        """
        try:
            # Validate required fields
            required_fields = ['category', 'allocated_amount', 'academic_year']
            for field in required_fields:
                if field not in budget_data or not budget_data[field]:
                    return None, f"{field.replace('_', ' ').title()} is required"
            
            # Check for duplicate budget in same category and academic year
            existing_budget = Budget.query.filter_by(
                category=budget_data['category'],
                academic_year=budget_data['academic_year']
            ).first()
            
            if existing_budget:
                logger.warning("Attempted to create duplicate budget", 
                              category=budget_data['category'],
                              academic_year=budget_data['academic_year'])
                return None, f"Budget for {budget_data['category']} in {budget_data['academic_year']} already exists"
            
            # Create the budget
            new_budget = Budget(**budget_data)
            self.db_session.add(new_budget)
            self.db_session.commit()
            
            logger.info("Budget created successfully", 
                       budget_id=new_budget.id, 
                       category=new_budget.category,
                       amount=str(new_budget.allocated_amount))
            return new_budget, None
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Database error creating budget", error=error_msg)
            return None, f"Database error: {error_msg}"
            
        except Exception as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Unexpected error creating budget", error=error_msg)
            return None, f"Unexpected error: {error_msg}"
    
    def update_budget(self, budget_id: int, budget_data: Dict[str, Any]) -> Tuple[Optional[Budget], Optional[str]]:
        """Update a budget.
        
        Args:
            budget_id: ID of the budget to update
            budget_data: Dictionary containing updated budget data
            
        Returns:
            Tuple containing:
                - Budget object if updated successfully, None otherwise
                - Error message if there was an error, None otherwise
        """
        try:
            budget = Budget.query.get(budget_id)
            if not budget:
                return None, "Budget not found"
            
            # Update fields
            for key, value in budget_data.items():
                if hasattr(budget, key) and key != 'id':
                    setattr(budget, key, value)
            
            budget.updated_at = datetime.utcnow()
            self.db_session.commit()
            
            logger.info("Budget updated successfully", budget_id=budget_id)
            return budget, None
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Database error updating budget", error=error_msg, budget_id=budget_id)
            return None, f"Database error: {error_msg}"
            
        except Exception as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Unexpected error updating budget", error=error_msg, budget_id=budget_id)
            return None, f"Unexpected error: {error_msg}"
    
    def delete_budget(self, budget_id: int) -> Tuple[bool, Optional[str]]:
        """Delete a budget.
        
        Args:
            budget_id: ID of the budget to delete
            
        Returns:
            Tuple containing:
                - True if deleted successfully, False otherwise
                - Error message if there was an error, None otherwise
        """
        try:
            budget = Budget.query.get(budget_id)
            if not budget:
                return False, "Budget not found"
            
            self.db_session.delete(budget)
            self.db_session.commit()
            
            logger.info("Budget deleted successfully", budget_id=budget_id)
            return True, None
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Database error deleting budget", error=error_msg, budget_id=budget_id)
            return False, f"Database error: {error_msg}"
            
        except Exception as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Unexpected error deleting budget", error=error_msg, budget_id=budget_id)
            return False, f"Unexpected error: {error_msg}"

    # Transaction Management Methods
    def get_all_transactions(self, page: int = 1, per_page: int = 20,
                           transaction_type: Optional[str] = None,
                           start_date: Optional[date] = None,
                           end_date: Optional[date] = None) -> Pagination:
        """Get all transactions with optional filtering and pagination.
        
        Args:
            page: Page number (1-indexed)
            per_page: Number of items per page
            transaction_type: Optional transaction type filter
            start_date: Optional start date filter
            end_date: Optional end date filter
            
        Returns:
            Paginated list of transactions
        """
        query = Transaction.query
        
        if transaction_type:
            query = query.filter(Transaction.transaction_type == transaction_type)
        
        if start_date:
            query = query.filter(Transaction.transaction_date >= start_date)
            
        if end_date:
            query = query.filter(Transaction.transaction_date <= end_date)
            
        return query.order_by(Transaction.transaction_date.desc()).paginate(page=page, per_page=per_page)
    
    def get_transaction_by_id(self, transaction_id: int) -> Optional[Transaction]:
        """Get a transaction by ID.
        
        Args:
            transaction_id: The ID of the transaction to retrieve
            
        Returns:
            Transaction object if found, None otherwise
        """
        return Transaction.query.get(transaction_id)
    
    def create_transaction(self, transaction_data: Dict[str, Any]) -> Tuple[Optional[Transaction], Optional[str]]:
        """Create a new transaction.
        
        Args:
            transaction_data: Dictionary containing transaction data
            
        Returns:
            Tuple containing:
                - Transaction object if created successfully, None otherwise
                - Error message if there was an error, None otherwise
        """
        try:
            # Validate required fields
            required_fields = ['transaction_type', 'amount', 'description']
            for field in required_fields:
                if field not in transaction_data or not transaction_data[field]:
                    return None, f"{field.replace('_', ' ').title()} is required"
            
            # Set transaction date if not provided
            if 'transaction_date' not in transaction_data:
                transaction_data['transaction_date'] = date.today()
            
            # Generate reference number if not provided
            if 'reference_number' not in transaction_data or not transaction_data['reference_number']:
                transaction_data['reference_number'] = Transaction.generate_reference_number()
            
            # Create the transaction
            new_transaction = Transaction(**transaction_data)
            self.db_session.add(new_transaction)
            self.db_session.commit()
            
            logger.info("Transaction created successfully", 
                       transaction_id=new_transaction.id, 
                       type=new_transaction.transaction_type,
                       amount=str(new_transaction.amount))
            return new_transaction, None
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Database error creating transaction", error=error_msg)
            return None, f"Database error: {error_msg}"
            
        except Exception as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Unexpected error creating transaction", error=error_msg)
            return None, f"Unexpected error: {error_msg}"

    # Fee Management Methods have been moved to FeeService in app/services/finance/service.py
    # The following methods are deprecated and removed to prevent model conflicts.

    # Financial Reports and Analytics
    def get_financial_summary(self, academic_year: Optional[str] = None) -> Dict[str, Any]:
        """Get financial summary including budget vs actual, fee collection stats.
        
        Args:
            academic_year: Optional academic year filter
            
        Returns:
            Dictionary containing financial summary data
        """
        try:
            # Budgets: filter by fiscal year and compute utilization
            budget_query = Budget.query
            if academic_year:
                budget_query = budget_query.filter(Budget.fiscal_year == academic_year)
            budgets = budget_query.all()

            total_allocated = sum((b.allocated_amount or Decimal('0')) for b in budgets)
            total_spent = sum((b.spent_amount or Decimal('0')) for b in budgets)
            budget_utilization = (total_spent / total_allocated * Decimal('100')) if total_allocated else Decimal('0')

            # Fee collections: join FeeStructure to filter by academic_year
            # Updated to use new Finance models
            from app.models.finance import StudentFee, FeeStructure
            fee_records_query = StudentFee.query
            if academic_year:
                fee_records_query = fee_records_query.join(FeeStructure).filter(FeeStructure.academic_year == academic_year)
            fee_records = fee_records_query.all()

            total_fee_collections = sum((getattr(fr, 'paid_amount', None) or Decimal('0')) for fr in fee_records)
            outstanding_fees = sum((getattr(fr, 'balance', None) or Decimal('0')) for fr in fee_records)

            # Transactions: filter by calendar year and split income/expenses
            transaction_query = Transaction.query
            if academic_year:
                year_start = datetime.strptime(f"{academic_year}-01-01", "%Y-%m-%d").date()
                year_end = datetime.strptime(f"{academic_year}-12-31", "%Y-%m-%d").date()
                transaction_query = transaction_query.filter(
                    Transaction.transaction_date.between(year_start, year_end)
                )
            transactions = transaction_query.all()

            # Handle enum vs string storage robustly
            def tx_type_val(tt):
                return getattr(tt, 'value', tt)

            total_income = sum(t.amount for t in transactions if tx_type_val(t.transaction_type) == 'income')
            total_expenses = sum(t.amount for t in transactions if tx_type_val(t.transaction_type) == 'expense')
            net_balance = (total_income or Decimal('0')) - (total_expenses or Decimal('0'))
            pending_transactions = sum(1 for t in transactions if getattr(t, 'approved_by', None) is None)

            return {
                'total_income': total_income,
                'total_expenses': total_expenses,
                'net_balance': net_balance,
                'pending_transactions': pending_transactions,
                'total_fee_collections': total_fee_collections,
                'outstanding_fees': outstanding_fees,
                'budget_utilization': budget_utilization,
            }
        except Exception as e:
            logger.error("Error generating financial summary", error=str(e))
            return {}
    
    def get_overdue_fees(self) -> List[StudentFee]:
        """Get all overdue fee records.
        
        Returns:
            List of overdue fee records
        """
        from app.models.finance import StudentFee, FeeStructure
        today = date.today()
        # Join with FeeStructure to check due_date
        return StudentFee.query.join(FeeStructure).filter(
            FeeStructure.due_date < today,
            StudentFee.balance > 0
        ).options(
            db.joinedload(StudentFee.student),
            db.joinedload(StudentFee.structure)
        ).all()

    def get_all_fee_records(
        self,
        page: int = 1,
        per_page: int = 20,
        academic_year: Optional[str] = None,
        class_id: Optional[int] = None
    ):
        from app.models.finance import StudentFee, FeeStructure

        query = StudentFee.query
        query = query.join(FeeStructure)

        if academic_year:
            query = query.filter(FeeStructure.academic_year == academic_year)

        if class_id:
            query = query.filter(FeeStructure.class_id == class_id)

        return query.order_by(StudentFee.id.desc()).paginate(page=page, per_page=per_page, error_out=False)

    # Infrastructure Management Methods
    
    # Facility Management
    def get_all_facilities(self, page: int = 1, per_page: int = 20, 
                          facility_type: Optional[str] = None, 
                          status: Optional[str] = None) -> Pagination:
        """Get all facilities with optional filtering and pagination.
        
        Args:
            page: Page number (1-indexed)
            per_page: Number of items per page
            facility_type: Optional facility type to filter
            status: Optional status to filter
            
        Returns:
            Paginated list of facilities
        """
        query = Facility.query
        
        if facility_type:
            query = query.filter(Facility.facility_type == facility_type)
        if status:
            query = query.filter(Facility.status == status)
            
        return query.order_by(Facility.created_at.desc()).paginate(page=page, per_page=per_page)
    
    def get_facility_by_id(self, facility_id: int) -> Optional[Facility]:
        """Get a facility by ID.
        
        Args:
            facility_id: The ID of the facility to retrieve
            
        Returns:
            Facility object or None if not found
        """
        return Facility.query.get(facility_id)
    
    def create_facility(self, facility_data: Dict[str, Any]) -> Tuple[bool, Union[Facility, str]]:
        """Create a new facility.
        
        Args:
            facility_data: Dictionary containing facility information
            
        Returns:
            Tuple of (success, facility_object_or_error_message)
        """
        try:
            facility = Facility(**facility_data)
            self.db_session.add(facility)
            self.db_session.commit()
            
            logger.info(f"Facility created successfully", facility_id=facility.id)
            return True, facility
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            logger.error(f"Error creating facility: {str(e)}")
            return False, f"Database error: {str(e)}"
        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Unexpected error creating facility: {str(e)}")
            return False, f"Unexpected error: {str(e)}"
    
    def update_facility(self, facility_id: int, update_data: Dict[str, Any]) -> Tuple[bool, Union[Facility, str]]:
        """Update an existing facility.
        
        Args:
            facility_id: ID of the facility to update
            update_data: Dictionary containing updated facility information
            
        Returns:
            Tuple of (success, facility_object_or_error_message)
        """
        try:
            facility = Facility.query.get(facility_id)
            if not facility:
                return False, "Facility not found"
            
            for key, value in update_data.items():
                if hasattr(facility, key):
                    setattr(facility, key, value)
            
            self.db_session.commit()
            logger.info(f"Facility updated successfully", facility_id=facility_id)
            return True, facility
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            logger.error(f"Error updating facility {facility_id}: {str(e)}")
            return False, f"Database error: {str(e)}"
        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Unexpected error updating facility {facility_id}: {str(e)}")
            return False, f"Unexpected error: {str(e)}"
    
    def delete_facility(self, facility_id: int) -> Tuple[bool, str]:
        """Delete a facility.
        
        Args:
            facility_id: ID of the facility to delete
            
        Returns:
            Tuple of (success, message)
        """
        try:
            facility = Facility.query.get(facility_id)
            if not facility:
                return False, "Facility not found"
            
            # Check if facility has associated maintenance requests or assets
            if facility.maintenance_requests.count() > 0 or facility.assets.count() > 0:
                return False, "Cannot delete facility with associated maintenance requests or assets"
            
            self.db_session.delete(facility)
            self.db_session.commit()
            
            logger.info(f"Facility deleted successfully", facility_id=facility_id)
            return True, "Facility deleted successfully"
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            logger.error(f"Error deleting facility {facility_id}: {str(e)}")
            return False, f"Database error: {str(e)}"
        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Unexpected error deleting facility {facility_id}: {str(e)}")
            return False, f"Unexpected error: {str(e)}"
    
    # Maintenance Request Management
    def get_all_maintenance_requests(self, page: int = 1, per_page: int = 20,
                                   facility_id: Optional[int] = None,
                                   status: Optional[str] = None,
                                   priority: Optional[str] = None) -> Pagination:
        """Get all maintenance requests with optional filtering and pagination.
        
        Args:
            page: Page number (1-indexed)
            per_page: Number of items per page
            facility_id: Optional facility ID to filter
            status: Optional status to filter
            priority: Optional priority to filter
            
        Returns:
            Paginated list of maintenance requests
        """
        query = MaintenanceRequest.query
        
        if facility_id:
            query = query.filter(MaintenanceRequest.facility_id == facility_id)
        if status:
            query = query.filter(MaintenanceRequest.status == status)
        if priority:
            query = query.filter(MaintenanceRequest.priority == priority)
            
        return query.order_by(MaintenanceRequest.created_at.desc()).paginate(page=page, per_page=per_page)
    
    def get_maintenance_request_by_id(self, request_id: int) -> Optional[MaintenanceRequest]:
        """Get a maintenance request by ID.
        
        Args:
            request_id: The ID of the maintenance request to retrieve
            
        Returns:
            MaintenanceRequest object or None if not found
        """
        return MaintenanceRequest.query.get(request_id)
    
    def create_maintenance_request(self, request_data: Dict[str, Any]) -> Tuple[bool, Union[MaintenanceRequest, str]]:
        """Create a new maintenance request.
        
        Args:
            request_data: Dictionary containing maintenance request information
            
        Returns:
            Tuple of (success, request_object_or_error_message)
        """
        try:
            maintenance_request = MaintenanceRequest(**request_data)
            self.db_session.add(maintenance_request)
            self.db_session.commit()
            
            logger.info(f"Maintenance request created successfully", request_id=maintenance_request.id)
            return True, maintenance_request
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            logger.error(f"Error creating maintenance request: {str(e)}")
            return False, f"Database error: {str(e)}"
        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Unexpected error creating maintenance request: {str(e)}")
            return False, f"Unexpected error: {str(e)}"
    
    def update_maintenance_request(self, request_id: int, update_data: Dict[str, Any]) -> Tuple[bool, Union[MaintenanceRequest, str]]:
        """Update an existing maintenance request.
        
        Args:
            request_id: ID of the maintenance request to update
            update_data: Dictionary containing updated request information
            
        Returns:
            Tuple of (success, request_object_or_error_message)
        """
        try:
            maintenance_request = MaintenanceRequest.query.get(request_id)
            if not maintenance_request:
                return False, "Maintenance request not found"
            
            for key, value in update_data.items():
                if hasattr(maintenance_request, key):
                    setattr(maintenance_request, key, value)
            
            self.db_session.commit()
            logger.info(f"Maintenance request updated successfully", request_id=request_id)
            return True, maintenance_request
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            logger.error(f"Error updating maintenance request {request_id}: {str(e)}")
            return False, f"Database error: {str(e)}"
        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Unexpected error updating maintenance request {request_id}: {str(e)}")
            return False, f"Unexpected error: {str(e)}"
    
    def get_overdue_maintenance_requests(self) -> List[MaintenanceRequest]:
        """Get all overdue maintenance requests.
        
        Returns:
            List of overdue maintenance requests
        """
        today = date.today()
        return MaintenanceRequest.query.filter(
            MaintenanceRequest.scheduled_date < today,
            MaintenanceRequest.status.in_(['pending', 'in_progress'])
        ).options(
            db.joinedload(MaintenanceRequest.facility),
            db.joinedload(MaintenanceRequest.reporter)
        ).all()
    
    # Asset Management
    def get_all_assets(self, page: int = 1, per_page: int = 20,
                      facility_id: Optional[int] = None,
                      category: Optional[str] = None,
                      condition: Optional[str] = None) -> Pagination:
        """Get all assets with optional filtering and pagination.
        
        Args:
            page: Page number (1-indexed)
            per_page: Number of items per page
            facility_id: Optional facility ID to filter
            category: Optional category to filter
            condition: Optional condition to filter
            
        Returns:
            Paginated list of assets
        """
        query = Asset.query
        
        if facility_id:
            query = query.filter(Asset.facility_id == facility_id)
        if category:
            query = query.filter(Asset.category == category)
        if condition:
            query = query.filter(Asset.condition == condition)
            
        return query.order_by(Asset.created_at.desc()).paginate(page=page, per_page=per_page)
    
    def get_asset_by_id(self, asset_id: int) -> Optional[Asset]:
        """Get an asset by ID.
        
        Args:
            asset_id: The ID of the asset to retrieve
            
        Returns:
            Asset object or None if not found
        """
        return Asset.query.get(asset_id)
    
    def create_asset(self, asset_data: Dict[str, Any]) -> Tuple[bool, Union[Asset, str]]:
        """Create a new asset.
        
        Args:
            asset_data: Dictionary containing asset information
            
        Returns:
            Tuple of (success, asset_object_or_error_message)
        """
        try:
            asset = Asset(**asset_data)
            self.db_session.add(asset)
            self.db_session.commit()
            
            logger.info(f"Asset created successfully", asset_id=asset.id)
            return True, asset
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            logger.error(f"Error creating asset: {str(e)}")
            return False, f"Database error: {str(e)}"
        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Unexpected error creating asset: {str(e)}")
            return False, f"Unexpected error: {str(e)}"
    
    def update_asset(self, asset_id: int, update_data: Dict[str, Any]) -> Tuple[bool, Union[Asset, str]]:
        """Update an existing asset.
        
        Args:
            asset_id: ID of the asset to update
            update_data: Dictionary containing updated asset information
            
        Returns:
            Tuple of (success, asset_object_or_error_message)
        """
        try:
            asset = Asset.query.get(asset_id)
            if not asset:
                return False, "Asset not found"
            
            for key, value in update_data.items():
                if hasattr(asset, key):
                    setattr(asset, key, value)
            
            self.db_session.commit()
            logger.info(f"Asset updated successfully", asset_id=asset_id)
            return True, asset
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            logger.error(f"Error updating asset {asset_id}: {str(e)}")
            return False, f"Database error: {str(e)}"
        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Unexpected error updating asset {asset_id}: {str(e)}")
            return False, f"Unexpected error: {str(e)}"
    
    def delete_asset(self, asset_id: int) -> Tuple[bool, str]:
        """Delete an asset.
        
        Args:
            asset_id: ID of the asset to delete
            
        Returns:
            Tuple of (success, message)
        """
        try:
            asset = Asset.query.get(asset_id)
            if not asset:
                return False, "Asset not found"
            
            self.db_session.delete(asset)
            self.db_session.commit()
            
            logger.info(f"Asset deleted successfully", asset_id=asset_id)
            return True, "Asset deleted successfully"
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            logger.error(f"Error deleting asset {asset_id}: {str(e)}")
            return False, f"Database error: {str(e)}"
        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Unexpected error deleting asset {asset_id}: {str(e)}")
            return False, f"Unexpected error: {str(e)}"
    
    def get_assets_needing_service(self) -> List[Asset]:
        """Get all assets that need service.
        
        Returns:
            List of assets needing service
        """
        today = date.today()
        return Asset.query.filter(
            Asset.next_service_date <= today,
            Asset.is_active == True
        ).options(
            db.joinedload(Asset.facility)
        ).all()
    
    def get_assets_with_expired_warranty(self) -> List[Asset]:
        """Get all assets with expired warranty.
        
        Returns:
            List of assets with expired warranty
        """
        today = date.today()
        return Asset.query.filter(
            Asset.warranty_expiry < today,
            Asset.is_active == True
        ).options(
            db.joinedload(Asset.facility)
        ).all()
    
    # Infrastructure Summary Methods
    def get_infrastructure_summary(self) -> Dict[str, Any]:
        """Get infrastructure summary statistics.
        
        Returns:
            Dictionary containing infrastructure summary data
        """
        try:
            total_facilities = Facility.query.count()
            active_facilities = Facility.query.filter(Facility.status == 'active').count()
            facilities_under_maintenance = Facility.query.filter(Facility.status == 'under_maintenance').count()
            
            total_maintenance_requests = MaintenanceRequest.query.count()
            pending_maintenance_requests = MaintenanceRequest.query.filter(MaintenanceRequest.status == 'pending').count()
            overdue_maintenance_requests = len(self.get_overdue_maintenance_requests())
            
            total_assets = Asset.query.count()
            assets_needing_service = len(self.get_assets_needing_service())
            assets_with_expired_warranty = len(self.get_assets_with_expired_warranty())
            
            # Calculate total asset value
            total_asset_value = db.session.query(db.func.sum(Asset.current_value)).filter(
                Asset.is_active == True
            ).scalar() or Decimal('0.00')
            
            return {
                'total_facilities': total_facilities,
                'active_facilities': active_facilities,
                'facilities_under_maintenance': facilities_under_maintenance,
                'total_maintenance_requests': total_maintenance_requests,
                'pending_maintenance_requests': pending_maintenance_requests,
                'overdue_maintenance_requests': overdue_maintenance_requests,
                'total_assets': total_assets,
                'assets_needing_service': assets_needing_service,
                'assets_with_expired_warranty': assets_with_expired_warranty,
                'total_asset_value': total_asset_value
            }
            
        except Exception as e:
            logger.error(f"Error generating infrastructure summary: {str(e)}")
            return {
                'total_facilities': 0,
                'active_facilities': 0,
                'facilities_under_maintenance': 0,
                'total_maintenance_requests': 0,
                'pending_maintenance_requests': 0,
                'overdue_maintenance_requests': 0,
                'total_assets': 0,
                'assets_needing_service': 0,
                'assets_with_expired_warranty': 0,
                'total_asset_value': Decimal('0.00')
            }
