import uuid
from flask import request, g, session, has_app_context
from app.extensions import db
from app.models.tenant import Branch, TenantMembership
from sqlalchemy import event
from sqlalchemy.orm import Session

def campus_isolation_middleware():
    """
    Flask before_request hook that intercepts and extracts the active branch context,
    assigning it globally to g.branch_id. Smoothly defaults to the Main Campus branch
    for school administrators if no active branch context is active.
    """
    if not has_app_context():
        return

    # 1. Resolve branch_id from X-Active-Branch-ID, X-Branch-ID, args, or session
    branch_id_str = (
        request.headers.get('X-Active-Branch-ID') or
        request.headers.get('X-Branch-ID') or
        request.args.get('active_branch_id') or
        request.args.get('branch_id') or
        session.get('active_branch_id')
    )

    g.branch_id = None
    if branch_id_str:
        try:
            g.branch_id = uuid.UUID(str(branch_id_str).strip())
        except Exception:
            pass

    # 2. Get active tenant context if available
    tenant_id = getattr(g, 'tenant_id', None)
    current_user = getattr(g, 'current_user', None)

    # 3. Default smoothly to 'Main Campus' if no branch is selected by an administrator
    if tenant_id and g.branch_id is None:
        is_admin = False
        if current_user:
            if current_user.role in ('admin', 'school_admin', 'school_finance', 'super_admin', 'super_manager'):
                is_admin = True
            else:
                membership = TenantMembership.query.filter_by(
                    user_id=current_user.id,
                    tenant_id=tenant_id,
                    status='active'
                ).first()
                if membership and membership.role in ('school_admin', 'school_finance'):
                    is_admin = True
                    
        # Apply the default branch rules
        if is_admin or not current_user:
            main_branch = Branch.query.filter_by(tenant_id=tenant_id, name='Main Campus').first()
            if not main_branch:
                main_branch = Branch.query.filter_by(tenant_id=tenant_id, is_active=True).first()
            if not main_branch:
                try:
                    main_branch = Branch(tenant_id=tenant_id, name='Main Campus', is_active=True)
                    db.session.add(main_branch)
                    db.session.commit()
                except Exception:
                    db.session.rollback()
            if main_branch:
                g.branch_id = main_branch.id


@event.listens_for(Session, 'before_flush')
def auto_populate_branch_id(session, flush_context, instances):
    """
    SQLAlchemy session event listener.
    Automatically populates the branch_id field for any new model instance
    created within a branch-scoped context before writing to storage.
    """
    if not has_app_context() or not getattr(g, 'branch_id', None):
        return
        
    for obj in session.new:
        if hasattr(obj, 'branch_id') and getattr(obj, 'branch_id') is None:
            obj.branch_id = g.branch_id
