# Shift Scheduler

AI-assisted shift scheduling for restaurants and retail. Managers enter employee availability, give plain-English rules, and an AI drafts the weekly schedule for approval.

## How it works

1. The manager talks with each employee and enters their agreed availability, with notes on why.
2. The manager gives the AI plain-English guidance (e.g. "keep two servers on Friday nights").
3. The AI generates a draft schedule.
4. The manager reviews and approves it.

## Tech stack

- **Database:** PostgreSQL
- **Backend:** Node.js, Express
- **Frontend:** React
- **Hosting:** AWS (planned)

## Database

Five tables: `users`, `employees`, `availability`, `schedules`, `shifts`. The schema is in `db/schema.sql`.

To set it up locally:

```
psql -U postgres -c "CREATE DATABASE shift_scheduler;"
psql -U postgres -d shift_scheduler -f db/schema.sql
```

## Status

- [x] Database schema
- [ ] Express API
- [ ] Authentication
- [ ] React frontend
- [ ] AI schedule generation
- [ ] Calendar sync
- [ ] Call-out coverage
- [ ] AWS deployment