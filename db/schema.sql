-- Managers who log in
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff that a manager schedules
CREATE TABLE employees (
    id         SERIAL PRIMARY KEY,
    manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    email      TEXT,
    phone      TEXT,
    role       TEXT NOT NULL,  -- e.g. 'server', 'kitchen'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- When each employee can work (recurring weekly)
CREATE TABLE availability (
    id          SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    note        TEXT,  -- why, e.g. "has class"
    CHECK (end_time > start_time)
);

-- One schedule per week
CREATE TABLE schedules (
    id         SERIAL PRIMARY KEY,
    manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (manager_id, week_start)
);

-- Individual shifts inside a schedule
CREATE TABLE shifts (
    id          SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    start_time  TIMESTAMPTZ NOT NULL,
    end_time    TIMESTAMPTZ NOT NULL,
    CHECK (end_time > start_time)
);

