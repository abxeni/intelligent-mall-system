import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "mall.db"))
    with TestClient(app) as test_client:
        yield test_client


def test_seed_has_requested_demo_data(client: TestClient) -> None:
    stats = client.get("/dashboard").json()

    assert stats["customers"] >= 100
    assert stats["products"] >= 100
    assert stats["completed"] >= 100
    assert stats["pending"] >= 30


def test_recommendations_are_customer_specific(client: TestClient) -> None:
    first = client.post(
        "/recommend", json={"customer_id": "CUST-0001", "limit": 5}
    ).json()["recommendations"]
    second = client.post(
        "/recommend", json={"customer_id": "CUST-0002", "limit": 5}
    ).json()["recommendations"]

    assert len(first) == len(second) == 5
    assert [item["product_id"] for item in first] != [
        item["product_id"] for item in second
    ]
    assert first[0]["reason"]


def test_customer_product_and_transaction_browsing(client: TestClient) -> None:
    assert client.get("/customers", params={"q": "CUST-0001"}).json()["total"] == 1
    assert client.get("/products").json()["total"] >= 100
    assert client.get(
        "/transactions", params={"status": "completed"}
    ).json()["total"] >= 100
    assert client.get(
        "/transactions", params={"status": "pending"}
    ).json()["total"] >= 30


def test_pending_transaction_can_be_completed(client: TestClient) -> None:
    before = client.get("/dashboard").json()
    response = client.patch("/transactions/PEND-0001", json={"status": "completed"})

    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    after = client.get("/dashboard").json()
    assert after["pending"] == before["pending"] - 1
    assert after["completed"] == before["completed"] + 1


def test_unknown_customer_returns_not_found(client: TestClient) -> None:
    response = client.post("/recommend", json={"customer_id": "unknown"})

    assert response.status_code == 404


def test_demo_accounts_include_admin_manager_and_customer(client: TestClient) -> None:
    accounts = client.get("/accounts").json()["items"]
    roles = {account["role"] for account in accounts}

    assert {"admin", "manager", "customer"} <= roles
    assert sum(account["role"] == "customer" for account in accounts) >= 100


def test_dashboard_is_backed_by_transaction_data(client: TestClient) -> None:
    before = client.get("/dashboard").json()
    client.patch("/transactions/PEND-0001", json={"status": "completed"})
    after = client.get("/dashboard").json()

    assert before["pending"] == after["pending"] + 1
    assert after["completed"] == before["completed"] + 1


def test_manager_store_scope_filters_catalog_and_orders(client: TestClient) -> None:
    first_store = client.get("/products").json()["items"][0]["store"]
    products = client.get("/products", params={"store": first_store}).json()
    transactions = client.get("/transactions", params={"store": first_store}).json()
    dashboard = client.get("/dashboard", params={"store": first_store}).json()

    assert products["total"] > 0
    assert all(product["store"] == first_store for product in products["items"])
    assert transactions["total"] > 0
    assert dashboard["scope"] == "store"
    assert dashboard["products"] == products["total"]


def test_customer_scoped_dashboard_uses_the_selected_customer(client: TestClient) -> None:
    dashboard = client.get(
        "/dashboard", params={"customer_id": "CUST-0001"}
    ).json()
    customer = client.get("/customers", params={"q": "CUST-0001"}).json()["items"][0]

    assert dashboard["scope"] == "customer"
    assert dashboard["customers"] == 1
    assert dashboard["completed"] == customer["order_count"]
