from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings

settings = get_settings()
fernet = Fernet(settings.encryption_key.encode())


def encrypt_token(raw_token: str) -> str:
    return fernet.encrypt(raw_token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    try:
        return fernet.decrypt(encrypted_token.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Unable to decrypt token") from exc
