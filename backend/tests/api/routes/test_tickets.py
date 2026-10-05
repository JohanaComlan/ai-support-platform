import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.ticket import create_random_ticket


def test_create_ticket(client: TestClient) -> None:
    data = {
        "requester_name": "Test Customer",
        "requester_email": "customer@example.com",
        "subject": "Cannot log in",
        "description": "I cannot log into my account.",
    }
    response = client.post(f"{settings.API_V1_STR}/tickets/", json=data)

    assert response.status_code == 200
    content = response.json()
    assert content["requester_name"] == data["requester_name"]
    assert content["requester_email"] == data["requester_email"]
    assert content["subject"] == data["subject"]
    assert content["description"] == data["description"]
    assert content["status"] == "open"
    assert "priority" not in content
    assert "id" in content
    assert "created_at" in content


def test_read_tickets(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    ticket = create_random_ticket(db)
    response = client.get(
        f"{settings.API_V1_STR}/tickets/",
        headers=superuser_token_headers,
    )

    assert response.status_code == 200
    content = response.json()
    assert content["count"] >= 1
    assert any(row["id"] == str(ticket.id) for row in content["data"])


def test_read_ticket(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    ticket = create_random_ticket(db)
    response = client.get(
        f"{settings.API_V1_STR}/tickets/{ticket.id}",
        headers=superuser_token_headers,
    )

    assert response.status_code == 200
    content = response.json()
    assert content["id"] == str(ticket.id)
    assert content["subject"] == ticket.subject
    assert content["status"] == "open"
    assert content["priority"] == "medium"


def test_read_ticket_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/tickets/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Ticket not found"


def test_create_and_read_ticket_message(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    ticket = create_random_ticket(db)
    data = {"content": "Please try resetting your password."}

    create_response = client.post(
        f"{settings.API_V1_STR}/tickets/{ticket.id}/messages",
        headers=normal_user_token_headers,
        json=data,
    )

    assert create_response.status_code == 200
    created_message = create_response.json()
    assert created_message["content"] == data["content"]
    assert created_message["ticket_id"] == str(ticket.id)
    assert created_message["sender_type"] == "staff"
    assert created_message["sender_user_id"] is not None

    read_response = client.get(
        f"{settings.API_V1_STR}/tickets/{ticket.id}/messages",
        headers=normal_user_token_headers,
    )

    assert read_response.status_code == 200
    messages = read_response.json()
    assert messages["count"] == 1
    assert messages["data"][0]["id"] == created_message["id"]


def test_create_ticket_message_for_missing_ticket(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/tickets/{uuid.uuid4()}/messages",
        headers=normal_user_token_headers,
        json={"content": "Test reply"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Ticket not found"


def test_read_tickets_requires_login(client: TestClient) -> None:
    response = client.get(f"{settings.API_V1_STR}/tickets/")

    assert response.status_code == 401


def test_update_ticket(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    ticket = create_random_ticket(db)
    data = {"status": "in_progress", "priority": "high"}
    response = client.put(
        f"{settings.API_V1_STR}/tickets/{ticket.id}",
        headers=normal_user_token_headers,
        json=data,
    )

    assert response.status_code == 200
    content = response.json()
    assert content["status"] == data["status"]
    assert content["priority"] == data["priority"]


def test_update_ticket_rejects_invalid_status(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    ticket = create_random_ticket(db)
    response = client.put(
        f"{settings.API_V1_STR}/tickets/{ticket.id}",
        headers=normal_user_token_headers,
        json={"status": "invalid"},
    )

    assert response.status_code == 422


def test_delete_ticket(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    ticket = create_random_ticket(db)
    response = client.delete(
        f"{settings.API_V1_STR}/tickets/{ticket.id}",
        headers=superuser_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Ticket deleted successfully"


def test_delete_ticket_requires_superuser(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    ticket = create_random_ticket(db)
    response = client.delete(
        f"{settings.API_V1_STR}/tickets/{ticket.id}",
        headers=normal_user_token_headers,
    )

    assert response.status_code == 403
