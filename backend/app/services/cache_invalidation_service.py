"""
Cache Invalidation Service

This service handles cache invalidation when data is updated, ensuring cache consistency
and preventing stale data from being served to users.
"""

from typing import List, Optional, Union
from app.services.cache_service import get_cache_service
import logging

logger = logging.getLogger(__name__)

class CacheInvalidationService:
    """Service for managing cache invalidation across the application"""
    
    def __init__(self):
        self.cache_service = get_cache_service()
    
    # === STUDENT CACHE INVALIDATION ===
    
    def invalidate_student_cache(self, student_id: int, user_id: Optional[int] = None) -> None:
        """Invalidate all cache entries related to a student"""
        try:
            # Direct student cache
            self.cache_service.delete(f"student:{student_id}")
            self.cache_service.delete(f"student:dto:{student_id}")
            
            # User-related caches if user_id provided
            if user_id:
                self.cache_service.delete(f"user_notifications:{user_id}:*")
            
            logger.info(f"Invalidated student cache for student_id: {student_id}")
        except Exception as e:
            logger.error(f"Error invalidating student cache: {e}")
    
    def invalidate_student_grades_cache(self, student_id: int) -> None:
        """Invalidate grade-related caches for a student"""
        try:
            # Student cache (includes grades via joinedload)
            self.cache_service.delete(f"student:{student_id}")
            self.cache_service.delete(f"student:dto:{student_id}")
            
            # Analytics cache that might include this student
            self.cache_service.delete_pattern("teacher_dashboard_analytics:*")
            
            logger.info(f"Invalidated grade cache for student_id: {student_id}")
        except Exception as e:
            logger.error(f"Error invalidating student grades cache: {e}")
    
    def invalidate_student_attendance_cache(self, student_id: int) -> None:
        """Invalidate attendance-related caches for a student"""
        try:
            # Student cache (includes attendance via joinedload)
            self.cache_service.delete(f"student:{student_id}")
            self.cache_service.delete(f"student:dto:{student_id}")
            
            # Analytics cache that might include this student
            self.cache_service.delete_pattern("teacher_dashboard_analytics:*")
            
            logger.info(f"Invalidated attendance cache for student_id: {student_id}")
        except Exception as e:
            logger.error(f"Error invalidating student attendance cache: {e}")
    
    # === TEACHER CACHE INVALIDATION ===
    
    def invalidate_teacher_cache(self, teacher_id: int, user_id: Optional[int] = None) -> None:
        """Invalidate all cache entries related to a teacher"""
        try:
            # Direct teacher cache
            self.cache_service.delete(f"teacher:{teacher_id}")
            self.cache_service.delete(f"teacher:dto:{teacher_id}")
            
            # Teacher dashboard analytics
            self.cache_service.delete(f"teacher_dashboard_analytics:{teacher_id}")
            
            # User-related caches if user_id provided
            if user_id:
                self.cache_service.delete(f"user_notifications:{user_id}:*")
            
            logger.info(f"Invalidated teacher cache for teacher_id: {teacher_id}")
        except Exception as e:
            logger.error(f"Error invalidating teacher cache: {e}")
    
    # === PARENT CACHE INVALIDATION ===
    
    def invalidate_parent_cache(self, parent_id: int, user_id: Optional[int] = None) -> None:
        """Invalidate all cache entries related to a parent"""
        try:
            # Direct parent cache
            self.cache_service.delete(f"parent:{parent_id}")
            
            # User-related caches if user_id provided
            if user_id:
                self.cache_service.delete(f"user_notifications:{user_id}:*")
            
            logger.info(f"Invalidated parent cache for parent_id: {parent_id}")
        except Exception as e:
            logger.error(f"Error invalidating parent cache: {e}")
    
    # === GRADE CACHE INVALIDATION ===
    
    def invalidate_grade_cache(self, grade_id: int, student_id: Optional[int] = None, 
                              exam_id: Optional[int] = None) -> None:
        """Invalidate all cache entries related to a grade"""
        try:
            # Direct grade cache
            self.cache_service.delete(f"grade:{grade_id}")
            self.cache_service.delete(f"grade:dto:{grade_id}")
            
            # Related student cache
            if student_id:
                self.cache_service.delete(f"student:{student_id}")
                self.cache_service.delete(f"student:dto:{student_id}")
            
            # Related exam cache
            if exam_id:
                self.cache_service.delete(f"exam:{exam_id}")
                self.cache_service.delete(f"exam:dto:{exam_id}")
            
            # Analytics cache
            self.cache_service.delete_pattern("teacher_dashboard_analytics:*")
            
            logger.info(f"Invalidated grade cache for grade_id: {grade_id}")
        except Exception as e:
            logger.error(f"Error invalidating grade cache: {e}")
    
    # === ATTENDANCE CACHE INVALIDATION ===
    
    def invalidate_attendance_cache(self, attendance_id: int, student_id: Optional[int] = None,
                                   class_id: Optional[int] = None) -> None:
        """Invalidate all cache entries related to attendance"""
        try:
            # Direct attendance cache
            self.cache_service.delete(f"attendance:{attendance_id}")
            self.cache_service.delete(f"attendance:dto:{attendance_id}")
            
            # Related student cache
            if student_id:
                self.cache_service.delete(f"student:{student_id}")
                self.cache_service.delete(f"student:dto:{student_id}")
            
            # Analytics cache
            self.cache_service.delete_pattern("teacher_dashboard_analytics:*")
            
            logger.info(f"Invalidated attendance cache for attendance_id: {attendance_id}")
        except Exception as e:
            logger.error(f"Error invalidating attendance cache: {e}")
    
    # === EXAM CACHE INVALIDATION ===
    
    def invalidate_exam_cache(self, exam_id: int, class_id: Optional[int] = None) -> None:
        """Invalidate all cache entries related to an exam"""
        try:
            # Direct exam cache
            self.cache_service.delete(f"exam:{exam_id}")
            self.cache_service.delete(f"exam:dto:{exam_id}")
            
            # Upcoming exams cache (all variations)
            self.cache_service.delete_pattern("upcoming_exams:*")
            self.cache_service.delete_pattern("upcoming_exams:dto:*")
            
            # Analytics cache
            self.cache_service.delete_pattern("teacher_dashboard_analytics:*")
            
            logger.info(f"Invalidated exam cache for exam_id: {exam_id}")
        except Exception as e:
            logger.error(f"Error invalidating exam cache: {e}")
    
    def invalidate_upcoming_exams_cache(self, class_id: Optional[int] = None) -> None:
        """Invalidate upcoming exams cache"""
        try:
            if class_id:
                # Specific class upcoming exams
                self.cache_service.delete_pattern(f"upcoming_exams:class_{class_id}:*")
                self.cache_service.delete_pattern(f"upcoming_exams:dto:class_{class_id}:*")
            else:
                # All upcoming exams
                self.cache_service.delete_pattern("upcoming_exams:*")
            
            logger.info(f"Invalidated upcoming exams cache for class_id: {class_id}")
        except Exception as e:
            logger.error(f"Error invalidating upcoming exams cache: {e}")
    
    # === NOTIFICATION CACHE INVALIDATION ===
    
    def invalidate_user_notifications_cache(self, user_id: int) -> None:
        """Invalidate all notification caches for a user"""
        try:
            # All variations of user notifications cache
            self.cache_service.delete_pattern(f"user_notifications:{user_id}:*")
            
            logger.info(f"Invalidated notifications cache for user_id: {user_id}")
        except Exception as e:
            logger.error(f"Error invalidating user notifications cache: {e}")
    
    # === ANALYTICS CACHE INVALIDATION ===
    
    def invalidate_teacher_analytics_cache(self, teacher_id: Optional[int] = None) -> None:
        """Invalidate teacher dashboard analytics cache"""
        try:
            if teacher_id:
                # Specific teacher analytics
                self.cache_service.delete(f"teacher_dashboard_analytics:{teacher_id}")
            else:
                # All teacher analytics
                self.cache_service.delete_pattern("teacher_dashboard_analytics:*")
            
            logger.info(f"Invalidated analytics cache for teacher_id: {teacher_id}")
        except Exception as e:
            logger.error(f"Error invalidating teacher analytics cache: {e}")
    
    # === BULK INVALIDATION METHODS ===
    
    def invalidate_class_related_cache(self, class_id: int) -> None:
        """Invalidate all cache entries related to a class"""
        try:
            # Upcoming exams for this class
            self.cache_service.delete_pattern(f"upcoming_exams:class_{class_id}:*")
            
            # Analytics cache (might include this class)
            self.cache_service.delete_pattern("teacher_dashboard_analytics:*")
            
            logger.info(f"Invalidated class-related cache for class_id: {class_id}")
        except Exception as e:
            logger.error(f"Error invalidating class-related cache: {e}")
    
    def invalidate_subject_related_cache(self, subject_id: int) -> None:
        """Invalidate all cache entries related to a subject"""
        try:
            # Analytics cache (might include this subject)
            self.cache_service.delete_pattern("teacher_dashboard_analytics:*")
            
            logger.info(f"Invalidated subject-related cache for subject_id: {subject_id}")
        except Exception as e:
            logger.error(f"Error invalidating subject-related cache: {e}")
    
    def invalidate_user_related_cache(self, user_id: int) -> None:
        """Invalidate all cache entries related to a user"""
        try:
            # User notifications
            self.cache_service.delete_pattern(f"user_notifications:{user_id}:*")
            
            logger.info(f"Invalidated user-related cache for user_id: {user_id}")
        except Exception as e:
            logger.error(f"Error invalidating user-related cache: {e}")
    
    # === CACHE WARMING METHODS ===
    
    def warm_student_cache(self, student_id: int) -> None:
        """Pre-warm student cache after invalidation"""
        try:
            from app.services.student_service import StudentService
            student_service = StudentService()
            
            # This will populate the cache
            student_service.get_student_by_id(student_id)
            
            logger.info(f"Warmed student cache for student_id: {student_id}")
        except Exception as e:
            logger.error(f"Error warming student cache: {e}")
    
    def warm_teacher_cache(self, teacher_id: int) -> None:
        """Pre-warm teacher cache after invalidation"""
        try:
            from app.services.teacher_service import TeacherService
            teacher_service = TeacherService()
            
            # This will populate the cache
            teacher_service.get_teacher_by_id(teacher_id)
            
            logger.info(f"Warmed teacher cache for teacher_id: {teacher_id}")
        except Exception as e:
            logger.error(f"Error warming teacher cache: {e}")
    
    def warm_upcoming_exams_cache(self, class_id: Optional[int] = None, days: int = 7) -> None:
        """Pre-warm upcoming exams cache"""
        try:
            from app.services.exam_service import ExamService
            exam_service = ExamService()
            
            # This will populate the cache
            exam_service.get_upcoming_exams(class_id=class_id, days=days)
            
            logger.info(f"Warmed upcoming exams cache for class_id: {class_id}")
        except Exception as e:
            logger.error(f"Error warming upcoming exams cache: {e}")
    
    # === UTILITY METHODS ===
    
    def clear_all_cache(self) -> None:
        """Clear all application cache (use with caution)"""
        try:
            self.cache_service.clear_all()
            logger.warning("Cleared all application cache")
        except Exception as e:
            logger.error(f"Error clearing all cache: {e}")
    
    def get_cache_stats(self) -> dict:
        """Get cache statistics"""
        try:
            return self.cache_service.get_stats()
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {}
