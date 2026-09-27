from app.policy import PricingPolicy


def test_policy_returns_supported_discount_and_numeric_reward() -> None:
    result = PricingPolicy().recommend(
        recent_sales=[100, 95, 90, 85],
        current_discount=10,
    )

    assert result.recommended_discount in {0, 5, 10, 15, 20, 25, 30}
    assert isinstance(result.expected_reward, float)

