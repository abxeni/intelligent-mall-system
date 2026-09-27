from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Mall Recommender Service", version="0.1.0")


class RecommendRequest(BaseModel):
    customer_id: str = Field(min_length=1)
    limit: int = Field(default=5, ge=1, le=20)


class Recommendation(BaseModel):
    product_id: str
    name: str
    score: float


class RecommendResponse(BaseModel):
    customer_id: str
    recommendations: list[Recommendation]


PRODUCTS = [
    Recommendation(product_id="p-001", name="Coffee beans", score=0.98),
    Recommendation(product_id="p-002", name="Running shoes", score=0.94),
    Recommendation(product_id="p-003", name="Wireless headphones", score=0.91),
    Recommendation(product_id="p-004", name="Organic snacks", score=0.87),
    Recommendation(product_id="p-005", name="Travel backpack", score=0.84),
]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(request: RecommendRequest) -> RecommendResponse:
    return RecommendResponse(
        customer_id=request.customer_id,
        recommendations=PRODUCTS[: request.limit],
    )

