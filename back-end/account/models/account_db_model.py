import json
from utilities.utilities import AES_SECRET_KEY, decrypt_data
from sqlalchemy import Column, String, ARRAY
from database import Base


class AccountDB(Base):
    __tablename__ = "accounts"

    nickname = Column(String, primary_key=True, index=True)
    private_key = Column(String)
    password = Column(String)
    salt = Column(String)
    polls = Column(ARRAY(String))

    def to_dict(self):
        return {
            "nickname": self.nickname,
            "private_key": decrypt_data(self.private_key, AES_SECRET_KEY),
            "polls": self.polls
        }

    def to_json(self):
        return json.dumps(self.to_dict())

    def __str__(self):
        return self.to_json()
