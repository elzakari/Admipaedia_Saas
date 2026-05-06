"""
Enhanced password security utilities for ADMIPAEDIA
Implements password strength validation, breach checking, and secure password policies
"""

import re
import hashlib
import secrets
import string
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
import structlog
from flask import request
from app.extensions import db
from app.models.security import LoginAttempt

logger = structlog.get_logger()

class PasswordSecurity:
    """Enhanced password security implementation"""
    
    # Common passwords to reject (top 1000 most common passwords)
    COMMON_PASSWORDS = {
        'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
        'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
        'qwerty123', 'dragon', 'master', 'hello', 'login', 'welcome123'
    }
    
    # Password strength requirements
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGITS = True
    REQUIRE_SPECIAL = True
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    # Account lockout settings
    MAX_FAILED_ATTEMPTS = 5
    LOCKOUT_DURATION = 30  # minutes
    
    @classmethod
    def validate_password_strength(cls, password: str, username: str = None, email: str = None) -> Tuple[bool, List[str]]:
        """
        Validate password strength against security requirements
        
        Args:
            password: Password to validate
            username: Username (to check for similarity)
            email: Email (to check for similarity)
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Length check
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters long")
        
        if len(password) > cls.MAX_LENGTH:
            errors.append(f"Password must not exceed {cls.MAX_LENGTH} characters")
        
        # Character requirements
        if cls.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if cls.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if cls.REQUIRE_DIGITS and not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        
        if cls.REQUIRE_SPECIAL and not re.search(f'[{re.escape(cls.SPECIAL_CHARS)}]', password):
            errors.append(f"Password must contain at least one special character ({cls.SPECIAL_CHARS})")
        
        # Common password check
        if password.lower() in cls.COMMON_PASSWORDS:
            errors.append("Password is too common and easily guessable")
        
        # Similarity checks
        if username and cls._is_similar(password, username):
            errors.append("Password is too similar to username")
        
        if email and cls._is_similar(password, email.split('@')[0]):
            errors.append("Password is too similar to email address")
        
        # Pattern checks
        if cls._has_repeated_chars(password):
            errors.append("Password contains too many repeated characters")
        
        if cls._is_sequential(password):
            errors.append("Password contains sequential characters (e.g., 123, abc)")
        
        return len(errors) == 0, errors
    
    @classmethod
    def _is_similar(cls, password: str, reference: str, threshold: float = 0.7) -> bool:
        """Check if password is too similar to reference string"""
        if not reference or len(reference) < 3:
            return False
        
        password_lower = password.lower()
        reference_lower = reference.lower()
        
        # Check if reference is contained in password
        if reference_lower in password_lower or password_lower in reference_lower:
            return True
        
        # Simple similarity check based on common characters
        common_chars = set(password_lower) & set(reference_lower)
        similarity = len(common_chars) / max(len(set(password_lower)), len(set(reference_lower)))
        
        return similarity > threshold
    
    @classmethod
    def _has_repeated_chars(cls, password: str, max_repeat: int = 3) -> bool:
        """Check for excessive character repetition"""
        for i in range(len(password) - max_repeat + 1):
            if len(set(password[i:i + max_repeat])) == 1:
                return True
        return False
    
    @classmethod
    def _is_sequential(cls, password: str, min_sequence: int = 3) -> bool:
        """Check for sequential characters"""
        sequences = [
            'abcdefghijklmnopqrstuvwxyz',
            '0123456789',
            'qwertyuiop',
            'asdfghjkl',
            'zxcvbnm'
        ]
        
        password_lower = password.lower()
        
        for sequence in sequences:
            for i in range(len(sequence) - min_sequence + 1):
                subseq = sequence[i:i + min_sequence]
                if subseq in password_lower or subseq[::-1] in password_lower:
                    return True
        
        return False
    
    @classmethod
    def generate_secure_password(cls, length: int = 12) -> str:
        """Generate a cryptographically secure password"""
        if length < cls.MIN_LENGTH:
            length = cls.MIN_LENGTH
        
        # Ensure we have at least one character from each required category
        password_chars = []
        
        if cls.REQUIRE_UPPERCASE:
            password_chars.append(secrets.choice(string.ascii_uppercase))
        
        if cls.REQUIRE_LOWERCASE:
            password_chars.append(secrets.choice(string.ascii_lowercase))
        
        if cls.REQUIRE_DIGITS:
            password_chars.append(secrets.choice(string.digits))
        
        if cls.REQUIRE_SPECIAL:
            password_chars.append(secrets.choice(cls.SPECIAL_CHARS))
        
        # Fill the rest with random characters
        all_chars = string.ascii_letters + string.digits + cls.SPECIAL_CHARS
        for _ in range(length - len(password_chars)):
            password_chars.append(secrets.choice(all_chars))
        
        # Shuffle the password
        secrets.SystemRandom().shuffle(password_chars)
        
        return ''.join(password_chars)
    
    @classmethod
    def check_password_breach(cls, password: str) -> bool:
        """
        Check if password has been found in known data breaches using k-anonymity
        This uses the HaveIBeenPwned API's k-anonymity model
        """
        try:
            import requests
            
            # Hash the password
            sha1_hash = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
            prefix = sha1_hash[:5]
            suffix = sha1_hash[5:]
            
            # Query HaveIBeenPwned API
            url = f"https://api.pwnedpasswords.com/range/{prefix}"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                # Check if our suffix appears in the response
                for line in response.text.splitlines():
                    hash_suffix, count = line.split(':')
                    if hash_suffix == suffix:
                        logger.warning("password_found_in_breach", count=int(count))
                        return True
            
            return False
            
        except Exception as e:
            logger.error("password_breach_check_failed", error=str(e))
            # If the check fails, don't block the user but log the error
            return False

class AccountSecurity:
    """Account security and lockout management"""
    
    @classmethod
    def record_failed_login(cls, identifier: str, ip_address: str = None, user_agent: str = None, device_info: dict = None):
        """Record a failed login attempt"""
        from app.models.security import LoginAttempt
        
        # Record the failed attempt
        attempt = LoginAttempt(
            identifier=identifier,
            ip_address=ip_address or (request.remote_addr if request else None),
            user_agent=user_agent or (request.headers.get('User-Agent') if request else None),
            success=False,
            attempted_at=datetime.utcnow()
        )
        db.session.add(attempt)
        
        # Count recent failed attempts (last 30 minutes)
        cutoff_time = datetime.utcnow() - timedelta(minutes=30)
        failed_count = db.session.query(db.func.count(LoginAttempt.id)).filter(
            LoginAttempt.identifier == identifier,
            LoginAttempt.success == False,
            LoginAttempt.attempted_at > cutoff_time
        ).scalar()
        
        is_locked = failed_count >= PasswordSecurity.MAX_FAILED_ATTEMPTS
        
        if is_locked:
            logger.warning(
                "account_locked",
                identifier=identifier,
                failed_attempts=failed_count,
                ip=ip_address or (request.remote_addr if request else None)
            )
        
        # Note: We commit here to ensure the count is saved and visible
        # But we'll try to minimize other commits in the auth flow
        db.session.commit()
        
        return {
            'is_locked': is_locked,
            'failed_attempts': failed_count,
            'lockout_duration': PasswordSecurity.LOCKOUT_DURATION,
            'retry_after': PasswordSecurity.LOCKOUT_DURATION * 60 if is_locked else 0
        }
    
    @classmethod
    def record_successful_login(cls, identifier: str, ip_address: str = None, user_agent: str = None):
        """Record a successful login attempt"""
        from app.models.security import LoginAttempt
        
        attempt = LoginAttempt(
            identifier=identifier,
            ip_address=ip_address or (request.remote_addr if 'request' in globals() else None),
            user_agent=user_agent,
            success=True,
            attempted_at=datetime.utcnow()
        )
        db.session.add(attempt)
        db.session.commit()
    
    @classmethod
    def is_account_locked(cls, identifier: str) -> Tuple[bool, int]:
        """
        Check if an account is locked due to too many failed login attempts
        
        Args:
            identifier: Username or email to check
            
        Returns:
            Tuple of (is_locked, seconds_until_unlock)
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=PasswordSecurity.LOCKOUT_DURATION)
        
        # Get the most recent failed attempts
        recent_failed = LoginAttempt.query.filter(
            LoginAttempt.identifier == identifier,
            LoginAttempt.success == False,
            LoginAttempt.attempted_at > cutoff_time
        ).order_by(LoginAttempt.attempted_at.desc()).limit(PasswordSecurity.MAX_FAILED_ATTEMPTS).all()
        
        if len(recent_failed) >= PasswordSecurity.MAX_FAILED_ATTEMPTS:
            # Check if there's been a successful login since the lockout period started
            last_failed = recent_failed[0].attempted_at
            successful_since = LoginAttempt.query.filter(
                LoginAttempt.identifier == identifier,
                LoginAttempt.success == True,
                LoginAttempt.attempted_at > last_failed
            ).first()
            
            if not successful_since:
                unlock_time = last_failed + timedelta(minutes=PasswordSecurity.LOCKOUT_DURATION)
                if datetime.utcnow() < unlock_time:
                    seconds_left = int((unlock_time - datetime.utcnow()).total_seconds())
                    return True, seconds_left
        
        return False, 0
    
    @classmethod
    def clear_failed_attempts(cls, identifier: str):
        """Clear failed login attempts for an identifier"""
        from app.models.security import LoginAttempt
        
        # We don't actually delete them, just mark them as cleared by recording a successful login
        cls.record_successful_login(identifier)