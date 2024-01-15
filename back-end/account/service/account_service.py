from controllers.account_controller import AccountController
from models.account_local_model import AccountLocal
from utilities.utilities import hash_data
from fastapi import status, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from utilities.utilities import TokenSchema, create_access_token, create_refresh_token


class AccountServiceInterface:
    def register_account(self, account: AccountLocal):
        pass

    def authorize_account(self, account: OAuth2PasswordRequestForm) -> TokenSchema:
        pass

    def get_account(self, nickname: str) -> str:
        pass

    def get_all_polls(self) -> list[str]:
        pass

    def add_poll_to_account(self, nickname: str, poll: str):
        pass


class AccountService(AccountServiceInterface):
    def __init__(self, account_controller: AccountController):
        self._account_controller = account_controller

    def register_account(self, account: AccountLocal):
        account_db = self._account_controller.get_account_by_nickname(account.nickname)

        if account_db:
            raise HTTPException(status.HTTP_409_CONFLICT)

        self._account_controller.create_account(account)

    def authorize_account(self, account: OAuth2PasswordRequestForm) -> TokenSchema:
        account_db = self._account_controller.get_account_by_nickname(account.username)
        if not account_db or hash_data(account.password + account_db.salt) != account_db.password:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED)

        return TokenSchema(
            access_token=create_access_token(account_db.nickname),
            refresh_token=create_refresh_token(account_db.nickname)
        )

    def get_account(self, nickname: str) -> str:
        account_db = self._account_controller.get_account_by_nickname(nickname)
        if not account_db:
            raise HTTPException(status.HTTP_404_NOT_FOUND)
        return str(account_db)

    def get_all_polls(self) -> list[str]:
        accounts_db = self._account_controller.get_accounts()

        all_polls: list[str] = []
        for account_db in accounts_db:
            if account_db.polls:
                all_polls.extend(account_db.polls)

        return all_polls

    def add_poll_to_account(self, nickname: str, poll: str):
        account_db = self._account_controller.get_account_by_nickname(nickname)
        if not account_db:
            raise HTTPException(status.HTTP_404_NOT_FOUND)

        self._account_controller.add_poll(account_db, poll)

