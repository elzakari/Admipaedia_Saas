from app.extensions import db
from app.models.library import (
    Book, LibraryMember, BorrowRecord, BookReservation, FineRecord, LibrarySettings,
    BookStatus, BorrowStatus, MemberType
)
from app.models.user import User
from datetime import date, timedelta, datetime
from sqlalchemy import func, and_, or_
import json
import structlog
from sqlalchemy.exc import IntegrityError

logger = structlog.get_logger()

class LibraryService:
    DIGITAL_RESOURCES_KEY = 'digital_library_resources'

    @staticmethod
    def _load_digital_resources():
        setting = LibrarySettings.query.filter_by(setting_key=LibraryService.DIGITAL_RESOURCES_KEY).first()
        if not setting or not setting.setting_value:
            return []
        try:
            return json.loads(setting.setting_value)
        except Exception:
            return []

    @staticmethod
    def _save_digital_resources(resources):
        setting = LibrarySettings.query.filter_by(setting_key=LibraryService.DIGITAL_RESOURCES_KEY).first()
        if setting is None:
            setting = LibrarySettings(
                setting_key=LibraryService.DIGITAL_RESOURCES_KEY,
                description='Digital library resources metadata'
            )
            db.session.add(setting)
        setting.setting_value = json.dumps(resources)
        db.session.commit()

    @staticmethod
    def list_digital_resources(search=None, category=None, resource_type=None):
        resources = LibraryService._load_digital_resources()
        filtered = []
        for resource in resources:
            haystack = " ".join([
                str(resource.get('title', '')),
                str(resource.get('author', '')),
                str(resource.get('description', '')),
                str(resource.get('category', '')),
            ]).lower()
            if search and search.strip().lower() not in haystack:
                continue
            if category and category != 'all' and resource.get('category') != category:
                continue
            if resource_type and resource_type != 'all' and resource.get('type') != resource_type:
                continue
            filtered.append(resource)
        return sorted(filtered, key=lambda item: item.get('created_at') or item.get('uploadDate') or '', reverse=True)

    @staticmethod
    def create_digital_resource(data, created_by_id=None):
        resources = LibraryService._load_digital_resources()
        next_id = max([int(item.get('id', 0)) for item in resources] or [0]) + 1
        resource = {
            'id': next_id,
            'title': data.get('title'),
            'type': data.get('type') or 'Document',
            'category': data.get('category') or 'General',
            'author': data.get('author') or 'School Admin',
            'uploadDate': date.today().isoformat(),
            'size': data.get('size') or 'N/A',
            'downloads': int(data.get('downloads') or 0),
            'url': data.get('url'),
            'thumbnail': data.get('thumbnail') or '',
            'description': data.get('description') or '',
            'created_by': created_by_id,
            'created_at': datetime.utcnow().isoformat(),
        }
        resources.append(resource)
        LibraryService._save_digital_resources(resources)
        return resource

    @staticmethod
    def update_digital_resource(resource_id, data):
        resources = LibraryService._load_digital_resources()
        updated = None
        for resource in resources:
            if int(resource.get('id')) == int(resource_id):
                for key in ['title', 'type', 'category', 'author', 'size', 'url', 'thumbnail', 'description']:
                    if key in data:
                        resource[key] = data.get(key)
                updated = resource
                break
        if updated is None:
            return None
        LibraryService._save_digital_resources(resources)
        return updated

    @staticmethod
    def delete_digital_resource(resource_id):
        resources = LibraryService._load_digital_resources()
        remaining = [resource for resource in resources if int(resource.get('id')) != int(resource_id)]
        if len(remaining) == len(resources):
            return False
        LibraryService._save_digital_resources(remaining)
        return True

    @staticmethod
    def increment_digital_resource_downloads(resource_id):
        resources = LibraryService._load_digital_resources()
        updated = None
        for resource in resources:
            if int(resource.get('id')) == int(resource_id):
                resource['downloads'] = int(resource.get('downloads') or 0) + 1
                updated = resource
                break
        if updated is None:
            return None
        LibraryService._save_digital_resources(resources)
        return updated

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
            record.status = BorrowStatus.RETURNED
            
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
        overdue_borrows = BorrowRecord.query.filter(
            db.or_(
                BorrowRecord.status == BorrowStatus.OVERDUE,
                db.and_(BorrowRecord.status == BorrowStatus.ACTIVE, BorrowRecord.due_date < date.today())
            )
        ).count()
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
            'returned_borrows': int(returned_borrows),
            'currently_out': int(active_borrows),
            'total_fines': float(db.session.query(func.coalesce(func.sum(FineRecord.amount), 0)).filter(FineRecord.status == 'pending').scalar() or 0),
            'digital_resources': len(LibraryService._load_digital_resources())
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
            Book.id,
            Book.title,
            Book.author,
            Book.category,
            func.count(BorrowRecord.id).label('borrow_count')
        ).join(BorrowRecord, Book.id == BorrowRecord.book_id).group_by(
            Book.id,
            Book.title,
            Book.author,
            Book.category
        ).order_by(
            func.count(BorrowRecord.id).desc()
        ).limit(limit).all()
        
        return [{
            'id': r.id,
            'title': r.title,
            'author': r.author,
            'category': r.category.value if hasattr(r.category, 'value') else r.category,
            'count': r.borrow_count
        } for r in results]

    @staticmethod
    def get_overdue_trends():
        """Get overdue count trends."""
        start_date = date.today() - timedelta(days=180)
        results = db.session.query(
            extract('year', BorrowRecord.due_date).label('year'),
            extract('month', BorrowRecord.due_date).label('month'),
            func.count(BorrowRecord.id).label('count')
        ).filter(
            BorrowRecord.due_date >= start_date,
            db.or_(
                BorrowRecord.status == BorrowStatus.OVERDUE,
                db.and_(BorrowRecord.status == BorrowStatus.ACTIVE, BorrowRecord.due_date < date.today())
            )
        ).group_by(
            extract('year', BorrowRecord.due_date),
            extract('month', BorrowRecord.due_date)
        ).order_by(
            extract('year', BorrowRecord.due_date),
            extract('month', BorrowRecord.due_date)
        ).all()

        trend_rows = []
        previous = None
        for row in results:
            year = int(row.year)
            month = int(row.month)
            count = int(row.count)
            if previous is None:
                trend = 'stable'
            elif count > previous:
                trend = 'up'
            elif count < previous:
                trend = 'down'
            else:
                trend = 'stable'
            trend_rows.append({
                'month': f'{year:04d}-{month:02d}',
                'count': count,
                'trend': trend
            })
            previous = count

        return trend_rows

    @staticmethod
    def build_report_rows(report_type='borrowing'):
        if report_type == 'categories':
            return LibraryService.get_category_distribution()
        if report_type == 'borrowers':
            return LibraryService.get_borrower_type_distribution()
        if report_type == 'popular':
            return LibraryService.get_popular_books(10)
        if report_type == 'overdue':
            return LibraryService.get_overdue_trends()
        return LibraryService.get_borrowing_activity('year')
