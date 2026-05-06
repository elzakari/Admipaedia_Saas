"""
Comprehensive integration tests for library system
Tests book management, borrowing, returns, overdue management, and analytics
"""
import pytest
import json
from datetime import datetime, date, timedelta
from decimal import Decimal
from unittest.mock import patch

from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.library import (
    Book, LibraryMember, BorrowRecord, BookReservation, 
    FineRecord, BookStatus, BookCategory, BorrowStatus, MemberType
)
from app.extensions import db


class TestBookManagement:
    """Test book inventory management functionality"""
    
    def test_create_book_success(self, auth_client, db):
        """Test successful book creation"""
        book_data = {
            'title': 'Introduction to Python Programming',
            'author': 'John Smith',
            'isbn': '978-0123456789',
            'publisher': 'Tech Publications',
            'publication_year': 2023,
            'edition': '3rd Edition',
            'category': 'textbook',
            'description': 'Comprehensive guide to Python programming',
            'language': 'English',
            'pages': 450,
            'shelf_location': 'A1-001',
            'total_copies': 5
        }
        
        response = auth_client.post('/api/v1/library/books', json=book_data)
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['book']['title'] == book_data['title']
        assert data['book']['author'] == book_data['author']
        assert data['book']['total_copies'] == 5
        assert data['book']['available_copies'] == 5
        
        # Verify book in database
        book = Book.query.filter_by(isbn=book_data['isbn']).first()
        assert book is not None
        assert book.category == BookCategory.TEXTBOOK
        assert book.status == BookStatus.AVAILABLE
    
    def test_create_book_duplicate_isbn(self, auth_client, db):
        """Test creating book with duplicate ISBN"""
        # Create first book
        book1_data = {
            'title': 'First Book',
            'author': 'Author One',
            'isbn': '978-1111111111',
            'category': 'fiction',
            'total_copies': 2
        }
        
        response1 = auth_client.post('/api/v1/library/books', json=book1_data)
        assert response1.status_code == 201
        
        # Try to create second book with same ISBN
        book2_data = {
            'title': 'Second Book',
            'author': 'Author Two',
            'isbn': '978-1111111111',  # Same ISBN
            'category': 'non_fiction',
            'total_copies': 1
        }
        
        response2 = auth_client.post('/api/v1/library/books', json=book2_data)
        assert response2.status_code == 400
        
        data = response2.get_json()
        assert data['success'] is False
        assert 'isbn' in data['message'].lower() or 'duplicate' in data['message'].lower()
    
    def test_get_books_with_filters(self, auth_client, db):
        """Test retrieving books with various filters"""
        # Create test books
        books_data = [
            {
                'title': 'Mathematics Textbook',
                'author': 'Math Author',
                'isbn': '978-2222222222',
                'category': 'textbook',
                'total_copies': 3
            },
            {
                'title': 'Science Fiction Novel',
                'author': 'Sci-Fi Author',
                'isbn': '978-3333333333',
                'category': 'fiction',
                'total_copies': 2
            },
            {
                'title': 'History Reference',
                'author': 'History Author',
                'isbn': '978-4444444444',
                'category': 'reference',
                'total_copies': 1
            }
        ]
        
        for book_data in books_data:
            auth_client.post('/api/v1/library/books', json=book_data)
        
        # Test category filter
        response = auth_client.get('/api/v1/library/books?category=textbook')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert len(data['books']) == 1
        assert data['books'][0]['category'] == 'textbook'
        
        # Test search filter
        response = auth_client.get('/api/v1/library/books?search=science')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert len(data['books']) == 1
        assert 'science' in data['books'][0]['title'].lower()
        
        # Test available only filter
        response = auth_client.get('/api/v1/library/books?available_only=true')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert len(data['books']) == 3  # All books should be available
    
    def test_update_book_details(self, auth_client, db):
        """Test updating book information"""
        # Create a book
        book_data = {
            'title': 'Original Title',
            'author': 'Original Author',
            'isbn': '978-5555555555',
            'category': 'fiction',
            'total_copies': 2
        }
        
        response = auth_client.post('/api/v1/library/books', json=book_data)
        book_id = response.get_json()['book']['id']
        
        # Update book details
        update_data = {
            'title': 'Updated Title',
            'author': 'Updated Author',
            'total_copies': 4,
            'shelf_location': 'B2-005'
        }
        
        response = auth_client.put(f'/api/v1/library/books/{book_id}', json=update_data)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert data['book']['title'] == 'Updated Title'
        assert data['book']['author'] == 'Updated Author'
        assert data['book']['total_copies'] == 4
        assert data['book']['available_copies'] == 4  # Should update automatically


class TestLibraryMemberManagement:
    """Test library member management functionality"""
    
    def test_create_library_member_student(self, auth_client, db):
        """Test creating a student library member"""
        # Create a student user first
        student_user = User(
            username='student001',
            email='student001@school.com',
            first_name='Alice',
            last_name='Johnson'
        )
        student_user.set_password('password123')
        db.session.add(student_user)
        db.session.commit()
        
        member_data = {
            'user_id': student_user.id,
            'member_type': 'student'
        }
        
        response = auth_client.post('/api/v1/library/members', json=member_data)
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['member']['member_type'] == 'student'
        assert data['member']['max_books'] == 3  # Default for students
        assert data['member']['max_days'] == 14  # Default for students
        assert data['member']['is_active'] is True
        
        # Verify member ID format
        assert data['member']['member_id'].startswith('STU')
    
    def test_create_library_member_teacher(self, auth_client, db):
        """Test creating a teacher library member"""
        # Create a teacher user
        teacher_user = User(
            username='teacher001',
            email='teacher001@school.com',
            first_name='Bob',
            last_name='Wilson'
        )
        teacher_user.set_password('password123')
        db.session.add(teacher_user)
        db.session.commit()
        
        member_data = {
            'user_id': teacher_user.id,
            'member_type': 'teacher',
            'max_books': 7,  # Custom limit
            'max_days': 45   # Custom duration
        }
        
        response = auth_client.post('/api/v1/library/members', json=member_data)
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['member']['member_type'] == 'teacher'
        assert data['member']['max_books'] == 7
        assert data['member']['max_days'] == 45
        assert data['member']['member_id'].startswith('TCH')


class TestBookBorrowingOperations:
    """Test book borrowing and return operations"""
    
    def test_borrow_book_success(self, auth_client, db):
        """Test successful book borrowing"""
        # Create book and member
        book = Book(
            title='Test Book',
            author='Test Author',
            isbn='978-6666666666',
            category=BookCategory.FICTION,
            total_copies=2,
            available_copies=2
        )
        
        user = User(
            username='borrower001',
            email='borrower001@school.com',
            first_name='Charlie',
            last_name='Brown'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0001',
            user_id=None,  # Will be set after user is saved
            member_type=MemberType.STUDENT,
            max_books=3,
            max_days=14
        )
        
        db.session.add_all([book, user])
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        # Borrow the book
        borrow_data = {
            'book_id': book.id,
            'member_id': member.id
        }
        
        response = auth_client.post('/api/v1/library/borrow', json=borrow_data)
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['borrow_record']['book_id'] == book.id
        assert data['borrow_record']['member_id'] == member.id
        assert data['borrow_record']['status'] == 'active'
        
        # Verify book availability updated
        db.session.refresh(book)
        assert book.available_copies == 1
    
    def test_borrow_book_unavailable(self, auth_client, db):
        """Test borrowing unavailable book"""
        # Create book with no available copies
        book = Book(
            title='Unavailable Book',
            author='Test Author',
            isbn='978-7777777777',
            category=BookCategory.FICTION,
            total_copies=1,
            available_copies=0,
            status=BookStatus.BORROWED
        )
        
        user = User(
            username='borrower002',
            email='borrower002@school.com',
            first_name='David',
            last_name='Smith'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0002',
            user_id=None,
            member_type=MemberType.STUDENT
        )
        
        db.session.add_all([book, user])
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        borrow_data = {
            'book_id': book.id,
            'member_id': member.id
        }
        
        response = auth_client.post('/api/v1/library/borrow', json=borrow_data)
        assert response.status_code == 400
        
        data = response.get_json()
        assert data['success'] is False
        assert 'not available' in data['message'].lower()
    
    def test_return_book_success(self, auth_client, db):
        """Test successful book return"""
        # Create book, member, and borrow record
        book = Book(
            title='Return Test Book',
            author='Test Author',
            isbn='978-8888888888',
            category=BookCategory.FICTION,
            total_copies=1,
            available_copies=0
        )
        
        user = User(
            username='returner001',
            email='returner001@school.com',
            first_name='Eve',
            last_name='Davis'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0003',
            user_id=None,
            member_type=MemberType.STUDENT
        )
        
        db.session.add_all([book, user])
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        # Create active borrow record
        borrow_record = BorrowRecord(
            book_id=book.id,
            member_id=member.id,
            borrow_date=date.today() - timedelta(days=7),
            due_date=date.today() + timedelta(days=7),
            status=BorrowStatus.ACTIVE
        )
        
        db.session.add(borrow_record)
        db.session.commit()
        
        # Return the book
        return_data = {
            'borrow_record_id': borrow_record.id
        }
        
        response = auth_client.post('/api/v1/library/return', json=return_data)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert 'returned successfully' in data['message'].lower()
        
        # Verify borrow record updated
        db.session.refresh(borrow_record)
        assert borrow_record.status == BorrowStatus.RETURNED
        assert borrow_record.return_date == date.today()
        
        # Verify book availability updated
        db.session.refresh(book)
        assert book.available_copies == 1
    
    def test_return_book_overdue_with_fine(self, auth_client, db):
        """Test returning overdue book with fine calculation"""
        # Create book, member, and overdue borrow record
        book = Book(
            title='Overdue Test Book',
            author='Test Author',
            isbn='978-9999999999',
            category=BookCategory.FICTION,
            total_copies=1,
            available_copies=0
        )
        
        user = User(
            username='overdue001',
            email='overdue001@school.com',
            first_name='Frank',
            last_name='Miller'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0004',
            user_id=None,
            member_type=MemberType.STUDENT,
            total_fines=Decimal('0.00')
        )
        
        db.session.add_all([book, user])
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        # Create overdue borrow record (due 5 days ago)
        borrow_record = BorrowRecord(
            book_id=book.id,
            member_id=member.id,
            borrow_date=date.today() - timedelta(days=20),
            due_date=date.today() - timedelta(days=5),  # 5 days overdue
            status=BorrowStatus.ACTIVE
        )
        
        db.session.add(borrow_record)
        db.session.commit()
        
        # Return the book
        return_data = {
            'borrow_record_id': borrow_record.id
        }
        
        response = auth_client.post('/api/v1/library/return', json=return_data)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        
        # Verify fine was created
        fine_record = FineRecord.query.filter_by(
            member_id=member.id,
            borrow_record_id=borrow_record.id
        ).first()
        
        assert fine_record is not None
        assert fine_record.fine_type == 'overdue'
        assert fine_record.amount == Decimal('5.00')  # 5 days * $1.00/day
        
        # Verify member's total fines updated
        db.session.refresh(member)
        assert member.total_fines == Decimal('5.00')


class TestBookRenewalOperations:
    """Test book renewal functionality"""
    
    def test_renew_book_success(self, auth_client, db):
        """Test successful book renewal"""
        # Create book, member, and borrow record
        book = Book(
            title='Renewable Book',
            author='Test Author',
            isbn='978-1010101010',
            category=BookCategory.FICTION,
            total_copies=1,
            available_copies=0
        )
        
        user = User(
            username='renewer001',
            email='renewer001@school.com',
            first_name='Grace',
            last_name='Wilson'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0005',
            user_id=None,
            member_type=MemberType.STUDENT,
            max_days=14
        )
        
        db.session.add_all([book, user])
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        original_due_date = date.today() + timedelta(days=7)
        borrow_record = BorrowRecord(
            book_id=book.id,
            member_id=member.id,
            borrow_date=date.today() - timedelta(days=7),
            due_date=original_due_date,
            status=BorrowStatus.ACTIVE,
            renewed_count=0,
            max_renewals=2
        )
        
        db.session.add(borrow_record)
        db.session.commit()
        
        # Renew the book
        response = auth_client.post(f'/api/v1/library/renew/{borrow_record.id}')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert 'renewed successfully' in data['message'].lower()
        
        # Verify renewal details
        db.session.refresh(borrow_record)
        assert borrow_record.renewed_count == 1
        assert borrow_record.due_date == original_due_date + timedelta(days=14)
    
    def test_renew_book_max_renewals_reached(self, auth_client, db):
        """Test renewal when maximum renewals reached"""
        # Create book, member, and borrow record at max renewals
        book = Book(
            title='Max Renewed Book',
            author='Test Author',
            isbn='978-1111101111',
            category=BookCategory.FICTION,
            total_copies=1,
            available_copies=0
        )
        
        user = User(
            username='maxrenewer001',
            email='maxrenewer001@school.com',
            first_name='Henry',
            last_name='Taylor'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0006',
            user_id=None,
            member_type=MemberType.STUDENT
        )
        
        db.session.add_all([book, user])
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        borrow_record = BorrowRecord(
            book_id=book.id,
            member_id=member.id,
            borrow_date=date.today() - timedelta(days=7),
            due_date=date.today() + timedelta(days=7),
            status=BorrowStatus.ACTIVE,
            renewed_count=2,  # Already at max
            max_renewals=2
        )
        
        db.session.add(borrow_record)
        db.session.commit()
        
        # Try to renew
        response = auth_client.post(f'/api/v1/library/renew/{borrow_record.id}')
        assert response.status_code == 400
        
        data = response.get_json()
        assert data['success'] is False
        assert 'maximum renewals' in data['message'].lower()


class TestLibraryAnalytics:
    """Test library analytics and reporting"""
    
    def test_get_library_statistics(self, auth_client, db):
        """Test retrieving library statistics"""
        # Create test data
        books = [
            Book(
                title=f'Book {i}',
                author=f'Author {i}',
                isbn=f'978-{i:010d}',
                category=BookCategory.FICTION,
                total_copies=2,
                available_copies=1 if i % 2 == 0 else 2
            )
            for i in range(1, 6)  # 5 books
        ]
        
        db.session.add_all(books)
        db.session.commit()
        
        # Create some borrow records
        user = User(
            username='stats_user',
            email='stats@school.com',
            first_name='Stats',
            last_name='User'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0007',
            user_id=None,
            member_type=MemberType.STUDENT
        )
        
        db.session.add(user)
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        # Create active and overdue borrow records
        borrow_records = [
            BorrowRecord(
                book_id=books[0].id,
                member_id=member.id,
                borrow_date=date.today() - timedelta(days=5),
                due_date=date.today() + timedelta(days=9),
                status=BorrowStatus.ACTIVE
            ),
            BorrowRecord(
                book_id=books[1].id,
                member_id=member.id,
                borrow_date=date.today() - timedelta(days=20),
                due_date=date.today() - timedelta(days=5),  # Overdue
                status=BorrowStatus.ACTIVE
            )
        ]
        
        db.session.add_all(borrow_records)
        db.session.commit()
        
        # Get statistics
        response = auth_client.get('/api/v1/library/statistics')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        
        stats = data['statistics']
        assert stats['total_books'] == 5
        assert stats['total_copies'] == 10
        assert stats['available_copies'] == 8  # 3 books with 2 copies + 2 books with 1 copy
        assert stats['borrowed_copies'] == 2
        assert stats['active_borrows'] == 2
        assert stats['overdue_books'] == 1
        assert stats['total_members'] == 1
    
    def test_get_overdue_books_report(self, auth_client, db):
        """Test retrieving overdue books report"""
        # Create test data with overdue books
        book1 = Book(
            title='Overdue Book 1',
            author='Author 1',
            isbn='978-2020202020',
            category=BookCategory.FICTION,
            total_copies=1,
            available_copies=0
        )
        
        book2 = Book(
            title='Overdue Book 2',
            author='Author 2',
            isbn='978-3030303030',
            category=BookCategory.TEXTBOOK,
            total_copies=1,
            available_copies=0
        )
        
        user1 = User(
            username='overdue_user1',
            email='overdue1@school.com',
            first_name='Overdue',
            last_name='User1'
        )
        user1.set_password('password123')
        
        user2 = User(
            username='overdue_user2',
            email='overdue2@school.com',
            first_name='Overdue',
            last_name='User2'
        )
        user2.set_password('password123')
        
        member1 = LibraryMember(
            member_id='STU0008',
            user_id=None,
            member_type=MemberType.STUDENT
        )
        
        member2 = LibraryMember(
            member_id='STU0009',
            user_id=None,
            member_type=MemberType.STUDENT
        )
        
        db.session.add_all([book1, book2, user1, user2])
        db.session.commit()
        
        member1.user_id = user1.id
        member2.user_id = user2.id
        db.session.add_all([member1, member2])
        db.session.commit()
        
        # Create overdue borrow records
        overdue_records = [
            BorrowRecord(
                book_id=book1.id,
                member_id=member1.id,
                borrow_date=date.today() - timedelta(days=25),
                due_date=date.today() - timedelta(days=10),  # 10 days overdue
                status=BorrowStatus.ACTIVE
            ),
            BorrowRecord(
                book_id=book2.id,
                member_id=member2.id,
                borrow_date=date.today() - timedelta(days=18),
                due_date=date.today() - timedelta(days=3),   # 3 days overdue
                status=BorrowStatus.ACTIVE
            )
        ]
        
        db.session.add_all(overdue_records)
        db.session.commit()
        
        # Get overdue books report
        response = auth_client.get('/api/v1/library/overdue')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert len(data['overdue_books']) == 2
        
        # Verify overdue details
        overdue_book = data['overdue_books'][0]
        assert 'days_overdue' in overdue_book
        assert overdue_book['days_overdue'] > 0
        assert 'fine_amount' in overdue_book
    
    def test_get_popular_books_report(self, auth_client, db):
        """Test retrieving popular books report"""
        # Create books with different borrow counts
        books = [
            Book(
                title='Popular Book 1',
                author='Author 1',
                isbn='978-2020202020',
                category=BookCategory.FICTION,
                total_copies=3,
                available_copies=2,
                borrow_count=15
            ),
            Book(
                title='Popular Book 2',
                author='Author 2',
                isbn='978-2121212121',
                category=BookCategory.TEXTBOOK,
                total_copies=2,
                available_copies=1,
                borrow_count=12
            ),
            Book(
                title='Less Popular Book',
                author='Author 3',
                isbn='978-2222222222',
                category=BookCategory.REFERENCE,
                total_copies=1,
                available_copies=1,
                borrow_count=3
            )
        ]
        
        db.session.add_all(books)
        db.session.commit()
        
        # Get popular books report
        response = auth_client.get('/api/v1/library/popular?limit=2')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert len(data['popular_books']) == 2
        
        # Verify books are ordered by popularity
        assert data['popular_books'][0]['borrow_count'] >= data['popular_books'][1]['borrow_count']
    
    def test_get_member_borrowing_history(self, auth_client, db):
        """Test retrieving member borrowing history"""
        # Create member and books
        user = User(
            username='history_user',
            email='history@school.com',
            first_name='History',
            last_name='User'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0010',
            user_id=None,
            member_type=MemberType.STUDENT
        )
        
        books = [
            Book(
                title='History Book 1',
                author='Author 1',
                isbn='978-3030303030',
                category=BookCategory.FICTION,
                total_copies=1,
                available_copies=1
            ),
            Book(
                title='History Book 2',
                author='Author 2',
                isbn='978-3131313131',
                category=BookCategory.TEXTBOOK,
                total_copies=1,
                available_copies=1
            )
        ]
        
        db.session.add_all([user] + books)
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        # Create borrow history
        borrow_records = [
            BorrowRecord(
                book_id=books[0].id,
                member_id=member.id,
                borrow_date=date.today() - timedelta(days=30),
                due_date=date.today() - timedelta(days=16),
                return_date=date.today() - timedelta(days=20),
                status=BorrowStatus.RETURNED
            ),
            BorrowRecord(
                book_id=books[1].id,
                member_id=member.id,
                borrow_date=date.today() - timedelta(days=10),
                due_date=date.today() + timedelta(days=4),
                status=BorrowStatus.ACTIVE
            )
        ]
        
        db.session.add_all(borrow_records)
        db.session.commit()
        
        # Get borrowing history
        response = auth_client.get(f'/api/v1/library/members/{member.id}/history')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert len(data['borrow_history']) == 2
        
        # Verify history details
        active_record = next(r for r in data['borrow_history'] if r['status'] == 'active')
        returned_record = next(r for r in data['borrow_history'] if r['status'] == 'returned')
        
        assert active_record['return_date'] is None
        assert returned_record['return_date'] is not None


class TestBookReservationSystem:
    """Test book reservation functionality"""
    
    def test_reserve_book_success(self, auth_client, db):
        """Test successful book reservation"""
        # Create book (all copies borrowed)
        book = Book(
            title='Reserved Book',
            author='Reserve Author',
            isbn='978-4040404040',
            category=BookCategory.FICTION,
            total_copies=1,
            available_copies=0,
            status=BookStatus.BORROWED
        )
        
        # Create member
        user = User(
            username='reserver001',
            email='reserver001@school.com',
            first_name='Reserve',
            last_name='User'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0011',
            user_id=None,
            member_type=MemberType.STUDENT
        )
        
        db.session.add_all([book, user])
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        # Reserve the book
        reservation_data = {
            'book_id': book.id,
            'member_id': member.id
        }
        
        response = auth_client.post('/api/v1/library/reserve', json=reservation_data)
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['reservation']['book_id'] == book.id
        assert data['reservation']['member_id'] == member.id
        assert data['reservation']['status'] == 'pending'
        
        # Verify reservation in database
        reservation = BookReservation.query.filter_by(
            book_id=book.id,
            member_id=member.id
        ).first()
        assert reservation is not None
        assert reservation.reservation_date == date.today()
    
    def test_reserve_available_book_error(self, auth_client, db):
        """Test reserving an available book (should fail)"""
        # Create available book
        book = Book(
            title='Available Book',
            author='Available Author',
            isbn='978-4141414141',
            category=BookCategory.FICTION,
            total_copies=1,
            available_copies=1,
            status=BookStatus.AVAILABLE
        )
        
        user = User(
            username='reserver002',
            email='reserver002@school.com',
            first_name='Reserve2',
            last_name='User'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0012',
            user_id=None,
            member_type=MemberType.STUDENT
        )
        
        db.session.add_all([book, user])
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        reservation_data = {
            'book_id': book.id,
            'member_id': member.id
        }
        
        response = auth_client.post('/api/v1/library/reserve', json=reservation_data)
        assert response.status_code == 400
        
        data = response.get_json()
        assert data['success'] is False
        assert 'available' in data['message'].lower()
    
    def test_cancel_reservation(self, auth_client, db):
        """Test canceling a book reservation"""
        # Create book and reservation
        book = Book(
            title='Cancel Reserve Book',
            author='Cancel Author',
            isbn='978-4242424242',
            category=BookCategory.FICTION,
            total_copies=1,
            available_copies=0
        )
        
        user = User(
            username='canceler001',
            email='canceler001@school.com',
            first_name='Cancel',
            last_name='User'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0013',
            user_id=None,
            member_type=MemberType.STUDENT
        )
        
        db.session.add_all([book, user])
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        reservation = BookReservation(
            book_id=book.id,
            member_id=member.id,
            reservation_date=date.today(),
            status='pending'
        )
        
        db.session.add(reservation)
        db.session.commit()
        
        # Cancel reservation
        response = auth_client.delete(f'/api/v1/library/reserve/{reservation.id}')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert 'cancelled' in data['message'].lower()
        
        # Verify reservation status updated
        db.session.refresh(reservation)
        assert reservation.status == 'cancelled'


class TestFineManagement:
    """Test fine management functionality"""
    
    def test_calculate_overdue_fines(self, auth_client, db):
        """Test automatic fine calculation for overdue books"""
        # Create member with overdue book
        user = User(
            username='fine_user',
            email='fine@school.com',
            first_name='Fine',
            last_name='User'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0014',
            user_id=None,
            member_type=MemberType.STUDENT,
            total_fines=Decimal('0.00')
        )
        
        book = Book(
            title='Fine Book',
            author='Fine Author',
            isbn='978-5050505050',
            category=BookCategory.FICTION,
            total_copies=1,
            available_copies=0
        )
        
        db.session.add_all([user, book])
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        # Create overdue borrow record
        borrow_record = BorrowRecord(
            book_id=book.id,
            member_id=member.id,
            borrow_date=date.today() - timedelta(days=25),
            due_date=date.today() - timedelta(days=10),  # 10 days overdue
            status=BorrowStatus.ACTIVE
        )
        
        db.session.add(borrow_record)
        db.session.commit()
        
        # Calculate fines
        response = auth_client.post('/api/v1/library/calculate-fines')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert data['fines_calculated'] > 0
        
        # Verify fine record created
        fine_record = FineRecord.query.filter_by(
            member_id=member.id,
            borrow_record_id=borrow_record.id
        ).first()
        
        assert fine_record is not None
        assert fine_record.amount == Decimal('10.00')  # 10 days * $1.00/day
        
        # Verify member's total fines updated
        db.session.refresh(member)
        assert member.total_fines == Decimal('10.00')
    
    def test_pay_fine(self, auth_client, db):
        """Test fine payment processing"""
        # Create member with existing fine
        user = User(
            username='payer001',
            email='payer001@school.com',
            first_name='Payer',
            last_name='User'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0015',
            user_id=None,
            member_type=MemberType.STUDENT,
            total_fines=Decimal('15.00')
        )
        
        db.session.add(user)
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        # Create fine record
        fine_record = FineRecord(
            member_id=member.id,
            fine_type='overdue',
            amount=Decimal('15.00'),
            fine_date=date.today() - timedelta(days=5),
            is_paid=False
        )
        
        db.session.add(fine_record)
        db.session.commit()
        
        # Pay fine
        payment_data = {
            'fine_id': fine_record.id,
            'amount': 15.00,
            'payment_method': 'cash'
        }
        
        response = auth_client.post('/api/v1/library/pay-fine', json=payment_data)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['success'] is True
        assert 'payment successful' in data['message'].lower()
        
        # Verify fine marked as paid
        db.session.refresh(fine_record)
        assert fine_record.is_paid is True
        assert fine_record.payment_date == date.today()
        
        # Verify member's total fines updated
        db.session.refresh(member)
        assert member.total_fines == Decimal('0.00')


class TestLibraryIntegrationWorkflow:
    """Test complete library workflow integration"""
    
    def test_complete_library_workflow(self, auth_client, db):
        """Test end-to-end library workflow"""
        # 1. Create book
        book_data = {
            'title': 'Workflow Test Book',
            'author': 'Workflow Author',
            'isbn': '978-6060606060',
            'category': 'fiction',
            'total_copies': 2
        }
        
        response = auth_client.post('/api/v1/library/books', json=book_data)
        assert response.status_code == 201
        book_id = response.get_json()['book']['id']
        
        # 2. Create library member
        user = User(
            username='workflow_user',
            email='workflow@school.com',
            first_name='Workflow',
            last_name='User'
        )
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()
        
        member_data = {
            'user_id': user.id,
            'member_type': 'student'
        }
        
        response = auth_client.post('/api/v1/library/members', json=member_data)
        assert response.status_code == 201
        member_id = response.get_json()['member']['id']
        
        # 3. Borrow book
        borrow_data = {
            'book_id': book_id,
            'member_id': member_id
        }
        
        response = auth_client.post('/api/v1/library/borrow', json=borrow_data)
        assert response.status_code == 201
        borrow_record_id = response.get_json()['borrow_record']['id']
        
        # 4. Renew book
        response = auth_client.post(f'/api/v1/library/renew/{borrow_record_id}')
        assert response.status_code == 200
        
        # 5. Return book
        return_data = {
            'borrow_record_id': borrow_record_id
        }
        
        response = auth_client.post('/api/v1/library/return', json=return_data)
        assert response.status_code == 200
        
        # 6. Verify library statistics updated
        response = auth_client.get('/api/v1/library/stats')
        assert response.status_code == 200
        
        stats = response.get_json()
        assert stats['total_books'] >= 1
        assert stats['total_members'] >= 1
        assert stats['total_borrows'] >= 1
    
    def test_library_validation_and_constraints(self, auth_client, db):
        """Test library system validation and business rules"""
        # Test member borrowing limit
        user = User(
            username='limit_user',
            email='limit@school.com',
            first_name='Limit',
            last_name='User'
        )
        user.set_password('password123')
        
        member = LibraryMember(
            member_id='STU0016',
            user_id=None,
            member_type=MemberType.STUDENT,
            max_books=2,  # Limit of 2 books
            current_books=2  # Already at limit
        )
        
        book = Book(
            title='Limit Test Book',
            author='Limit Author',
            isbn='978-7070707070',
            category=BookCategory.FICTION,
            total_copies=1,
            available_copies=1
        )
        
        db.session.add_all([user, book])
        db.session.commit()
        
        member.user_id = user.id
        db.session.add(member)
        db.session.commit()
        
        # Try to borrow when at limit
        borrow_data = {
            'book_id': book.id,
            'member_id': member.id
        }
        
        response = auth_client.post('/api/v1/library/borrow', json=borrow_data)
        assert response.status_code == 400
        
        data = response.get_json()
        assert data['success'] is False
        assert 'limit' in data['message'].lower()
        
        # Test inactive member borrowing
        member.is_active = False
        db.session.commit()
        
        response = auth_client.post('/api/v1/library/borrow', json=borrow_data)
        assert response.status_code == 400
        
        data = response.get_json()
        assert data['success'] is False
        assert 'inactive' in data['message'].lower() or 'not active' in data['message'].lower()