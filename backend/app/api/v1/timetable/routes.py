from flask import Blueprint, request, jsonify
from app.services.timetable.service import TimetableService
from flask_jwt_extended import jwt_required
from app.utils.rbac_decorators import require_permission

timetable_bp = Blueprint('timetable', __name__)
timetable_bp.strict_slashes = False

@timetable_bp.route('/periods', methods=['GET', 'POST'])
@jwt_required()
@require_permission('timetable.manage')
def manage_periods():
    if request.method == 'POST':
        period, error = TimetableService.create_period(request.json)
        if error:
            return jsonify({'success': False, 'message': error}), 400
        return jsonify({'success': True, 'id': period.id}), 201
    else:
        class_id = request.args.get('class_id', type=int)
        subject_id = request.args.get('subject_id', type=int)
        teacher_id = request.args.get('teacher_id', type=int)
        day_of_week = request.args.get('day_of_week')
        term = request.args.get('term')
        academic_year = request.args.get('academic_year')
        current_slot_id = request.args.get('slot_id', type=int)
        period_payload = TimetableService.get_period_option_payload(
            class_id=class_id,
            subject_id=subject_id,
            teacher_id=teacher_id,
            day_of_week=day_of_week,
            term=term,
            academic_year=academic_year,
            current_slot_id=current_slot_id,
        )
        return jsonify({
            'success': True,
            'data': period_payload['periods'],
            'meta': period_payload['meta'],
        }), 200

@timetable_bp.route('', methods=['GET'])
@timetable_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_slots():
    filters = {
        'academic_year': request.args.get('academic_year'),
        'term': request.args.get('term'),
        'class_id': request.args.get('class_id'),
        'teacher_id': request.args.get('teacher_id')
    }
    slots = TimetableService.get_all_slots(filters)
    return jsonify({
        'success': True,
        'data': slots
    }), 200

@timetable_bp.route('/slots', methods=['POST'])
@jwt_required()
@require_permission('timetable.manage')
def create_slot():
    slot, error = TimetableService.create_slot(request.json)
    if error:
        return jsonify({'success': False, 'message': error}), 400
    return jsonify({'success': True, 'id': slot.id}), 201

@timetable_bp.route('/slots/<int:slot_id>', methods=['PUT', 'DELETE'])
@jwt_required()
@require_permission('timetable.manage')
def manage_slot(slot_id):
    if request.method == 'DELETE':
        success, error = TimetableService.delete_slot(slot_id)
        if not success:
            return jsonify({'success': False, 'message': error}), 404 if error == "Slot not found" else 400
        return jsonify({'success': True, 'message': 'Slot deleted successfully'}), 200
    else:
        # PUT for update
        slot, error = TimetableService.update_slot(slot_id, request.json)
        if error:
            return jsonify({'success': False, 'message': error}), 400
        return jsonify({'success': True, 'id': slot.id}), 200

@timetable_bp.route('/check-conflicts', methods=['POST'])
@jwt_required()
def check_conflicts():
    conflicts = TimetableService.check_conflicts(request.json)
    return jsonify({
        'success': True,
        'conflicts': conflicts
    }), 200

@timetable_bp.route('/class/<int:class_id>', methods=['GET'])
@jwt_required()
def get_class_timetable(class_id):
    term = request.args.get('term')
    year = request.args.get('academic_year')
    timetable, error = TimetableService.get_class_timetable(class_id, term, year)
    return jsonify({'success': True, 'data': timetable}), 200

@timetable_bp.route('/teacher/<int:teacher_id>', methods=['GET'])
@jwt_required()
def get_teacher_timetable(teacher_id):
    term = request.args.get('term')
    year = request.args.get('academic_year')
    timetable, error = TimetableService.get_teacher_timetable(teacher_id, term, year)
    return jsonify({'success': True, 'data': timetable}), 200

@timetable_bp.route('/auto-schedule', methods=['POST'])
@jwt_required()
@require_permission('timetable.manage')
def auto_schedule():
    data = request.json
    count, errors = TimetableService.auto_schedule_greedy(data.get('term'), data.get('academic_year'))
    return jsonify({
        'success': True, 
        'allocated_slots': count,
        'errors': errors
    }), 200

@timetable_bp.route('', methods=['OPTIONS'])
@timetable_bp.route('/', methods=['OPTIONS'])
def handle_options():
    """Handle preflight OPTIONS requests."""
    return '', 200
