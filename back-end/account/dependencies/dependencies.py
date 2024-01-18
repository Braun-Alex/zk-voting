from datetime import datetime
import jose
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from utilities.utilities import TokenSchema, TokenPayload, create_access_token, ALGORITHM, JWT_SECRET_KEY
from jose import jwt
from pydantic import ValidationError

LOGIN_URL = "/login"

reusable_oauth = OAuth2PasswordBearer(
    tokenUrl=LOGIN_URL,
    scheme_name="JWT"
)


def validate_token(token: str) -> TokenPayload:
    try:
        payload = jwt.decode(
            token, JWT_SECRET_KEY, algorithms=[ALGORITHM]
        )
        token_data = TokenPayload(**payload)

        if datetime.fromtimestamp(token_data.exp) < datetime.now():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                headers={"WWW-Authenticate": "Bearer"}
            )
    except (jose.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            headers={"WWW-Authenticate": "Bearer"}
        )

    return token_data


def get_current_account(token: str = Depends(reusable_oauth)) -> TokenPayload:
    return validate_token(token)


def refresh_access_token(refresh_token: str = Depends(reusable_oauth)) -> TokenSchema:
    token_data = validate_token(refresh_token)

    return TokenSchema(
        access_token=create_access_token(token_data.sub),
        refresh_token=refresh_token
    )
