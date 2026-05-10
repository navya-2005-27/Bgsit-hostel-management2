# Student Authentication & Dashboard Flow

## Overview
This document describes the complete student authentication flow for the hostel management system.

## Flow Stages

### 1. **Request for Access** (No Access Request)
- Student clicks "Login as Student" from home page
- Sees form requesting: Name, USN, Phone Number
- Submits request to warden for approval
- **Device Memory**: USN stored in localStorage on same device

### 2. **Access Pending** (Request Exists, Status = Pending)
- Student sees "Access Pending" screen
- Shows request details
- Can refresh to check status
- Cannot proceed until warden approves
- **Device Memory**: Persists on same device

### 3. **OTP Login** (Request Approved, Not Logged In)
- Shows USN input field → Click "Get OTP"
- OTP generated and displayed (in console + sent to phone in production)
- Enter OTP → Click "Verify & Login"
- Session created and stored in localStorage
- **Device Memory**: Session persists on same device

### 4. **Dashboard** (Logged In)
- Shows student tabs:
  - **Profile**: View/edit personal details, documents, photo
  - **Attendance**: Mark attendance with QR code
  - **Notifications**: View hostel announcements
  - **Settings**: Logout, Remove Account

## Key Features

### Persistent Session (Same Device)
```javascript
// Session stored in localStorage
const session = {
  studentId: "...",
  usn: "22CSE123",
  token: "...",
  loginTime: Date.now()
}
```

### OTP Verification
- 6-digit OTP generated server-side
- Expires after 10 minutes
- Can request new OTP anytime
- Debug mode shows OTP in console + notification toast

### Remove Account
- Requests warden approval
- Resets access request to pending
- Logs out student
- Student must request access again if they change mind

### Logout
- Clears session from localStorage
- Returns to login flow
- Preserves access approval (can login again via OTP)

## API Endpoints

### Generate OTP
```
POST /api/auth/student/otp/generate
Body: { usn: "22CSE123" }
Response: { ok: true, message: "OTP sent..." }
```

### Verify OTP
```
POST /api/auth/student/otp/verify
Body: { usn: "22CSE123", otp: "123456" }
Response: { ok: true, studentId: "...", token: "..." }
```

## Storage Keys (localStorage)

- `campusstay.access.currentUsn.v1` - Current USN with access request
- `campusstay.student.session.v1` - Active login session
- `campusstay.student.otp.request.v1` - OTP request tracking
- `campusstay.students.v1` - Student records (synced with SQL)
- `campusstay.access.requests.v1` - Access requests (synced with SQL)

## Mobile/Other Screens Behavior

The student section on other screens (mobile, tablet) mirrors the warden/admin behavior:
- Full-featured dashboard on all screen sizes
- Responsive design with mobile-optimized tabs
- Icons appear on small screens when text is hidden

## Warden Admin Features

Wardens can:
- View pending access requests
- Approve/Reject requests (this creates student account)
- View student list with details
- Manage attendance sessions
- Send notifications

## Notes

- Access approval automatically creates a student account
- OTP is generated on-demand when student logs in after approval
- Session is device-specific (localStorage-based)
- Production: Replace console log with SMS/Email OTP delivery
- Production: Replace in-memory OTP store with Redis/DB
