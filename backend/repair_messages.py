import os
from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.extensions import db
from app.models.message import Message
from app.models.user import User
from app.models.parent import Parent
from app.models.student import Student
from app.services.message_service import MessageService

def repair_messages():
    app = create_app()
    with app.app_context():
        try:
            # Query all messages with recipient_type = 'parent'
            messages = Message.query.filter_by(recipient_type='parent').all()
            print(f"Found {len(messages)} messages with recipient_type = 'parent'")
            
            repaired_count = 0
            for msg in messages:
                recipient_id = msg.recipient_id
                
                # Check if recipient_id is already a user ID of a parent user
                user = User.query.get(recipient_id)
                if user and MessageService._get_user_type(user) == 'parent':
                    # Already correct
                    continue
                
                resolved_user_id = None
                
                # Try Parent profile table resolution
                parent = Parent.query.get(recipient_id)
                if parent:
                    resolved_user_id = parent.user_id
                    print(f"Message ID {msg.id}: Resolved recipient_id {recipient_id} via Parent profile ID -> user_id {resolved_user_id}")
                else:
                    # Try Student profile table fallback
                    student = Student.query.get(recipient_id)
                    if student and student.parent_id:
                        parent = Parent.query.get(student.parent_id)
                        if parent:
                            resolved_user_id = parent.user_id
                            print(f"Message ID {msg.id}: Resolved recipient_id {recipient_id} via Student profile ID {student.id} -> parent profile ID {student.parent_id} -> user_id {resolved_user_id}")
                
                if resolved_user_id:
                    # Update message in DB
                    msg.recipient_id = resolved_user_id
                    repaired_count += 1
                else:
                    print(f"WARNING: Message ID {msg.id} has recipient_id {recipient_id} but could not be resolved to any parent or student profile.")
            
            if repaired_count > 0:
                db.session.commit()
                print(f"Successfully repaired {repaired_count} messages.")
            else:
                print("No messages needed repair.")
                
        except Exception as e:
            print(f"Error repairing messages: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    repair_messages()
