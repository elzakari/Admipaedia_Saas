"""
Real-time Service

This service handles WebSocket connections and real-time features like:
- Live notifications
- Real-time chat/messaging
- Live dashboard updates
- Attendance tracking updates
- Grade updates
"""

import asyncio
import json
import logging
from typing import Dict, List, Set, Optional, Any
from datetime import datetime
from app.services.cache_service import get_cache_service
from app.services.cache_invalidation_service import CacheInvalidationService

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time features"""
    
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[int, Set] = {}
        # Store connections by room/channel
        self.rooms: Dict[str, Set[int]] = {}
        # Store user metadata
        self.user_metadata: Dict[int, Dict] = {}
        
    async def connect(self, websocket, user_id: int, user_role: str):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        self.user_metadata[user_id] = {
            'role': user_role,
            'connected_at': datetime.utcnow(),
            'last_activity': datetime.utcnow()
        }
        
        logger.info(f"User {user_id} connected via WebSocket")
        
        # Send connection confirmation
        await self.send_personal_message({
            'type': 'connection_confirmed',
            'message': 'Connected to real-time service',
            'timestamp': datetime.utcnow().isoformat()
        }, user_id)
    
    def disconnect(self, websocket, user_id: int):
        """Remove a WebSocket connection"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            
            # Remove user if no more connections
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                if user_id in self.user_metadata:
                    del self.user_metadata[user_id]
        
        # Remove from all rooms
        for room_users in self.rooms.values():
            room_users.discard(user_id)
        
        logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(self, message: Dict, user_id: int):
        """Send message to a specific user"""
        if user_id in self.active_connections:
            message_str = json.dumps(message)
            disconnected_sockets = set()
            
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(message_str)
                except:
                    disconnected_sockets.add(websocket)
            
            # Clean up disconnected sockets
            for socket in disconnected_sockets:
                self.active_connections[user_id].discard(socket)
    
    async def send_to_room(self, message: Dict, room: str):
        """Send message to all users in a room"""
        if room in self.rooms:
            for user_id in self.rooms[room]:
                await self.send_personal_message(message, user_id)
    
    async def broadcast(self, message: Dict):
        """Send message to all connected users"""
        for user_id in self.active_connections:
            await self.send_personal_message(message, user_id)
    
    def join_room(self, user_id: int, room: str):
        """Add user to a room"""
        if room not in self.rooms:
            self.rooms[room] = set()
        self.rooms[room].add(user_id)
        logger.info(f"User {user_id} joined room {room}")
    
    def leave_room(self, user_id: int, room: str):
        """Remove user from a room"""
        if room in self.rooms:
            self.rooms[room].discard(user_id)
            if not self.rooms[room]:
                del self.rooms[room]
        logger.info(f"User {user_id} left room {room}")
    
    def get_connected_users(self) -> List[int]:
        """Get list of all connected user IDs"""
        return list(self.active_connections.keys())
    
    def is_user_online(self, user_id: int) -> bool:
        """Check if a user is currently online"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


class RealtimeService:
    """Service for handling real-time features"""
    
    def __init__(self):
        self.connection_manager = ConnectionManager()
        self.cache_service = get_cache_service()
        self.cache_invalidation = CacheInvalidationService()
    
    # === NOTIFICATION REAL-TIME FEATURES ===
    
    async def send_notification(self, user_id: int, notification_data: Dict):
        """Send real-time notification to a user"""
        try:
            message = {
                'type': 'notification',
                'data': notification_data,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            await self.connection_manager.send_personal_message(message, user_id)
            
            # Invalidate notifications cache
            self.cache_invalidation.invalidate_user_notifications_cache(user_id)
            
            logger.info(f"Sent real-time notification to user {user_id}")
            
        except Exception as e:
            logger.error(f"Error sending real-time notification: {e}")
    
    async def broadcast_announcement(self, announcement_data: Dict, target_roles: List[str] = None):
        """Broadcast announcement to users with specific roles"""
        try:
            message = {
                'type': 'announcement',
                'data': announcement_data,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            if target_roles:
                # Send to users with specific roles
                for user_id in self.connection_manager.get_connected_users():
                    user_role = self.connection_manager.user_metadata.get(user_id, {}).get('role')
                    if user_role in target_roles:
                        await self.connection_manager.send_personal_message(message, user_id)
            else:
                # Broadcast to all users
                await self.connection_manager.broadcast(message)
            
            logger.info(f"Broadcasted announcement to roles: {target_roles}")
            
        except Exception as e:
            logger.error(f"Error broadcasting announcement: {e}")
    
    # === ACADEMIC REAL-TIME UPDATES ===
    
    async def notify_grade_update(self, student_id: int, grade_data: Dict):
        """Notify student and parents about grade updates"""
        try:
            message = {
                'type': 'grade_update',
                'data': grade_data,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Send to student
            await self.connection_manager.send_personal_message(message, student_id)
            
            # Get parent user IDs and send to them as well
            try:
                from app.models.parent import Parent
                from app.models.associations import student_parent_association
                from app.database import db
                
                # Query to get parent user IDs for this student
                parent_users = db.session.query(Parent.user_id).join(
                    student_parent_association,
                    Parent.id == student_parent_association.c.parent_id
                ).filter(
                    student_parent_association.c.student_id == student_id
                ).all()
                
                # Send notifications to all parent users
                parent_message = {
                    'type': 'child_grade_update',
                    'data': {
                        **grade_data,
                        'student_id': student_id
                    },
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                for parent_user in parent_users:
                    if parent_user.user_id:
                        await self.connection_manager.send_personal_message(parent_message, parent_user.user_id)
                
                logger.info(f"Sent grade update notification to student {student_id} and {len(parent_users)} parents")
                
            except Exception as parent_error:
                logger.warning(f"Could not send grade update to parents for student {student_id}: {parent_error}")
            
            # Invalidate related caches
            self.cache_invalidation.invalidate_student_grades_cache(student_id)
            
        except Exception as e:
            logger.error(f"Error sending grade update notification: {e}")
    
    async def notify_attendance_update(self, student_id: int, attendance_data: Dict):
        """Notify about attendance updates"""
        try:
            message = {
                'type': 'attendance_update',
                'data': attendance_data,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Send to student
            await self.connection_manager.send_personal_message(message, student_id)
            
            # Invalidate related caches
            self.cache_invalidation.invalidate_student_attendance_cache(student_id)
            
            logger.info(f"Sent attendance update notification to student {student_id}")
            
        except Exception as e:
            logger.error(f"Error sending attendance update notification: {e}")
    
    async def notify_exam_schedule(self, class_id: int, exam_data: Dict):
        """Notify class about exam schedule updates"""
        try:
            message = {
                'type': 'exam_schedule',
                'data': exam_data,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Send to class room
            room_name = f"class_{class_id}"
            await self.connection_manager.send_to_room(message, room_name)
            
            # Invalidate exam caches
            self.cache_invalidation.invalidate_upcoming_exams_cache(class_id)
            
            logger.info(f"Sent exam schedule notification to class {class_id}")
            
        except Exception as e:
            logger.error(f"Error sending exam schedule notification: {e}")
    
    # === DASHBOARD REAL-TIME UPDATES ===
    
    async def update_teacher_dashboard(self, teacher_id: int, analytics_data: Dict):
        """Send real-time dashboard updates to teacher"""
        try:
            message = {
                'type': 'dashboard_update',
                'data': analytics_data,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            await self.connection_manager.send_personal_message(message, teacher_id)
            
            # Invalidate analytics cache
            self.cache_invalidation.invalidate_teacher_analytics_cache(teacher_id)
            
            logger.info(f"Sent dashboard update to teacher {teacher_id}")
            
        except Exception as e:
            logger.error(f"Error sending dashboard update: {e}")
    
    async def update_student_dashboard(self, student_id: int, dashboard_data: Dict):
        """Send real-time dashboard updates to student"""
        try:
            message = {
                'type': 'dashboard_update',
                'data': dashboard_data,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            await self.connection_manager.send_personal_message(message, student_id)
            
            logger.info(f"Sent dashboard update to student {student_id}")
            
        except Exception as e:
            logger.error(f"Error sending dashboard update: {e}")
    
    # === MESSAGING REAL-TIME FEATURES ===
    
    async def send_message(self, sender_id: int, recipient_id: int, message_data: Dict):
        """Send real-time message between users"""
        try:
            message = {
                'type': 'message',
                'data': {
                    'sender_id': sender_id,
                    'recipient_id': recipient_id,
                    **message_data
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Send to recipient
            await self.connection_manager.send_personal_message(message, recipient_id)
            
            # Send confirmation to sender
            confirmation = {
                'type': 'message_sent',
                'data': {'message_id': message_data.get('id')},
                'timestamp': datetime.utcnow().isoformat()
            }
            await self.connection_manager.send_personal_message(confirmation, sender_id)
            
            logger.info(f"Sent real-time message from {sender_id} to {recipient_id}")
            
        except Exception as e:
            logger.error(f"Error sending real-time message: {e}")
    
    # === ROOM MANAGEMENT ===
    
    def join_class_room(self, user_id: int, class_id: int):
        """Add user to class-specific room"""
        room_name = f"class_{class_id}"
        self.connection_manager.join_room(user_id, room_name)
    
    def leave_class_room(self, user_id: int, class_id: int):
        """Remove user from class-specific room"""
        room_name = f"class_{class_id}"
        self.connection_manager.leave_room(user_id, room_name)
    
    def join_subject_room(self, user_id: int, subject_id: int):
        """Add user to subject-specific room"""
        room_name = f"subject_{subject_id}"
        self.connection_manager.join_room(user_id, room_name)
    
    def leave_subject_room(self, user_id: int, subject_id: int):
        """Remove user from subject-specific room"""
        room_name = f"subject_{subject_id}"
        self.connection_manager.leave_room(user_id, room_name)
    
    # === UTILITY METHODS ===
    
    def get_online_users(self) -> List[int]:
        """Get list of currently online users"""
        return self.connection_manager.get_connected_users()
    
    def is_user_online(self, user_id: int) -> bool:
        """Check if a specific user is online"""
        return self.connection_manager.is_user_online(user_id)
    
    async def send_system_message(self, message: str, user_ids: List[int] = None):
        """Send system message to specific users or all users"""
        try:
            system_message = {
                'type': 'system_message',
                'data': {'message': message},
                'timestamp': datetime.utcnow().isoformat()
            }
            
            if user_ids:
                for user_id in user_ids:
                    await self.connection_manager.send_personal_message(system_message, user_id)
            else:
                await self.connection_manager.broadcast(system_message)
            
            logger.info(f"Sent system message to {len(user_ids) if user_ids else 'all'} users")
            
        except Exception as e:
            logger.error(f"Error sending system message: {e}")
    
    # === PERFORMANCE MONITORING ===
    
    def get_connection_stats(self) -> Dict:
        """Get real-time connection statistics"""
        return {
            'total_connections': len(self.connection_manager.get_connected_users()),
            'active_rooms': len(self.connection_manager.rooms),
            'users_by_role': self._get_users_by_role(),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _get_users_by_role(self) -> Dict[str, int]:
        """Get count of users by role"""
        role_counts = {}
        for user_id, metadata in self.connection_manager.user_metadata.items():
            role = metadata.get('role', 'unknown')
            role_counts[role] = role_counts.get(role, 0) + 1
        return role_counts


# Global instance
realtime_service = RealtimeService()