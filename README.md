# Intelligent Mall System

This project modernizes a university mall discount-scheme system into a
cloud-native platform. The first implemented component is the pricing-agent
service from Phase 1 of the build plan.

## Phase 1: Pricing agent

The pricing agent exposes a FastAPI endpoint that accepts recent shop sales and
the current discount, then recommends a discount and estimates its reward.
Policy logic is isolated in `agents/pricing-agent/app/policy.py` so it can be
replaced by a trained RLlib policy later without changing the API contract.

This phase intentionally uses a lightweight Q-learning-inspired heuristic
instead of Ray RLlib, keeping local setup fast while preserving the service
boundary and response shape.

## Run locally

From `agents/pricing-agent`:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open the API documentation at <http://127.0.0.1:8000/docs>.

Example request:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/generate-scheme `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"shop_id":"shop-101","recent_sales":[100,110,125,140],"current_discount":10}'
```

## Test

```powershell
python -m pytest
```

