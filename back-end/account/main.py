import logging

from database import Base, engine, SessionLocal
from service.account_service import AccountService
from controllers.account_controller import AccountController
from models.account_local_model import AccountLocal
from models.poll_local_model import PollLocal
from fastapi import FastAPI, Depends
from fastapi.security import OAuth2PasswordRequestForm
from dependencies.dependencies import get_current_account, refresh_access_token
from utilities.utilities import TokenSchema

app = FastAPI()

db = SessionLocal()

account_service = AccountService(account_controller=AccountController(db=db))

Base.metadata.create_all(bind=engine)

logger = logging.getLogger(__name__)


@app.post("/signup")
def register_account(account: AccountLocal):
    logger.info(f"Registering account with nickname {account.nickname}")
    return account_service.register_account(account=account)


@app.post("/login", response_model=TokenSchema)
def authorize_account(account: OAuth2PasswordRequestForm = Depends()):
    logger.info(f"Authenticating account with nickname {account.username}")
    return account_service.authorize_account(account=account)


@app.post("/add_poll")
def add_poll(poll: PollLocal, token_payload=Depends(get_current_account)):
    account_nickname = token_payload.sub
    logger.info(f"Adding poll {poll.poll_id} to account with nickname {account_nickname}")
    return account_service.add_poll_to_account(nickname=account_nickname, poll=poll.poll_id)


@app.get('/profile', response_model=str)
def get_account(token_payload=Depends(get_current_account)):
    account_nickname = token_payload.sub
    logger.info(f"Profile request from account with nickname {account_nickname}")
    return account_service.get_account(nickname=token_payload.sub)


@app.get('/all_polls', response_model=list[str])
def get_all_polls():
    all_polls = account_service.get_all_polls()
    logger.info("Successful request of getting all polls")
    return all_polls


@app.get('/refresh', response_model=TokenSchema)
def refresh_token(tokens: TokenSchema = Depends(refresh_access_token)):
    logger.info(f"Successful refreshing access token {tokens.access_token}")
    return tokens
