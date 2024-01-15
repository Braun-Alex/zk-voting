import hashlib
import base64
import os

from jose import jwt
from enum import Enum
from datetime import datetime, timedelta
from typing import Union, Any
from pydantic import BaseModel
from dotenv import load_dotenv
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad

load_dotenv()

SECRET_KEY_LENGTH = 32
ALGORITHM = "HS256"
JWT_SECRET_KEY = os.environ['JWT_SECRET_KEY']
AES_SECRET_KEY = os.environ['AES_SECRET_KEY']


class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str


class TokenPayload(BaseModel):
    sub: str = None
    exp: int = None


class JWTTokenTypeExpiration(Enum):
    ACCESS_TOKEN_EXPIRATION = 15  # 15 minutes
    REFRESH_TOKEN_EXPIRATION = 60 * 24 * 7  # 7 days


def hash_data(data) -> str | None:
    if data is None:
        return None
    else:
        sha256 = hashlib.sha256()
        sha256.update(data.encode('utf-8'))
        return sha256.hexdigest()


def hash_data_bytes(data) -> bytes | None:
    if data is None:
        return None
    else:
        sha256 = hashlib.sha256()
        sha256.update(data.encode('utf-8'))
        return sha256.digest()


def encrypt_data(data, secret_key) -> str | None:
    if data is None:
        return None
    else:
        key = secret_key.encode('utf-8')[:SECRET_KEY_LENGTH].ljust(SECRET_KEY_LENGTH, b'\0')
        initialization_vector = get_random_bytes(AES.block_size)
        cipher = AES.new(key, AES.MODE_CBC, initialization_vector)
        encrypted_data = cipher.encrypt(pad(data.encode('utf-8'), AES.block_size))
        return base64.b64encode(initialization_vector + encrypted_data).decode('utf-8')


def decrypt_data(encrypted_data, secret_key) -> str | None:
    if encrypted_data is None:
        return None
    else:
        key = secret_key.encode('utf-8')[:SECRET_KEY_LENGTH].ljust(SECRET_KEY_LENGTH, b'\0')
        encrypted_data = base64.b64decode(encrypted_data)
        initialization_vector = encrypted_data[:AES.block_size]
        encrypted_data = encrypted_data[AES.block_size:]
        cipher = AES.new(key, AES.MODE_CBC, initialization_vector)
        decrypted_data = unpad(cipher.decrypt(encrypted_data), AES.block_size).decode('utf-8')
        return decrypted_data


def create_jwt_token(subject: Union[str, Any], expires_delta: timedelta = None,
                     jwt_token_type_expiration: int = None) -> str:
    if expires_delta is not None:
        expires_delta = datetime.utcnow() + expires_delta
    else:
        expires_delta = (datetime.utcnow() +
                         timedelta(minutes=jwt_token_type_expiration))

    to_encode = {"exp": expires_delta, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, ALGORITHM)
    return encoded_jwt


def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    return create_jwt_token(subject, expires_delta,
                            JWTTokenTypeExpiration.ACCESS_TOKEN_EXPIRATION.value)


def create_refresh_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    return create_jwt_token(subject, expires_delta,
                            JWTTokenTypeExpiration.REFRESH_TOKEN_EXPIRATION.value)
