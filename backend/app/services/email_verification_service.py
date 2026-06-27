import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple
from flask import request, current_app
from app.extensions import db, logger
from app.models.user import User
from app.models.email_verification import EmailVerificationToken
from app.utils.url_helpers import get_frontend_base_url

class EmailVerificationRepository:
    """
    Repository class encapsulating data access logic for EmailVerificationToken.
    This strictly isolates all database writes without disrupting existing migrations
    by dynamically creating the verification table at runtime if missing.
    """
    def __init__(self):
        try:
            # Skip DDL table creation during unit testing to prevent SQLite savepoint invalidation.
            # conftest.py already creates all tables automatically.
            import sys
            is_testing = 'pytest' in sys.modules
            try:
                if current_app and current_app.config.get('TESTING'):
                    is_testing = True
            except RuntimeError:
                pass

            if not is_testing:
                db.Model.metadata.create_all(bind=db.engine, tables=[EmailVerificationToken.__table__])
        except Exception as e:
            logger.warning("Runtime metadata creation bypassed or not yet bound to an engine", error=str(e))

    def create_token(self, user_id: int, email: str, expires_in_minutes: int = 60, expires_in_hours: Optional[int] = None) -> Tuple[str, EmailVerificationToken]:
        """
        Generate a secure url-safe cryptographic token via secrets.token_urlsafe(48),
        SHA-256 hash it, invalidate prior tokens, and persist to database.
        Returns a tuple of (plain_token, token_record).
        """
        if expires_in_hours is not None:
            expires_in_minutes = expires_in_hours * 60
        # 1. Single-active tracking state sweeps: Sweep any existing active verification tokens for this user
        try:
            EmailVerificationToken.query.filter_by(user_id=int(user_id), is_used=False).update({
                'is_used': True,
                'used_at': datetime.utcnow()
            })
            db.session.flush()
        except Exception as e:
            logger.warning("Single-active tracking sweep encountered a dynamic context override", error=str(e))

        # 2. Highly unpredictable token generation
        plain_token = secrets.token_urlsafe(48)
        token_hash = hashlib.sha256(plain_token.encode('utf-8')).hexdigest()
        expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)

        record = EmailVerificationToken(
            user_id=int(user_id),
            email=email.strip().lower(),
            token_hash=token_hash,
            expires_at=expires_at,
            is_used=False
        )

        db.session.add(record)
        db.session.commit()
        return plain_token, record

    def get_by_token(self, plain_token: str) -> Optional[EmailVerificationToken]:
        """
        Retrieve the token record by matching its hashed form.
        """
        if not plain_token:
            return None
        token_hash = hashlib.sha256(plain_token.encode('utf-8')).hexdigest()
        return EmailVerificationToken.query.filter_by(token_hash=token_hash).first()

    def save(self, record: EmailVerificationToken) -> None:
        """
        Save or update a token record in the database.
        """
        db.session.add(record)
        db.session.commit()

    def get_active_by_user(self, user_id: int) -> Optional[EmailVerificationToken]:
        """
        Get the latest active, non-expired verification token for a user.
        """
        return EmailVerificationToken.query.filter(
            EmailVerificationToken.user_id == user_id,
            EmailVerificationToken.is_used == False,
            EmailVerificationToken.expires_at > datetime.utcnow()
        ).order_by(EmailVerificationToken.created_at.desc()).first()


class EmailVerificationService:
    """
    Service class implementing the email verification lifecycle loop.
    Supports secure background email formatting and dynamic window context inheritance.
    """
    def __init__(self, repo: Optional[EmailVerificationRepository] = None):
        self.repo = repo or EmailVerificationRepository()

    def send_verification_email(self, user: User, base_url: Optional[str] = None) -> bool:
        """
        Generates a token, dynamically formats the secure activation link,
        and dispatches the verification email.
        """
        try:
            # Generate cryptographic token
            plain_token, record = self.repo.create_token(user_id=user.id, email=user.email)

            # Dynamically inherit server context to avoid hardcoded localhost overrides
            if not base_url:
                base_url = self.get_request_base_url()

            activation_link = f"{base_url}/auth/verify-email?token={plain_token}"

            subject = "ADMIPAEDIA - Verify Your Email Address"
            text_body = (
                f"Hello {user.username},\n\n"
                f"Thank you for registering on ADMIPAEDIA! Please verify your email address "
                f"by clicking the link below (expires in 24 hours):\n\n"
                f"{activation_link}\n\n"
                f"If you did not request this email, you can safely ignore it."
            )
            html_body = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #4f46e5; font-size: 24px; font-weight: 700; margin: 0;">Welcome to ADMIPAEDIA!</h2>
                </div>
                <p style="font-size: 16px; color: #1f2937; line-height: 1.5; margin: 0 0 16px 0;">Hello <strong>{user.username}</strong>,</p>
                <p style="font-size: 16px; color: #4b5563; line-height: 1.5; margin: 0 0 24px 0;">Thank you for registering on our platform. Please verify your email address to activate your account and complete your SaaS registration. This verification link expires in 24 hours.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{activation_link}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Verify Email Address</a>
                </div>
                <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 8px 0;">If the button above does not work, copy and paste this URL into your browser:</p>
                <p style="font-size: 12px; color: #4f46e5; word-break: break-all; margin: 0 0 24px 0;"><a href="{activation_link}" style="color: #4f46e5;">{activation_link}</a></p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">If you did not register for this account, you can safely ignore this email.</p>
            </div>
            """

            # Dispatch using standard background mailing
            from app.services.email_service import _send_email_background
            _send_email_background(
                subject=subject,
                recipients=[user.email],
                text_body=text_body,
                html_body=html_body
            )
            logger.info("Email verification dispatch initiated", user_id=user.id, email=user.email)
            return True
        except Exception as e:
            logger.error("Failed to execute verification email loop", error=str(e), user_id=user.id)
            return False

    def verify_token(self, plain_token: str) -> Tuple[bool, str]:
        """
        Verify the plain token against stored hashed entries, and activate the user.
        """
        record = self.repo.get_by_token(plain_token)
        if not record:
            return False, "Invalid verification token"

        if record.is_used:
            return False, "This verification token has already been used"

        if record.expires_at < datetime.utcnow():
            return False, "This verification token has expired"

        # Mark token as successfully used
        record.is_used = True
        record.used_at = datetime.utcnow()
        self.repo.save(record)

        # Retrieve user and activate
        user = User.query.get(record.user_id)
        if not user:
            return False, "User not found"

        user.email_verified = True
        user.status = 'active'
        db.session.add(user)
        db.session.commit()

        if user.role == 'teacher':
            try:
                from app.services.teacher_provisioning_service import TeacherProvisioningService
                TeacherProvisioningService.provision_teacher(user.id)
            except Exception as e:
                logger.error("Failed to run TeacherProvisioningService during email verification activation", error=str(e), user_id=user.id)

        logger.info("Email verification complete. User activated.", user_id=user.id, email=user.email)
        return True, "Email verified successfully"

    def get_request_base_url(self) -> str:
        """Resolve a production-safe frontend base URL for verification links."""
        return get_frontend_base_url()
