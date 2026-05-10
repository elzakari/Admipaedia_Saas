from __future__ import annotations

import base64
from typing import Optional

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def _derive_fernet_key(secret: str, salt: str) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=(salt or '').encode('utf-8'),
        iterations=390000,
    )
    return base64.urlsafe_b64encode(kdf.derive((secret or '').encode('utf-8')))


def encrypt_value(value: Optional[str], *, secret: str, salt: str) -> Optional[str]:
    if value is None:
        return None
    if value == '':
        return ''
    f = Fernet(_derive_fernet_key(secret, salt))
    return f.encrypt(value.encode('utf-8')).decode('utf-8')


def decrypt_value(value: Optional[str], *, secret: str, salt: str) -> Optional[str]:
    if value is None:
        return None
    if value == '':
        return ''
    f = Fernet(_derive_fernet_key(secret, salt))
    return f.decrypt(value.encode('utf-8')).decode('utf-8')

