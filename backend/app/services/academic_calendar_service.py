from app.models.academic_calendar import AcademicYear, Term
from app.extensions import db
from datetime import datetime

class AcademicCalendarService:
    @staticmethod
    def get_all_years(page=1, per_page=20):
        return AcademicYear.query.order_by(AcademicYear.start_date.desc()).paginate(page=page, per_page=per_page)

    @staticmethod
    def get_current_year():
        return AcademicYear.query.filter_by(is_current=True).first()

    @staticmethod
    def get_year_by_id(year_id):
        return AcademicYear.query.get(year_id)

    @staticmethod
    def create_year(data):
        year = AcademicYear(**data)
        db.session.add(year)
        db.session.commit()
        return year

    @staticmethod
    def update_year(year_id, data):
        year = AcademicYear.query.get(year_id)
        if not year:
            return None, "Academic year not found"
        
        for key, value in data.items():
            setattr(year, key, value)
        
        db.session.commit()
        return year, None

    @staticmethod
    def delete_year(year_id):
        year = AcademicYear.query.get(year_id)
        if not year:
            return False, "Academic year not found"
        
        db.session.delete(year)
        db.session.commit()
        return True, None

    # Terms
    @staticmethod
    def get_terms_by_year(year_id=None):
        query = Term.query
        if year_id:
            query = query.filter_by(academic_year_id=year_id)
        return query.order_by(Term.start_date.asc()).all()

    @staticmethod
    def get_current_term():
        return Term.query.filter_by(is_current=True).first()

    @staticmethod
    def create_term(data):
        term = Term(**data)
        db.session.add(term)
        db.session.commit()
        return term

    @staticmethod
    def update_term(term_id, data):
        term = Term.query.get(term_id)
        if not term:
            return None, "Term not found"
        
        for key, value in data.items():
            setattr(term, key, value)
        
        db.session.commit()
        return term, None

    @staticmethod
    def delete_term(term_id):
        term = Term.query.get(term_id)
        if not term:
            return False, "Term not found"
        
        db.session.delete(term)
        db.session.commit()
        return True, None
