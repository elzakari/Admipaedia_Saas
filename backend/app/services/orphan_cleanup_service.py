import uuid
from typing import Any, Dict, Tuple

from sqlalchemy import func, inspect, or_, select, text
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.tenant import (
    Tenant,
    TenantMembership,
    TenantInvitation,
    Subscription,
    PlatformInvoice,
    PlatformPayment,
)
from app.models.educational_system import EducationalSystemConfig, GradeLevel
from app.models.academic_term import AcademicTerm
from app.models.tenant_academic_settings import TenantAcademicSettings
from app.models.grading_system import GradingScheme
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.parent import Parent
from app.models.staff import Staff
from app.models.class_ import Class
from app.models.department import Department
from app.models.subject import Subject

from app.models.user import User, user_roles, LoginHistory
from app.models.security import SecurityEvent, PasswordHistory, PasswordResetToken, APIKey, SchoolRegistrationToken
from app.models.session_token import SessionToken
from app.models.dashboard import Notification
from app.models.user_profile import UserProfile
from app.models.user_preferences import UserPreferences
from app.models.audit_log import AuditLog
from app.models.staff_enhanced import StaffLeave
from app.models.enhanced_auth import MFADevice, TrustedDevice, AuthenticationAttempt, UserSecuritySettings, SecurityAuditLog
from app.models.grading_system import FinalGrade


class OrphanCleanupService:
    @staticmethod
    def _safe_count(fn):
        try:
            return True, int(fn() or 0)
        except Exception:
            try:
                db.session.rollback()
            except Exception:
                pass
            return False, None

    @staticmethod
    def _iter_mapped_models():
        try:
            mappers = list(db.Model.registry.mappers)
        except Exception:
            mappers = []
        for m in mappers:
            cls = getattr(m, 'class_', None)
            if not cls:
                continue
            if not hasattr(cls, '__table__'):
                continue
            yield cls

    @staticmethod
    def _quote_ident(name: str) -> str:
        return db.engine.dialect.identifier_preparer.quote(name)

    @staticmethod
    def _tenant_param_value(tenant_uuid: uuid.UUID):
        if db.engine.dialect.name == 'sqlite':
            return str(tenant_uuid)
        return tenant_uuid

    @staticmethod
    def _tenant_table(table_name: str):
        metadata_tables = getattr(db.Model.metadata, 'tables', {}) or {}
        return metadata_tables.get(table_name)

    @staticmethod
    def _tenant_value_for_column(column, tenant_uuid: uuid.UUID):
        try:
            python_type = column.type.python_type
        except Exception:
            python_type = None
        if python_type is str:
            return str(tenant_uuid)
        return tenant_uuid

    @staticmethod
    def _tenant_predicate(table_name: str, columns: list[str], tenant_uuid: uuid.UUID):
        table = OrphanCleanupService._tenant_table(table_name)
        if table is None:
            return None
        predicates = [
            table.c[col] == OrphanCleanupService._tenant_value_for_column(table.c[col], tenant_uuid)
            for col in columns
            if col in table.c
        ]
        if not predicates:
            return None
        return or_(*predicates)

    @staticmethod
    def _tenant_reference_columns():
        inspector = inspect(db.engine)
        metadata_tables = getattr(db.Model.metadata, 'tables', {}) or {}
        table_names = inspector.get_table_names()
        existing_table_names = set(table_names)
        tenant_refs: dict[str, set[str]] = {}

        def add_reference(table_name: str, column_name: str):
            if not table_name or not column_name or table_name == 'tenants':
                return
            tenant_refs.setdefault(table_name, set()).add(column_name)

        for t in table_names:
            if t == 'tenants':
                continue
            try:
                cols = inspector.get_columns(t) or []
            except Exception:
                continue
            referenced_cols = {
                c.get('name')
                for c in cols
                if (c.get('name') or '').lower() == 'tenant_id'
            }
            try:
                fks = inspector.get_foreign_keys(t) or []
            except Exception:
                fks = []
            for fk in fks:
                if (fk.get('referred_table') or '') != 'tenants':
                    continue
                referred_cols = fk.get('referred_columns') or []
                if 'id' not in referred_cols:
                    continue
                for col in fk.get('constrained_columns') or []:
                    if col:
                        referenced_cols.add(col)
            if referenced_cols:
                tenant_refs[t] = referenced_cols

        for table_name, table in metadata_tables.items():
            if table_name == 'tenants':
                continue
            if existing_table_names and table_name not in existing_table_names:
                continue
            for column in table.columns:
                if (column.name or '').lower() == 'tenant_id':
                    add_reference(table_name, column.name)
                for fk in column.foreign_keys:
                    fk_column = getattr(fk, 'column', None)
                    fk_table = getattr(getattr(fk_column, 'table', None), 'name', None)
                    fk_name = getattr(fk_column, 'name', None)
                    if fk_table == 'tenants' and fk_name == 'id':
                        add_reference(table_name, column.name)

        return tenant_refs

    @staticmethod
    def _tenant_scoped_predicates(tenant_uuid: uuid.UUID):
        metadata_tables = getattr(db.Model.metadata, 'tables', {}) or {}
        inspector = inspect(db.engine)
        existing_table_names = set(inspector.get_table_names())
        tenant_refs = OrphanCleanupService._tenant_reference_columns()

        scoped_predicates = {}
        for table_name, columns in tenant_refs.items():
            predicate = OrphanCleanupService._tenant_predicate(table_name, sorted(columns), tenant_uuid)
            if predicate is not None:
                scoped_predicates[table_name] = predicate

        changed = True
        while changed:
            changed = False
            for table_name, table in metadata_tables.items():
                if table_name in scoped_predicates or table_name == 'tenants':
                    continue
                if existing_table_names and table_name not in existing_table_names:
                    continue

                predicates = []
                for fk_constraint in table.foreign_key_constraints:
                    referred_table = getattr(getattr(fk_constraint, 'referred_table', None), 'name', None)
                    if referred_table not in scoped_predicates:
                        continue
                    parent_table = metadata_tables.get(referred_table)
                    if parent_table is None:
                        continue

                    child_columns = list(fk_constraint.columns)
                    parent_columns = [getattr(element, 'column', None) for element in fk_constraint.elements]
                    if not child_columns or len(child_columns) != len(parent_columns):
                        continue

                    # Start with single-column FKs, which cover the current tenant purge graph.
                    if len(child_columns) != 1:
                        continue

                    child_column = child_columns[0]
                    parent_column = parent_columns[0]
                    if child_column is None or parent_column is None:
                        continue

                    predicates.append(
                        child_column.in_(
                            select(parent_column).where(scoped_predicates[referred_table])
                        )
                    )

                if predicates:
                    scoped_predicates[table_name] = or_(*predicates)
                    changed = True

        return scoped_predicates

    @staticmethod
    def _tenant_tables_order(table_names=None):
        tenant_tables = list(table_names or [])
        if not tenant_tables:
            tenant_refs = OrphanCleanupService._tenant_reference_columns()
            tenant_tables = list(tenant_refs.keys())
        if not tenant_tables:
            return []
        tenant_tables_set = set(tenant_tables)
        inspector = inspect(db.engine)
        metadata_tables = getattr(db.Model.metadata, 'tables', {}) or {}

        deps: dict[str, set[str]] = {t: set() for t in tenant_tables}
        for t in tenant_tables:
            table = metadata_tables.get(t)
            if table is not None:
                for fk in table.foreign_keys:
                    ref_table = getattr(getattr(fk.column, 'table', None), 'name', None)
                    if ref_table in tenant_tables_set and ref_table != t:
                        deps[t].add(ref_table)
            try:
                fks = inspector.get_foreign_keys(t) or []
            except Exception:
                continue
            for fk in fks:
                ref_table = fk.get('referred_table')
                if ref_table in tenant_tables_set and ref_table != t:
                    deps[t].add(ref_table)

        visited: set[str] = set()
        visiting: set[str] = set()
        order: list[str] = []

        def visit(n: str):
            if n in visited:
                return
            if n in visiting:
                return
            visiting.add(n)
            for m in deps.get(n, set()):
                visit(m)
            visiting.remove(n)
            visited.add(n)
            order.append(n)

        for t in tenant_tables:
            visit(t)

        return order

    @staticmethod
    def _tenant_ref_clause(columns: list[str], tenant_uuid: uuid.UUID):
        tenant_value = OrphanCleanupService._tenant_param_value(tenant_uuid)
        params = {}
        predicates = []
        for index, col in enumerate(columns):
            param_name = f'tid_{index}'
            params[param_name] = tenant_value
            predicates.append(f"{OrphanCleanupService._quote_ident(col)} = :{param_name}")
        return " OR ".join(predicates), params

    @staticmethod
    def _tenant_references(tenant_uuid: uuid.UUID):
        refs = []
        try:
            tenant_refs = OrphanCleanupService._tenant_reference_columns()
        except Exception:
            return refs

        for t, columns in tenant_refs.items():
            ordered_columns = sorted(columns)
            try:
                predicate = OrphanCleanupService._tenant_predicate(t, ordered_columns, tenant_uuid)
                if predicate is not None:
                    table = OrphanCleanupService._tenant_table(t)
                    cnt = db.session.query(func.count()).select_from(table).filter(predicate).scalar()
                else:
                    q_table = OrphanCleanupService._quote_ident(t)
                    where_clause, params = OrphanCleanupService._tenant_ref_clause(ordered_columns, tenant_uuid)
                    cnt = db.session.execute(
                        text(f"SELECT COUNT(*) FROM {q_table} WHERE {where_clause}"),
                        params,
                    ).scalar()
                cnt = int(cnt or 0)
            except Exception:
                continue
            if cnt > 0:
                refs.append({'table': t, 'columns': ordered_columns, 'count': cnt})
        return refs

    @staticmethod
    def _user_fk_references_db(user_id: int):
        blocking = []
        detachable = []
        unknown = []

        try:
            inspector = inspect(db.session.connection())
            table_names = inspector.get_table_names()
        except Exception:
            return blocking, detachable, unknown

        for table in table_names:
            if table == 'users':
                continue
            try:
                fks = inspector.get_foreign_keys(table) or []
            except Exception:
                continue

            try:
                cols = inspector.get_columns(table) or []
            except Exception:
                cols = []
            col_nullable = {c.get('name'): bool(c.get('nullable', True)) for c in cols if c.get('name')}

            for fk in fks:
                if (fk.get('referred_table') or '') != 'users':
                    continue
                referred_cols = fk.get('referred_columns') or []
                if 'id' not in referred_cols:
                    continue
                for col in fk.get('constrained_columns') or []:
                    if not col:
                        continue
                    nullable = col_nullable.get(col, True)
                    try:
                        q_table = OrphanCleanupService._quote_ident(table)
                        q_col = OrphanCleanupService._quote_ident(col)
                        cnt = db.session.execute(
                            text(f"SELECT COUNT(*) FROM {q_table} WHERE {q_col} = :uid"),
                            {'uid': user_id},
                        ).scalar()
                        cnt = int(cnt or 0)
                    except Exception:
                        unknown.append({'table': table, 'column': col})
                        continue

                    if cnt <= 0:
                        continue

                    entry = {'table': table, 'column': col, 'count': cnt, 'nullable': nullable}
                    if nullable:
                        detachable.append(entry)
                    else:
                        blocking.append(entry)

        return blocking, detachable, unknown

    @staticmethod
    def _user_fk_references(user_id: int):
        blocking, detachable, unknown = OrphanCleanupService._user_fk_references_db(user_id)
        if blocking or detachable or unknown:
            return blocking, detachable, unknown

        blocking = []
        detachable = []
        unknown = []

        for cls in OrphanCleanupService._iter_mapped_models():
            if cls is User:
                continue
            table = getattr(cls, '__table__', None)
            if table is None:
                continue

            for col in table.columns:
                if not col.foreign_keys:
                    continue
                if not any(getattr(fk.column, 'table', None) is not None and fk.column.table.name == 'users' and fk.column.name == 'id' for fk in col.foreign_keys):
                    continue

                try:
                    cnt = db.session.query(func.count()).select_from(cls).filter(col == user_id).scalar() or 0
                except Exception:
                    unknown.append({'table': table.name, 'column': col.name})
                    continue

                if int(cnt) <= 0:
                    continue

                entry = {
                    'table': table.name,
                    'column': col.name,
                    'count': int(cnt),
                    'nullable': bool(col.nullable),
                }
                if col.nullable:
                    detachable.append(entry)
                else:
                    blocking.append(entry)

        return blocking, detachable, unknown

    @staticmethod
    def _parse_tenant_id(tenant_id: str) -> uuid.UUID:
        return uuid.UUID(str(tenant_id))

    @staticmethod
    def get_orphan_tenant_status(tenant_id: str) -> Dict[str, Any]:
        tid = OrphanCleanupService._parse_tenant_id(tenant_id)
        tenant = Tenant.query.get(tid)
        if not tenant:
            return {
                'exists': False,
                'tenant_id': str(tid),
                'can_delete': False,
                'reasons': ['Tenant not found'],
                'counts': {},
            }

        counts: Dict[str, int] = {}
        count_errors: list[str] = []
        for key, fn in [
            ('memberships', lambda: TenantMembership.query.filter_by(tenant_id=tid).count()),
            ('invitations', lambda: TenantInvitation.query.filter_by(tenant_id=tid).count()),
            ('subscriptions', lambda: Subscription.query.filter_by(tenant_id=tid).count()),
            ('platform_invoices', lambda: PlatformInvoice.query.filter_by(tenant_id=tid).count()),
            ('platform_payments', lambda: PlatformPayment.query.filter_by(tenant_id=tid).count()),
            ('students', lambda: Student.query.filter_by(tenant_id=tid).count()),
            ('teachers', lambda: Teacher.query.filter_by(tenant_id=tid).count()),
            ('parents', lambda: Parent.query.filter_by(tenant_id=tid).count()),
            ('staff', lambda: Staff.query.filter_by(tenant_id=tid).count()),
            ('classes', lambda: Class.query.filter_by(tenant_id=tid).count()),
            ('departments', lambda: Department.query.filter_by(tenant_id=tid).count()),
            ('subjects', lambda: Subject.query.filter_by(tenant_id=tid).count()),
            ('grading_schemes', lambda: GradingScheme.query.filter_by(tenant_id=tid).count()),
            ('educational_system_config', lambda: EducationalSystemConfig.query.filter_by(tenant_id=tid).count()),
            ('grade_levels', lambda: GradeLevel.query.filter_by(tenant_id=tid).count()),
            ('academic_terms', lambda: AcademicTerm.query.filter_by(tenant_id=tid).count()),
            ('tenant_academic_settings', lambda: TenantAcademicSettings.query.filter_by(tenant_id=tid).count()),
        ]:
            ok, value = OrphanCleanupService._safe_count(fn)
            counts[key] = int(value or 0)
            if not ok:
                count_errors.append(key)

        reasons = []
        if counts['memberships'] > 0:
            reasons.append('Tenant has memberships')
        if counts['subscriptions'] > 0:
            reasons.append('Tenant has subscriptions')
        if counts['platform_invoices'] > 0 or counts['platform_payments'] > 0:
            reasons.append('Tenant has billing history')

        blocking = ['students', 'teachers', 'parents', 'staff', 'classes', 'departments', 'subjects']
        for key in blocking:
            if counts[key] > 0:
                reasons.append(f"Tenant has {key}")

        if count_errors:
            reasons.append('Unable to verify all tenant references due to schema mismatch')

        can_delete = len(reasons) == 0
        return {
            'exists': True,
            'tenant_id': str(tid),
            'tenant': {
                'id': str(tenant.id),
                'name': tenant.name,
                'slug': tenant.slug,
                'country_code': tenant.country_code,
                'status': tenant.status,
                'plan': tenant.plan,
                'created_at': tenant.created_at.isoformat() if tenant.created_at else None,
            },
            'can_delete': can_delete,
            'reasons': reasons,
            'counts': counts,
        }

    @staticmethod
    def delete_orphan_tenant(tenant_id: str) -> Tuple[bool, Dict[str, Any]]:
        status = OrphanCleanupService.get_orphan_tenant_status(tenant_id)
        if not status.get('exists'):
            return False, status
        if not status.get('can_delete'):
            return False, status

        tid = OrphanCleanupService._parse_tenant_id(tenant_id)
        tenant = Tenant.query.get(tid)
        if not tenant:
            return False, status

        deletions = {}

        for key, fn in [
            ('platform_payments', lambda: PlatformPayment.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('platform_invoices', lambda: PlatformInvoice.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('subscriptions', lambda: Subscription.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('tenant_invitations', lambda: TenantInvitation.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('tenant_memberships', lambda: TenantMembership.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('grading_schemes', lambda: GradingScheme.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('tenant_academic_settings', lambda: TenantAcademicSettings.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('academic_terms', lambda: AcademicTerm.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('grade_levels', lambda: GradeLevel.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('educational_system_config', lambda: EducationalSystemConfig.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('subjects', lambda: Subject.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('departments', lambda: Department.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('classes', lambda: Class.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('staff', lambda: Staff.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('parents', lambda: Parent.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('teachers', lambda: Teacher.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
            ('students', lambda: Student.query.filter_by(tenant_id=tid).delete(synchronize_session=False)),
        ]:
            try:
                deletions[key] = int(fn() or 0)
            except Exception as e:
                try:
                    db.session.rollback()
                except Exception:
                    pass
                return False, {
                    'exists': True,
                    'tenant_id': str(tid),
                    'can_delete': False,
                    'reasons': ['Failed to delete tenant due to a database/schema mismatch'],
                    'failed_on': key,
                    'error': type(e).__name__,
                }

        db.session.delete(tenant)
        deletions['tenant'] = 1

        return True, {'deleted': deletions, 'tenant_id': str(tid)}

    @staticmethod
    def get_tenant_purge_status(tenant_id: str) -> Dict[str, Any]:
        tid = OrphanCleanupService._parse_tenant_id(tenant_id)
        tenant = Tenant.query.get(tid)
        if not tenant:
            return {
                'exists': False,
                'tenant_id': str(tid),
                'can_delete': False,
                'reasons': ['Tenant not found'],
                'counts': {},
            }

        ok, student_count = OrphanCleanupService._safe_count(lambda: Student.query.filter_by(tenant_id=tid).count())
        student_count = int(student_count or 0)

        reasons: list[str] = []
        if not ok:
            reasons.append('Unable to verify student count due to schema mismatch')
        if student_count > 0 and (tenant.status or '').lower() != 'suspended':
            reasons.append('School has students. Suspend school before deletion.')

        can_delete = len(reasons) == 0
        return {
            'exists': True,
            'tenant_id': str(tid),
            'tenant': {
                'id': str(tenant.id),
                'name': tenant.name,
                'slug': tenant.slug,
                'country_code': tenant.country_code,
                'status': tenant.status,
                'plan': tenant.plan,
                'created_at': tenant.created_at.isoformat() if tenant.created_at else None,
            },
            'can_delete': can_delete,
            'reasons': reasons,
            'counts': {'students': student_count},
            'requires_status': 'suspended' if student_count > 0 else None,
        }

    @staticmethod
    def purge_tenant(tenant_id: str, actor_user_id: int) -> Tuple[bool, Dict[str, Any]]:
        if not tenant_id:
            return False, {'exists': False, 'tenant_id': None, 'can_delete': False, 'reasons': ['Tenant not found']}

        tid = OrphanCleanupService._parse_tenant_id(tenant_id)
        tenant = Tenant.query.get(tid)
        if not tenant:
            return False, {'exists': False, 'tenant_id': str(tid), 'can_delete': False, 'reasons': ['Tenant not found']}

        status = OrphanCleanupService.get_tenant_purge_status(str(tid))
        if not status.get('can_delete'):
            return False, status

        deletions: Dict[str, Any] = {}
        try:
            ordered_tables = OrphanCleanupService._tenant_tables_order()
        except Exception:
            ordered_tables = []

        try:
            current_table = None
            tenant_scoped_predicates = OrphanCleanupService._tenant_scoped_predicates(tid)
            tenant_refs = OrphanCleanupService._tenant_reference_columns()
            if not ordered_tables:
                ordered_tables = list(tenant_scoped_predicates.keys() or tenant_refs.keys())
            if tenant_scoped_predicates:
                ordered_tables = OrphanCleanupService._tenant_tables_order(tenant_scoped_predicates.keys())
            for table in reversed(ordered_tables):
                current_table = table
                predicate = tenant_scoped_predicates.get(table)
                if predicate is not None:
                    table_obj = OrphanCleanupService._tenant_table(table)
                    if table_obj is not None:
                        db.session.execute(table_obj.delete().where(predicate))
                        continue
                columns = sorted(tenant_refs.get(table) or [])
                if not columns:
                    continue
                predicate = OrphanCleanupService._tenant_predicate(table, columns, tid)
                if predicate is not None:
                    table_obj = OrphanCleanupService._tenant_table(table)
                    if table_obj is not None:
                        db.session.execute(table_obj.delete().where(predicate))
                        continue
                else:
                    q_table = OrphanCleanupService._quote_ident(table)
                    where_clause, params = OrphanCleanupService._tenant_ref_clause(columns, tid)
                    db.session.execute(
                        text(f"DELETE FROM {q_table} WHERE {where_clause}"),
                        params,
                    )
        except Exception as e:
            db.session.rollback()
            return False, {
                'exists': True,
                'tenant_id': str(tid),
                'can_delete': False,
                'reasons': ['Purge failed while deleting tenant data'],
                'failed_table': current_table,
                'error': type(e).__name__,
            }

        db.session.delete(tenant)
        deletions['tenant'] = 1
        try:
            db.session.flush()
        except IntegrityError:
            db.session.rollback()
            remaining = OrphanCleanupService._tenant_references(tid)
            return False, {
                'exists': True,
                'tenant_id': str(tid),
                'can_delete': False,
                'reasons': ['Tenant is still referenced by database constraints'],
                'references': remaining,
            }
        except Exception as e:
            db.session.rollback()
            return False, {
                'exists': True,
                'tenant_id': str(tid),
                'can_delete': False,
                'reasons': ['Purge failed due to an unexpected database error'],
                'error': type(e).__name__,
            }

        return True, {'deleted': deletions, 'tenant_id': str(tid)}

    @staticmethod
    def get_orphan_user_status(user_id: int) -> Dict[str, Any]:
        user = User.query.get(user_id)
        if not user:
            return {
                'exists': False,
                'user_id': user_id,
                'can_delete': False,
                'reasons': ['User not found'],
                'counts': {},
            }

        try:
            blocking_fk, detachable_fk, unknown_fk = OrphanCleanupService._user_fk_references(user_id)
            count_errors = []

            counts: Dict[str, Any] = {}
            for key, fn in [
                ('memberships', lambda: TenantMembership.query.filter_by(user_id=user_id).count()),
                ('invited_memberships', lambda: TenantMembership.query.filter_by(invited_by_user_id=user_id).count()),
                ('students', lambda: Student.query.filter_by(user_id=user_id).count()),
                ('teachers', lambda: Teacher.query.filter_by(user_id=user_id).count()),
                ('parents', lambda: Parent.query.filter_by(user_id=user_id).count()),
                ('staff', lambda: Staff.query.filter_by(user_id=user_id).count()),
                ('session_tokens', lambda: SessionToken.query.filter_by(user_id=user_id).count()),
                ('login_history', lambda: LoginHistory.query.filter_by(user_id=user_id).count()),
                ('password_history', lambda: PasswordHistory.query.filter_by(user_id=user_id).count()),
                ('password_reset_tokens', lambda: PasswordResetToken.query.filter_by(user_id=user_id).count()),
                ('api_keys', lambda: APIKey.query.filter_by(user_id=user_id).count()),
                ('notifications', lambda: Notification.query.filter_by(user_id=user_id).count()),
                ('user_profile', lambda: UserProfile.query.filter_by(user_id=user_id).count()),
                ('user_preferences', lambda: UserPreferences.query.filter_by(user_id=user_id).count()),
                ('mfa_devices', lambda: MFADevice.query.filter_by(user_id=user_id).count()),
                ('trusted_devices', lambda: TrustedDevice.query.filter_by(user_id=user_id).count()),
                ('auth_attempts', lambda: AuthenticationAttempt.query.filter_by(user_id=user_id).count()),
                ('user_security_settings', lambda: UserSecuritySettings.query.filter_by(user_id=user_id).count()),
                ('security_audit_logs', lambda: SecurityAuditLog.query.filter_by(user_id=user_id).count()),
                ('staff_leaves', lambda: StaffLeave.query.filter_by(user_id=user_id).count()),
                ('final_grades_computed', lambda: FinalGrade.query.filter_by(computed_by=user_id).count()),
                ('registration_tokens_created', lambda: SchoolRegistrationToken.query.filter_by(created_by_user_id=user_id).count()),
            ]:
                ok, value = OrphanCleanupService._safe_count(fn)
                counts[key] = value
                if not ok:
                    count_errors.append(key)

            counts['blocking_fk_refs'] = len(blocking_fk)
            counts['detachable_fk_refs'] = len(detachable_fk)
            counts['unknown_fk_refs'] = len(unknown_fk)

            if user.role in ('student', 'parent'):
                return {
                    'exists': True,
                    'user_id': user_id,
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'username': user.username,
                        'role': user.role,
                        'status': user.status,
                        'created_at': user.created_at.isoformat() if getattr(user, 'created_at', None) else None,
                    },
                    'can_delete': True,
                    'can_anonymize': True,
                    'reasons': [],
                    'counts': counts,
                    'blocking_references': [],
                    'detachable_references': [],
                    'unknown_references': [],
                }

            reasons = []
            if user.role == 'super_admin':
                reasons.append('Cannot delete a super admin account')
            if counts.get('memberships') and counts['memberships'] > 0:
                reasons.append('User belongs to one or more schools')
            if (
                (counts.get('students') and counts['students'] > 0)
                or (counts.get('teachers') and counts['teachers'] > 0)
                or (counts.get('parents') and counts['parents'] > 0)
                or (counts.get('staff') and counts['staff'] > 0)
            ):
                reasons.append('User has a school profile')
            if counts.get('final_grades_computed') and counts['final_grades_computed'] > 0:
                reasons.append('User is referenced by computed grades')
            if counts.get('registration_tokens_created') and counts['registration_tokens_created'] > 0:
                reasons.append('User has created school registration links')
            if blocking_fk:
                reasons.append('User is referenced by non-nullable foreign keys')
            if unknown_fk or count_errors:
                reasons.append('Unable to verify all user references due to schema mismatch')

            can_delete = len(reasons) == 0
            return {
                'exists': True,
                'user_id': user_id,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'role': user.role,
                    'status': user.status,
                    'created_at': user.created_at.isoformat() if getattr(user, 'created_at', None) else None,
                },
                'can_delete': can_delete,
                'reasons': reasons,
                'counts': counts,
                'blocking_references': blocking_fk,
                'detachable_references': detachable_fk,
                'unknown_references': unknown_fk,
            }
        except Exception:
            return {
                'exists': True,
                'user_id': user_id,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'role': user.role,
                    'status': user.status,
                    'created_at': user.created_at.isoformat() if getattr(user, 'created_at', None) else None,
                },
                'can_delete': False,
                'reasons': ['Unable to verify deletion eligibility'],
                'counts': {},
                'blocking_references': [],
                'detachable_references': [],
                'unknown_references': [],
            }

    @staticmethod
    def delete_orphan_user(user_id: int, actor_user_id: int) -> Tuple[bool, Dict[str, Any]]:
        status = OrphanCleanupService.get_orphan_user_status(user_id)
        if not status.get('exists'):
            return False, status
        if not status.get('can_delete'):
            return False, status
        if user_id == actor_user_id:
            return False, {**status, 'can_delete': False, 'reasons': ['Cannot delete your own account']}

        user = User.query.get(user_id)
        if not user:
            return False, status

        # Student/parent platform-only users can still have profile rows that
        # keep a FK back to users. Reuse the hardened purge path to avoid
        # route-level 500s from partial lightweight deletion.
        try:
            from app.services.user_service import SecurePurgeService
        except Exception as e:
            return False, {
                **status,
                'can_delete': False,
                'reasons': ['Unable to initialize secure orphan deletion'],
                'error': type(e).__name__,
            }

        ok, result = SecurePurgeService.force_purge_user(user_id, actor_user_id=actor_user_id)
        if not ok:
            return False, {
                **status,
                'can_delete': False,
                'reasons': [result.get('error', 'Secure orphan deletion failed')],
                'delete_error': result,
            }
        return True, {'deleted': result, 'user_id': user_id}

    @staticmethod
    def purge_user(user_id: int, actor_user_id: int) -> Tuple[bool, Dict[str, Any]]:
        if user_id == actor_user_id:
            return False, {'exists': True, 'user_id': user_id, 'can_delete': False, 'reasons': ['Cannot delete your own account']}

        user = User.query.get(user_id)
        if not user:
            return False, {'exists': False, 'user_id': user_id, 'can_delete': False, 'reasons': ['User not found']}
        if user.role == 'super_admin':
            return False, {'exists': True, 'user_id': user_id, 'can_delete': False, 'reasons': ['Cannot delete a super admin account']}

        delete_row_tables = {
            'tenant_memberships',
            'students',
            'teachers',
            'parents',
            'staff',
            'session_tokens',
            'api_keys',
            'password_reset_tokens',
            'mfa_devices',
            'trusted_devices',
            'authentication_attempts',
            'user_security_settings',
            'user_preferences',
            'user_profile',
            'user_profiles',
            'login_history',
            'password_history',
            'notifications',
            'staff_leaves',
            'security_audit_logs',
            'audit_logs',
            'user_roles',
        }

        deletions: Dict[str, Any] = {}

        try:
            inspector = inspect(db.engine)
            table_names = inspector.get_table_names()
        except Exception as e:
            return False, {'exists': True, 'user_id': user_id, 'can_delete': False, 'reasons': ['Unable to inspect database'], 'error': type(e).__name__}

        fk_refs = []
        for table in table_names:
            if table == 'users':
                continue
            try:
                fks = inspector.get_foreign_keys(table) or []
            except Exception:
                continue
            try:
                cols = inspector.get_columns(table) or []
            except Exception:
                cols = []
            col_nullable = {c.get('name'): bool(c.get('nullable', True)) for c in cols if c.get('name')}

            for fk in fks:
                if (fk.get('referred_table') or '') != 'users':
                    continue
                referred_cols = fk.get('referred_columns') or []
                if 'id' not in referred_cols:
                    continue
                for col in fk.get('constrained_columns') or []:
                    if not col:
                        continue
                    fk_refs.append({
                        'table': table,
                        'column': col,
                        'nullable': col_nullable.get(col, True)
                    })

        try:
            db.session.execute(user_roles.delete().where(user_roles.c.user_id == user_id))
            deletions['user_roles'] = True
        except Exception:
            pass

        for ref in fk_refs:
            table = ref['table']
            column = ref['column']
            nullable = bool(ref.get('nullable', True))
            q_table = OrphanCleanupService._quote_ident(str(table))
            q_col = OrphanCleanupService._quote_ident(str(column))
            try:
                if table in delete_row_tables:
                    db.session.execute(text(f"DELETE FROM {q_table} WHERE {q_col} = :uid"), {'uid': user_id})
                elif nullable:
                    db.session.execute(text(f"UPDATE {q_table} SET {q_col} = NULL WHERE {q_col} = :uid"), {'uid': user_id})
                else:
                    db.session.execute(text(f"UPDATE {q_table} SET {q_col} = :actor_uid WHERE {q_col} = :uid"), {'uid': user_id, 'actor_uid': actor_user_id})
            except Exception as e:
                db.session.rollback()
                return False, {
                    'exists': True,
                    'user_id': user_id,
                    'can_delete': False,
                    'reasons': ['Purge failed'],
                    'error': type(e).__name__,
                    'failed_operation': {'table': str(table), 'column': str(column)},
                }

        try:
            # Force a clean session state check
            db.session.rollback()
            
            # 1. Step A: Clear out any pending setup tasks bound to a student profile card
            db.session.execute(
                text("""
                    DELETE FROM parent_child_setup_tasks 
                    WHERE student_id IN (SELECT id FROM students WHERE user_id = :uid)
                    OR parent_id = :uid
                """), 
                {"uid": user_id}
            )
            
            # 2. Step B: Drop the student profile record entry
            db.session.execute(
                text("DELETE FROM students WHERE user_id = :uid"), 
                {"uid": user_id}
            )
            
            # 3. Step C: Clear any active account activation or password reset invitation tokens
            db.session.execute(
                text("DELETE FROM password_reset_tokens WHERE user_id = :uid"), 
                {"uid": user_id}
            )
            
            # 4. Step D: Strip multi-tenant organization tracking access memberships
            db.session.execute(
                text("DELETE FROM tenant_memberships WHERE user_id = :uid"), 
                {"uid": user_id}
            )
            
            # 5. Step E: Finally, delete the core user profile security row wrapper
            db.session.execute(
                text("DELETE FROM users WHERE id = :uid"), 
                {"uid": user_id}
            )
            
            # Commit the entire atomic block safely to the cluster layout
            db.session.commit()
            deletions['user'] = 1
        except IntegrityError:
            db.session.rollback()
            blocking_after, detachable_after, unknown_after = OrphanCleanupService._user_fk_references(user_id)
            return False, {
                'exists': True,
                'user_id': user_id,
                'can_delete': False,
                'reasons': ['User is still referenced by database constraints'],
                'blocking_references': blocking_after,
                'detachable_references': detachable_after,
                'unknown_references': unknown_after,
            }
        except Exception as e:
            db.session.rollback()
            return False, {
                'exists': True,
                'user_id': user_id,
                'can_delete': False,
                'reasons': [f"Purge pipeline failed: {str(e)}"],
                'error': type(e).__name__,
            }

        return True, {'deleted': deletions, 'user_id': user_id}

    @staticmethod
    def anonymize_user(user_id: int, actor_user_id: int) -> Tuple[bool, Dict[str, Any]]:
        if user_id == actor_user_id:
            return False, {'exists': True, 'user_id': user_id, 'can_anonymize': False, 'reasons': ['Cannot anonymize your own account']}

        user = User.query.get(user_id)
        if not user:
            return False, {'exists': False, 'user_id': user_id, 'can_anonymize': False, 'reasons': ['User not found']}
        if user.role == 'super_admin':
            return False, {'exists': True, 'user_id': user_id, 'can_anonymize': False, 'reasons': ['Cannot anonymize a super admin account']}

        token = uuid.uuid4().hex
        user.status = 'inactive'
        user.username = f"deleted_{user.id}_{token[:6]}"
        user.email = f"deleted+{user.id}+{token[:8]}@admipaedia.invalid"
        try:
            user.set_password_hash(uuid.uuid4().hex)
        except Exception:
            pass

        if hasattr(user, 'mfa_enabled'):
            user.mfa_enabled = False
        if hasattr(user, 'email_verification_token'):
            user.email_verification_token = None
        if hasattr(user, 'email_verification_expires'):
            user.email_verification_expires = None
        if hasattr(user, 'force_password_change'):
            user.force_password_change = False

        SessionToken.query.filter_by(user_id=user.id).delete(synchronize_session=False)
        APIKey.query.filter_by(user_id=user.id).delete(synchronize_session=False)
        PasswordResetToken.query.filter_by(user_id=user.id).delete(synchronize_session=False)
        MFADevice.query.filter_by(user_id=user.id).delete(synchronize_session=False)
        TrustedDevice.query.filter_by(user_id=user.id).delete(synchronize_session=False)
        AuthenticationAttempt.query.filter_by(user_id=user.id).delete(synchronize_session=False)
        UserSecuritySettings.query.filter_by(user_id=user.id).delete(synchronize_session=False)

        return True, {'user_id': user_id, 'mode': 'anonymized'}
