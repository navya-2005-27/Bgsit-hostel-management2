# Bgsit-hostel-management2

Hostel management application built with React + Express.

## SQL Server 2025

SQL Server integration and schema files are available now:

- Setup guide: [docs/sql-server-setup.md](docs/sql-server-setup.md)
- Connection code: [server/db.ts](server/db.ts)
- Schema script: [server/sql/schema.sql](server/sql/schema.sql)

Quick commands:

```bash
pnpm install
pnpm dev
```

Health check endpoint:

`GET /api/db/health`