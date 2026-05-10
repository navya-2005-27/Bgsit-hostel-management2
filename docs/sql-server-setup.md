# SQL Server 2025 Setup Guide

This project now includes SQL Server connection code in [server/db.ts](server/db.ts), a health endpoint at [server/index.ts](server/index.ts), and a full schema at [server/sql/schema.sql](server/sql/schema.sql).

## 1. Create database in SQL Server 2025

Run this in SSMS (SQL Server Management Studio):

```sql
CREATE DATABASE BgsitHostelDB;
GO
```

## 2. Create tables

1. Select database `BgsitHostelDB` in SSMS.
2. Open and execute [server/sql/schema.sql](server/sql/schema.sql).

This creates all major data tables used by your app features:
- users/admin/warden/student auth: `app.user_accounts`
- students + documents + access requests
- rooms + occupants + room requests
- parcels
- notifications
- events + registrations + comments
- attendance sessions + records
- hostel geofence settings

The schema also seeds default admin and warden rows in `app.user_accounts` so the login screens work immediately after setup:
- admin / `Admin@123`
- warden / `Warden@123`

The admin dashboard now updates the warden account through the SQL-backed auth endpoint.

## 3. Configure app environment

1. Copy [.env.example](.env.example) to `.env`.
2. Fill SQL values (`SQLSERVER_*`) for your SQL Server instance.

Quick example:

```env
SQLSERVER_HOST=localhost
SQLSERVER_PORT=1433
SQLSERVER_DATABASE=BgsitHostelDB
SQLSERVER_USER=sa
SQLSERVER_PASSWORD=YourStrong@Passw0rd
SQLSERVER_ENCRYPT=true
SQLSERVER_TRUST_CERT=true
```

## 4. Install dependency and run

```bash
pnpm install
pnpm dev
```

Check DB connectivity:

`GET /api/db/health`

If connected, response is:

```json
{ "ok": true, "message": "SQL Server connection is healthy" }
```

## 4A. SQL Server API endpoints to connect

Backend endpoints added:
- `GET /api/students` -> reads from SQL table `app.students`
- `POST /api/students` -> inserts a row into SQL table `app.students`
- `GET /api/rooms` -> reads from SQL table `app.rooms`
- `POST /api/rooms` -> inserts a row into SQL table `app.rooms`
- `GET /api/parcels` -> reads from SQL table `app.parcels`
- `POST /api/parcels` -> inserts a row into SQL table `app.parcels`
- `GET /api/notifications` -> reads from SQL table `app.notifications`
- `POST /api/notifications` -> inserts a row into SQL table `app.notifications`
- `GET /api/events` -> reads from SQL table `app.events`
- `POST /api/events` -> inserts a row into SQL table `app.events`
- `GET /api/attendance?dateKey=YYYY-MM-DD` -> reads SQL table `app.attendance_records`
- `POST /api/attendance` -> upserts SQL table `app.attendance_records`
- `GET /api/storage-status` -> shows what is SQL-backed vs localStorage
- `GET /api/state-sync` -> loads synced `campusstay.*` keys from SQL
- `POST /api/state-sync` -> upserts/deletes one `campusstay.*` key in SQL

## 4B. Fast migration mode (all existing localStorage data to SQL)

To migrate quickly without rewriting all old screens immediately, app startup now enables SQL sync for all `campusstay.*` localStorage keys.

- Client bootstrap: [client/lib/storageSqlSync.ts](client/lib/storageSqlSync.ts)
- Enabled in app entry: [client/App.tsx](client/App.tsx)
- SQL table used: `app.client_state`

This means existing modules (students/rooms/parcels/events/attendance/payments/complaints) are now persisted to SQL through state sync, while older UI logic still reads/writes localStorage locally.

Sample create request:

```http
POST /api/students
Content-Type: application/json

{
  "id": "std-1001",
  "student_id": "std-1001",
  "name": "Shreya",
  "usn": "1BG22CS001",
  "year": "3rd Year",
  "joining_year": 2022,
  "student_contact": "9876543210",
  "email": "shreya@example.com"
}
```

Frontend fetch example:

```ts
const res = await fetch("/api/students", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id: "std-1001",
    student_id: "std-1001",
    name: "Shreya",
    usn: "1BG22CS001",
  }),
});

const data = await res.json();
console.log(data);
```

## 5. Where your data is stored

### Current state in this codebase

Most feature data is still written in browser localStorage (frontend stores), not yet through backend APIs.
Examples:
- [client/lib/studentStore.ts](client/lib/studentStore.ts)
- [client/lib/roomStore.ts](client/lib/roomStore.ts)
- [client/lib/parcelStore.ts](client/lib/parcelStore.ts)
- [client/lib/eventStore.ts](client/lib/eventStore.ts)
- [client/lib/notificationStore.ts](client/lib/notificationStore.ts)
- [client/lib/notificationStoreV2.ts](client/lib/notificationStoreV2.ts)
- [client/lib/adminStore.ts](client/lib/adminStore.ts)

So right now, existing app data is stored in:
- Browser localStorage (user device)
- SQL Server (only when new server APIs start writing to SQL tables)

### Physical SQL Server storage location

SQL Server stores database files on server disk as:
- `.mdf` (primary data file)
- `.ldf` (transaction log file)

Find exact path for your database:

```sql
SELECT
  DB_NAME(database_id) AS database_name,
  name AS logical_name,
  physical_name,
  type_desc
FROM sys.master_files
WHERE database_id = DB_ID('BgsitHostelDB');
```

Typical path example on Windows:

`C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA\BgsitHostelDB.mdf`

## 6. Next migration step (important)

To fully use SQL Server for all app data, move each localStorage store to backend APIs:
1. Create REST APIs in `server/routes/*` for each entity (students, rooms, parcels, events, notifications, attendance).
2. Replace localStorage reads/writes in client stores with fetch calls.
3. Keep only session tokens on client; store business data in SQL Server tables.

## 7. Verify Student Details Saved

Run these queries in SSMS after saving student profile in UI.

Check latest student rows:

```sql
SELECT TOP 20
  id,
  student_id,
  name,
  usn,
  year,
  joining_year,
  father_name,
  mother_name,
  father_contact,
  mother_contact,
  student_contact,
  address,
  email,
  total_amount,
  joining_date,
  updated_at
FROM app.students
ORDER BY updated_at DESC;
```

Check one student by USN:

```sql
DECLARE @usn NVARCHAR(80) = '1BG22CS001';

SELECT
  id,
  student_id,
  name,
  usn,
  student_contact,
  email,
  updated_at
FROM app.students
WHERE usn = @usn;
```

Check uploaded documents for a USN:

```sql
DECLARE @usn NVARCHAR(80) = '1BG22CS001';

SELECT
  s.usn,
  s.name,
  d.document_name,
  DATALENGTH(d.document_data_url) AS document_bytes,
  d.created_at
FROM app.students s
LEFT JOIN app.student_documents d
  ON d.student_id = s.id
WHERE s.usn = @usn
ORDER BY d.created_at DESC;
```

Check if access request data matches student auto-filled data:

```sql
SELECT TOP 20
  ar.usn,
  ar.name AS request_name,
  ar.phone AS request_phone,
  ar.status,
  s.name AS student_name,
  s.student_contact,
  s.updated_at
FROM app.access_requests ar
LEFT JOIN app.students s
  ON s.usn = ar.usn
ORDER BY ar.requested_at DESC;
```
