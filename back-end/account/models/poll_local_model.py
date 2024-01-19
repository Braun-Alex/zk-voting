from pydantic import BaseModel


class PollLocal(BaseModel):
    poll_id: str
