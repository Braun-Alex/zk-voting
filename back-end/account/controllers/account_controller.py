import os

from abc import ABC, abstractmethod
from typing import Optional, Type
from sqlalchemy.orm import Session
from models.account_db_model import AccountDB
from models.account_local_model import AccountLocal
from utilities.utilities import hash_data, AES_SECRET_KEY, encrypt_data


class AccountControllerInterface(ABC):
    @abstractmethod
    def create_account(self, account: AccountLocal):
        pass

    @abstractmethod
    def get_account_by_nickname(self, nickname: str) -> Optional[AccountDB]:
        pass

    @abstractmethod
    def get_accounts(self) -> list[Type[AccountDB]]:
        pass

    @abstractmethod
    def add_poll(self, account_db: AccountDB, poll: str):
        pass


class AccountController(AccountControllerInterface):
    def __init__(self, db: Session) -> None:
        super().__init__()
        self._db = db

    def create_account(self, account: AccountLocal):
        random_salt = os.urandom(32).hex()
        account_db = AccountDB(nickname=account.nickname,
                               private_key=encrypt_data(account.private_key, AES_SECRET_KEY),
                               password=hash_data(account.password + random_salt),
                               salt=random_salt,
                               polls=[])
        self._db.add(account_db)
        self._db.commit()
        self._db.refresh(account_db)

    def get_account_by_nickname(self, nickname: str) -> Optional[AccountDB]:
        return self._db.query(AccountDB).filter(AccountDB.nickname == nickname).first()

    def get_accounts(self) -> list[Type[AccountDB]]:
        accounts = self._db.query(AccountDB).all()
        return accounts

    def add_poll(self, account_db: AccountDB, poll: str):
        account_db.polls = account_db.polls + [poll]

        self._db.commit()
        self._db.refresh(account_db)
