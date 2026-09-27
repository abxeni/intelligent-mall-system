from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_generate_scheme_returns_contract() -> None:
    response = client.post(
        "/generate-scheme",
        json={
            "shop_id": "shop-101",
            "recent_sales": [100, 110, 125, 140],
            "current_discount": 10,
        },
    )

    assert response.status_code == 200
    assert response.json().keys() == {
        "shop_id",
        "recommended_discount",
        "expected_reward",
    }
    assert response.json()["shop_id"] == "shop-101"
    assert 0 <= response.json()["recommended_discount"] <= 30
    assert isinstance(response.json()["expected_reward"], float)


def test_generate_scheme_rejects_invalid_sales_history() -> None:
    response = client.post(
        "/generate-scheme",
        json={
            "shop_id": "shop-101",
            "recent_sales": [100],
            "current_discount": 10,
        },
    )

    assert response.status_code == 422


def test_health_check() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

