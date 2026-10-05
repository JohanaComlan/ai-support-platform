import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.models import (
    Message,
    Ticket,
    TicketCreate,
    TicketMessage,
    TicketMessageCreate,
    TicketMessagePublic,
    TicketMessageSender,
    TicketMessagesPublic,
    TicketPublic,
    TicketsStaffPublic,
    TicketStaffPublic,
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


@router.get("/{ticket_id}/messages", response_model=TicketMessagesPublic)
def read_ticket_messages(
    session: SessionDep,
    _current_user: CurrentUser,
    ticket_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve messages for a ticket.
    """
    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    count_statement = (
        select(func.count())
        .select_from(TicketMessage)
        .where(TicketMessage.ticket_id == ticket_id)
    )
    count = session.exec(count_statement).one()
    statement = (
        select(TicketMessage)
        .where(TicketMessage.ticket_id == ticket_id)
        .order_by(col(TicketMessage.created_at).asc())
        .offset(skip)
        .limit(limit)
    )
    messages = session.exec(statement).all()
    messages_public = [
        TicketMessagePublic.model_validate(message) for message in messages
    ]
    return TicketMessagesPublic(data=messages_public, count=count)


@router.post("/{ticket_id}/messages", response_model=TicketMessagePublic)
def create_ticket_message(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    ticket_id: uuid.UUID,
    message_in: TicketMessageCreate,
) -> Any:
    """
    Add a staff reply to a ticket.
    """
    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    message = TicketMessage.model_validate(
        message_in,
        update={
            "ticket_id": ticket_id,
            "sender_type": TicketMessageSender.staff,
            "sender_user_id": current_user.id,
        },
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    return message


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
