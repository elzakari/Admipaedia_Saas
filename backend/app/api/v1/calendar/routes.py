# Create calendar routes
from flask import request, jsonify, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1.calendar import calendar_bp
from app.services.calendar_service import CalendarService
from app.utils.auth_utils import admin_required, teacher_required
from marshmallow import ValidationError
from datetime import datetime
import pytz
from app.utils.tenant_context import tenant_required
from app.schemas.academic_term import AcademicTermSchema
from app.services.academic_term_service import AcademicTermService

try:
    from icalendar import Calendar as iCalendar, Event as iEvent
except ModuleNotFoundError:
    iCalendar = None
    iEvent = None

academic_term_schema = AcademicTermSchema()

@calendar_bp.route('/events', methods=['POST'])
@jwt_required()
@teacher_required
def create_event():
    """Create a new calendar event."""
    try:
        data = request.json
        
        # Validate required fields
        if not all(k in data for k in ('title', 'date', 'type')):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        # Create event
        event = CalendarService.create_event(
            title=data['title'],
            date=data['date'],
            event_type=data['type'],
            description=data.get('description', ''),
            created_by=get_jwt_identity(),
            target_roles=data.get('target_roles', []),
            send_notification=data.get('send_notification', True),
            location=data.get('location'),
            start_time=data.get('start_time'),
            end_time=data.get('end_time')
        )
        
        return jsonify({
            'success': True,
            'message': 'Event created successfully',
            'event': {
                'id': event.id,
                'title': event.title,
                'date': event.date.isoformat(),
                'type': event.type,
                'description': event.description,
                'location': event.location,
                'start_time': event.start_time,
                'end_time': event.end_time
            }
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error creating event: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create event'
        }), 500

@calendar_bp.route('/events', methods=['GET'])
@jwt_required()
def get_events():
    """Get calendar events for the current user."""
    try:
        user_id = get_jwt_identity()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        event_type = request.args.get('type')
        
        events = CalendarService.get_events_for_user(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            event_type=event_type
        )
        
        return jsonify({
            'success': True,
            'events': events
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching events: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch events'
        }), 500

@calendar_bp.route('/events/<event_id>', methods=['PUT'])
@jwt_required()
@teacher_required
def update_event(event_id):
    """Update an existing calendar event."""
    try:
        data = request.json
        
        # Update event
        event = CalendarService.update_event(
            event_id=event_id,
            **data
        )
        
        return jsonify({
            'success': True,
            'message': 'Event updated successfully',
            'event': {
                'id': event.id,
                'title': event.title,
                'date': event.date.isoformat(),
                'type': event.type,
                'description': event.description,
                'location': event.location,
                'start_time': event.start_time,
                'end_time': event.end_time
            }
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 404
    except Exception as e:
        current_app.logger.error(f"Error updating event: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update event'
        }), 500

@calendar_bp.route('/events/<event_id>', methods=['DELETE'])
@jwt_required()
@teacher_required
def delete_event(event_id):
    """Delete a calendar event."""
    try:
        CalendarService.delete_event(event_id)
        
        return jsonify({
            'success': True,
            'message': 'Event deleted successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 404
    except Exception as e:
        current_app.logger.error(f"Error deleting event: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to delete event'
        }), 500

@calendar_bp.route('/events/shared', methods=['GET'])
@jwt_required()
def get_shared_events():
    """Get calendar events shared with the current user."""
    try:
        user_id = get_jwt_identity()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        events = CalendarService.get_shared_events(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )
        
        return jsonify({
            'success': True,
            'events': events
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching shared events: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch shared events'
        }), 500

@calendar_bp.route('/events/export', methods=['GET'])
@jwt_required()
def export_events():
    """Export calendar events as iCalendar (.ics) file."""
    try:
        user_id = get_jwt_identity()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        event_type = request.args.get('type')
        
        # Get events for the user
        events = CalendarService.get_events_for_user(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            event_type=event_type
        )
        
        # Lazy import to avoid startup crash when package is missing
        if iCalendar is None or iEvent is None:
            return jsonify({
                'success': False,
                'message': 'icalendar package not installed. Please install it to use export.'
            }), 500
        
        # Create iCalendar object
        cal = iCalendar()
        cal.add('prodid', '-//ADMIPAEDIA//Calendar//EN')
        cal.add('version', '2.0')
        
        # Add events to calendar
        for event_data in events:
            event = iEvent()
            event.add('summary', event_data['title'])
            event.add('description', event_data.get('description', ''))
            event.add('dtstart', datetime.fromisoformat(event_data['date']))
            event.add('dtend', datetime.fromisoformat(event_data['date']))
            event.add('uid', event_data['id'])
            cal.add_component(event)
        
        # Return as attachment
        response = current_app.response_class(
            cal.to_ical(),
            mimetype='text/calendar'
        )
        response.headers['Content-Disposition'] = 'attachment; filename=calendar.ics'
        return response
        
    except Exception as e:
        current_app.logger.error(f"Error exporting events: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to export events'
        }), 500

@calendar_bp.route('/events/import', methods=['POST'])
@jwt_required()
@teacher_required
def import_events():
    """Import calendar events from iCalendar (.ics) file."""
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file provided'
            }), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
            
        if not file.filename.endswith('.ics'):
            return jsonify({
                'success': False,
                'message': 'File must be an iCalendar (.ics) file'
            }), 400
        
        # Parse iCalendar file
        cal_data = file.read()
        if iCalendar is None:
            return jsonify({
                'success': False,
                'message': 'icalendar package not installed. Please install it to use import.'
            }), 500

        cal = iCalendar.from_ical(cal_data)
        
        # Process events
        imported_events = []
        for component in cal.walk():
            if component.name == "VEVENT":
                # Extract event data
                title = str(component.get('summary', 'Imported Event'))
                description = str(component.get('description', ''))
                start_date = component.get('dtstart').dt
                
                # Convert datetime to string format
                if isinstance(start_date, datetime):
                    date_str = start_date.strftime('%Y-%m-%d')
                else:
                    date_str = start_date.isoformat()
                
                # Create event
                event = CalendarService.create_event(
                    title=title,
                    date=date_str,
                    event_type='meeting',  # Default type
                    description=description,
                    created_by=get_jwt_identity(),
                    send_notification=False
                )
                
                imported_events.append({
                    'id': event.id,
                    'title': event.title,
                    'date': event.date.isoformat(),
                    'type': event.type,
                    'description': event.description
                })
        
        return jsonify({
            'success': True,
            'message': f'Successfully imported {len(imported_events)} events',
            'events': imported_events
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error importing events: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to import events'
        }), 500


@calendar_bp.route('/terms', methods=['GET'])
@jwt_required()
@admin_required
@tenant_required
def list_academic_terms():
    terms = AcademicTermService.list_terms(getattr(g, 'tenant_id', None))
    payload = []
    for t in terms:
        row = academic_term_schema.dump(t)
        row['status'] = AcademicTermService.compute_status(t)
        payload.append(row)
    return jsonify({'success': True, 'terms': payload}), 200


@calendar_bp.route('/terms', methods=['POST'])
@jwt_required()
@admin_required
@tenant_required
def create_academic_term():
    try:
        data = academic_term_schema.load(request.get_json() or {})
    except ValidationError as e:
        return jsonify({'success': False, 'message': 'Validation error', 'errors': e.messages}), 400

    term = AcademicTermService.create_term(
        tenant_id=getattr(g, 'tenant_id', None),
        name=data['name'],
        start_date=data['start_date'],
        end_date=data['end_date'],
    )
    out = academic_term_schema.dump(term)
    out['status'] = AcademicTermService.compute_status(term)
    return jsonify({'success': True, 'term': out}), 201


@calendar_bp.route('/terms/<int:term_id>', methods=['PUT'])
@jwt_required()
@admin_required
@tenant_required
def update_academic_term(term_id):
    try:
        data = academic_term_schema.load(request.get_json() or {}, partial=True)
    except ValidationError as e:
        return jsonify({'success': False, 'message': 'Validation error', 'errors': e.messages}), 400

    term = AcademicTermService.update_term(term_id, getattr(g, 'tenant_id', None), **data)
    if not term:
        return jsonify({'success': False, 'message': 'Term not found'}), 404
    out = academic_term_schema.dump(term)
    out['status'] = AcademicTermService.compute_status(term)
    return jsonify({'success': True, 'term': out}), 200


@calendar_bp.route('/terms/<int:term_id>', methods=['DELETE'])
@jwt_required()
@admin_required
@tenant_required
def delete_academic_term(term_id):
    ok = AcademicTermService.delete_term(term_id, getattr(g, 'tenant_id', None))
    if not ok:
        return jsonify({'success': False, 'message': 'Term not found'}), 404
    return jsonify({'success': True}), 200
