/*
  SQL Server 2025 schema for BG SIT Hostel Management.
  Run this file in SSMS/Azure Data Studio after creating the database.
*/

-- Create app schema if it does not exist
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'app')
BEGIN
  EXEC('CREATE SCHEMA app');
END;
GO

-- Accounts: admin, warden, student login identity
IF OBJECT_ID('app.user_accounts', 'U') IS NULL
BEGIN
  CREATE TABLE app.user_accounts (
    id NVARCHAR(80) NOT NULL PRIMARY KEY,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('admin', 'warden', 'student')),
    username NVARCHAR(120) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    student_id NVARCHAR(80) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM app.user_accounts WHERE role = 'admin' AND username = 'admin')
BEGIN
  INSERT INTO app.user_accounts (id, role, username, password_hash, student_id, is_active)
  VALUES (
    'acct-admin',
    'admin',
    'admin',
    CONVERT(NVARCHAR(64), HASHBYTES('SHA2_256', CONVERT(NVARCHAR(255), N'Admin@123')), 2),
    NULL,
    1
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM app.user_accounts WHERE role = 'warden')
BEGIN
  INSERT INTO app.user_accounts (id, role, username, password_hash, student_id, is_active)
  VALUES (
    'acct-warden',
    'warden',
    'warden',
    CONVERT(NVARCHAR(64), HASHBYTES('SHA2_256', CONVERT(NVARCHAR(255), N'Warden@123')), 2),
    NULL,
    1
  );
END;
GO

IF OBJECT_ID('app.students', 'U') IS NULL
BEGIN
  CREATE TABLE app.students (
    id NVARCHAR(80) NOT NULL PRIMARY KEY,
    student_id NVARCHAR(80) NOT NULL UNIQUE,
    roll_number NVARCHAR(80) NULL UNIQUE,
    name NVARCHAR(150) NOT NULL,
    usn NVARCHAR(80) NULL UNIQUE,
    room_number NVARCHAR(50) NULL,
    year NVARCHAR(30) NULL,
    joining_year INT NULL,
    father_name NVARCHAR(150) NULL,
    mother_name NVARCHAR(150) NULL,
    father_contact NVARCHAR(30) NULL,
    mother_contact NVARCHAR(30) NULL,
    student_contact NVARCHAR(30) NULL,
    address NVARCHAR(500) NULL,
    email NVARCHAR(255) NULL,
    total_amount DECIMAL(12, 2) NULL,
    joining_date DATE NULL,
    profile_photo_data_url NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO

-- Backfill columns for existing databases created from older schema versions
IF COL_LENGTH('app.students', 'father_name') IS NULL
  ALTER TABLE app.students ADD father_name NVARCHAR(150) NULL;
IF COL_LENGTH('app.students', 'room_number') IS NULL
  ALTER TABLE app.students ADD room_number NVARCHAR(50) NULL;
IF COL_LENGTH('app.students', 'mother_name') IS NULL
  ALTER TABLE app.students ADD mother_name NVARCHAR(150) NULL;
IF COL_LENGTH('app.students', 'father_contact') IS NULL
  ALTER TABLE app.students ADD father_contact NVARCHAR(30) NULL;
IF COL_LENGTH('app.students', 'mother_contact') IS NULL
  ALTER TABLE app.students ADD mother_contact NVARCHAR(30) NULL;
IF COL_LENGTH('app.students', 'address') IS NULL
  ALTER TABLE app.students ADD address NVARCHAR(500) NULL;
IF COL_LENGTH('app.students', 'total_amount') IS NULL
  ALTER TABLE app.students ADD total_amount DECIMAL(12, 2) NULL;
IF COL_LENGTH('app.students', 'joining_date') IS NULL
  ALTER TABLE app.students ADD joining_date DATE NULL;
IF COL_LENGTH('app.students', 'profile_photo_data_url') IS NULL
  ALTER TABLE app.students ADD profile_photo_data_url NVARCHAR(MAX) NULL;
GO

IF OBJECT_ID('app.residents', 'U') IS NULL
BEGIN
  CREATE TABLE app.residents (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    name NVARCHAR(150) NOT NULL,
    room_number NVARCHAR(50) NOT NULL,
    phone_number NVARCHAR(30) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );

  CREATE INDEX IX_residents_room_number ON app.residents(room_number);
END;
GO

IF OBJECT_ID('app.student_documents', 'U') IS NULL
BEGIN
  CREATE TABLE app.student_documents (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    student_id NVARCHAR(80) NOT NULL,
    document_name NVARCHAR(255) NOT NULL,
    document_data_url NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_student_documents_students
      FOREIGN KEY (student_id) REFERENCES app.students(id) ON DELETE CASCADE
  );
END;
GO

IF OBJECT_ID('app.client_state', 'U') IS NULL
BEGIN
  CREATE TABLE app.client_state (
    state_key NVARCHAR(255) NOT NULL PRIMARY KEY,
    state_value NVARCHAR(MAX) NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID('app.access_requests', 'U') IS NULL
BEGIN
  CREATE TABLE app.access_requests (
    id NVARCHAR(80) NOT NULL PRIMARY KEY,
    name NVARCHAR(150) NOT NULL,
    usn NVARCHAR(80) NOT NULL,
    phone NVARCHAR(30) NOT NULL,
    status NVARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at DATETIME2 NOT NULL,
    approved_at DATETIME2 NULL,
    rejected_at DATETIME2 NULL
  );

  CREATE INDEX IX_access_requests_usn ON app.access_requests(usn);
  CREATE INDEX IX_access_requests_status_requested ON app.access_requests(status, requested_at DESC);
  CREATE UNIQUE INDEX UX_access_requests_active_usn
    ON app.access_requests(usn)
    WHERE status IN ('pending', 'rejected');
END;
GO

IF OBJECT_ID('app.rooms', 'U') IS NULL
BEGIN
  CREATE TABLE app.rooms (
    id NVARCHAR(80) NOT NULL PRIMARY KEY,
    name NVARCHAR(50) NOT NULL UNIQUE,
    capacity INT NOT NULL CHECK (capacity > 0),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID('app.room_occupants', 'U') IS NULL
BEGIN
  CREATE TABLE app.room_occupants (
    room_id NVARCHAR(80) NOT NULL,
    student_id NVARCHAR(80) NOT NULL,
    assigned_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (room_id, student_id),
    CONSTRAINT FK_room_occupants_rooms
      FOREIGN KEY (room_id) REFERENCES app.rooms(id) ON DELETE CASCADE,
    CONSTRAINT FK_room_occupants_students
      FOREIGN KEY (student_id) REFERENCES app.students(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX UX_room_occupants_student ON app.room_occupants(student_id);
END;
GO

IF OBJECT_ID('app.room_requests', 'U') IS NULL
BEGIN
  CREATE TABLE app.room_requests (
    id NVARCHAR(80) NOT NULL PRIMARY KEY,
    request_type NVARCHAR(20) NOT NULL CHECK (request_type IN ('leave', 'change')),
    student_id NVARCHAR(80) NOT NULL,
    target_room_id NVARCHAR(80) NULL,
    status NVARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    note NVARCHAR(500) NULL,
    created_at DATETIME2 NOT NULL,
    resolved_at DATETIME2 NULL,
    CONSTRAINT FK_room_requests_student
      FOREIGN KEY (student_id) REFERENCES app.students(id) ON DELETE CASCADE,
    CONSTRAINT FK_room_requests_target_room
      FOREIGN KEY (target_room_id) REFERENCES app.rooms(id)
  );

  CREATE INDEX IX_room_requests_status_created ON app.room_requests(status, created_at DESC);
END;
GO

IF OBJECT_ID('app.parcels', 'U') IS NULL
BEGIN
  CREATE TABLE app.parcels (
    id NVARCHAR(80) NOT NULL PRIMARY KEY,
    student_id NVARCHAR(80) NOT NULL,
    parcel_code NVARCHAR(120) NOT NULL,
    carrier NVARCHAR(120) NULL,
    received_at DATETIME2 NOT NULL,
    collected BIT NOT NULL DEFAULT 0,
    collected_at DATETIME2 NULL,
    otp NVARCHAR(10) NOT NULL,
    note NVARCHAR(500) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_parcels_students
      FOREIGN KEY (student_id) REFERENCES app.students(id) ON DELETE CASCADE
  );

  CREATE INDEX IX_parcels_student_received ON app.parcels(student_id, received_at DESC);
  CREATE INDEX IX_parcels_collected_received ON app.parcels(collected, received_at DESC);
END;
GO

IF OBJECT_ID('app.notifications', 'U') IS NULL
BEGIN
  CREATE TABLE app.notifications (
    id NVARCHAR(80) NOT NULL PRIMARY KEY,
    title NVARCHAR(255) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    description NVARCHAR(MAX) NULL,
    image_data_url NVARCHAR(MAX) NULL,
    date_iso DATETIME2 NOT NULL,
    created_at DATETIME2 NOT NULL
  );

  CREATE INDEX IX_notifications_date ON app.notifications(date_iso DESC);
END;
GO

IF OBJECT_ID('app.events', 'U') IS NULL
BEGIN
  CREATE TABLE app.events (
    id NVARCHAR(80) NOT NULL PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    organizer_role NVARCHAR(20) NOT NULL CHECK (organizer_role IN ('student', 'warden')),
    organizer_name NVARCHAR(150) NULL,
    event_type NVARCHAR(50) NOT NULL,
    date_iso DATETIME2 NOT NULL,
    venue NVARCHAR(255) NOT NULL,
    expected_count INT NULL,
    budget DECIMAL(12, 2) NULL,
    poster_data_url NVARCHAR(MAX) NULL,
    status NVARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    created_at DATETIME2 NOT NULL
  );

  CREATE INDEX IX_events_date_status ON app.events(date_iso DESC, status);
END;
GO

IF OBJECT_ID('app.event_registrations', 'U') IS NULL
BEGIN
  CREATE TABLE app.event_registrations (
    event_id NVARCHAR(80) NOT NULL,
    student_id NVARCHAR(80) NOT NULL,
    registered_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (event_id, student_id),
    CONSTRAINT FK_event_registrations_event
      FOREIGN KEY (event_id) REFERENCES app.events(id) ON DELETE CASCADE,
    CONSTRAINT FK_event_registrations_student
      FOREIGN KEY (student_id) REFERENCES app.students(id) ON DELETE CASCADE
  );
END;
GO

IF OBJECT_ID('app.event_comments', 'U') IS NULL
BEGIN
  CREATE TABLE app.event_comments (
    id NVARCHAR(80) NOT NULL PRIMARY KEY,
    event_id NVARCHAR(80) NOT NULL,
    author_role NVARCHAR(20) NOT NULL CHECK (author_role IN ('student', 'warden')),
    comment_text NVARCHAR(MAX) NOT NULL,
    date_iso DATETIME2 NOT NULL,
    CONSTRAINT FK_event_comments_event
      FOREIGN KEY (event_id) REFERENCES app.events(id) ON DELETE CASCADE
  );

  CREATE INDEX IX_event_comments_event_date ON app.event_comments(event_id, date_iso DESC);
END;
GO

IF OBJECT_ID('app.attendance_sessions', 'U') IS NULL
BEGIN
  CREATE TABLE app.attendance_sessions (
    id NVARCHAR(80) NOT NULL PRIMARY KEY,
    token NVARCHAR(120) NOT NULL UNIQUE,
    date_key DATE NOT NULL,
    created_at DATETIME2 NOT NULL,
    expires_at DATETIME2 NOT NULL,
    locked BIT NOT NULL DEFAULT 0
  );

  CREATE INDEX IX_attendance_sessions_date_locked ON app.attendance_sessions(date_key, locked);
END;
GO

IF OBJECT_ID('app.attendance_records', 'U') IS NULL
BEGIN
  CREATE TABLE app.attendance_records (
    student_id NVARCHAR(80) NOT NULL,
    date_key DATE NOT NULL,
    marked_at DATETIME2 NOT NULL,
    status NVARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent')),
    latitude FLOAT NULL,
    longitude FLOAT NULL,
    PRIMARY KEY (student_id, date_key),
    CONSTRAINT FK_attendance_records_student
      FOREIGN KEY (student_id) REFERENCES app.students(id) ON DELETE CASCADE
  );

  CREATE INDEX IX_attendance_records_date_status ON app.attendance_records(date_key, status);
END;
GO

IF OBJECT_ID('app.hostel_settings', 'U') IS NULL
BEGIN
  CREATE TABLE app.hostel_settings (
    id INT NOT NULL PRIMARY KEY CHECK (id = 1),
    center_lat FLOAT NOT NULL,
    center_lng FLOAT NOT NULL,
    radius_m INT NOT NULL CHECK (radius_m > 0),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO
