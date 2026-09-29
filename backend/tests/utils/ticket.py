from sqlmodel import Session

from app.models import Ticket, TicketCreate
from tests.utils.utils import random_email, random_lower_string


def create_random_ticket(db: Session) -> Ticket:
    ticket_in = TicketCreate(
        requester_name=random_lower_string(),
        requester_email=random_email(),
        subject=random_lower_string(),
        description=random_lower_string(),
    )
    ticket = Ticket.model_validate(ticket_in)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket
