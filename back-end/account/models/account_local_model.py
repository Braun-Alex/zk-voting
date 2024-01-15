from pydantic import BaseModel
from typing import Optional, List


class AccountLocal(BaseModel):
    nickname: str
    private_key: str
    password: str
    salt: Optional[str] = None
    polls: List[str] = None
