from datetime import date

from app.extensions import db
from app.models.academic_term import AcademicTerm


class AcademicTermService:
    @staticmethod
    def list_terms(tenant_id):
        return AcademicTerm.query.filter_by(tenant_id=tenant_id).order_by(AcademicTerm.start_date.asc()).all()

    @staticmethod
    def create_term(tenant_id, name, start_date, end_date):
        term = AcademicTerm(tenant_id=tenant_id, name=name, start_date=start_date, end_date=end_date)
        db.session.add(term)
        db.session.commit()
        return term

    @staticmethod
    def update_term(term_id, tenant_id, **updates):
        term = AcademicTerm.query.filter_by(id=term_id, tenant_id=tenant_id).first()
        if not term:
            return None
        for k, v in updates.items():
            if hasattr(term, k):
                setattr(term, k, v)
        db.session.commit()
        return term

    @staticmethod
    def delete_term(term_id, tenant_id):
        term = AcademicTerm.query.filter_by(id=term_id, tenant_id=tenant_id).first()
        if not term:
            return False
        db.session.delete(term)
        db.session.commit()
        return True

    @staticmethod
    def compute_status(term: AcademicTerm):
        today = date.today()
        if term.end_date < today:
            return 'Completed'
        if term.start_date <= today <= term.end_date:
            return 'Current'
        return 'Upcoming'

