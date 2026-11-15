BEGIN;

-- Who can do what: every login is a manager or an employee
ALTER TABLE users
    ADD COLUMN role TEXT NOT NULL DEFAULT 'manager'
    CHECK (role IN ('manager', 'employee'));

-- Optional link: an employee row can belong to a login (NULL = never logs in)
ALTER TABLE employees
    ADD COLUMN user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL;

-- The business owns employees now, not one manager
ALTER TABLE employees DROP COLUMN manager_id;

COMMIT;