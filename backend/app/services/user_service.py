import uuid
from typing import Dict, Any, Tuple
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models.user import User, user_roles
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.parent import Parent, ParentChildSetupTask
from app.models.staff import Staff

class SecurePurgeService:
    @staticmethod
    def force_purge_user(user_id: int, actor_user_id: int) -> Tuple[bool, Dict[str, Any]]:
        """
        Executes a complete, constraint-resistant cascade deletion of a user profile and all
        associated relational dependencies across schemas.
        """
        if user_id == actor_user_id:
            return False, {'error': 'Cannot force-purge your own account'}
            
        user = User.query.get(user_id)
        if not user:
            return False, {'error': 'User not found'}
            
        if user.role == 'super_admin':
            return False, {'error': 'Cannot force-purge a super admin account'}

        # Force a clean session state check
        db.session.rollback()

        try:
            # 1. Stage A: Resolve sub-profiles
            student_profiles = Student.query.filter_by(user_id=user_id).all()
            student_ids = [s.id for s in student_profiles]
            parent_profiles = Parent.query.filter_by(user_id=user_id).all()
            parent_ids = [p.id for p in parent_profiles]
            teacher_profiles = Teacher.query.filter_by(user_id=user_id).all()
            teacher_ids = [t.id for t in teacher_profiles]
            staff_profiles = Staff.query.filter_by(user_id=user_id).all()
            staff_ids = [s.id for s in staff_profiles]

            # 2. Stage B: Delete Onboarding/Setup Tasks
            setup_tasks = ParentChildSetupTask.query.filter(
                (ParentChildSetupTask.student_id == user_id) |
                (ParentChildSetupTask.parent_id == user_id)
            ).all()
            for task in setup_tasks:
                db.session.delete(task)
                
            if student_ids:
                student_setup_tasks = ParentChildSetupTask.query.filter(ParentChildSetupTask.student_id.in_(student_ids)).all()
                for task in student_setup_tasks:
                    db.session.delete(task)
            if parent_ids:
                parent_setup_tasks = ParentChildSetupTask.query.filter(ParentChildSetupTask.parent_id.in_(parent_ids)).all()
                for task in parent_setup_tasks:
                    db.session.delete(task)
            db.session.flush()

            # 3. Stage C: Delete Dependent Profiles
            for s in student_profiles:
                db.session.delete(s)
            for p in parent_profiles:
                db.session.delete(p)
            for t in teacher_profiles:
                db.session.delete(t)
            for s in staff_profiles:
                db.session.delete(s)
            db.session.flush()

            # 4. Stage D: Dynamic Schema Cascade
            inspector = inspect(db.session.connection())
            table_names = inspector.get_table_names()
            
            # Map of target tables and their resolved IDs to search for
            target_refs = [
                ('users', 'id', [user_id]),
            ]
            if student_ids:
                target_refs.append(('students', 'id', student_ids))
            if parent_ids:
                target_refs.append(('parents', 'id', parent_ids))
            if teacher_ids:
                target_refs.append(('teachers', 'id', teacher_ids))
            if staff_ids:
                target_refs.append(('staff', 'id', staff_ids))

            delete_row_tables = {
                'tenant_memberships',
                'session_tokens',
                'api_keys',
                'password_reset_tokens',
                'mfa_devices',
                'trusted_devices',
                'authentication_attempts',
                'user_security_settings',
                'user_preferences',
                'user_profiles',
                'user_profile',
                'login_history',
                'password_history',
                'notifications',
                'staff_leaves',
                'security_audit_logs',
                'audit_logs',
                'user_roles',
                'parent_child_setup_tasks'
            }

            for table in table_names:
                if table in ('users', 'students', 'parents', 'teachers', 'staff'):
                    continue
                try:
                    fks = inspector.get_foreign_keys(table) or []
                    cols = inspector.get_columns(table) or []
                except Exception:
                    continue
                    
                col_nullable = {c.get('name'): bool(c.get('nullable', True)) for c in cols if c.get('name')}

                for fk in fks:
                    ref_table = fk.get('referred_table') or ''
                    for target_table, target_col, target_vals in target_refs:
                        if ref_table != target_table:
                            continue
                        ref_cols = fk.get('referred_columns') or []
                        if target_col not in ref_cols:
                            continue
                        for col in fk.get('constrained_columns') or []:
                            if not col:
                                continue
                            nullable = col_nullable.get(col, True)
                            q_table = f'"{table}"'
                            q_col = f'"{col}"'
                            
                            # Execute safe cascaded updates/deletes in database transaction
                            for val in target_vals:
                                if table in delete_row_tables:
                                    db.session.execute(
                                        text(f"DELETE FROM {q_table} WHERE {q_col} = :val"),
                                        {'val': val}
                                    )
                                elif nullable:
                                    db.session.execute(
                                        text(f"UPDATE {q_table} SET {q_col} = NULL WHERE {q_col} = :val"),
                                        {'val': val}
                                    )
                                else:
                                    db.session.execute(
                                        text(f"UPDATE {q_table} SET {q_col} = :actor WHERE {q_col} = :val"),
                                        {'val': val, 'actor': actor_user_id}
                                    )
            db.session.flush()

            # Delete role assignments
            db.session.execute(user_roles.delete().where(user_roles.c.user_id == user_id))

            # Finally, delete core user security row wrapper
            db.session.execute(text("DELETE FROM users WHERE id = :uid"), {'uid': user_id})
            db.session.commit()
            return True, {'success': True, 'message': 'User profile force-purged cleanly'}
        except Exception as e:
            db.session.rollback()
            return False, {'error': f"Force-purge transaction failed: {str(e)}", 'type': type(e).__name__}
