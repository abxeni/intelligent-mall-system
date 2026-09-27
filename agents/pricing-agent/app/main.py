"""HTTP API for the pricing agent."""

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .policy import PricingPolicy

app = FastAPI(
    title="Intelligent Mall Pricing Agent",
    version="0.1.0",
    description="Generates discount schemes from recent shop sales.",
)
policy = PricingPolicy()


class GenerateSchemeRequest(BaseModel):
    shop_id: str = Field(min_length=1)
    recent_sales: list[float] = Field(min_length=2)
    current_discount: float = Field(ge=0, le=100)


class GenerateSchemeResponse(BaseModel):
    shop_id: str
    recommended_discount: int = Field(ge=0, le=100)
    expected_reward: float


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/generate-scheme", response_model=GenerateSchemeResponse)
def generate_scheme(request: GenerateSchemeRequest) -> GenerateSchemeResponse:
    recommendation = policy.recommend(
        recent_sales=request.recent_sales,
        current_discount=request.current_discount,
    )
    return GenerateSchemeResponse(
        shop_id=request.shop_id,
        recommended_discount=recommendation.recommended_discount,
        expected_reward=recommendation.expected_reward,
    )

