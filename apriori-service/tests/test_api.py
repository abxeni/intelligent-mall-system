from fastapi.testclient import TestClient

from app.main import app


def test_mine_rules() -> None:
    response = TestClient(app).post(
        "/mine-rules",
        json={
            "transactions": [["coffee", "cake"], ["coffee", "cake"], ["coffee"]],
            "min_support": 0.5,
            "min_confidence": 0.5,
        },
    )
    assert response.status_code == 200
    assert response.json()["rules"]

