BEGIN;

-- 1. Add the column (nullable for now, because existing rows have no value yet)
ALTER TABLE users        ADD COLUMN business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE employees    ADD COLUMN business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE availability ADD COLUMN business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE schedules    ADD COLUMN business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE shifts       ADD COLUMN business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE;

-- 2. Move every existing row into the starter business (id 1)
UPDATE users        SET business_id = 1;
UPDATE employees    SET business_id = 1;
UPDATE availability SET business_id = 1;
UPDATE schedules    SET business_id = 1;
UPDATE shifts       SET business_id = 1;

-- 3. Now that every row has a value, make it required
ALTER TABLE users        ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE employees    ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE availability ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE schedules    ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE shifts       ALTER COLUMN business_id SET NOT NULL;

-- 4. Every query will filter by business_id, so index it
CREATE INDEX idx_users_business        ON users(business_id);
CREATE INDEX idx_employees_business    ON employees(business_id);
CREATE INDEX idx_availability_business ON availability(business_id);
CREATE INDEX idx_schedules_business    ON schedules(business_id);
CREATE INDEX idx_shifts_business       ON shifts(business_id);

COMMIT;