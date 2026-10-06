import asyncio
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
import asyncpg

class DatabaseManager:
    def __init__(self, database_url: str, min_size: int = 5, max_size: int = 20, statement_timeout: float = 10.0):
        self.database_url = database_url
        self.min_size = min_size
        self.max_size = max_size
        self.statement_timeout = statement_timeout
        self._pool: Optional[asyncpg.Pool] = None

    async def get_pool(self) -> asyncpg.Pool:
        if self._pool is None:
            # Set statement timeout on connection init
            timeout_ms = int(self.statement_timeout * 1000)
            async def init_connection(conn):
                await conn.execute(f"SET statement_timeout = '{timeout_ms}ms';")

            self._pool = await asyncpg.create_pool(
                dsn=self.database_url,
                min_size=self.min_size,
                max_size=self.max_size,
                init=init_connection,
            )
        return self._pool

    async def close(self):
        if self._pool:
            await self._pool.close()
            self._pool = None

    @asynccontextmanager
    async def connection(self) -> AsyncGenerator[asyncpg.Connection, None]:
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            yield conn

    @asynccontextmanager
    async def transaction(self) -> AsyncGenerator[asyncpg.Connection, None]:
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                yield conn

    async def run_migrations(self, migrations_dir: str, schema_name: str):
        """Runs plain .sql migration files in alphabetical order with schema versioning."""
        if not os.path.exists(migrations_dir):
            return

        async with self.connection() as conn:
            # Ensure schema and schema_migrations table exist
            await conn.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name};")
            await conn.execute(f"""
                CREATE TABLE IF NOT EXISTS {schema_name}.schema_migrations (
                    version VARCHAR(255) PRIMARY KEY,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
            """)

            files = sorted([f for f in os.listdir(migrations_dir) if f.endswith(".sql")])
            for filename in files:
                applied = await conn.fetchval(
                    f"SELECT 1 FROM {schema_name}.schema_migrations WHERE version = $1",
                    filename,
                )
                if not applied:
                    filepath = os.path.join(migrations_dir, filename)
                    with open(filepath, "r", encoding="utf-8") as f:
                        sql = f.read()
                    async with conn.transaction():
                        await conn.execute(sql)
                        await conn.execute(
                            f"INSERT INTO {schema_name}.schema_migrations (version) VALUES ($1)",
                            filename,
                        )

    def get_pool_metrics(self) -> dict:
        if not self._pool:
            return {"in_use": 0, "size": 0, "idle": 0}
        size = self._pool.get_size()
        idle = self._pool.get_idle_size()
        return {
            "size": size,
            "idle": idle,
            "in_use": size - idle,
        }
