from flask import Blueprint, jsonify, request, g
from app.extensions import db
from app.models.tenant import Tenant, Branch
from app.utils.tenant_context import tenant_required
import uuid
import logging

logger = logging.getLogger(__name__)

branches_bp = Blueprint('branches', __name__)

def verify_enterprise_tier(tenant_id):
    """Ensure the tenant is on the enterprise or ultimate plan tier."""
    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        return False, "Tenant not found"
    
    plan = getattr(tenant, 'plan', 'trial') or 'trial'
    if plan.lower() not in ('enterprise', 'ultimate'):
        return False, "Multi-branch setups are exclusive to the Enterprise tier"
    
    return True, None

@branches_bp.route('', methods=['GET'])
@tenant_required
def list_branches():
    """List all branches for the active school/tenant."""
    try:
        is_ok, err = verify_enterprise_tier(g.tenant_id)
        if not is_ok:
            return jsonify({'success': False, 'message': err}), 403

        # Disable automatic compile listener so we can fetch all branches for the school
        # (Though before_compile doesn't target Branch model directly, this is extremely safe)
        branches = Branch.query.filter_by(tenant_id=g.tenant_id).order_by(Branch.created_at.desc()).all()
        
        serialized = []
        for b in branches:
            serialized.append({
                'id': str(b.id),
                'name': b.name,
                'code': b.code,
                'address': b.address,
                'is_active': b.is_active,
                'created_at': b.created_at.isoformat() if b.created_at else None
            })
            
        return jsonify({'success': True, 'branches': serialized}), 200
        
    except Exception as e:
        logger.error(f"Error listing branches: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to retrieve branches'}), 500

@branches_bp.route('', methods=['POST'])
@tenant_required
def create_branch():
    """Create a new campus branch for the active school/tenant."""
    try:
        is_ok, err = verify_enterprise_tier(g.tenant_id)
        if not is_ok:
            return jsonify({'success': False, 'message': err}), 403

        data = request.get_json() or {}
        name = data.get('name')
        code = data.get('code')
        address = data.get('address')

        if not name:
            return jsonify({'success': False, 'message': 'Branch name is required'}), 400

        # Optional: check unique branch code per tenant
        if code:
            existing = Branch.query.filter_by(tenant_id=g.tenant_id, code=code).first()
            if existing:
                return jsonify({'success': False, 'message': f"Branch code '{code}' is already in use"}), 400

        branch = Branch(
            tenant_id=g.tenant_id,
            name=name,
            code=code,
            address=address,
            is_active=True
        )
        
        db.session.add(branch)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Branch created successfully',
            'branch': {
                'id': str(branch.id),
                'name': branch.name,
                'code': branch.code,
                'address': branch.address,
                'is_active': branch.is_active
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating branch: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to create branch'}), 500

@branches_bp.route('/<string:branch_id>', methods=['PUT'])
@tenant_required
def update_branch(branch_id):
    """Update details of a campus branch."""
    try:
        is_ok, err = verify_enterprise_tier(g.tenant_id)
        if not is_ok:
            return jsonify({'success': False, 'message': err}), 403

        try:
            bid = uuid.UUID(branch_id)
        except Exception:
            return jsonify({'success': False, 'message': 'Invalid branch ID'}), 400

        branch = Branch.query.filter_by(id=bid, tenant_id=g.tenant_id).first()
        if not branch:
            return jsonify({'success': False, 'message': 'Branch not found'}), 404

        data = request.get_json() or {}
        name = data.get('name')
        code = data.get('code')
        address = data.get('address')
        is_active = data.get('is_active')

        if name is not None:
            if not name.strip():
                return jsonify({'success': False, 'message': 'Branch name cannot be empty'}), 400
            branch.name = name.strip()

        if code is not None:
            if code.strip():
                # Check uniqueness
                existing = Branch.query.filter_by(tenant_id=g.tenant_id, code=code.strip()).first()
                if existing and existing.id != branch.id:
                    return jsonify({'success': False, 'message': f"Branch code '{code}' is already in use"}), 400
            branch.code = code.strip() if code.strip() else None

        if address is not None:
            branch.address = address.strip() if address.strip() else None

        if is_active is not None:
            branch.is_active = bool(is_active)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Branch updated successfully',
            'branch': {
                'id': str(branch.id),
                'name': branch.name,
                'code': branch.code,
                'address': branch.address,
                'is_active': branch.is_active
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating branch {branch_id}: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to update branch'}), 500

@branches_bp.route('/<string:branch_id>', methods=['DELETE'])
@tenant_required
def delete_branch(branch_id):
    """Deactivate or remove a campus branch."""
    try:
        is_ok, err = verify_enterprise_tier(g.tenant_id)
        if not is_ok:
            return jsonify({'success': False, 'message': err}), 403

        try:
            bid = uuid.UUID(branch_id)
        except Exception:
            return jsonify({'success': False, 'message': 'Invalid branch ID'}), 400

        branch = Branch.query.filter_by(id=bid, tenant_id=g.tenant_id).first()
        if not branch:
            return jsonify({'success': False, 'message': 'Branch not found'}), 404

        # For strict data safety, we do a soft-delete (deactivation)
        branch.is_active = False
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Branch deactivated successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deactivating branch {branch_id}: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to deactivate branch'}), 500
