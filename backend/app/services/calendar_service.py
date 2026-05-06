import structlog
from datetime import datetime
from sqlalchemy import and_, extract
from app.extensions import db
from app.models.dashboard import CalendarEvent
from app.models.user import User
from app.services.notification_service import NotificationService

logger = structlog.get_logger()

class CalendarService:
    """Service for calendar-related operations."""
    
    @staticmethod
    def create_event(title, date, event_type, description='', created_by=None, target_roles=None, send_notification=True):
        """Create a new calendar event.
        
        Args:
            title (str): Event title
            date (str): Event date in ISO format
            event_type (str): Type of event (class, exam, meeting, holiday)
            description (str, optional): Event description
            created_by (int, optional): User ID of creator
            target_roles (list, optional): List of roles to target (admin, teacher, student, parent)
            send_notification (bool, optional): Whether to send notification
            
        Returns:
            CalendarEvent: The created event
        """
        try:
            # Parse date string to datetime object
            if isinstance(date, str):
                date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            
            # Create new event
            event = CalendarEvent(
                title=title,
                date=date,
                type=event_type,
                description=description
            )
            
            # Add to database
            db.session.add(event)
            db.session.commit()
            
            # Send notification if requested
            if send_notification and target_roles:
                notification_title = f"New {event_type} event: {title}"
                notification_message = f"A new {event_type} has been scheduled for {date.strftime('%B %d, %Y')}."
                
                # Send to specified roles
                for role in target_roles:
                    users = User.query.filter_by(role=role).all()
                    for user in users:
                        NotificationService.create_notification(
                            title=notification_title,
                            message=notification_message,
                            notification_type='info',
                            user_id=user.id
                        )
            
            return event
            
        except Exception as e:
            logger.error("Error creating calendar event", error=str(e))
            db.session.rollback()
            raise
    
    @staticmethod
    def get_events_for_user(user_id, start_date=None, end_date=None, event_type=None):
        """Get calendar events for a specific user.
        
        Args:
            user_id (int): User ID
            start_date (str, optional): Start date filter in ISO format
            end_date (str, optional): End date filter in ISO format
            event_type (str, optional): Filter by event type
            
        Returns:
            list: List of events as dictionaries
        """
        try:
            # Start with base query
            query = CalendarEvent.query
            
            # Apply date filters if provided
            if start_date:
                if isinstance(start_date, str):
                    start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(CalendarEvent.date >= start_date)
                
            if end_date:
                if isinstance(end_date, str):
                    end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(CalendarEvent.date <= end_date)
            
            # Filter by event type if provided
            if event_type:
                query = query.filter(CalendarEvent.type == event_type)
            
            # Get user's role to determine which events they should see
            user = User.query.get(user_id)
            if not user:
                return []
            
            # Order by date
            events = query.order_by(CalendarEvent.date).all()
            
            # Convert to dictionary format for API response
            result = []
            for event in events:
                result.append({
                    'id': event.id,
                    'title': event.title,
                    'date': event.date.isoformat(),
                    'type': event.type,
                    'description': event.description
                })
                
            return result
            
        except Exception as e:
            logger.error("Error fetching calendar events", error=str(e))
            raise
    
    @staticmethod
    def update_event(event_id, **kwargs):
        """Update an existing calendar event.
        
        Args:
            event_id (str): Event ID
            **kwargs: Fields to update
            
        Returns:
            CalendarEvent: The updated event
        """
        try:
            event = CalendarEvent.query.get(event_id)
            if not event:
                raise ValueError(f"Event with ID {event_id} not found")
            
            # Update fields
            for key, value in kwargs.items():
                if key == 'date' and isinstance(value, str):
                    value = datetime.fromisoformat(value.replace('Z', '+00:00'))
                if hasattr(event, key):
                    setattr(event, key, value)
            
            db.session.commit()
            return event
            
        except Exception as e:
            logger.error("Error updating calendar event", error=str(e))
            db.session.rollback()
            raise
    
    @staticmethod
    def delete_event(event_id):
        """Delete a calendar event.
        
        Args:
            event_id (str): Event ID
            
        Returns:
            bool: True if successful
        """
        try:
            event = CalendarEvent.query.get(event_id)
            if not event:
                raise ValueError(f"Event with ID {event_id} not found")
            
            db.session.delete(event)
            db.session.commit()
            return True
            
        except Exception as e:
            logger.error("Error deleting calendar event", error=str(e))
            db.session.rollback()
            raise
    
    # Add this method to the CalendarService class
    
    @staticmethod
    def get_shared_events(user_id, start_date=None, end_date=None):
        """Get calendar events shared with a specific user.
        
        Args:
            user_id (int): User ID
            start_date (str, optional): Start date filter in ISO format
            end_date (str, optional): End date filter in ISO format
            
        Returns:
            list: List of shared events as dictionaries
        """
        try:
            # Get user's role
            user = User.query.get(user_id)
            if not user:
                return []
            
            # Start with base query
            query = CalendarEvent.query
            
            # Apply date filters if provided
            if start_date:
                if isinstance(start_date, str):
                    start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(CalendarEvent.date >= start_date)
                
            if end_date:
                if isinstance(end_date, str):
                    end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(CalendarEvent.date <= end_date)
            
            # Order by date
            events = query.order_by(CalendarEvent.date).all()
            
            # Convert to dictionary format for API response
            result = []
            for event in events:
                # Check if this event is shared with the user's role
                # In a real implementation, you would have a many-to-many relationship
                # between events and roles or users
                result.append({
                    'id': event.id,
                    'title': event.title,
                    'date': event.date.isoformat(),
                    'type': event.type,
                    'description': event.description,
                    'shared_by': 'System'  # In a real implementation, this would be the actual user who shared it
                })
                
            return result
            
        except Exception as e:
            logger.error("Error fetching shared calendar events", error=str(e))
            raise

    @staticmethod
    def sync_with_class_schedule(class_id):
        """Sync calendar events with class schedule.
        
        Args:
            class_id (int): Class ID to sync schedule for
            
        Returns:
            list: List of created/updated events
        """
        try:
            # Get class details
            class_obj = Class.query.get(class_id)
            if not class_obj:
                raise ValueError(f"Class with ID {class_id} not found")
            
            # Parse class schedule
            days = class_obj.days.split(',') if class_obj.days else []
            start_time = class_obj.start_time
            end_time = class_obj.end_time
            
            # Get date range for current term (example: next 3 months)
            today = datetime.now().date()
            end_date = today + timedelta(days=90)
            
            # Create/update calendar events for each class session
            created_events = []
            current_date = today
            
            while current_date <= end_date:
                # Check if current day is in class schedule
                day_name = current_date.strftime('%A').lower()
                if day_name in [d.lower().strip() for d in days]:
                    # Create event title and description
                    title = f"{class_obj.name} Class"
                    description = f"Regular class for {class_obj.name} in {class_obj.room or 'TBD'}"
                    
                    # Check if event already exists
                    existing_event = CalendarEvent.query.filter(
                        CalendarEvent.title == title,
                        CalendarEvent.date == current_date,
                        CalendarEvent.type == 'class'
                    ).first()
                    
                    if existing_event:
                        # Update existing event
                        existing_event.description = description
                        existing_event.start_time = start_time
                        existing_event.end_time = end_time
                        db.session.commit()
                        created_events.append(existing_event)
                    else:
                        # Create new event
                        event = CalendarEvent(
                            title=title,
                            date=current_date,
                            type='class',
                            description=description,
                            start_time=start_time,
                            end_time=end_time,
                            location=class_obj.room
                        )
                        db.session.add(event)
                        db.session.commit()
                        created_events.append(event)
                
                # Move to next day
                current_date += timedelta(days=1)
            
            return created_events
            
        except Exception as e:
            logger.error("Error syncing class schedule with calendar", error=str(e))
            db.session.rollback()
            raise
    
    @staticmethod
    def sync_with_exams(exam_id=None):
        """Sync calendar events with exams.
        
        Args:
            exam_id (int, optional): Specific exam ID to sync, or all if None
            
        Returns:
            list: List of created/updated events
        """
        try:
            # Start with base query
            query = Exam.query
            
            # Filter by specific exam if provided
            if exam_id:
                query = query.filter(Exam.id == exam_id)
            
            # Get all exams (or specific one)
            exams = query.all()
            created_events = []
            
            for exam in exams:
                # Create event title and description
                title = f"{exam.title} - {exam.subject.name if exam.subject else 'Unknown Subject'}"
                description = exam.description or f"Exam for {exam.subject.name if exam.subject else 'Unknown Subject'}"
                
                # Calculate end time based on duration
                exam_date = exam.exam_date
                
                # Check if event already exists
                existing_event = CalendarEvent.query.filter(
                    CalendarEvent.title == title,
                    CalendarEvent.date == exam_date.date(),
                    CalendarEvent.type == 'exam'
                ).first()
                
                if existing_event:
                    # Update existing event
                    existing_event.description = description
                    existing_event.start_time = exam_date.strftime('%H:%M')
                    end_time = (exam_date + timedelta(minutes=exam.duration)).strftime('%H:%M')
                    existing_event.end_time = end_time
                    db.session.commit()
                    created_events.append(existing_event)
                else:
                    # Create new event
                    event = CalendarEvent(
                        title=title,
                        date=exam_date.date(),
                        type='exam',
                        description=description,
                        start_time=exam_date.strftime('%H:%M'),
                        end_time=(exam_date + timedelta(minutes=exam.duration)).strftime('%H:%M'),
                        location=f"Class {exam.class_.name if exam.class_ else 'Unknown'}"
                    )
                    db.session.add(event)
                    db.session.commit()
                    created_events.append(event)
            
            return created_events
            
        except Exception as e:
            logger.error("Error syncing exams with calendar", error=str(e))
            db.session.rollback()
            raise
    
    @staticmethod
    def sync_with_teacher_schedule(teacher_id):
        """Sync calendar events with teacher schedule.
        
        Args:
            teacher_id (int): Teacher ID to sync schedule for
            
        Returns:
            list: List of created/updated events
        """
        try:
            # Get teacher's classes
            classes = Class.query.filter(Class.teacher_id == teacher_id).all()
            created_events = []
            
            # Sync each class schedule
            for class_obj in classes:
                class_events = CalendarService.sync_with_class_schedule(class_obj.id)
                created_events.extend(class_events)
            
            return created_events
            
        except Exception as e:
            logger.error("Error syncing teacher schedule with calendar", error=str(e))
            raise

    @staticmethod
    def get_events_with_sync_token(user_id, sync_token=None, start_date=None, end_date=None):
        """Get calendar events with sync token for offline synchronization.
        
        Args:
            user_id (int): User ID
            sync_token (str, optional): Previous sync token
            start_date (str, optional): Start date filter in ISO format
            end_date (str, optional): End date filter in ISO format
            
        Returns:
            dict: Dictionary with events and new sync token
        """
        try:
            # Start with base query
            query = CalendarEvent.query
            
            # Apply date filters if provided
            if start_date:
                if isinstance(start_date, str):
                    start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(CalendarEvent.date >= start_date)
                
            if end_date:
                if isinstance(end_date, str):
                    end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(CalendarEvent.date <= end_date)
            
            # If sync token provided, only get events updated since that time
            if sync_token:
                try:
                    # Sync token is a timestamp
                    last_sync = datetime.fromisoformat(sync_token.replace('Z', '+00:00'))
                    query = query.filter(CalendarEvent.updated_at >= last_sync)
                except (ValueError, TypeError):
                    # Invalid sync token, ignore it
                    pass
            
            # Get user's role to determine which events they should see
            user = User.query.get(user_id)
            if not user:
                return {'events': [], 'sync_token': datetime.utcnow().isoformat()}
            
            # Order by date
            events = query.order_by(CalendarEvent.date).all()
            
            # Convert to dictionary format for API response
            result = []
            for event in events:
                result.append({
                    'id': event.id,
                    'title': event.title,
                    'date': event.date.isoformat(),
                    'type': event.type,
                    'description': event.description,
                    'location': event.location,
                    'start_time': event.start_time,
                    'end_time': event.end_time,
                    'updated_at': event.updated_at.isoformat() if event.updated_at else None
                })
            
            # Generate new sync token (current timestamp)
            new_sync_token = datetime.utcnow().isoformat()
            
            return {
                'events': result,
                'sync_token': new_sync_token
            }
            
        except Exception as e:
            logger.error("Error fetching calendar events with sync token", error=str(e))
            raise
    
    @staticmethod
    def resolve_conflicts(server_event, client_event):
        """Resolve conflicts between server and client versions of an event.
        
        Args:
            server_event (dict): Server version of the event
            client_event (dict): Client version of the event
            
        Returns:
            dict: Resolved event
        """
        # Simple last-write-wins strategy
        server_updated = datetime.fromisoformat(server_event.get('updated_at', '2000-01-01T00:00:00').replace('Z', '+00:00'))
        client_updated = datetime.fromisoformat(client_event.get('updated_at', '2000-01-01T00:00:00').replace('Z', '+00:00'))
        
        if client_updated > server_updated:
            return client_event
        return server_event
    
    @staticmethod
    def sync_offline_changes(user_id, client_events):
        """Sync offline changes from client.
        
        Args:
            user_id (int): User ID
            client_events (list): List of events modified offline
            
        Returns:
            dict: Dictionary with sync results
        """
        try:
            results = {
                'created': [],
                'updated': [],
                'conflicts': [],
                'errors': []
            }
            
            for event_data in client_events:
                event_id = event_data.get('id')
                
                # Check if this is a new event or an update
                if event_id and event_id.startswith('temp_'):
                    # This is a new event created offline
                    try:
                        # Remove the temporary ID
                        del event_data['id']
                        
                        # Create new event
                        new_event = CalendarService.create_event(
                            title=event_data.get('title'),
                            date=event_data.get('date'),
                            event_type=event_data.get('type'),
                            description=event_data.get('description', ''),
                            created_by=user_id,
                            # Don't send notifications for events created offline
                            send_notification=False
                        )
                        
                        results['created'].append({
                            'temp_id': event_id,
                            'server_id': new_event.id,
                            'title': new_event.title
                        })
                    except Exception as e:
                        results['errors'].append({
                            'temp_id': event_id,
                            'error': str(e)
                        })
                elif event_id:
                    # This is an update to an existing event
                    try:
                        # Get the server version
                        server_event = CalendarEvent.query.get(event_id)
                        
                        if server_event:
                            # Check for conflicts
                            if server_event.updated_at and 'updated_at' in event_data:
                                server_updated = server_event.updated_at
                                client_updated = datetime.fromisoformat(event_data['updated_at'].replace('Z', '+00:00'))
                                
                                if server_updated > client_updated:
                                    # Server version is newer, potential conflict
                                    results['conflicts'].append({
                                        'id': event_id,
                                        'server_version': {
                                            'title': server_event.title,
                                            'date': server_event.date.isoformat(),
                                            'updated_at': server_event.updated_at.isoformat()
                                        },
                                        'client_version': {
                                            'title': event_data.get('title'),
                                            'date': event_data.get('date'),
                                            'updated_at': event_data.get('updated_at')
                                        }
                                    })
                                    continue
                            
                            # Update the event
                            update_data = {}
                            for key, value in event_data.items():
                                if key not in ['id', 'updated_at', 'created_at']:
                                    update_data[key] = value
                            
                            updated_event = CalendarService.update_event(event_id, **update_data)
                            
                            results['updated'].append({
                                'id': updated_event.id,
                                'title': updated_event.title
                            })
                        else:
                            # Event doesn't exist on server
                            results['errors'].append({
                                'id': event_id,
                                'error': 'Event not found on server'
                            })
                    except Exception as e:
                        results['errors'].append({
                            'id': event_id,
                            'error': str(e)
                        })
            
            return results
            
        except Exception as e:
            logger.error("Error syncing offline changes", error=str(e))
            raise