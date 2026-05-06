"""
Library service for managing books, borrowing, and library operations
"""
import logging
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import joinedload
from app.extensions import db
from app.models.library import (
    Book, LibraryMember, BorrowRecord, BookReservation, 
    FineRecord, LibrarySettings, BookStatus, BookCategory, 
    BorrowStatus, MemberType
)
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher

logger = logging.getLogger(__name__)


class LibraryService:
    """Service class for library operations"""
    
    @staticmethod
    def create_book(book_data: Dict[str, Any], created_by_id: int) -> Book:
        """Create a new book in the library"""
        try:
            book = Book(
                title=book_data['title'],
                author=book_data['author'],
                isbn=book_data.get('isbn'),
                publisher=book_data.get('publisher'),
                publication_year=book_data.get('publication_year'),
                edition=book_data.get('edition'),
                category=BookCategory(book_data['category']),
                description=book_data.get('description'),
                language=book_data.get('language', 'English'),
                pages=book_data.get('pages'),
                shelf_location=book_data.get('shelf_location'),
                total_copies=book_data.get('total_copies', 1),
                available_copies=book_data.get('total_copies', 1),
                created_by=created_by_id
            )
            
            db.session.add(book)
            db.session.commit()
            
            logger.info(f"Book created: {book.title} by {book.author}")
            return book
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating book: {str(e)}")
            raise
    
    @staticmethod
    def get_book_by_id(book_id: int) -> Optional[Book]:
        """Get book by ID"""
        return Book.query.get(book_id)
    
    @staticmethod
    def get_books(page: int = 1, per_page: int = 20, **filters) -> Any:
        """Get paginated list of books with filters"""
        query = Book.query
        
        # Apply filters
        if filters.get('category'):
            query = query.filter(Book.category == BookCategory(filters['category']))
        
        if filters.get('status'):
            query = query.filter(Book.status == BookStatus(filters['status']))
        
        if filters.get('search'):
            search_term = f"%{filters['search']}%"
            query = query.filter(
                or_(
                    Book.title.ilike(search_term),
                    Book.author.ilike(search_term),
                    Book.isbn.ilike(search_term)
                )
            )
        
        if filters.get('available_only'):
            query = query.filter(Book.available_copies > 0)
        
        return query.order_by(Book.title).paginate(
            page=page, per_page=per_page, error_out=False
        )
    
    @staticmethod
    def update_book(book_id: int, update_data: Dict[str, Any]) -> Optional[Book]:
        """Update book information"""
        try:
            book = Book.query.get(book_id)
            if not book:
                return None
            
            # Update allowed fields
            allowed_fields = [
                'title', 'author', 'isbn', 'publisher', 'publication_year',
                'edition', 'category', 'description', 'language', 'pages',
                'shelf_location', 'total_copies', 'status'
            ]
            
            for field in allowed_fields:
                if field in update_data:
                    if field == 'category':
                        setattr(book, field, BookCategory(update_data[field]))
                    elif field == 'status':
                        setattr(book, field, BookStatus(update_data[field]))
                    else:
                        setattr(book, field, update_data[field])
            
            # Update available copies if total copies changed
            if 'total_copies' in update_data:
                book.update_availability()
            
            db.session.commit()
            logger.info(f"Book updated: {book.title}")
            return book
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating book {book_id}: {str(e)}")
            raise
    
    @staticmethod
    def create_library_member(user_id: int, member_type: str, **kwargs) -> LibraryMember:
        """Create a new library member"""
        try:
            # Generate member ID
            member_id = LibraryService._generate_member_id(member_type)
            
            # Set defaults based on member type
            defaults = LibraryService._get_member_defaults(member_type)
            
            member = LibraryMember(
                member_id=member_id,
                user_id=user_id,
                member_type=MemberType(member_type),
                max_books=kwargs.get('max_books', defaults['max_books']),
                max_days=kwargs.get('max_days', defaults['max_days']),
                expiry_date=kwargs.get('expiry_date', defaults['expiry_date']),
                fine_limit=kwargs.get('fine_limit', defaults['fine_limit'])
            )
            
            db.session.add(member)
            db.session.commit()
            
            logger.info(f"Library member created: {member.member_id}")
            return member
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating library member: {str(e)}")
            raise
    
    @staticmethod
    def borrow_book(book_id: int, member_id: int, issued_by_id: int, 
                   due_date: Optional[date] = None) -> Tuple[bool, str, Optional[BorrowRecord]]:
        """Borrow a book"""
        try:
            book = Book.query.get(book_id)
            member = LibraryMember.query.get(member_id)
            
            if not book:
                return False, "Book not found", None
            
            if not member:
                return False, "Library member not found", None
            
            # Check if book is available
            if not book.is_available:
                return False, "Book is not available for borrowing", None
            
            # Check if member can borrow
            can_borrow, message = member.can_borrow
            if not can_borrow:
                return False, message, None
            
            # Calculate due date
            if not due_date:
                due_date = date.today() + timedelta(days=member.max_days)
            
            # Create borrow record
            borrow_record = BorrowRecord(
                book_id=book_id,
                member_id=member_id,
                due_date=due_date,
                issued_by=issued_by_id
            )
            
            # Update book availability
            book.available_copies -= 1
            book.update_availability()
            
            db.session.add(borrow_record)
            db.session.commit()
            
            logger.info(f"Book borrowed: {book.title} by {member.member_id}")
            return True, "Book borrowed successfully", borrow_record
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error borrowing book: {str(e)}")
            raise
    
    @staticmethod
    def return_book(borrow_record_id: int, returned_by_id: int, 
                   return_date: Optional[date] = None) -> Tuple[bool, str]:
        """Return a borrowed book"""
        try:
            borrow_record = BorrowRecord.query.get(borrow_record_id)
            
            if not borrow_record:
                return False, "Borrow record not found"
            
            if borrow_record.status != BorrowStatus.ACTIVE:
                return False, "Book is not currently borrowed"
            
            # Set return date
            if not return_date:
                return_date = date.today()
            
            # Update borrow record
            borrow_record.return_date = return_date
            borrow_record.status = BorrowStatus.RETURNED
            borrow_record.returned_to = returned_by_id
            
            # Update book availability
            book = borrow_record.book
            book.available_copies += 1
            book.update_availability()
            
            # Calculate and create fine if overdue
            if return_date > borrow_record.due_date:
                fine_amount = borrow_record.calculate_fine()
                if fine_amount > 0:
                    LibraryService._create_fine_record(
                        borrow_record, fine_amount, "overdue", returned_by_id
                    )
            
            db.session.commit()
            
            logger.info(f"Book returned: {book.title} by {borrow_record.member.member_id}")
            return True, "Book returned successfully"
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error returning book: {str(e)}")
            raise
    
    @staticmethod
    def renew_book(borrow_record_id: int) -> Tuple[bool, str]:
        """Renew a borrowed book"""
        try:
            borrow_record = BorrowRecord.query.get(borrow_record_id)
            
            if not borrow_record:
                return False, "Borrow record not found"
            
            can_renew, message = borrow_record.can_renew
            if not can_renew:
                return False, message
            
            # Extend due date
            borrow_record.due_date += timedelta(days=borrow_record.member.max_days)
            borrow_record.renewed_count += 1
            
            db.session.commit()
            
            logger.info(f"Book renewed: {borrow_record.book.title}")
            return True, "Book renewed successfully"
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error renewing book: {str(e)}")
            raise
    
    @staticmethod
    def get_member_borrow_history(member_id: int, page: int = 1, per_page: int = 20) -> Any:
        """Get member's borrowing history"""
        return BorrowRecord.query.filter_by(member_id=member_id)\
            .options(joinedload(BorrowRecord.book))\
            .order_by(desc(BorrowRecord.borrow_date))\
            .paginate(page=page, per_page=per_page, error_out=False)
    
    @staticmethod
    def get_overdue_books(page: int = 1, per_page: int = 20) -> Any:
        """Get all overdue books"""
        today = date.today()
        return BorrowRecord.query.filter(
            and_(
                BorrowRecord.status == BorrowStatus.ACTIVE,
                BorrowRecord.due_date < today
            )
        ).options(
            joinedload(BorrowRecord.book),
            joinedload(BorrowRecord.member)
        ).order_by(BorrowRecord.due_date)\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    @staticmethod
    def get_library_statistics() -> Dict[str, Any]:
        """Get library statistics"""
        try:
            total_books = Book.query.count()
            total_copies = db.session.query(func.sum(Book.total_copies)).scalar() or 0
            available_copies = db.session.query(func.sum(Book.available_copies)).scalar() or 0
            
            active_borrows = BorrowRecord.query.filter_by(status=BorrowStatus.ACTIVE).count()
            overdue_books = BorrowRecord.query.filter(
                and_(
                    BorrowRecord.status == BorrowStatus.ACTIVE,
                    BorrowRecord.due_date < date.today()
                )
            ).count()
            
            total_members = LibraryMember.query.filter_by(is_active=True).count()
            total_fines = db.session.query(func.sum(FineRecord.amount))\
                .filter_by(status='pending').scalar() or Decimal('0.00')
            
            return {
                'total_books': total_books,
                'total_copies': total_copies,
                'available_copies': available_copies,
                'borrowed_copies': total_copies - available_copies,
                'active_borrows': active_borrows,
                'overdue_books': overdue_books,
                'total_members': total_members,
                'total_outstanding_fines': float(total_fines),
                'borrowing_rate': round((active_borrows / total_copies * 100), 2) if total_copies > 0 else 0,
                'overdue_rate': round((overdue_books / active_borrows * 100), 2) if active_borrows > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting library statistics: {str(e)}")
            raise
    
    @staticmethod
    def _generate_member_id(member_type: str) -> str:
        """Generate unique member ID"""
        prefix_map = {
            'student': 'STU',
            'teacher': 'TCH',
            'staff': 'STF',
            'external': 'EXT'
        }
        
        prefix = prefix_map.get(member_type, 'MEM')
        
        # Get next sequence number
        last_member = LibraryMember.query.filter(
            LibraryMember.member_id.like(f'{prefix}%')
        ).order_by(desc(LibraryMember.member_id)).first()
        
        if last_member:
            last_number = int(last_member.member_id[3:])
            next_number = last_number + 1
        else:
            next_number = 1
        
        return f"{prefix}{next_number:04d}"
    
    @staticmethod
    def _get_member_defaults(member_type: str) -> Dict[str, Any]:
        """Get default settings for member type"""
        defaults = {
            'student': {
                'max_books': 3,
                'max_days': 14,
                'fine_limit': Decimal('20.00'),
                'expiry_date': date.today() + timedelta(days=365)
            },
            'teacher': {
                'max_books': 5,
                'max_days': 30,
                'fine_limit': Decimal('50.00'),
                'expiry_date': date.today() + timedelta(days=365)
            },
            'staff': {
                'max_books': 3,
                'max_days': 21,
                'fine_limit': Decimal('30.00'),
                'expiry_date': date.today() + timedelta(days=365)
            },
            'external': {
                'max_books': 2,
                'max_days': 7,
                'fine_limit': Decimal('15.00'),
                'expiry_date': date.today() + timedelta(days=90)
            }
        }
        
        return defaults.get(member_type, defaults['student'])
    
    @staticmethod
    def _create_fine_record(borrow_record: BorrowRecord, amount: Decimal, 
                          fine_type: str, issued_by_id: int) -> FineRecord:
        """Create a fine record"""
        fine_record = FineRecord(
            member_id=borrow_record.member_id,
            borrow_record_id=borrow_record.id,
            fine_type=fine_type,
            amount=amount,
            description=f"Fine for {fine_type} book: {borrow_record.book.title}",
            issued_by=issued_by_id
        )
        
        # Update member's total fines
        borrow_record.member.total_fines += amount
        
        db.session.add(fine_record)
        return fine_record