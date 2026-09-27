from itertools import combinations

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Mall Apriori Mining Service", version="0.1.0")


class MineRulesRequest(BaseModel):
    transactions: list[list[str]] = Field(min_length=1)
    min_support: float = Field(default=0.2, gt=0, le=1)
    min_confidence: float = Field(default=0.5, gt=0, le=1)


class Rule(BaseModel):
    antecedent: list[str]
    consequent: list[str]
    support: float
    confidence: float


class MineRulesResponse(BaseModel):
    frequent_itemsets: list[dict]
    rules: list[Rule]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/mine-rules", response_model=MineRulesResponse)
def mine_rules(request: MineRulesRequest) -> MineRulesResponse:
    transactions = [set(transaction) for transaction in request.transactions]
    itemsets: dict[tuple[str, ...], float] = {}
    items = sorted({item for transaction in transactions for item in transaction})
    for size in range(1, min(3, len(items)) + 1):
        for candidate in combinations(items, size):
            support = sum(set(candidate) <= transaction for transaction in transactions) / len(transactions)
            if support >= request.min_support:
                itemsets[candidate] = round(support, 4)

    rules: list[Rule] = []
    for itemset, support in itemsets.items():
        if len(itemset) < 2:
            continue
        for split_size in range(1, len(itemset)):
            for antecedent in combinations(itemset, split_size):
                consequent = tuple(item for item in itemset if item not in antecedent)
                antecedent_support = itemsets.get(tuple(sorted(antecedent)))
                if not antecedent_support:
                    continue
                confidence = support / antecedent_support
                if confidence >= request.min_confidence:
                    rules.append(
                        Rule(
                            antecedent=list(antecedent),
                            consequent=list(consequent),
                            support=support,
                            confidence=round(confidence, 4),
                        )
                    )
    return MineRulesResponse(
        frequent_itemsets=[
            {"items": list(items), "support": support}
            for items, support in itemsets.items()
        ],
        rules=rules,
    )

