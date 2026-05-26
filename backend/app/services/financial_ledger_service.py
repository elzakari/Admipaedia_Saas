import uuid
from decimal import Decimal
from sqlalchemy import func
from app.extensions import db
from app.models.finance import StudentFee, Payment as StudentPayment
from app.models.student import Student
from app.models.tenant import Branch
from app.models.billing import BillingInvoice, SchoolPlanSubscription

class FinancialLedgerService:
    @staticmethod
    def get_branch_ledger_metrics(tenant_id: uuid.UUID, branch_id: uuid.UUID) -> dict:
        """
        Calculates student fee billing and collection metrics for a single branch.
        Performs all calculations with exact Decimal math.
        """
        # Ensure UUIDs are resolved
        t_id = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id
        b_id = uuid.UUID(str(branch_id)) if isinstance(branch_id, str) else branch_id

        # 1. Total Student Fees Billed (final_amount) and outstanding balances
        # Join with Student to ensure we filter by the tenant_id context as a safety boundary
        fee_stats = db.session.query(
            func.sum(StudentFee.final_amount),
            func.sum(StudentFee.paid_amount),
            func.sum(StudentFee.balance)
        ).join(Student, Student.id == StudentFee.student_id)\
         .filter(Student.tenant_id == t_id, StudentFee.branch_id == b_id).first()

        total_billed = Decimal(str(fee_stats[0] or '0.00'))
        total_paid_fees = Decimal(str(fee_stats[1] or '0.00'))
        total_outstanding = Decimal(str(fee_stats[2] or '0.00'))

        # 2. Total Student Payments Collected (amount) where status == 'completed'
        payments_query = db.session.query(func.sum(StudentPayment.amount))\
            .join(Student, Student.id == StudentPayment.student_id)\
            .filter(
                Student.tenant_id == t_id,
                Student.branch_id == b_id,
                StudentPayment.status == 'completed'
            ).scalar()
        
        total_collected = Decimal(str(payments_query or '0.00'))

        # 3. Calculate collection rate
        if total_billed > 0:
            collection_rate = (total_collected / total_billed) * Decimal('100.00')
        else:
            collection_rate = Decimal('0.00')

        # 4. Group collections by payment_method where status == 'completed'
        method_stats = db.session.query(
            StudentPayment.payment_method,
            func.sum(StudentPayment.amount)
        ).join(Student, Student.id == StudentPayment.student_id)\
         .filter(
             Student.tenant_id == t_id,
             Student.branch_id == b_id,
             StudentPayment.status == 'completed'
         ).group_by(StudentPayment.payment_method).all()

        collections_by_method = {
            row[0]: Decimal(str(row[1] or '0.00'))
            for row in method_stats if row[0] is not None
        }

        # 5. Group student fees by status
        status_stats = db.session.query(
            StudentFee.status,
            func.count(StudentFee.id)
        ).join(Student, Student.id == StudentFee.student_id)\
         .filter(Student.tenant_id == t_id, StudentFee.branch_id == b_id)\
         .group_by(StudentFee.status).all()

        fees_by_status = {
            row[0]: row[1] or 0
            for row in status_stats if row[0] is not None
        }

        # Standardise payment methods and status categories for smooth rendering
        for method in ['cash', 'mobile_money', 'card', 'bank_transfer']:
            if method not in collections_by_method:
                collections_by_method[method] = Decimal('0.00')

        for status in ['pending', 'partial', 'paid', 'overdue']:
            if status not in fees_by_status:
                fees_by_status[status] = 0

        return {
            "branch_id": str(b_id),
            "total_billed": total_billed,
            "total_collected": total_collected,
            "total_outstanding": total_outstanding,
            "collection_rate": collection_rate,
            "collections_by_method": collections_by_method,
            "fees_by_status": fees_by_status
        }

    @staticmethod
    def get_proprietor_global_metrics(tenant_id: uuid.UUID) -> dict:
        """
        Calculates cross-campus metrics and SaaS subscription stats for school proprietors.
        """
        t_id = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id

        # 1. Total Student Fees Billed globally
        fee_stats = db.session.query(
            func.sum(StudentFee.final_amount),
            func.sum(StudentFee.paid_amount),
            func.sum(StudentFee.balance)
        ).join(Student, Student.id == StudentFee.student_id)\
         .filter(Student.tenant_id == t_id).first()

        total_billed = Decimal(str(fee_stats[0] or '0.00'))
        total_outstanding = Decimal(str(fee_stats[2] or '0.00'))

        # 2. Total Student Payments Collected globally
        payments_query = db.session.query(func.sum(StudentPayment.amount))\
            .join(Student, Student.id == StudentPayment.student_id)\
            .filter(
                Student.tenant_id == t_id,
                StudentPayment.status == 'completed'
            ).scalar()
        
        total_collected = Decimal(str(payments_query or '0.00'))

        if total_billed > 0:
            collection_rate = (total_collected / total_billed) * Decimal('100.00')
        else:
            collection_rate = Decimal('0.00')

        # 3. Global collections by method
        method_stats = db.session.query(
            StudentPayment.payment_method,
            func.sum(StudentPayment.amount)
        ).join(Student, Student.id == StudentPayment.student_id)\
         .filter(
             Student.tenant_id == t_id,
             StudentPayment.status == 'completed'
         ).group_by(StudentPayment.payment_method).all()

        collections_by_method = {
            row[0]: Decimal(str(row[1] or '0.00'))
            for row in method_stats if row[0] is not None
        }

        # 4. Global fees status
        status_stats = db.session.query(
            StudentFee.status,
            func.count(StudentFee.id)
        ).join(Student, Student.id == StudentFee.student_id)\
         .filter(Student.tenant_id == t_id)\
         .group_by(StudentFee.status).all()

        fees_by_status = {
            row[0]: row[1] or 0
            for row in status_stats if row[0] is not None
        }

        for method in ['cash', 'mobile_money', 'card', 'bank_transfer']:
            if method not in collections_by_method:
                collections_by_method[method] = Decimal('0.00')

        for status in ['pending', 'partial', 'paid', 'overdue']:
            if status not in fees_by_status:
                fees_by_status[status] = 0

        # 5. Branch-by-Branch Comparison Grid
        branches = Branch.query.filter_by(tenant_id=t_id, is_active=True).all()
        branch_comparison = []
        for b in branches:
            b_metrics = FinancialLedgerService.get_branch_ledger_metrics(t_id, b.id)
            branch_comparison.append({
                "branch_id": str(b.id),
                "branch_name": b.name,
                "total_billed": b_metrics["total_billed"],
                "total_collected": b_metrics["total_collected"],
                "total_outstanding": b_metrics["total_outstanding"],
                "collection_rate": b_metrics["collection_rate"]
            })

        # 6. SaaS Subscription details
        saas_stats = db.session.query(
            func.count(BillingInvoice.id),
            func.sum(BillingInvoice.amount_paid),
            func.sum(BillingInvoice.balance_due)
        ).filter(BillingInvoice.tenant_id == t_id).first()

        saas_invoice_count = saas_stats[0] or 0
        saas_paid = Decimal(str(saas_stats[1] or '0.00'))
        saas_balance = Decimal(str(saas_stats[2] or '0.00'))

        next_due_invoice = BillingInvoice.query.filter(
            BillingInvoice.tenant_id == t_id,
            BillingInvoice.status == 'pending'
        ).order_by(BillingInvoice.due_date.asc()).first()
        saas_next_due_date = next_due_invoice.due_date.isoformat() if next_due_invoice and next_due_invoice.due_date else None

        active_sub = SchoolPlanSubscription.query.filter_by(school_id=t_id, status='active').first()
        active_plan_name = active_sub.plan.name if active_sub and active_sub.plan else "Standard Plan"

        return {
            "global_billed": total_billed,
            "global_collected": total_collected,
            "global_outstanding": total_outstanding,
            "global_collection_rate": collection_rate,
            "collections_by_method": collections_by_method,
            "fees_by_status": fees_by_status,
            "branch_comparison": branch_comparison,
            "saas_subscription": {
                "active_plan_name": active_plan_name,
                "invoice_count": saas_invoice_count,
                "total_paid": saas_paid,
                "balance_due": saas_balance,
                "next_due_date": saas_next_due_date
            }
        }
