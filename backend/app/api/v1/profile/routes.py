import os
import uuid
from datetime import datetime

from flask import Blueprint, jsonify, request, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from marshmallow import Schema, fields, validate, ValidationError
from werkzeug.utils import secure_filename
import structlog

from app.extensions import db
from app.models.user import User
from app.models.session_token import SessionToken
from app.models.security import SecurityEvent
from app.models.user_profile import UserProfile
from app.models.user_preferences import UserPreferences
from app.middleware.security_middleware import security_headers, sanitize_request_data, rate_limit, log_security_event


logger = structlog.get_logger()
profile_bp = Blueprint('profile', __name__)


def _ensure_profile_tables():
    bind = db.engine
    UserProfile.__table__.create(bind=bind, checkfirst=True)
    UserPreferences.__table__.create(bind=bind, checkfirst=True)


def _get_or_create_profile(user: User) -> UserProfile:
    _ensure_profile_tables()
    profile = UserProfile.query.filter_by(user_id=user.id).first()
    if profile:
        return profile
    profile = UserProfile(
        user_id=user.id,
        display_name=user.username or 'User'
    )
    db.session.add(profile)
    db.session.commit()
    return profile


def _get_or_create_preferences(user: User) -> UserPreferences:
    _ensure_profile_tables()
    prefs = UserPreferences.query.filter_by(user_id=user.id).first()
    if prefs:
        return prefs
    prefs = UserPreferences(user_id=user.id)
    db.session.add(prefs)
    db.session.commit()
    return prefs


class UpdateProfileSchema(Schema):
    display_name = fields.String(required=True, validate=validate.Length(min=2, max=120))
    legal_name = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=200))
    phone = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=32))
    country = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=80))
    timezone = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=80))


class UpdatePreferencesSchema(Schema):
    theme_mode = fields.String(load_default=None, allow_none=True, validate=validate.OneOf(['system', 'light', 'dark', 'gradient', 'casaos']))
    language = fields.String(load_default=None, allow_none=True, validate=validate.Length(min=2, max=12))
    date_time_format = fields.String(load_default=None, allow_none=True, validate=validate.OneOf(['auto', '12h', '24h']))
    default_profile_tab = fields.String(load_default=None, allow_none=True, validate=validate.OneOf(['profile', 'security', 'preferences']))
    notify_product_updates = fields.Boolean(load_default=None, allow_none=True)
    notify_security_alerts = fields.Boolean(load_default=None, allow_none=True)


@profile_bp.route('/me', methods=['GET'])
@jwt_required()
@security_headers()
def get_my_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        profile = _get_or_create_profile(user)
        preferences = _get_or_create_preferences(user)

        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'email_verified': bool(getattr(user, 'email_verified', False)),
                'mfa_enabled': bool(getattr(user, 'mfa_enabled', False)),
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'password_changed_at': user.password_changed_at.isoformat() if getattr(user, 'password_changed_at', None) else None
            },
            'profile': profile.to_dict(),
            'preferences': preferences.to_dict()
        }), 200

    except Exception as err:
        logger.error('profile_me_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to load profile'}), 500


@profile_bp.route('/me', methods=['PUT'])
@jwt_required()
@rate_limit(limit=20, window=3600)
@sanitize_request_data()
@security_headers()
def update_my_profile():
    try:
        schema = UpdateProfileSchema()
        data = schema.load(request.json or {})

        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        profile = _get_or_create_profile(user)

        profile.display_name = data['display_name']
        profile.legal_name = data.get('legal_name')
        profile.phone = data.get('phone')
        profile.country = data.get('country')
        profile.timezone = data.get('timezone')
        profile.updated_at = datetime.utcnow()

        db.session.commit()

        log_security_event('profile_updated', {'user_id': user_id})

        return jsonify({'success': True, 'profile': profile.to_dict()}), 200

    except ValidationError as err:
        return jsonify({'success': False, 'error': err.messages}), 400
    except Exception as err:
        logger.error('profile_update_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to update profile'}), 500


@profile_bp.route('/preferences', methods=['GET'])
@jwt_required()
@security_headers()
def get_preferences():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        prefs = _get_or_create_preferences(user)
        return jsonify({'success': True, 'preferences': prefs.to_dict()}), 200
    except Exception as err:
        logger.error('get_preferences_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to load preferences'}), 500


@profile_bp.route('/preferences', methods=['PUT'])
@jwt_required()
@rate_limit(limit=20, window=3600)
@sanitize_request_data()
@security_headers()
def update_preferences():
    try:
        schema = UpdatePreferencesSchema()
        data = schema.load(request.json or {})

        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        prefs = _get_or_create_preferences(user)

        for key in ['theme_mode', 'language', 'date_time_format', 'default_profile_tab', 'notify_product_updates', 'notify_security_alerts']:
            if key in data and data[key] is not None:
                setattr(prefs, key, data[key])

        prefs.updated_at = datetime.utcnow()
        db.session.commit()

        log_security_event('preferences_updated', {'user_id': user_id})

        return jsonify({'success': True, 'preferences': prefs.to_dict()}), 200

    except ValidationError as err:
        return jsonify({'success': False, 'error': err.messages}), 400
    except Exception as err:
        logger.error('update_preferences_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to update preferences'}), 500


@profile_bp.route('/sessions', methods=['GET'])
@jwt_required()
@security_headers()
def list_sessions():
    try:
        user_id = get_jwt_identity()
        current_jti = get_jwt().get('jti')

        sessions = SessionToken.get_user_active_sessions(user_id)
        data = []
        for token in sessions:
            d = token.to_dict()
            d['is_current'] = token.jti == current_jti
            d['revocation_reason'] = token.revocation_reason
            data.append(d)

        data.sort(key=lambda s: (not s.get('is_current', False), s.get('last_used_at') or s.get('issued_at') or ''), reverse=False)

        return jsonify({'success': True, 'sessions': data}), 200

    except Exception as err:
        logger.error('list_sessions_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to load sessions'}), 500


@profile_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@jwt_required()
@rate_limit(limit=30, window=3600)
@security_headers()
def revoke_session(session_id: int):
    try:
        user_id = get_jwt_identity()
        current_jti = get_jwt().get('jti')

        token = SessionToken.query.filter_by(id=session_id, user_id=user_id, token_type='access').first()
        if not token:
            return jsonify({'success': False, 'error': 'Session not found'}), 404

        if token.jti == current_jti:
            return jsonify({'success': False, 'error': 'Cannot revoke current session'}), 400

        token.is_revoked = True
        token.revoked_at = datetime.utcnow()
        token.revocation_reason = 'user_revoked'
        db.session.commit()

        log_security_event('session_revoked', {'user_id': user_id, 'session_id': session_id})

        return jsonify({'success': True, 'message': 'Session revoked'}), 200

    except Exception as err:
        logger.error('revoke_session_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to revoke session'}), 500


@profile_bp.route('/sessions/revoke-others', methods=['POST'])
@jwt_required()
@rate_limit(limit=10, window=3600)
@security_headers()
def revoke_other_sessions():
    try:
        user_id = get_jwt_identity()
        current_jti = get_jwt().get('jti')

        SessionToken.query.filter(
            SessionToken.user_id == user_id,
            SessionToken.token_type == 'access',
            SessionToken.is_revoked == False,
            SessionToken.jti != current_jti,
            SessionToken.expires_at > datetime.utcnow()
        ).update({
            'is_revoked': True,
            'revoked_at': datetime.utcnow(),
            'revocation_reason': 'revoke_others'
        })

        db.session.commit()

        log_security_event('sessions_revoked_others', {'user_id': user_id})

        return jsonify({'success': True, 'message': 'Other sessions revoked'}), 200

    except Exception as err:
        logger.error('revoke_other_sessions_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to revoke other sessions'}), 500


@profile_bp.route('/security-events', methods=['GET'])
@jwt_required()
@security_headers()
def list_security_events():
    try:
        user_id = get_jwt_identity()
        limit = min(request.args.get('limit', 20, type=int), 50)
        events = SecurityEvent.query.filter_by(user_id=user_id).order_by(SecurityEvent.created_at.desc()).limit(limit).all()
        return jsonify({
            'success': True,
            'events': [{
                'id': e.id,
                'event_type': e.event_type,
                'severity': e.severity,
                'created_at': e.created_at.isoformat() if e.created_at else None,
                'ip_address': e.ip_address,
                'user_agent': e.user_agent[:120] if e.user_agent else None,
                'details': e.details
            } for e in events]
        }), 200
    except Exception as err:
        logger.error('list_security_events_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to load security activity'}), 500


def _allowed_avatar_file(filename: str) -> bool:
    if not filename or '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in {'png', 'jpg', 'jpeg', 'webp'}


@profile_bp.route('/avatar', methods=['POST'])
@jwt_required()
@rate_limit(limit=30, window=3600)
@security_headers()
def upload_avatar():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        file = request.files['file']
        if not file or not _allowed_avatar_file(file.filename):
            return jsonify({'success': False, 'error': 'Invalid file type'}), 400

        profile = _get_or_create_profile(user)

        filename = secure_filename(file.filename)
        unique_name = f"avatar_{user_id}_{uuid.uuid4().hex}_{filename}"
        rel_dir = os.path.join('uploads', 'avatars')
        abs_dir = os.path.join(current_app.root_path, rel_dir)
        os.makedirs(abs_dir, exist_ok=True)

        abs_path = os.path.join(abs_dir, unique_name)
        file.save(abs_path)

        profile.avatar_url = f"/api/v1/profile/avatar/{unique_name}"
        profile.updated_at = datetime.utcnow()
        db.session.commit()

        log_security_event('avatar_updated', {'user_id': user_id})

        return jsonify({'success': True, 'avatar_url': profile.avatar_url}), 200

    except Exception as err:
        logger.error('upload_avatar_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to upload avatar'}), 500


@profile_bp.route('/avatar', methods=['DELETE'])
@jwt_required()
@rate_limit(limit=30, window=3600)
@security_headers()
def remove_avatar():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        profile = _get_or_create_profile(user)
        old_url = profile.avatar_url
        profile.avatar_url = None
        profile.updated_at = datetime.utcnow()
        db.session.commit()

        if old_url and old_url.startswith('/api/v1/profile/avatar/'):
            filename = old_url.split('/api/v1/profile/avatar/', 1)[1]
            rel_dir = os.path.join('uploads', 'avatars')
            abs_dir = os.path.join(current_app.root_path, rel_dir)
            abs_path = os.path.join(abs_dir, filename)
            try:
                if os.path.isfile(abs_path):
                    os.remove(abs_path)
            except Exception:
                pass

        log_security_event('avatar_removed', {'user_id': user_id})

        return jsonify({'success': True}), 200

    except Exception as err:
        logger.error('remove_avatar_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to remove avatar'}), 500


@profile_bp.route('/avatar/<path:filename>', methods=['GET'])
def serve_avatar(filename: str):
    rel_dir = os.path.join(current_app.root_path, 'uploads', 'avatars')
    return send_from_directory(rel_dir, filename)

