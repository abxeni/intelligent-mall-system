# Intelligent Mall System 2.0 — Phased Build Plan

A phase-by-phase roadmap to rebuild your 2018 "Intelligent Mall System" (multi-agent RL + Apriori) as a
cloud-native, AI-integrated DevOps portfolio project. Each phase includes what you're learning, why it
matters for a senior DevOps/platform role, and a ready-to-paste prompt for your MCP CLI coding agent.

Work through phases in order — each one produces a working artifact before you move to the next, so you
always have something runnable and something to commit.

---

## Phase 0: Repo Scaffolding & Problem Framing

**What's happening:** Set up the two-repo structure (app repo + GitOps repo), write the initial README with
the architecture vision, and define the service boundaries (agents, apriori-service, recommender-service).

**What you learn:** Repo design patterns, monorepo vs. multi-repo tradeoffs, writing a technical README that
sells the project to a hiring manager before they read a line of code.

**Prompt for MCP CLI:**
```
Create two repos: "intelligent-mall-system" (application code) and "intelligent-mall-gitops" (deployment
manifests). In intelligent-mall-system, scaffold this folder structure: agents/, apriori-service/,
recommender-service/, terraform/, helm/, .github/workflows/, observability/, README.md. Write a README.md
that explains: (1) this modernizes a 2018 university project (multi-agent reinforcement learning + Apriori
association-rule mining for a mall discount-scheme system) into a cloud-native platform, (2) the new
architecture: three microservices — a pricing-agent service (RL-based), an apriori-mining service, and a
recommender service — deployed on Kubernetes via GitOps, (3) the tech stack: Python/FastAPI, Ray RLlib or a
LangGraph agent, PostgreSQL + pgvector, Terraform, ArgoCD, Prometheus/Grafana. Leave placeholder sections for
architecture diagram, setup instructions, and demo link.
```

---

## Phase 1: Core Agent Logic (Keep It Simple)

**What's happening:** Build the pricing-agent microservice. Don't over-engineer the ML — a single RLlib
policy (or a LangGraph agent that calls an LLM to reason about pricing) that takes shop sales data and
outputs a discount scheme is enough. Wrap it in a FastAPI service with a `/generate-scheme` endpoint.

**What you learn:** How to package an ML/AI model behind a clean API contract — the skill that actually
matters when you're the platform engineer supporting data scientists, not the one designing the model.

**Prompt for MCP CLI:**
```
In agents/, build a FastAPI service called pricing-agent. It should expose POST /generate-scheme, which
takes JSON {shop_id, recent_sales, current_discount} and returns {recommended_discount, expected_reward}.
Implement the core logic as a simple Q-learning agent using Ray RLlib (or a stub reward-based heuristic if
RLlib setup is too heavy for now) that treats discount level as the action and shop profit delta as reward.
Include a Dockerfile, requirements.txt, and a pytest test for the endpoint. Keep the model logic isolated in
a policy.py module so it can be swapped later without touching the API layer.
```

---

## Phase 2: Apriori & Recommender Microservices

**What's happening:** Build the two supporting services — apriori-service (mines product association rules
from transaction data) and recommender-service (serves product recommendations via a vector database).
This replicates and modernizes your original Apriori + SVM comparison modules.

**What you learn:** Multi-service decomposition, database integration (Postgres + pgvector), and how to
design internal service-to-service contracts.

**Prompt for MCP CLI:**
```
In apriori-service/, build a FastAPI service with POST /mine-rules that accepts a list of transactions and
returns frequent itemsets and association rules using the mlxtend apriori implementation. Include a Dockerfile
and requirements.txt.

In recommender-service/, build a FastAPI service backed by PostgreSQL with the pgvector extension. Implement
POST /recommend that takes a customer_id and returns top-5 product recommendations using cosine similarity
over product embeddings. Include a seed script to populate sample product embeddings and a Dockerfile.
```

---

## Phase 3: Containerize Everything Consistently

**What's happening:** Standardize Dockerfiles across all three services (multi-stage builds, non-root user,
health checks), and verify all three run together via docker-compose locally.

**What you learn:** Production-grade container hygiene — this is a top signal reviewers look for, since
sloppy Dockerfiles are the #1 giveaway of a tutorial-follower rather than a real engineer.

**Prompt for MCP CLI:**
```
Review and rewrite the Dockerfiles for pricing-agent, apriori-service, and recommender-service using
multi-stage builds: a builder stage that installs dependencies, and a slim runtime stage. Add a non-root
user, a HEALTHCHECK instruction, and .dockerignore files. Then create a docker-compose.yml at the repo root
that runs all three services plus a Postgres container with pgvector, wired together with the correct
environment variables and a shared network, so `docker-compose up` brings up the whole system locally.
```

---

## Phase 4: Infrastructure as Code (Terraform)

**What's happening:** Provision the real cloud infrastructure — VPC, EKS cluster, RDS/Postgres, ECR
repositories — using modular Terraform with remote state.

**What you learn:** This is core DevOps muscle: modular IaC design, state management, and workspace
separation between dev and prod, which is explicitly what separates senior candidates from beginners.

**Prompt for MCP CLI:**
```
In terraform/, create a modular Terraform configuration with separate modules: modules/vpc, modules/eks,
modules/rds-postgres, modules/ecr. Root main.tf should wire these modules together for an EKS cluster with
2 managed node groups, an RDS Postgres instance with pgvector enabled, and one ECR repo per microservice
(pricing-agent, apriori-service, recommender-service). Configure a remote backend using an S3 bucket with
DynamoDB state locking. Create separate .tfvars files for dev and prod environments. Add outputs.tf exposing
the cluster endpoint, RDS endpoint, and ECR repo URLs.
```

---

## Phase 5: CI Pipeline (Build, Test, Push)

**What's happening:** GitHub Actions workflow that runs tests, builds Docker images, and pushes them to ECR
on every merge to main — the "CI" half of CI/CD.

**What you learn:** Pipeline-as-code, image tagging strategy, and how to structure workflows so they scale
across multiple microservices without duplicated YAML.

**Prompt for MCP CLI:**
```
In .github/workflows/, create a ci.yml GitHub Actions workflow triggered on push to main and on pull requests.
It should use a matrix strategy to run for each of the three services (pricing-agent, apriori-service,
recommender-service): install dependencies, run pytest, build the Docker image, tag it with both `latest`
and the short git SHA, and push it to the corresponding ECR repository using OIDC federation for AWS auth
(no long-lived AWS keys). Fail the workflow if tests fail before any image is built or pushed.
```

---

## Phase 6: GitOps Deployment (ArgoCD)

**What's happening:** Set up Helm charts for each service, push manifests to the `intelligent-mall-gitops`
repo, and configure ArgoCD with an app-of-apps pattern so merges auto-sync to the cluster.

**What you learn:** The GitOps pattern itself — declarative deployments, drift detection, and the
separation of "what should run" (git) from "what is running" (cluster), which is the single most
requested pattern in senior platform-engineering interviews right now.

**Prompt for MCP CLI:**
```
In helm/, create a Helm chart per service (pricing-agent, apriori-service, recommender-service) with
deployment, service, and configmap templates, parameterized for replica count, image tag, and resource
limits. In the separate intelligent-mall-gitops repo, create an ArgoCD app-of-apps structure: a root
Application that points to a directory of three child Applications, one per service, each referencing the
Helm chart and values file for the dev environment. Write a short doc explaining how a merge to
intelligent-mall-system's main branch should trigger an image build (Phase 5) and how that new tag gets
updated in the gitops repo's values files (manually for now, automated in a later phase).
```

---

## Phase 7: Observability Stack

**What's happening:** Deploy Prometheus + Grafana (or the OpenTelemetry stack) to monitor all three
services, build a dashboard showing agent reward trends and service health, and write one real alert with a
documented runbook.

**What you learn:** Production monitoring design and incident-response documentation — the "boring" skill
that's actually rare and highly valued, because most portfolio projects stop at "it deploys" and never show
what happens when something breaks.

**Prompt for MCP CLI:**
```
In observability/, create Helm values for kube-prometheus-stack to deploy Prometheus, Grafana, and
Alertmanager into the cluster. Instrument the pricing-agent FastAPI service with prometheus-fastapi-
instrumentator to expose a /metrics endpoint tracking request latency, request count, and a custom gauge
for "average reward per scheme generated". Build a Grafana dashboard JSON showing these three metrics plus
pod health for all three services. Define one Prometheus alert rule: if average reward drops below zero for
5 consecutive minutes, fire a warning. Write a runbook.md documenting exactly how to investigate and resolve
that alert.
```

---

## Phase 8: MLOps — Versioning, Canary Rollout, Retraining

**What's happening:** Add MLflow for RL policy versioning, implement a canary rollout so a new pricing
policy only gets partial traffic until it proves itself, and schedule automated retraining.

**What you learn:** This is your differentiator over both pure-DevOps and pure-ML candidates — the
intersection skill of deploying and safely rolling back machine learning models in production, following
patterns used in real MLOps platforms built on Terraform and GitHub.

**Prompt for MCP CLI:**
```
Integrate MLflow into the pricing-agent service: log each trained policy as an MLflow model with version
tags. Add a canary deployment configuration in the Helm chart that splits traffic 90/10 between the current
policy and a newly promoted one, using either Argo Rollouts or an Istio VirtualService for traffic splitting.
Write a GitHub Actions workflow, retrain.yml, scheduled weekly (cron), that pulls the latest transaction
data, retrains the RL policy, logs it to MLflow, and opens a pull request updating the gitops repo's image
tag if the new policy's average reward beats the current production policy on a held-out evaluation set.
```

---

## Phase 9 (Stretch): Self-Healing & Automated Remediation

**What's happening:** Add automated rollback logic — if the reward-drop alert fires repeatedly, ArgoCD
auto-reverts to the last known-good policy version without a human in the loop.

**What you learn:** Closed-loop automation design, the most advanced portfolio signal, showing you can
build systems that respond to their own telemetry rather than just alerting a human.

**Prompt for MCP CLI:**
```
Design and implement an automated remediation controller: a lightweight service (or Argo Workflows job)
that watches the Prometheus alert for "average reward below zero for 5 minutes" via Alertmanager webhook,
and when triggered, calls the ArgoCD API to roll the pricing-agent Application back to its previous synced
Git revision. Log every auto-rollback action to a dedicated Slack channel or a simple audit table in
Postgres, including which policy version was rolled back and why, so the action is fully traceable.
```

---

## Phase 10: Documentation & Demo

**What's happening:** Finalize the README with an architecture diagram, record a 3-minute demo video
walking through the system, and write a short "what broke and how I fixed it" section from your build
process.

**What you learn:** Technical communication — translating what you built into a story a non-technical
recruiter and a technical interviewer can both follow.

**Prompt for MCP CLI:**
```
Generate a polished README.md for intelligent-mall-system that includes: a one-paragraph problem statement
contrasting the original 2018 rule-based mall system with this AI-native rebuild, an architecture diagram
described in Mermaid syntax showing the three microservices, Postgres, EKS, ArgoCD, and the CI/CD flow, a
"Tech Stack" table, local setup instructions using docker-compose, cloud deployment instructions referencing
the Terraform and Helm directories, and a "Lessons Learned" section with 3-4 real technical challenges (e.g.,
canary rollout tuning, RL reward shaping, OIDC auth setup) and how they were resolved.
```

---

## How To Use This

Work top to bottom. Each phase's prompt is self-contained — paste it into your MCP CLI session once you've
completed and understood the previous phase. After each phase, commit your work, and re-read the generated
code before moving on; the goal is understanding, not just accumulating commits.
