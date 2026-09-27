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
scheme_count = 0
reward_total = 0.0


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
    global scheme_count, reward_total
    recommendation = policy.recommend(
        recent_sales=request.recent_sales,
        current_discount=request.current_discount,
    )
    scheme_count += 1
    reward_total += recommendation.expected_reward
    return GenerateSchemeResponse(
        shop_id=request.shop_id,
        recommended_discount=recommendation.recommended_discount,
        expected_reward=recommendation.expected_reward,
    )


@app.get("/metrics", include_in_schema=False)
def metrics() -> str:
    average_reward = reward_total / scheme_count if scheme_count else 0.0
    return (
        "# HELP pricing_agent_schemes_total Number of schemes generated.\n"
        "# TYPE pricing_agent_schemes_total counter\n"
        f"pricing_agent_schemes_total {scheme_count}\n"
        "# HELP pricing_agent_average_reward Average expected reward.\n"
        "# TYPE pricing_agent_average_reward gauge\n"
        f"pricing_agent_average_reward {average_reward}\n"
    )
