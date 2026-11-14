BEGIN;

-- A business (restaurant) that uses the app
CREATE TABLE businesses (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Starter business so existing rows have somewhere to belong
INSERT INTO businesses (name) VALUES ('Test Restaurant');

COMMIT;