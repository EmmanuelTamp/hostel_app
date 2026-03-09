import secrets
import string
import hashlib

ALPHABET = string.ascii_uppercase + string.digits

def generate_code(length: int = 10) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))

def hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()