from app.extensions import db
from app.models.library import (
    Book, LibraryMember, BorrowRecord, BookReservation, FineRecord, 
    BookStatus, BorrowStatus, MemberType
)
from app.models.user import User
from datetime import date, timedelta, datetime
from sqlalchemy import func, and_, or_
import structlog
from sqlalchemy.exc import IntegrityError

logger = structlog.get_logger()

class LibraryService:
    @staticmethod
    def create_book(data, created_by_id=None):
        """Create a new book record."""
        book = Book(
            title=data.get('title'),
            author=data.get('author'),
            isbn=data.get('isbn'),
            publisher=data.get('publisher'),
            publication_year=data.get('publication_year'),
            edition=data.get('edition'),
            category=data.get('category'),
            description=data.get('description'),
            language=data.get('language', 'English'),
            pages=data.get('pages'),
            shelf_location=data.get('shelf_location'),
            total_copies=data.get('total_copies', 1),
            available_copies=data.get('total_copies', 1),
            created_by=created_by_id
        )
        db.session.add(book)
        db.session.commit()
        return book

    @staticmethod
    def update_book(book_id, data):
        """Update book details."""
        book = Book.query.get(book_id)
        if not book:
            return None
            
        for key, value in data.items():
            if hasattr(book, key):
                setattr(book, key, value)
        
        # Recalculate availability if total copies changed
        if 'total_copies' in data:
            active_borrows = book.borrow_records.filter_by(status=BorrowStatus.ACTIVE).count()
            book.available_copies = max(0, book.total_copies - active_borrows)
            
        db.session.commit()
        return book

    @staticmethod
    def get_books(page=1, per_page=20, category=None, status=None, search=None, available_only=False):
        """Get paginated list of books with filters."""
        query = Book.query
        
        if category:
            query = query.filter(Book.category == category)
        
        if status:
            query = query.filter(Book.status == status)
            
        if available_only:
            query = query.filter(Book.available_copies > 0)
            
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Book.title.ilike(search_term)) | 
                (Book.author.ilike(search_term)) | 
                (Book.isbn.ilike(search_term))
            )
            
        return query.paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def delete_book(book_id):
        book = Book.query.get(book_id)
        if not book:
            return False, 'Book not found'
        active = BorrowRecord.query.filter_by(book_id=book.id, status=BorrowStatus.ACTIVE).count()
        if active > 0:
            return False, 'Cannot delete a book with active borrow records'
        db.session.delete(book)
        db.session.commit()
        return True, None

    @staticmethod
    def get_borrow_records(page=1, per_page=20, status=None, search=None, member_type=None):
        query = BorrowRecord.query.join(Book).join(LibraryMember).join(User)

        if status:
            query = query.filter(BorrowRecord.status == status)
        if member_type:
            query = query.filter(LibraryMember.member_type == member_type)
        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    Book.title.ilike(s),
                    Book.author.ilike(s),
                    Book.isbn.ilike(s),
                    LibraryMember.member_id.ilike(s),
                    User.first_name.ilike(s),
                    User.last_name.ilike(s),
                    User.email.ilike(s)
                )
            )

        return query.order_by(BorrowRecord.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def get_members(page=1, per_page=20, search=None, member_type=None, is_active=None):
        query = LibraryMember.query.join(User)

        if member_type:
            query = query.filter(LibraryMember.member_type == member_type)
        if is_active is not None:
            query = query.filter(LibraryMember.is_active == is_active)
        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    LibraryMember.member_id.ilike(s),
                    User.first_name.ilike(s),
                    User.last_name.ilike(s),
                    User.email.ilike(s)
                )
            )

        return query.order_by(LibraryMember.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def create_library_member(user_id, member_type, max_books=3, max_days=14):
        """Register a user as a library member."""
        # Check if already a member
        existing = LibraryMember.query.filter_by(user_id=user_id).first()
        if existing:
            return existing
            
        # Generate member ID (e.g., LIB-2024-001)
        year = date.today().year
        count = LibraryMember.query.count() + 1
        member_id = f"LIB-{year}-{count:04d}"
        
        member = LibraryMember(
            member_id=member_id,
            user_id=user_id,
            member_type=member_type,
            max_books=max_books,
            max_days=max_days,
            expiry_date=date.today().replace(year=year + 1) # 1 year validity
        )
        db.session.add(member)
        db.session.commit()
        return member

    @staticmethod
    def borrow_book(book_id, member_id, issued_by_id):
        """Issue a book to a member."""
        book = Book.query.get(book_id)
        member = LibraryMember.query.get(member_id)
        
        if not book or not member:
            return False, "Book or Member not found", None
            
        # Check eligibility
        can_borrow, reason = member.can_borrow
        if not can_borrow:
            return False, reason, None
            
        if not book.is_available:
            return False, "Book is not available", None
            
        # Create record
        due_date = date.today() + timedelta(days=member.max_days)
        
        record = BorrowRecord(
            book_id=book.id,
            member_id=member.id,
            borrow_date=date.today(),
            due_date=due_date,
            issued_by=issued_by_id,
            status=BorrowStatus.ACTIVE
        )
        
        # Update book availability
        book.available_copies -= 1
        if book.available_copies == 0:
            book.status = BookStatus.BORROWED
            
        db.session.add(record)
        db.session.commit()
        
        return True, "Book issued successfully", record

    @staticmethod
    def return_book(borrow_record_id, returned_by_id, notes=None):
        """Return a borrowed book."""
        record = BorrowRecord.query.get(borrow_record_id)
        if not record or record.status != BorrowStatus.ACTIVE:
            return False, "Invalid borrow record"
            
        record.return_date = date.today()
        record.returned_to = returned_by_id
        record.notes = notes
        
        # Check for fines
        fine_amount = record.calculate_fine()
        if fine_amount > 0:
            record.status = BorrowStatus.OVERDUE
            
            # Create fine record
            fine = FineRecord(
                member_id=record.member_id,
                borrow_record_id=record.id,
                fine_type='overdue',
                amount=fine_amount,
                description=f"Overdue fine for {record.book.title} ({record.days_overdue} days)",
                issued_by=returned_by_id
            )
            db.session.add(fine)
            
            # Update member total fines
            record.member.total_fines = float(record.member.total_fines) + float(fine_amount)
        else:
            record.status = BorrowStatus.RETURNED
            
        # Update book availability
        record.book.available_copies += 1
        if record.book.status == BookStatus.BORROWED:
            record.book.status = BookStatus.AVAILABLE
            
        # Check for reservations
        reservation = BookReservation.query.filter_by(
            book_id=record.book_id, status='active'
        ).order_by(BookReservation.reservation_date).first()
        
        if reservation:
            reservation.status = 'fulfilled'
            reservation.notified = True # Placeholder for actual notification logic
            reservation.notification_date = date.today()
            # In real app, trigger email/SMS here
            
        db.session.commit()
        return True, f"Book returned successfully. Fine: {fine_amount}"

    @staticmethod
    def get_library_stats():
        """Get summary stats for library."""
        total_titles = Book.query.count()
        available_titles = Book.query.filter(Book.available_copies > 0).count()

        total_copies = db.session.query(func.coalesce(func.sum(Book.total_copies), 0)).scalar() or 0
        available_copies = db.session.query(func.coalesce(func.sum(Book.available_copies), 0)).scalar() or 0

        total_members = LibraryMember.query.count()
        active_members = LibraryMember.query.filter_by(is_active=True).count()

        active_borrows = BorrowRecord.query.filter_by(status=BorrowStatus.ACTIVE).count()
        overdue_borrows = BorrowRecord.query.filter_by(status=BorrowStatus.OVERDUE).count()
        returned_borrows = BorrowRecord.query.filter_by(status=BorrowStatus.RETURNED).count()

        return {
            'total_titles': int(total_titles),
            'available_titles': int(available_titles),
            'total_copies': int(total_copies),
            'available_copies': int(available_copies),
            'total_members': int(total_members),
            'active_members': int(active_members),
            'active_borrows': int(active_borrows),
            'overdue_borrows': int(overdue_borrows),
            'returned_borrows': int(returned_borrows)
        }

    @staticmethod
    def get_borrowing_activity(time_range='month'):
        """Get borrowing trends for charts."""
        today = date.today()
        if time_range == 'week':
            start_date = today - timedelta(days=7)
            interval = 'day'
        elif time_range == 'month':
            start_date = today - timedelta(days=30)
            interval = 'day'
        elif time_range == 'year':
            start_date = today - timedelta(days=365)
            interval = 'month'
        else:
            start_date = today - timedelta(days=30)
            interval = 'day'
            
        records = db.session.query(
            func.date(BorrowRecord.borrow_date).label('date'),
            func.count(BorrowRecord.id).label('count')
        ).filter(
            BorrowRecord.borrow_date >= start_date
        ).group_by(
            func.date(BorrowRecord.borrow_date)
        ).order_by(
            func.date(BorrowRecord.borrow_date)
        ).all()
        
        return [{'date': r.date.isoformat(), 'count': r.count} for r in records]

    @staticmethod
    def get_category_distribution():
        """Get book counts by category."""
        results = db.session.query(
            Book.category,
            func.count(Book.id)
        ).group_by(Book.category).all()
        
        return [{'category': r[0].value, 'count': r[1]} for r in results]

    @staticmethod
    def get_borrower_type_distribution():
        """Get borrower counts by member type."""
        results = db.session.query(
            LibraryMember.member_type,
            func.count(BorrowRecord.id)
        ).join(BorrowRecord, LibraryMember.id == BorrowRecord.member_id).group_by(
            LibraryMember.member_type
        ).all()
        
        return [{'type': r[0].value, 'count': r[1]} for r in results]

    @staticmethod
    def get_popular_books(limit=10):
        """Get most borrowed books."""
        results = db.session.query(
            Book.title,
            Book.author,
            func.count(BorrowRecord.id).label('borrow_count')
        ).join(BorrowRecord, Book.id == BorrowRecord.book_id).group_by(
            Book.id
        ).order_by(
            func.count(BorrowRecord.id).desc()
        ).limit(limit).all()
        
        return [{'title': r.title, 'author': r.author, 'count': r.borrow_count} for r in results]

    @staticmethod
    def get_overdue_trends():
        """Get overdue count trends."""
        # Simple implementation: overdue by member type
        results = db.session.query(
            LibraryMember.member_type,
            func.count(BorrowRecord.id)
        ).join(BorrowRecord, LibraryMember.id == BorrowRecord.member_id).filter(
            BorrowRecord.status == BorrowStatus.OVERDUE
        ).group_by(
            LibraryMember.member_type
        ).all()
        
        return [{'type': r[0].value, 'count': r[1]} for r in results]
