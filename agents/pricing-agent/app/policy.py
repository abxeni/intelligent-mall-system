"""Pricing policy implementation.

The policy is deliberately small and deterministic for the first phase. Its
interface is stable so a trained RLlib policy can replace it later.
"""

from dataclasses import dataclass
from statistics import mean


DISCOUNT_LEVELS = (0, 5, 10, 15, 20, 25, 30)


@dataclass(frozen=True)
class SchemeRecommendation:
    recommended_discount: int
    expected_reward: float


class PricingPolicy:
    """Choose a discount by estimating profit delta for each action."""

    def recommend(
        self,
        recent_sales: list[float],
        current_discount: float,
    ) -> SchemeRecommendation:
        baseline_sales = mean(recent_sales)
        sales_trend = recent_sales[-1] - recent_sales[0]

        best_discount = min(
            DISCOUNT_LEVELS,
            key=lambda discount: self._negative_expected_reward(
                discount=discount,
                baseline_sales=baseline_sales,
                sales_trend=sales_trend,
                current_discount=current_discount,
            ),
        )
        reward = self._expected_reward(
            discount=best_discount,
            baseline_sales=baseline_sales,
            sales_trend=sales_trend,
            current_discount=current_discount,
        )
        return SchemeRecommendation(
            recommended_discount=best_discount,
            expected_reward=round(reward, 2),
        )

    @staticmethod
    def _negative_expected_reward(
        *,
        discount: int,
        baseline_sales: float,
        sales_trend: float,
        current_discount: float,
    ) -> float:
        return -PricingPolicy._expected_reward(
            discount=discount,
            baseline_sales=baseline_sales,
            sales_trend=sales_trend,
            current_discount=current_discount,
        )

    @staticmethod
    def _expected_reward(
        *,
        discount: int,
        baseline_sales: float,
        sales_trend: float,
        current_discount: float,
    ) -> float:
        """Estimate profit delta, treating discount as the action.

        Positive sales momentum supports a smaller discount, while declining
        sales justify a larger discount to stimulate demand. The current
        discount acts as the baseline action.
        """
        demand_lift = max(-sales_trend / max(baseline_sales, 1.0), 0.0)
        discount_change = discount - current_discount
        projected_demand = baseline_sales * (1 + demand_lift + discount * 0.01)
        retained_margin = 1 - discount * 0.01
        baseline_profit = baseline_sales * (1 - current_discount * 0.01)
        projected_profit = projected_demand * retained_margin
        switching_cost = abs(discount_change) * baseline_sales * 0.002
        return projected_profit - baseline_profit - switching_cost

