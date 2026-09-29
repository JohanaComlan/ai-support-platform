import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.models import (
    Message,
    Ticket,
    TicketCreate,
    TicketPublic,
    TicketStaffPublic,
    TicketsStaffPublic,
    TicketUpdate,
)

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("/", response_model=TicketsStaffPublic)
def read_tickets(
    session: SessionDep, _current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve tickets.
    """
    count_statement = select(func.count()).select_from(Ticket)
    count = session.exec(count_statement).one()
    statement = (
        select(Ticket).order_by(col(Ticket.created_at).desc()).offset(skip).limit(limit)
    )
    tickets = session.exec(statement).all()

    tickets_staff_public = [
        TicketStaffPublic.model_validate(ticket) for ticket in tickets
    ]
    return TicketsStaffPublic(data=tickets_staff_public, count=count)


@router.get("/{id}", response_model=TicketStaffPublic)
def read_ticket(
    session: SessionDep, _current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Get ticket by ID.
    """
    ticket = session.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.post("/", response_model=TicketPublic)
def create_ticket(*, session: SessionDep, ticket_in: TicketCreate) -> Any:
    """
    Create a new ticket.
    """
    ticket = Ticket.model_validate(ticket_in)
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


@router.put("/{id}", response_model=TicketStaffPublic)
def update_ticket(
    *,
    session: SessionDep,
    _current_user: CurrentUser,
    id: uuid.UUID,
    ticket_in: TicketUpdate,
) -> Any:
    """
    Update a ticket's status or priority.
    """
    ticket = session.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    update_dict = ticket_in.model_dump(exclude_unset=True)
    ticket.sqlmodel_update(update_dict)
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


@router.delete("/{id}", dependencies=[Depends(get_current_active_superuser)])
def delete_ticket(session: SessionDep, id: uuid.UUID) -> Message:
    """
    Delete a ticket.
    """
    ticket = session.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    session.delete(ticket)
    session.commit()
    return Message(message="Ticket deleted successfully")
