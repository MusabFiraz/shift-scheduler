# Shift Scheduler

Manager-first shift scheduling for restaurants and retail. Managers enter each employee's agreed availability with a note on why, give plain-English rules, and the app builds a weekly schedule for the manager to review and approve.

## How it works

1. The manager talks with each employee and enters the agreed availability, plus a short note on why it was set.
2. The manager gives plain-English guidance (e.g. "keep Maria off closing").
3. An AI turns that guidance into structured rules, and a constraint solver (Google OR-Tools) builds the draft schedule. The AI parses and explains; the solver decides.
4. The manager reviews and approves.
5. Approved shifts sync to employees' calendars.
6. If someone calls out, the app ranks who can cover and texts candidates; the manager approves with one tap.

## Tech stack

- **Database:** PostgreSQL
- **Backend:** Node.js, Express, bcrypt, JSON Web Tokens
- **Frontend:** React (planned)
- **Scheduling:** Google OR-Tools (planned)
- **Hosting:** AWS with a managed database (planned)

## Project structure

```
db/
  schema.sql        original baseline schema
  migrations/       numbered changes, applied in order
server/
  index.js          Express routes and auth middleware
  db.js             PostgreSQL connection pool
```

## Database

Six tables: `businesses`, `users`, `employees`, `availability`, `schedules`, `shifts`. Every table except `businesses` carries a `business_id`, so many businesses can share one database without seeing each other's data.

To set it up locally, apply the baseline schema, then the migrations in order:

```
psql -U postgres -c "CREATE DATABASE shift_scheduler;"
psql -U postgres -d shift_scheduler -f db/schema.sql
psql -U postgres -d shift_scheduler -f db/migrations/001_create_businesses.sql
psql -U postgres -d shift_scheduler -f db/migrations/002_add_business_id.sql
psql -U postgres -d shift_scheduler -f db/migrations/003_roles_and_employee_link.sql
```

## Running the API

Requires Node 20.6 or newer.

```
cd server
npm install
```

Create `server/.env` (never commit this file) with:

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/shift_scheduler
JWT_SECRET=a-long-random-string
```

Generate a secret with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then start the server:

```
npm run dev
```

The API runs at `http://localhost:3000`.

## API

Protected routes need an `Authorization: Bearer <token>` header. Tokens last 8 hours.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/signup` | no | Create a business and its first manager in one transaction |
| POST | `/auth/login` | no | Check the password and return a token |
| GET | `/employees` | yes | List employees (optional `?role=`) |
| POST | `/employees` | yes | Add an employee |
| DELETE | `/employees/:id` | yes | Remove an employee |
| GET | `/employees/:id/availability` | yes | List an employee's availability windows |
| POST | `/employees/:id/availability` | yes | Add a window (rejects overlaps) |
| DELETE | `/employees/:id/availability/:windowId` | yes | Remove a window |
| GET | `/health`, `/health/db` | no | Check the server and database |

## Security design

- **Multi-tenancy:** one shared database, every row tagged with `business_id`. The business id comes only from the signed token, never from the request body, URL, or query string, and every query filters on it.
- **Passwords** are hashed with bcrypt and never stored or logged in plain text.
- **Signup** runs in a single database transaction, so a failure never leaves a business without a manager.
- **Queries** are parameterized to prevent SQL injection, and all input is validated in the API.
- **Secrets** live in `.env`, which is kept out of Git.

## Status

- [x] Database schema and migrations
- [x] Multi-tenant data model (`business_id` on every table)
- [x] Manager signup and login (bcrypt, JWT)
- [x] Employees API
- [x] Availability API with notes and overlap checks
- [ ] React frontend
- [ ] Schedule generation with a solver and manager approval
- [ ] Plain-English rules (AI)
- [ ] Employee login, time-off requests, and shift swaps
- [ ] Calendar sync
- [ ] Call-out coverage
- [ ] AWS deployment