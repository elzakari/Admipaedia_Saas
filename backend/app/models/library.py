"""
Library system models for ADMIPAEDIA
Handles book inventory, borrowing records, and library member management
"""
from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey, Numeric, Enum
from sqlalchemy.orm import relationship, backref
from app.extensions import db
import enum


class BookStatus(enum.Enum):
    """Book availability status"""
    AVAILABLE = "available"
    BORROWED = "borrowed"
    RESERVED = "reserved"
    MAINTENANCE = "maintenance"
    LOST = "lost"
    DAMAGED = "damaged"


class BookCategory(enum.Enum):
    """Book categories"""
    FICTION = "fiction"
    NON_FICTION = "non_fiction"
    TEXTBOOK = "textbook"
    REFERENCE = "reference"
    BIOGRAPHY = "biography"
    SCIENCE = "science"
    HISTORY = "history"
    MATHEMATICS = "mathematics"
    LITERATURE = "literature"
    CHILDREN = "children"


class BorrowStatus(enum.Enum):
    """Borrowing record status"""
    ACTIVE = "active"
    RETURNED = "returned"
    OVERDUE = "overdue"
    LOST = "lost"
    RENEWED = "renewed"


class MemberType(enum.Enum):
    """Library member types"""
    STUDENT = "student"
    TEACHER = "teacher"
    STAFF = "staff"
    EXTERNAL = "external"


class Book(db.Model):
    """Book model for library inventory"""
    __tablename__ = 'books'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False, index=True)
    author = Column(String(255), nullable=False, index=True)
    isbn = Column(String(20), unique=True, index=True)
    publisher = Column(String(255))
    publication_year = Column(Integer)
    edition = Column(String(50))
    category = Column(Enum(BookCategory), nullable=False, index=True)
    description = Column(Text)
    language = Column(String(50), default='English')
    pages = Column(Integer)
    shelf_location = Column(String(50))
    
    # Inventory management
    total_copies = Column(Integer, default=1, nullable=False)
    available_copies = Column(Integer, default=1, nullable=False)
    status = Column(Enum(BookStatus), default=BookStatus.AVAILABLE, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    borrow_records = relationship('BorrowRecord', back_populates='book', lazy='dynamic')
    reservations = relationship('BookReservation', back_populates='book', lazy='dynamic')
    
    def __repr__(self):
        return f'<Book {self.title} by {self.author}>'
    
    @property
    def is_available(self):
        """Check if book has available copies"""
        return self.available_copies > 0 and self.status == BookStatus.AVAILABLE
    
    def update_availability(self):
        """Update available copies based on active borrows"""
        active_borrows = self.borrow_records.filter_by(status=BorrowStatus.ACTIVE).count()
        self.available_copies = max(0, self.total_copies - active_borrows)
        
        if self.available_copies == 0:
            self.status = BookStatus.BORROWED
        elif self.status == BookStatus.BORROWED and self.available_copies > 0:
            self.status = BookStatus.AVAILABLE


class LibraryMember(db.Model):
    """Library member model"""
    __tablename__ = 'library_members'
    
    id = Column(Integer, primary_key=True)
    member_id = Column(String(20), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    member_type = Column(Enum(MemberType), nullable=False)
    
    # Borrowing limits
    max_books = Column(Integer, default=3)
    max_days = Column(Integer, default=14)
    
    # Status
    is_active = Column(Boolean, default=True)
    registration_date = Column(Date, default=date.today)
    expiry_date = Column(Date)
    
    # Fine management
    total_fines = Column(Numeric(10, 2), default=0.00)
    fine_limit = Column(Numeric(10, 2), default=50.00)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship('User', backref=backref('library_member', uselist=False))
    borrow_records = relationship('BorrowRecord', back_populates='member', lazy='dynamic')
    reservations = relationship('BookReservation', back_populates='member', lazy='dynamic')
    fine_records = relationship('FineRecord', back_populates='member', lazy='dynamic')
    
    def __repr__(self):
        return f'<LibraryMember {self.member_id} - {self.member_type.value}>'
    
    @property
    def can_borrow(self):
        """Check if member can borrow books"""
        if not self.is_active:
            return False, "Member account is inactive"
        
        if self.expiry_date and self.expiry_date < date.today():
            return False, "Membership has expired"
        
        active_borrows = self.borrow_records.filter_by(status=BorrowStatus.ACTIVE).count()
        if active_borrows >= self.max_books:
            return False, f"Maximum borrowing limit ({self.max_books}) reached"
        
        if self.total_fines >= self.fine_limit:
            return False, f"Outstanding fines exceed limit (${self.fine_limit})"
        
        return True, "Can borrow"
    
    @property
    def active_borrows_count(self):
        """Get count of active borrowed books"""
        return self.borrow_records.filter_by(status=BorrowStatus.ACTIVE).count()
    
    @property
    def overdue_books_count(self):
        """Get count of overdue books"""
        return self.borrow_records.filter_by(status=BorrowStatus.OVERDUE).count()


class BorrowRecord(db.Model):
    """Book borrowing record"""
    __tablename__ = 'borrow_records'
    
    id = Column(Integer, primary_key=True)
    book_id = Column(Integer, ForeignKey('books.id'), nullable=False)
    member_id = Column(Integer, ForeignKey('library_members.id'), nullable=False)
    
    # Borrowing details
    borrow_date = Column(Date, default=date.today, nullable=False)
    due_date = Column(Date, nullable=False)
    return_date = Column(Date)
    renewed_count = Column(Integer, default=0)
    max_renewals = Column(Integer, default=2)
    
    # Status and notes
    status = Column(Enum(BorrowStatus), default=BorrowStatus.ACTIVE, nullable=False)
    notes = Column(Text)
    
    # Staff tracking
    issued_by = Column(Integer, ForeignKey('users.id'))
    returned_to = Column(Integer, ForeignKey('users.id'))
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    book = relationship('Book', back_populates='borrow_records')
    member = relationship('LibraryMember', back_populates='borrow_records')
    issuer = relationship('User', foreign_keys=[issued_by])
    returner = relationship('User', foreign_keys=[returned_to])
    fine_records = relationship('FineRecord', back_populates='borrow_record', lazy='dynamic')
    
    def __repr__(self):
        return f'<BorrowRecord {self.book.title} - {self.member.member_id}>'
    
    @property
    def is_overdue(self):
        """Check if book is overdue"""
        return self.status == BorrowStatus.ACTIVE and date.today() > self.due_date
    
    @property
    def days_overdue(self):
        """Calculate days overdue"""
        if not self.is_overdue:
            return 0
        return (date.today() - self.due_date).days
    
    @property
    def can_renew(self):
        """Check if book can be renewed"""
        if self.status != BorrowStatus.ACTIVE:
            return False, "Book is not currently borrowed"
        
        if self.renewed_count >= self.max_renewals:
            return False, f"Maximum renewals ({self.max_renewals}) reached"
        
        # Check if book has reservations
        if self.book.reservations.filter_by(status='active').count() > 0:
            return False, "Book has pending reservations"
        
        return True, "Can renew"
    
    def calculate_fine(self, daily_rate=1.00):
        """Calculate fine for overdue book"""
        if not self.is_overdue:
            return Decimal('0.00')
        
        return Decimal(str(daily_rate)) * self.days_overdue


class BookReservation(db.Model):
    """Book reservation model"""
    __tablename__ = 'book_reservations'
    
    id = Column(Integer, primary_key=True)
    book_id = Column(Integer, ForeignKey('books.id'), nullable=False)
    member_id = Column(Integer, ForeignKey('library_members.id'), nullable=False)
    
    # Reservation details
    reservation_date = Column(Date, default=date.today, nullable=False)
    expiry_date = Column(Date, nullable=False)
    status = Column(String(20), default='active')  # active, fulfilled, expired, cancelled
    
    # Notification
    notified = Column(Boolean, default=False)
    notification_date = Column(Date)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    book = relationship('Book', back_populates='reservations')
    member = relationship('LibraryMember', back_populates='reservations')
    
    def __repr__(self):
        return f'<BookReservation {self.book.title} - {self.member.member_id}>'
    
    @property
    def is_expired(self):
        """Check if reservation has expired"""
        return date.today() > self.expiry_date


class FineRecord(db.Model):
    """Fine record for overdue books and damages"""
    __tablename__ = 'fine_records'
    
    id = Column(Integer, primary_key=True)
    member_id = Column(Integer, ForeignKey('library_members.id'), nullable=False)
    borrow_record_id = Column(Integer, ForeignKey('borrow_records.id'))
    
    # Fine details
    fine_type = Column(String(50), nullable=False)  # overdue, damage, lost
    amount = Column(Numeric(10, 2), nullable=False)
    description = Column(Text)
    
    # Payment status
    status = Column(String(20), default='pending')  # pending, paid, waived
    payment_date = Column(Date)
    payment_method = Column(String(50))
    
    # Staff tracking
    issued_by = Column(Integer, ForeignKey('users.id'))
    processed_by = Column(Integer, ForeignKey('users.id'))
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    member = relationship('LibraryMember', back_populates='fine_records')
    borrow_record = relationship('BorrowRecord', back_populates='fine_records')
    issuer = relationship('User', foreign_keys=[issued_by])
    processor = relationship('User', foreign_keys=[processed_by])
    
    def __repr__(self):
        return f'<FineRecord {self.fine_type} - ${self.amount} - {self.member.member_id}>'


class LibrarySettings(db.Model):
    """Library system settings"""
    __tablename__ = 'library_settings'
    
    id = Column(Integer, primary_key=True)
    setting_key = Column(String(100), unique=True, nullable=False)
    setting_value = Column(Text, nullable=False)
    description = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<LibrarySetting {self.setting_key}: {self.setting_value}>'