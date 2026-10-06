CREATE SCHEMA IF NOT EXISTS wrap;

CREATE TABLE IF NOT EXISTS wrap.monthly_wraps (
    user_id UUID NOT NULL,
    period CHAR(7) NOT NULL CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    payload JSONB NOT NULL,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, period)
);
