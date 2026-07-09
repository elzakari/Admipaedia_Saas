from datetime import date
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.api.v1.library import library_bp
from app.services.library.service import LibraryService
from app.utils.auth_utils import admin_required
from app.utils.rbac_decorators import require_role

@library_bp.route('/books', methods=['POST'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def create_book():
    try:
        data = request.get_json() or {}
        created_by_id = get_jwt_identity()
        book = LibraryService.create_book(data, created_by_id)
        return jsonify({
            'success': True,
            'book': {
                'id': book.id,
                'title': book.title,
                'author': book.author,
                'isbn': book.isbn,
                'category': book.category.value if hasattr(book.category, 'value') else book.category,
                'total_copies': book.total_copies,
                'available_copies': book.available_copies
            }
        }), 201
    except IntegrityError as ie:
        return jsonify({'success': False, 'message': str(ie)}), 400
    except Exception as err:
        return jsonify({'success': False, 'message': str(err)}), 400

@library_bp.route('/books', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher'])
def get_books():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    filters = {
        'category': request.args.get('category'),
        'status': request.args.get('status'),
        'search': request.args.get('search'),
        'available_only': request.args.get('available_only') in ['true', '1']
    }
    
    paginated = LibraryService.get_books(page=page, per_page=per_page, **filters)
    
    return jsonify({
        'success': True,
        'books': [
            {
                'id': b.id,
                'title': b.title,
                'author': b.author,
                'isbn': b.isbn,
                'category': b.category.value if hasattr(b.category, 'value') else b.category,
                'status': b.status.value if hasattr(b.status, 'value') else b.status,
                'publisher': b.publisher,
                'publication_year': b.publication_year,
                'description': b.description,
                'shelf_location': b.shelf_location,
                'total_copies': b.total_copies,
                'available_copies': b.available_copies
            } for b in paginated.items
        ],
        'total': paginated.total,
        'pages': paginated.pages
    }), 200


@library_bp.route('/books/<int:book_id>', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher'])
def get_book(book_id):
    from app.models.library import Book
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'success': False, 'message': 'Book not found'}), 404

    return jsonify({
        'success': True,
        'book': {
            'id': book.id,
            'title': book.title,
            'author': book.author,
            'isbn': book.isbn,
            'publisher': book.publisher,
            'publication_year': book.publication_year,
            'edition': book.edition,
            'category': book.category.value if hasattr(book.category, 'value') else book.category,
            'description': book.description,
            'language': book.language,
            'pages': book.pages,
            'shelf_location': book.shelf_location,
            'total_copies': book.total_copies,
            'available_copies': book.available_copies,
            'status': book.status.value if hasattr(book.status, 'value') else book.status,
            'created_at': book.created_at.isoformat() if getattr(book, 'created_at', None) else None
        }
    }), 200


@library_bp.route('/books/<int:book_id>', methods=['PUT'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def update_book(book_id):
    data = request.get_json() or {}
    book = LibraryService.update_book(book_id, data)
    if not book:
        return jsonify({'success': False, 'message': 'Book not found'}), 404

    return jsonify({
        'success': True,
        'book': {
            'id': book.id,
            'title': book.title,
            'author': book.author,
            'isbn': book.isbn,
            'category': book.category.value if hasattr(book.category, 'value') else book.category,
            'status': book.status.value if hasattr(book.status, 'value') else book.status,
            'total_copies': book.total_copies,
            'available_copies': book.available_copies,
            'shelf_location': book.shelf_location
        }
    }), 200


@library_bp.route('/books/<int:book_id>', methods=['DELETE'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def delete_book(book_id):
    ok, error = LibraryService.delete_book(book_id)
    if not ok:
        return jsonify({'success': False, 'message': error}), 400
    return jsonify({'success': True}), 200


@library_bp.route('/borrow-records', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher'])
def get_borrow_records():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    search = request.args.get('search')
    member_type = request.args.get('member_type')

    paginated = LibraryService.get_borrow_records(page=page, per_page=per_page, status=status, search=search, member_type=member_type)
    return jsonify({
        'success': True,
        'borrow_records': [
            {
                'id': r.id,
                'book_id': r.book_id,
                'book_title': r.book.title,
                'member_id': r.member_id,
                'member_code': r.member.member_id,
                'member_type': r.member.member_type.value if hasattr(r.member.member_type, 'value') else r.member.member_type,
                'member_name': f"{getattr(r.member.user, 'first_name', '')} {getattr(r.member.user, 'last_name', '')}".strip(),
                'borrow_date': r.borrow_date.isoformat() if r.borrow_date else None,
                'due_date': r.due_date.isoformat() if r.due_date else None,
                'return_date': r.return_date.isoformat() if r.return_date else None,
                'status': (
                    'overdue'
                    if (getattr(r, 'return_date', None) is None and getattr(r, 'due_date', None) and r.due_date < date.today())
                    else (r.status.value if hasattr(r.status, 'value') else r.status)
                ),
                'fine': float(r.calculate_fine())
            }
            for r in paginated.items
        ],
        'pagination': {
            'total': paginated.total,
            'pages': paginated.pages,
            'page': paginated.page,
            'per_page': paginated.per_page,
            'next': paginated.next_num,
            'prev': paginated.prev_num
        }
    }), 200


@library_bp.route('/members', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher'])
def get_members():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search')
    member_type = request.args.get('member_type')
    is_active = request.args.get('is_active')
    if is_active is not None:
        is_active = is_active in ['true', '1']

    paginated = LibraryService.get_members(page=page, per_page=per_page, search=search, member_type=member_type, is_active=is_active)
    return jsonify({
        'success': True,
        'members': [
            {
                'id': m.id,
                'member_id': m.member_id,
                'user_id': m.user_id,
                'member_type': m.member_type.value if hasattr(m.member_type, 'value') else m.member_type,
                'is_active': m.is_active,
                'max_books': m.max_books,
                'max_days': m.max_days,
                'total_fines': float(m.total_fines or 0),
                'fine_limit': float(m.fine_limit or 0),
                'user': {
                    'first_name': getattr(m.user, 'first_name', None),
                    'last_name': getattr(m.user, 'last_name', None),
                    'email': getattr(m.user, 'email', None)
                }
            }
            for m in paginated.items
        ],
        'pagination': {
            'total': paginated.total,
            'pages': paginated.pages,
            'page': paginated.page,
            'per_page': paginated.per_page,
            'next': paginated.next_num,
            'prev': paginated.prev_num
        }
    }), 200


@library_bp.route('/members', methods=['POST'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def create_member():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    member_type = data.get('member_type')
    max_books = data.get('max_books', 3)
    max_days = data.get('max_days', 14)

    if not user_id or not member_type:
        return jsonify({'success': False, 'message': 'user_id and member_type are required'}), 400

    member = LibraryService.create_library_member(user_id=user_id, member_type=member_type, max_books=max_books, max_days=max_days)
    return jsonify({
        'success': True,
        'member': {
            'id': member.id,
            'member_id': member.member_id,
            'user_id': member.user_id,
            'member_type': member.member_type.value if hasattr(member.member_type, 'value') else member.member_type,
            'is_active': member.is_active,
            'max_books': member.max_books,
            'max_days': member.max_days
        }
    }), 201

@library_bp.route('/borrow', methods=['POST'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def borrow_book():
    data = request.get_json() or {}
    issued_by_id = get_jwt_identity()
    
    ok, message, record = LibraryService.borrow_book(
        book_id=data.get('book_id'), 
        member_id=data.get('member_id'), 
        issued_by_id=issued_by_id
    )
    
    if not ok:
        return jsonify({'success': False, 'message': message}), 400
        
    return jsonify({
        'success': True,
        'message': message,
        'borrow_record': {
            'id': record.id,
            'book_id': record.book_id,
            'member_id': record.member_id,
            'due_date': record.due_date.isoformat(),
            'status': record.status.value if hasattr(record.status, 'value') else record.status
        }
    }), 201

@library_bp.route('/return', methods=['POST'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def return_book():
    data = request.get_json() or {}
    returned_by_id = get_jwt_identity()
    
    ok, message = LibraryService.return_book(
        borrow_record_id=data.get('borrow_record_id'), 
        returned_by_id=returned_by_id,
        notes=data.get('notes')
    )
    
    if not ok:
        return jsonify({'success': False, 'message': message}), 400
        
    return jsonify({'success': True, 'message': message}), 200


@library_bp.route('/digital-resources', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher'])
def get_digital_resources():
    resources = LibraryService.list_digital_resources(
        search=request.args.get('search'),
        category=request.args.get('category'),
        resource_type=request.args.get('type')
    )
    return jsonify({'success': True, 'resources': resources}), 200


@library_bp.route('/digital-resources', methods=['POST'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def create_digital_resource():
    payload = request.get_json() or {}
    if not payload.get('title') or not payload.get('url'):
        return jsonify({'success': False, 'message': 'title and url are required'}), 400
    resource = LibraryService.create_digital_resource(payload, created_by_id=get_jwt_identity())
    return jsonify({'success': True, 'resource': resource}), 201


@library_bp.route('/digital-resources/<int:resource_id>', methods=['PUT'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def update_digital_resource(resource_id):
    payload = request.get_json() or {}
    resource = LibraryService.update_digital_resource(resource_id, payload)
    if resource is None:
        return jsonify({'success': False, 'message': 'Resource not found'}), 404
    return jsonify({'success': True, 'resource': resource}), 200


@library_bp.route('/digital-resources/<int:resource_id>', methods=['DELETE'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def delete_digital_resource(resource_id):
    ok = LibraryService.delete_digital_resource(resource_id)
    if not ok:
        return jsonify({'success': False, 'message': 'Resource not found'}), 404
    return jsonify({'success': True}), 200


@library_bp.route('/digital-resources/<int:resource_id>/download', methods=['POST'])
@jwt_required()
@require_role(['admin', 'teacher'])
def download_digital_resource(resource_id):
    resource = LibraryService.increment_digital_resource_downloads(resource_id)
    if resource is None:
        return jsonify({'success': False, 'message': 'Resource not found'}), 404
    return jsonify({'success': True, 'resource': resource}), 200

# Library Reports Endpoints
@library_bp.route('/reports/stats', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def get_library_report_stats():
    """Get library overview stats."""
    stats = LibraryService.get_library_stats()
    return jsonify({'success': True, 'data': stats}), 200

@library_bp.route('/reports/borrowing-activity', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def get_library_borrowing_activity():
    """Get borrowing trends."""
    time_range = request.args.get('timeRange', 'month')
    data = LibraryService.get_borrowing_activity(time_range)
    return jsonify({'success': True, 'data': data}), 200

@library_bp.route('/reports/category-distribution', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def get_library_category_distribution():
    """Get book category distribution."""
    data = LibraryService.get_category_distribution()
    return jsonify({'success': True, 'data': data}), 200

@library_bp.route('/reports/borrower-type-distribution', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def get_library_borrower_type_distribution():
    """Get borrower type distribution."""
    data = LibraryService.get_borrower_type_distribution()
    return jsonify({'success': True, 'data': data}), 200

@library_bp.route('/reports/popular-books', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def get_library_popular_books():
    """Get most borrowed books."""
    limit = request.args.get('limit', 10, type=int)
    data = LibraryService.get_popular_books(limit)
    return jsonify({'success': True, 'data': data}), 200

@library_bp.route('/reports/overdue-trends', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def get_library_overdue_trends():
    """Get overdue trends."""
    data = LibraryService.get_overdue_trends()
    return jsonify({'success': True, 'data': data}), 200


@library_bp.route('/reports/export', methods=['POST'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def export_library_report():
    payload = request.get_json() or {}
    report_type = payload.get('reportType', 'borrowing')
    rows = LibraryService.build_report_rows(report_type)
    headers = sorted({key for row in rows for key in row.keys()}) if rows else []

    def escape(value):
        string_value = '' if value is None else str(value)
        if any(char in string_value for char in [',', '"', '\n']):
            return '"' + string_value.replace('"', '""') + '"'
        return string_value

    csv = '\n'.join([
        ','.join(headers),
        *[','.join(escape(row.get(header)) for header in headers) for row in rows]
    ])
    response = current_app.response_class(csv, mimetype='text/csv')
    response.headers['Content-Disposition'] = f'attachment; filename=library-{report_type}.csv'
    return response


@library_bp.route('/reports/print', methods=['POST'])
@jwt_required()
@require_role(['admin', 'teacher'])
@admin_required
def print_library_report():
    payload = request.get_json() or {}
    report_type = payload.get('reportType', 'borrowing')
    rows = LibraryService.build_report_rows(report_type)
    headers = sorted({key for row in rows for key in row.keys()}) if rows else []
    html_rows = ''.join(
        "<tr>"
        + "".join(f"<td>{row.get(header, '')}</td>" for header in headers)
        + "</tr>"
        for row in rows
    )
    html = f"""
    <html>
      <head>
        <title>Library Report</title>
        <style>
          body {{ font-family: Arial, sans-serif; padding: 24px; }}
          table {{ width: 100%; border-collapse: collapse; }}
          th, td {{ border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }}
          th {{ background: #f5f5f5; }}
        </style>
      </head>
      <body>
        <h1>Library Report: {report_type}</h1>
        <table>
          <thead><tr>{''.join(f'<th>{header}</th>' for header in headers)}</tr></thead>
          <tbody>{html_rows}</tbody>
        </table>
      </body>
    </html>
    """
    return jsonify({'success': True, 'html': html}), 200
