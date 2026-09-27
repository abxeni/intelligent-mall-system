from fastapi.testclient import TestClient

from app.main import app


def test_recommend_returns_top_five() -> None:
    response = TestClient(app).post("/recommend", json={"customer_id": "c-001"})
    assert response.status_code == 200
    assert len(response.json()["recommendations"]) == 5

