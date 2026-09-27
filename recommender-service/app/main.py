"""Configurable demo-data API and customer-specific recommendations."""

from __future__ import annotations

import os
import random
import sqlite3
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Annotated

from faker import Faker
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="Mall Data & Recommender Service",
    version="0.3.0",
    lifespan=lifespan,
)


class RecommendRequest(BaseModel):
    customer_id: str = Field(min_length=1)
    limit: int = Field(default=5, ge=1, le=20)


class StatusUpdate(BaseModel):
    status: str = Field(pattern="^(completed|cancelled)$")


def configured_int(name: str, default: int, minimum: int = 100) -> int:
    value = int(os.environ.get(name, default))
    if value < minimum:
        raise ValueError(f"{name} must be at least {minimum}.")
    return value


def database_path() -> Path:
    return Path(os.environ.get("DATABASE_PATH", "data/mall.db"))


def connect() -> sqlite3.Connection:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database() -> None:
    with connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                segment TEXT NOT NULL,
                joined_on TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                store TEXT NOT NULL,
                price REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL REFERENCES customers(id),
                status TEXT NOT NULL CHECK (status IN ('completed', 'pending', 'cancelled')),
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS transaction_items (
                transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
                product_id TEXT NOT NULL REFERENCES products(id),
                quantity INTEGER NOT NULL CHECK (quantity > 0),
                PRIMARY KEY (transaction_id, product_id)
            );
            """
        )
        if connection.execute("SELECT COUNT(*) FROM customers").fetchone()[0]:
            return
        seed_database(connection)


def seed_database(connection: sqlite3.Connection) -> None:
    customer_count = configured_int("DEMO_CUSTOMER_COUNT", 120, minimum=100)
    product_count = configured_int("DEMO_PRODUCT_COUNT", 150, minimum=100)
    completed_count = configured_int(
        "DEMO_COMPLETED_TRANSACTION_COUNT", 150, minimum=100
    )
    pending_count = configured_int(
        "DEMO_PENDING_TRANSACTION_COUNT", 35, minimum=30
    )
    seed = int(os.environ.get("DEMO_DATA_SEED", "20260927"))
    rng = random.Random(seed)
    fake = Faker()
    fake.seed_instance(seed)
    today = date.today()
    segments = _setting_list(
        "DEMO_CUSTOMER_SEGMENTS",
        "Regular,Loyal,New,VIP,At risk",
    )
    categories = _setting_list(
        "DEMO_PRODUCT_CATEGORIES",
        "Food & Drink,Sports & Outdoors,Electronics,Fashion,Home & Living,"
        "Beauty & Wellness,Books & Gifts,Kids & Family,Travel,Lifestyle",
    )
    store_count = configured_int("DEMO_STORE_COUNT", 20, minimum=1)
    stores = [fake.unique.company() for _ in range(store_count)]

    customers = [
        (
            f"CUST-{index + 1:04}",
            fake.name(),
            f"customer{index + 1:04}@example.test",
            rng.choice(segments),
            (today - timedelta(days=rng.randint(15, 900))).isoformat(),
        )
        for index in range(customer_count)
    ]
    products = [
        (
            f"PROD-{index + 1:04}",
            f"{fake.color_name()} {fake.word()} {fake.word()}",
            rng.choice(categories),
            rng.choice(stores),
            round(rng.uniform(5, 350), 2),
        )
        for index in range(product_count)
    ]
    connection.executemany(
        "INSERT INTO customers VALUES (?, ?, ?, ?, ?)", customers
    )
    connection.executemany(
        "INSERT INTO products VALUES (?, ?, ?, ?, ?)", products
    )

    transaction_rows: list[tuple[str, str, str, str]] = []
    item_rows: list[tuple[str, str, int]] = []
    for index in range(completed_count + pending_count):
        is_pending = index >= completed_count
        transaction_id = (
            f"PEND-{index - completed_count + 1:04}"
            if is_pending
            else f"TXN-{index + 1:04}"
        )
        customer_id = customers[rng.randrange(customer_count)][0]
        created_at = datetime.combine(
            today - timedelta(days=rng.randint(0 if is_pending else 1, 6 if is_pending else 365)),
            datetime.min.time(),
            tzinfo=UTC,
        ).isoformat()
        transaction_rows.append(
            (
                transaction_id,
                customer_id,
                "pending" if is_pending else "completed",
                created_at,
            )
        )
        count = rng.randint(2, min(5, product_count))
        purchased = rng.sample(products, count)
        item_rows.extend(
            (transaction_id, product[0], rng.randint(1, 3))
            for product in purchased
        )

    connection.executemany(
        "INSERT INTO transactions VALUES (?, ?, ?, ?)", transaction_rows
    )
    connection.executemany(
        "INSERT INTO transaction_items VALUES (?, ?, ?)", item_rows
    )


def _setting_list(name: str, default: str) -> list[str]:
    values = [
        value.strip()
        for value in os.environ.get(name, default).split(",")
        if value.strip()
    ]
    if not values:
        raise ValueError(f"{name} must contain at least one value.")
    return values


def get_transaction(connection: sqlite3.Connection, row: sqlite3.Row) -> dict:
    items = connection.execute(
        """
        SELECT p.id AS product_id, p.name, p.category, p.price, ti.quantity
        FROM transaction_items ti
        JOIN products p ON p.id = ti.product_id
        WHERE ti.transaction_id = ?
        ORDER BY p.name
        """,
        (row["id"],),
    ).fetchall()
    item_data = [dict(item) for item in items]
    return {
        **dict(row),
        "items": item_data,
        "total": round(sum(item["price"] * item["quantity"] for item in item_data), 2),
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/accounts")
def list_demo_accounts() -> dict:
    """Return role-switcher identities; this endpoint does not authenticate."""
    with connect() as connection:
        customers = connection.execute(
            "SELECT id, name, email FROM customers ORDER BY name LIMIT 100"
        ).fetchall()
        stores = connection.execute(
            "SELECT DISTINCT store FROM products ORDER BY store LIMIT 5"
        ).fetchall()
    admin_name = os.environ.get("DEMO_ADMIN_NAME", "Mall Administrator")
    admin_email = os.environ.get("DEMO_ADMIN_EMAIL", "admin@example.test")
    accounts = [
        {
            "id": os.environ.get("DEMO_ADMIN_ID", "ADMIN-001"),
            "name": admin_name,
            "email": admin_email,
            "role": "admin",
            "role_label": "Mall administrator",
            "organization": os.environ.get("MALL_NAME", "Intelligent Mall"),
        }
    ]
    manager_name = os.environ.get("DEMO_MANAGER_NAME", "Store Manager")
    for index, store in enumerate(stores):
        accounts.append(
            {
                "id": f"MGR-{index + 1:03}",
                "name": manager_name if index == 0 else f"{manager_name} {index + 1}",
                "email": f"manager{index + 1:03}@example.test",
                "role": "manager",
                "role_label": "Store manager",
                "organization": store["store"],
            }
        )
    accounts.extend(
        {
            **dict(customer),
            "role": "customer",
            "role_label": "Mall customer",
            "organization": os.environ.get("MALL_NAME", "Intelligent Mall"),
        }
        for customer in customers
    )
    return {"items": accounts}


@app.get("/dashboard")
def dashboard(customer_id: str | None = None, store: str = "") -> dict:
    with connect() as connection:
        if customer_id:
            customer = connection.execute(
                "SELECT id FROM customers WHERE id = ?", (customer_id,)
            ).fetchone()
            if not customer:
                raise HTTPException(status_code=404, detail="Customer not found.")
            counts = connection.execute(
                """
                SELECT
                  1 AS customers,
                  (SELECT COUNT(*) FROM products) AS products,
                  (SELECT COUNT(*) FROM transactions
                   WHERE customer_id = ? AND status = 'completed') AS completed,
                  (SELECT COUNT(*) FROM transactions
                   WHERE customer_id = ? AND status = 'pending') AS pending,
                  (SELECT COUNT(DISTINCT p.store)
                   FROM transactions t
                   JOIN transaction_items ti ON ti.transaction_id = t.id
                   JOIN products p ON p.id = ti.product_id
                   WHERE t.customer_id = ? AND t.status = 'completed') AS stores,
                  (SELECT COUNT(*) FROM transactions
                   WHERE customer_id = ? AND status = 'completed' AND created_at >= ?) AS recent_orders,
                  (SELECT COALESCE(ROUND(AVG(total), 2), 0) FROM (
                    SELECT SUM(p.price * ti.quantity) AS total
                    FROM transactions t
                    JOIN transaction_items ti ON ti.transaction_id = t.id
                    JOIN products p ON p.id = ti.product_id
                    WHERE t.customer_id = ? AND t.status = 'completed'
                    GROUP BY t.id
                  )) AS average_order_value,
                  (SELECT COALESCE(ROUND(SUM(p.price * ti.quantity), 2), 0)
                   FROM transactions t
                   JOIN transaction_items ti ON ti.transaction_id = t.id
                   JOIN products p ON p.id = ti.product_id
                   WHERE t.customer_id = ? AND t.status = 'completed') AS lifetime_value
                """,
                (
                    customer_id,
                    customer_id,
                    customer_id,
                    customer_id,
                    datetime.combine(date.today() - timedelta(days=7), datetime.min.time(), tzinfo=UTC).isoformat(),
                    customer_id,
                    customer_id,
                ),
            ).fetchone()
            daily = connection.execute(
                """
                SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS orders
                FROM transactions
                WHERE customer_id = ? AND status = 'completed' AND created_at >= ?
                GROUP BY day ORDER BY day
                """,
                (
                    customer_id,
                    datetime.combine(date.today() - timedelta(days=6), datetime.min.time(), tzinfo=UTC).isoformat(),
                ),
            ).fetchall()
            return {
                **dict(counts),
                "stores": counts["stores"] or 0,
                "daily_orders": [dict(row) for row in daily],
                "scope": "customer",
            }
        if store:
            counts = connection.execute(
                """
                SELECT
                  (SELECT COUNT(DISTINCT t.customer_id) FROM transactions t
                   JOIN transaction_items ti ON ti.transaction_id = t.id
                   JOIN products p ON p.id = ti.product_id
                   WHERE p.store = ?) AS customers,
                  (SELECT COUNT(*) FROM products WHERE store = ?) AS products,
                  (SELECT COUNT(DISTINCT t.id) FROM transactions t
                   JOIN transaction_items ti ON ti.transaction_id = t.id
                   JOIN products p ON p.id = ti.product_id
                   WHERE t.status = 'completed' AND p.store = ?) AS completed,
                  (SELECT COUNT(DISTINCT t.id) FROM transactions t
                   JOIN transaction_items ti ON ti.transaction_id = t.id
                   JOIN products p ON p.id = ti.product_id
                   WHERE t.status = 'pending' AND p.store = ?) AS pending,
                  1 AS stores,
                  (SELECT COUNT(DISTINCT t.id) FROM transactions t
                   JOIN transaction_items ti ON ti.transaction_id = t.id
                   JOIN products p ON p.id = ti.product_id
                   WHERE t.status = 'completed' AND t.created_at >= ? AND p.store = ?) AS recent_orders,
                  (SELECT COALESCE(ROUND(AVG(total), 2), 0) FROM (
                    SELECT SUM(p.price * ti.quantity) AS total
                    FROM transactions t
                    JOIN transaction_items ti ON ti.transaction_id = t.id
                    JOIN products p ON p.id = ti.product_id
                    WHERE p.store = ? AND t.status = 'completed'
                    GROUP BY t.id
                  )) AS average_order_value
                """,
                (
                    store, store, store, store,
                    datetime.combine(date.today() - timedelta(days=7), datetime.min.time(), tzinfo=UTC).isoformat(),
                    store, store,
                ),
            ).fetchone()
            daily = connection.execute(
                """
                SELECT substr(t.created_at, 1, 10) AS day, COUNT(DISTINCT t.id) AS orders
                FROM transactions t
                JOIN transaction_items ti ON ti.transaction_id = t.id
                JOIN products p ON p.id = ti.product_id
                WHERE t.status = 'completed' AND t.created_at >= ? AND p.store = ?
                GROUP BY day ORDER BY day
                """,
                (
                    datetime.combine(date.today() - timedelta(days=6), datetime.min.time(), tzinfo=UTC).isoformat(),
                    store,
                ),
            ).fetchall()
            return {
                **dict(counts),
                "daily_orders": [dict(row) for row in daily],
                "scope": "store",
                "store": store,
            }
        counts = connection.execute(
            """
            SELECT
              (SELECT COUNT(*) FROM customers) AS customers,
              (SELECT COUNT(*) FROM products) AS products,
              (SELECT COUNT(*) FROM transactions WHERE status = 'completed') AS completed,
              (SELECT COUNT(*) FROM transactions WHERE status = 'pending') AS pending,
              (SELECT COUNT(DISTINCT store) FROM products) AS stores,
              (SELECT COUNT(*) FROM transactions
               WHERE status = 'completed' AND created_at >= ?) AS recent_orders,
              (SELECT COALESCE(ROUND(AVG(total), 2), 0) FROM (
                SELECT SUM(p.price * ti.quantity) AS total
                FROM transactions t
                JOIN transaction_items ti ON ti.transaction_id = t.id
                JOIN products p ON p.id = ti.product_id
                WHERE t.status = 'completed'
                GROUP BY t.id
              )) AS average_order_value
            """,
            (datetime.combine(date.today() - timedelta(days=7), datetime.min.time(), tzinfo=UTC).isoformat(),),
        ).fetchone()
        daily = connection.execute(
            """
            SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS orders
            FROM transactions
            WHERE status = 'completed' AND created_at >= ?
            GROUP BY day ORDER BY day
            """,
            (datetime.combine(date.today() - timedelta(days=6), datetime.min.time(), tzinfo=UTC).isoformat(),),
        ).fetchall()
    return {
        **dict(counts),
        "stores": counts["stores"] or 0,
        "daily_orders": [dict(row) for row in daily],
        "scope": "mall",
    }


@app.get("/customers")
def list_customers(
    q: str = "",
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict:
    with connect() as connection:
        search = f"%{q.strip()}%"
        rows = connection.execute(
            """
            SELECT c.*,
              (SELECT COUNT(*) FROM transactions t
               WHERE t.customer_id = c.id AND t.status = 'completed') AS order_count,
              (SELECT COALESCE(ROUND(SUM(p.price * ti.quantity), 2), 0)
               FROM transactions t
               JOIN transaction_items ti ON ti.transaction_id = t.id
               JOIN products p ON p.id = ti.product_id
               WHERE t.customer_id = c.id AND t.status = 'completed') AS lifetime_value
            FROM customers c
            WHERE c.id LIKE ? OR c.name LIKE ? OR c.email LIKE ?
            ORDER BY c.name, c.id
            LIMIT ? OFFSET ?
            """,
            (search, search, search, limit, offset),
        ).fetchall()
        total = connection.execute(
            "SELECT COUNT(*) FROM customers WHERE id LIKE ? OR name LIKE ? OR email LIKE ?",
            (search, search, search),
        ).fetchone()[0]
    return {"items": [dict(row) for row in rows], "total": total}


@app.get("/products")
def list_products(
    q: str = "",
    category: str = "",
    store: str = "",
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict:
    with connect() as connection:
        search = f"%{q.strip()}%"
        category_search = f"%{category.strip()}%"
        rows = connection.execute(
            """
            SELECT p.*,
              (SELECT COALESCE(SUM(ti.quantity), 0)
               FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id
               WHERE ti.product_id = p.id AND t.status = 'completed') AS units_sold
            FROM products p
            WHERE (p.id LIKE ? OR p.name LIKE ? OR p.store LIKE ?)
              AND p.category LIKE ?
              AND (? = '' OR p.store = ?)
            ORDER BY p.category, p.name LIMIT ? OFFSET ?
            """,
            (search, search, search, category_search, store, store, limit, offset),
        ).fetchall()
        total = connection.execute(
            """
            SELECT COUNT(*) FROM products
            WHERE (id LIKE ? OR name LIKE ? OR store LIKE ?) AND category LIKE ?
              AND (? = '' OR store = ?)
            """,
            (search, search, search, category_search, store, store),
        ).fetchone()[0]
        categories = [
            row[0]
            for row in connection.execute(
                "SELECT DISTINCT category FROM products ORDER BY category"
            ).fetchall()
        ]
    return {"items": [dict(row) for row in rows], "total": total, "categories": categories}


@app.get("/transactions")
def list_transactions(
    status: str = "all",
    q: str = "",
    customer_id: str = "",
    store: str = "",
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict:
    if status not in {"all", "completed", "pending", "cancelled"}:
        raise HTTPException(status_code=422, detail="Unsupported transaction status.")
    conditions = ["(t.id LIKE ? OR c.name LIKE ? OR c.id LIKE ?)"]
    params: list = [f"%{q.strip()}%"] * 3
    if status != "all":
        conditions.append("t.status = ?")
        params.append(status)
    if customer_id:
        conditions.append("t.customer_id = ?")
        params.append(customer_id)
    if store:
        conditions.append(
            "EXISTS (SELECT 1 FROM transaction_items ti "
            "JOIN products p ON p.id = ti.product_id "
            "WHERE ti.transaction_id = t.id AND p.store = ?)"
        )
        params.append(store)
    where = " AND ".join(conditions)
    with connect() as connection:
        rows = connection.execute(
            f"""
            SELECT t.id, t.customer_id, c.name AS customer_name, t.status, t.created_at
            FROM transactions t JOIN customers c ON c.id = t.customer_id
            WHERE {where}
            ORDER BY t.created_at DESC, t.id DESC
            LIMIT ? OFFSET ?
            """,
            (*params, limit, offset),
        ).fetchall()
        total = connection.execute(
            f"SELECT COUNT(*) FROM transactions t JOIN customers c ON c.id = t.customer_id WHERE {where}",
            params,
        ).fetchone()[0]
        transactions = [get_transaction(connection, row) for row in rows]
    return {"items": transactions, "total": total}


@app.patch("/transactions/{transaction_id}")
def update_transaction(
    transaction_id: str,
    update: StatusUpdate,
) -> dict:
    with connect() as connection:
        result = connection.execute(
            "UPDATE transactions SET status = ? WHERE id = ? AND status = 'pending'",
            (update.status, transaction_id),
        )
        if result.rowcount == 0:
            exists = connection.execute(
                "SELECT 1 FROM transactions WHERE id = ?", (transaction_id,)
            ).fetchone()
            if not exists:
                raise HTTPException(status_code=404, detail="Transaction not found.")
            raise HTTPException(
                status_code=409, detail="Only pending transactions can be updated."
            )
        row = connection.execute(
            """
            SELECT t.id, t.customer_id, c.name AS customer_name, t.status, t.created_at
            FROM transactions t JOIN customers c ON c.id = t.customer_id WHERE t.id = ?
            """,
            (transaction_id,),
        ).fetchone()
        return get_transaction(connection, row)


@app.post("/recommend")
def recommend(request: RecommendRequest) -> dict:
    with connect() as connection:
        customer = connection.execute(
            "SELECT id FROM customers WHERE id = ?", (request.customer_id,)
        ).fetchone()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found.")
        purchased = {
            row[0]
            for row in connection.execute(
                """
                SELECT DISTINCT ti.product_id FROM transaction_items ti
                JOIN transactions t ON t.id = ti.transaction_id
                WHERE t.customer_id = ? AND t.status = 'completed'
                """,
                (request.customer_id,),
            ).fetchall()
        }
        preferences = connection.execute(
            """
            SELECT p.category, SUM(ti.quantity) AS quantity
            FROM transactions t
            JOIN transaction_items ti ON ti.transaction_id = t.id
            JOIN products p ON p.id = ti.product_id
            WHERE t.customer_id = ? AND t.status = 'completed'
            GROUP BY p.category ORDER BY quantity DESC
            """,
            (request.customer_id,),
        ).fetchall()
        preference_strength = {row["category"]: row["quantity"] for row in preferences}
        candidates = connection.execute(
            """
            SELECT p.id AS product_id, p.name, p.category, p.store, p.price,
              (SELECT COUNT(DISTINCT ti.transaction_id)
               FROM transaction_items ti
               JOIN transactions t ON t.id = ti.transaction_id
               WHERE ti.product_id = p.id AND t.status = 'completed') AS popularity
            FROM products p ORDER BY p.id
            """
        ).fetchall()
        max_preference = max(preference_strength.values(), default=1)
        max_popularity = max((row["popularity"] for row in candidates), default=1)
        scored = []
        for product in candidates:
            if product["product_id"] in purchased:
                continue
            preference = preference_strength.get(product["category"], 0)
            score = 0.55 + 0.35 * preference / max_preference
            score += 0.1 * product["popularity"] / max(max_popularity, 1)
            scored.append(
                {
                    **dict(product),
                    "score": round(min(score, 0.99), 2),
                    "reason": (
                        f"Popular in {product['category']}"
                        if preference == 0
                        else f"Based on your {product['category']} shopping"
                    ),
                }
            )
        scored.sort(key=lambda product: (-product["score"], product["product_id"]))
    return {"customer_id": request.customer_id, "recommendations": scored[: request.limit]}
