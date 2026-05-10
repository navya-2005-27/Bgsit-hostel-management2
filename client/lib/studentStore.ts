import { loginUserAccount, upsertStudentAccount } from "@/lib/authApi";
import {
  createAccessRequestApi,
  listAccessRequestsApi,
  updateAccessRequestApi,
} from "@/lib/accessRequestApi";
import { upsertAttendanceSqlApi } from "@/lib/attendanceSqlApi";
import { generateStudentOtp, verifyStudentOtp } from "@/lib/authApi";
import type { CreateStudentApiBody } from "@shared/api";
import type { AccessRequestApiItem } from "@shared/api";

export type StudentId = string;

export type StudentDetails = {
  name: string;
  usn?: string;
  roomNumber?: string;
  year?: string;
  joiningYear?: number | null;
  fatherName: string;
  motherName: string;
  fatherContact: string;
  motherContact: string;
  studentContact: string;
  address: string;
  email: string;
  totalAmount: number | null;
  joiningDate: string; // ISO date
  profilePhotoDataUrl?: string; // base64 preview
  documents?: { name: string; dataUrl: string }[];
  parentName?: string; // legacy field for older localStorage records
  parentContact?: string; // legacy field for older localStorage records
};

export type StudentCredentials = {
  username: string;
  password: string; // kept only in warden space
};

export type StudentRecord = {
  id: StudentId;
  student_id: StudentId;
  details: StudentDetails;
  credentials?: StudentCredentials; // optional until created
};

export type AccessStatus = "pending" | "approved" | "rejected";
export type AccessRequest = {
  id: string;
  name: string;
  usn: string;
  phone: string;
  status: AccessStatus;
  requestedAt: number;
  approvedAt?: number;
  rejectedAt?: number;
};

const STORAGE_KEY = "campusstay.students.v1";
const ACCESS_REQUESTS_KEY = "campusstay.access.requests.v1";
const ACCESS_SESSION_KEY = "campusstay.access.currentUsn.v1";

function readAll(): StudentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<StudentRecord & { student_id?: StudentId }>;
    // Migrate legacy records that only had `id` so each student keeps a stable unique key.
    return parsed.map((student) => ({
      ...student,
      student_id: student.student_id ?? student.id,
    }));
  } catch {
    return [];
  }
}

function stripStudentForCache(student: StudentRecord): StudentRecord {
  return {
    ...student,
    details: {
      ...student.details,
      profilePhotoDataUrl: undefined,
      documents: [],
    },
  };
}

function writeAll(students: StudentRecord[]) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(students.map(stripStudentForCache)),
  );
}

function toStudentApiPayload(record: StudentRecord): CreateStudentApiBody {
  return {
    id: record.student_id,
    student_id: record.student_id,
    roll_number: record.details.usn || record.student_id,
    name: record.details.name,
    usn: record.details.usn,
    room_number: record.details.roomNumber,
    year: record.details.year,
    joining_year: record.details.joiningYear ?? undefined,
    father_name: record.details.fatherName,
    mother_name: record.details.motherName,
    father_contact: record.details.fatherContact,
    mother_contact: record.details.motherContact,
    student_contact: record.details.studentContact,
    address: record.details.address,
    email: record.details.email,
    total_amount: record.details.totalAmount ?? undefined,
    joining_date: record.details.joiningDate || undefined,
    profile_photo_data_url: record.details.profilePhotoDataUrl,
    documents: record.details.documents,
  };
}

export async function syncStudentRecordToSql(
  record: StudentRecord,
): Promise<void> {
  const payload = toStudentApiPayload(record);
  console.log("Syncing student to SQL with room_number:", payload.room_number);
  
  const response = await fetch("/api/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.error("SQL sync error response:", body);
    throw new Error(body?.message || `SQL sync failed (HTTP ${response.status})`);
  }
  
  console.log("Student synced successfully:", record.student_id, "room:", payload.room_number);
}

function mirrorStudentToSql(record: StudentRecord) {
  void syncStudentRecordToSql(record)
    .then(() => undefined)
    .catch(() => {
      console.warn(
        "Failed to reach SQL Server while mirroring student record",
        record.student_id,
      );
    });
}

export async function hydrateStudentsFromSql(): Promise<StudentRecord[]> {
  try {
    const response = await fetch("/api/students");
    if (!response.ok) {
      return listStudents();
    }

    const payload = (await response.json()) as
      | { ok?: boolean; data?: StudentApiItem[] }
      | StudentApiItem[];

    const rows = Array.isArray(payload) ? payload : payload.data || [];
    const existing = readAll();

    const byStudentId = new Map(existing.map((record) => [record.student_id, record]));
    const byUsn = new Map(
      existing
        .filter((record) => record.details.usn)
        .map((record) => [record.details.usn!.trim().toUpperCase(), record]),
    );

    const hydrated: StudentRecord[] = rows.map((row) => {
      const key = row.student_id || row.id;
      const usnKey = (row.usn || "").trim().toUpperCase();
      const prev = byStudentId.get(key) || byUsn.get(usnKey);

      return normalizeLegacyYear({
        id: key,
        student_id: key,
        credentials: prev?.credentials,
        details: {
          name: row.name || "",
          usn: row.usn || undefined,
          roomNumber: row.room_number || prev?.details.roomNumber,
          year: row.year || "",
          joiningYear: row.joining_year ?? null,
          fatherName: row.father_name || "",
          motherName: row.mother_name || "",
          fatherContact: row.father_contact || "",
          motherContact: row.mother_contact || "",
          studentContact: row.student_contact || "",
          address: row.address || "",
          email: row.email || "",
          totalAmount: row.total_amount ?? null,
          joiningDate: row.joining_date || "",
          profilePhotoDataUrl: row.profile_photo_data_url || prev?.details.profilePhotoDataUrl,
          documents: prev?.details.documents || [],
        },
      });
    });

    writeAll(hydrated);
    return hydrated;
  } catch {
    return [];
  }
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeUsn(usn: string) {
  return usn.trim().toUpperCase();
}

function normalizeYear(year?: string) {
  const value = year?.trim();
  return value || "";
}

function normalizeJoiningYear(joiningYear?: number | string | null) {
  if (joiningYear === null || joiningYear === undefined || joiningYear === "") {
    return null;
  }
  const parsed = typeof joiningYear === "number" ? joiningYear : Number(joiningYear);
  return Number.isFinite(parsed) ? parsed : null;
}

function deriveYearFromJoiningYear(joiningYear?: number | null): string {
  if (!joiningYear) return "";
  const digit = String(joiningYear).slice(-1);
  return digit === "1"
    ? "1st Year"
    : digit === "2"
      ? "2nd Year"
      : digit === "3"
        ? "3rd Year"
        : "4th Year";
}

function normalizeLegacyYear(student: StudentRecord): StudentRecord {
  const year = normalizeYear(student.details.year || deriveYearFromJoiningYear(student.details.joiningYear));
  const joiningYear = normalizeJoiningYear(
    student.details.joiningYear ||
      (student.details.joiningDate ? new Date(student.details.joiningDate).getFullYear() : null),
  );
  return {
    ...student,
    details: {
      ...student.details,
      year,
      joiningYear,
    },
  };
}

function readAccessRequests(): AccessRequest[] {
  try {
    const raw = localStorage.getItem(ACCESS_REQUESTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as AccessRequest[]) : [];
    return parsed.map(normalizeAccessRequest);
  } catch {
    return [];
  }
}

function writeAccessRequests(reqs: AccessRequest[]) {
  localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(reqs));
}

function toMillis(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    const date = Date.parse(value);
    if (Number.isFinite(date)) return date;
  }
  return Date.now();
}

function normalizeAccessRequest(request: AccessRequest): AccessRequest {
  return {
    ...request,
    usn: normalizeUsn(request.usn),
    status: request.status,
    requestedAt: toMillis(request.requestedAt),
    approvedAt: request.approvedAt ? toMillis(request.approvedAt) : undefined,
    rejectedAt: request.rejectedAt ? toMillis(request.rejectedAt) : undefined,
  };
}

function fromAccessRequestApi(item: AccessRequestApiItem): AccessRequest {
  return normalizeAccessRequest({
    id: item.id,
    name: item.name,
    usn: item.usn,
    phone: item.phone,
    status: item.status,
    requestedAt: new Date(item.requestedAt).getTime(),
    approvedAt: item.approvedAt ? new Date(item.approvedAt).getTime() : undefined,
    rejectedAt: item.rejectedAt ? new Date(item.rejectedAt).getTime() : undefined,
  });
}

function replaceAccessRequestInCache(request: AccessRequest) {
  const all = readAccessRequests();
  const idx = all.findIndex((item) => item.id === request.id);
  if (idx >= 0) all[idx] = normalizeAccessRequest(request);
  else all.push(normalizeAccessRequest(request));
  writeAccessRequests(all);
}

export async function hydrateAccessRequestsFromSql() {
  try {
    const items = await listAccessRequestsApi();
    writeAccessRequests(items.map(fromAccessRequestApi));
  } catch {
    // Keep the local cache usable if SQL is unavailable.
  }
}

export function listStudents(): StudentRecord[] {
  return readAll().map(normalizeLegacyYear);
}

export function getStudent(id: StudentId): StudentRecord | undefined {
  const found = readAll().find((s) => s.student_id === id || s.id === id);
  return found ? normalizeLegacyYear(found) : undefined;
}

export function findStudentByUsername(
  username: string,
): StudentRecord | undefined {
  const u = username.trim().toLowerCase();
  return readAll().find(
    (s) =>
      s.credentials?.username.toLowerCase() === u ||
      s.details.usn?.trim().toLowerCase() === u,
  );
}

const SESSION_KEY = "campusstay.session.studentId.v1";
export async function authenticateStudent(
  username: string,
  password: string,
): Promise<StudentRecord | null> {
  const result = await loginUserAccount({ username, password, role: "student" });
  if (!result.ok) return null;

  const s = findStudentByUsername(username);
  if (!s) return null;
  localStorage.setItem(SESSION_KEY, s.id);
  return s;
}
export function getCurrentStudentId(): StudentId | null {
  return localStorage.getItem(SESSION_KEY) as StudentId | null;
}
export function logoutStudent() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentAccessUsn(): string | null {
  return localStorage.getItem(ACCESS_SESSION_KEY);
}

export function clearCurrentAccessUsn() {
  localStorage.removeItem(ACCESS_SESSION_KEY);
}

export function getLatestAccessRequestByUsn(usn: string): AccessRequest | null {
  const u = normalizeUsn(usn);
  const all = readAccessRequests()
    .filter((r) => r.usn === u)
    .sort((a, b) => b.requestedAt - a.requestedAt);
  return all[0] || null;
}

export function listPendingAccessRequests(): AccessRequest[] {
  return readAccessRequests()
    .filter((r) => r.status === "pending")
    .sort((a, b) => b.requestedAt - a.requestedAt);
}

export function listAccessRequests(): AccessRequest[] {
  return readAccessRequests().sort((a, b) => b.requestedAt - a.requestedAt);
}

export async function submitAccessRequest(input: {
  name: string;
  usn: string;
  phone: string;
}): Promise<AccessRequest> {
  const name = input.name.trim();
  const usn = normalizeUsn(input.usn);
  const phone = input.phone.trim();
  if (!name || !usn || !phone) {
    throw new Error("Name, USN and phone number are required");
  }

  const existing = getLatestAccessRequestByUsn(usn);
  if (existing && existing.status !== "approved") {
    throw new Error("This USN already has a pending or denied access request.");
  }

  const created = fromAccessRequestApi(
    await createAccessRequestApi({ name, usn, phone }),
  );
  replaceAccessRequestInCache(created);
  localStorage.setItem(ACCESS_SESSION_KEY, usn);
  return created;
}

export async function approveAccessRequest(id: string): Promise<AccessRequest> {
  const updated = fromAccessRequestApi(
    await updateAccessRequestApi(id, { status: "approved" }),
  );
  replaceAccessRequestInCache(updated);
  ensureStudentRecordForUsn(updated.usn, updated.name, updated.phone);
  return updated;
}

export async function rejectAccessRequest(id: string): Promise<AccessRequest> {
  const updated = fromAccessRequestApi(
    await updateAccessRequestApi(id, { status: "rejected" }),
  );
  replaceAccessRequestInCache(updated);
  return updated;
}

export function resetAccessToPending(usn: string) {
  const u = normalizeUsn(usn);
  const all = readAccessRequests();
  const approved = all
    .filter((r) => r.usn === u && r.status === "approved")
    .sort((a, b) => b.requestedAt - a.requestedAt)[0];
  if (approved) {
    all.push({
      id: uid(),
      name: approved.name,
      usn: approved.usn,
      phone: approved.phone,
      status: "pending",
      requestedAt: Date.now(),
    });
    writeAccessRequests(all);
  }
}

export function upsertStudent(record: StudentRecord): StudentRecord {
  const all = readAll();
  const idx = all.findIndex(
    (s) =>
      s.student_id === record.student_id ||
      s.id === record.id ||
      (record.details.usn && s.details.usn === record.details.usn),
  );
  const normalized: StudentRecord = {
    ...record,
    id: record.student_id,
    details: {
      ...record.details,
      year: normalizeYear(record.details.year),
      joiningYear: normalizeJoiningYear(record.details.joiningYear),
    },
  };
  if (idx >= 0) all[idx] = normalized;
  else all.push(normalized);
  writeAll(all);
  mirrorStudentToSql(normalized);
  return normalized;
}

export function createStudent(
  details: Partial<StudentDetails> & { name: string },
): StudentRecord {
  const studentId = uid();
  const joiningYear = normalizeJoiningYear(details.joiningYear);
  const year = normalizeYear(details.year || deriveYearFromJoiningYear(joiningYear));
  const record: StudentRecord = {
    id: studentId,
    student_id: studentId,
    details: {
      name: details.name,
      usn: details.usn,
      roomNumber: details.roomNumber,
      year,
      joiningYear,
      fatherName: details.fatherName ?? details.parentName ?? "",
      motherName: details.motherName ?? "",
      fatherContact: details.fatherContact ?? details.parentContact ?? "",
      motherContact: details.motherContact ?? "",
      studentContact: details.studentContact ?? "",
      address: details.address ?? "",
      email: details.email ?? "",
      totalAmount: details.totalAmount ?? null,
      joiningDate: details.joiningDate ?? "",
      profilePhotoDataUrl: details.profilePhotoDataUrl,
      documents: details.documents ?? [],
    },
  };
  return upsertStudent(record);
}

export async function setCredentials(id: StudentId, creds: StudentCredentials) {
  const all = readAll();
  const idx = all.findIndex((s) => s.student_id === id || s.id === id);
  if (idx === -1) throw new Error("Student not found");
  all[idx] = { ...all[idx], credentials: creds };
  writeAll(all);
  if (creds.username.trim() && creds.password) {
    await upsertStudentAccount({
      studentId: all[idx].student_id,
      username: creds.username,
      password: creds.password,
    });
  }
}

export function ensureStudentRecordForUsn(
  usn: string,
  fallbackName: string,
  fallbackPhone = "",
): StudentRecord {
  const normalizedUsn = normalizeUsn(usn);
  const existing = findStudentByUsername(normalizedUsn);
  if (existing) {
    updateDetails(existing.id, {
      name: existing.details.name || fallbackName,
      usn: normalizedUsn,
      studentContact: existing.details.studentContact || fallbackPhone,
    });
    return getStudent(existing.id)!;
  }

  const created = createStudent({
    name: fallbackName,
    usn: normalizedUsn,
    studentContact: fallbackPhone,
  });
  return getStudent(created.id)!;
}

export function saveStudentDetailsByUsn(
  usn: string,
  patch: Partial<StudentDetails> & { name: string },
): StudentRecord {
  const normalizedUsn = normalizeUsn(usn);
  const record = ensureStudentRecordForUsn(
    normalizedUsn,
    patch.name,
    patch.studentContact,
  );
  updateDetails(record.id, {
    ...patch,
    usn: normalizedUsn,
    year: normalizeYear(patch.year),
    joiningYear: normalizeJoiningYear(patch.joiningYear),
  });
  return getStudent(record.id)!;
}

export function getStudentByUsn(usn: string): StudentRecord | undefined {
  const found = findStudentByUsername(normalizeUsn(usn));
  return found ? normalizeLegacyYear(found) : undefined;
}

export async function resetPassword(id: StudentId, newPassword: string) {
  const all = readAll();
  const idx = all.findIndex((s) => s.student_id === id || s.id === id);
  if (idx === -1) throw new Error("Student not found");
  const current = all[idx];
  all[idx] = {
    ...current,
    credentials: current.credentials
      ? { ...current.credentials, password: newPassword }
      : undefined,
  };
  writeAll(all);
  if (all[idx].credentials?.username && newPassword) {
    await upsertStudentAccount({
      studentId: all[idx].student_id,
      username: all[idx].credentials.username,
      password: newPassword,
    });
  }
}

export type StudentPublicView = {
  id: StudentId;
  details: StudentDetails;
  username?: string; // optional for convenience, but no password
};

export function getStudentPublic(id: StudentId): StudentPublicView | undefined {
  const s = getStudent(id);
  if (!s) return undefined;
  return { id: s.id, details: s.details, username: s.credentials?.username };
}

export function updateDetails(id: StudentId, patch: Partial<StudentDetails>) {
  const all = readAll();
  const idx = all.findIndex((s) => s.student_id === id || s.id === id);
  if (idx === -1) throw new Error("Student not found");
  all[idx] = {
    ...all[idx],
    details: {
      ...all[idx].details,
      ...patch,
      year: normalizeYear(patch.year ?? all[idx].details.year),
      joiningYear: normalizeJoiningYear(patch.joiningYear ?? all[idx].details.joiningYear),
    },
  };
  writeAll(all);
  mirrorStudentToSql(all[idx]);
  const current = getCurrentStudentId();
  if (current === id) {
    // keep session id intact
    localStorage.setItem(SESSION_KEY, id);
  }
}

export function importFilesToDataUrls(
  files: FileList | File[],
): Promise<{ name: string; dataUrl: string }[]> {
  const arr = Array.from(files);
  return Promise.all(
    arr.map(
      (file) =>
        new Promise<{ name: string; dataUrl: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({ name: file.name, dataUrl: String(reader.result) });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
    ),
  );
}

export function suggestUsername(name: string): string {
  const clean = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
  const tail = Math.floor(1000 + Math.random() * 9000);
  return `${clean || "student"}.${tail}`;
}

export function generatePassword(length = 12): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

// -------------------- Attendance & Geofencing (frontend-only demo) --------------------
export type GeoPoint = { lat: number; lng: number };
export type HostelSettings = { center: GeoPoint; radiusM: number };

export type AttendanceSession = {
  id: string;
  token: string;
  dateKey: string; // YYYY-MM-DD
  createdAt: number;
  expiresAt: number;
  locked: boolean;
};

export type AttendanceRecord = {
  studentId: StudentId;
  dateKey: string;
  time: string; // ISO
  status: "present" | "absent";
  location?: GeoPoint;
};

const SESSIONS_KEY = "campusstay.attendance.sessions.v1";
const RECORDS_KEY = "campusstay.attendance.records.v1";
const SETTINGS_KEY = "campusstay.hostel.settings.v1";

export function dateKey(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10);
}

function readSessions(): AttendanceSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as AttendanceSession[]) : [];
  } catch {
    return [];
  }
}
function writeSessions(s: AttendanceSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(s));
}
function readRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    return raw ? (JSON.parse(raw) as AttendanceRecord[]) : [];
  } catch {
    return [];
  }
}
function writeRecords(r: AttendanceRecord[]) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(r));
}

async function syncAttendanceToSql(record: AttendanceRecord) {
  await upsertAttendanceSqlApi({
    studentId: record.studentId,
    dateKey: record.dateKey,
    status: record.status,
  });
}

export function getHostelSettings(): HostelSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as HostelSettings) : null;
  } catch {
    return null;
  }
}
export function setHostelSettings(settings: HostelSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function haversineMeters(a: GeoPoint, b: GeoPoint) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function withinFence(point: GeoPoint): boolean {
  const s = getHostelSettings();
  if (!s) return true; // if not configured, allow for demo
  return haversineMeters(point, s.center) <= s.radiusM;
}

export function createAttendanceSession({
  durationMs = 60 * 60 * 1000,
  forDate = dateKey(),
} = {}) {
  const now = Date.now();
  const session: AttendanceSession = {
    id: uid(),
    token: `QR-${uid()}`,
    dateKey: forDate,
    createdAt: now,
    expiresAt: now + durationMs,
    locked: false,
  };
  const sessions = readSessions();
  sessions.push(session);
  writeSessions(sessions);
  return session;
}

export function getActiveAttendanceSession(): AttendanceSession | null {
  const now = Date.now();
  const activeSessions = readSessions().filter((s) => now < s.expiresAt && !s.locked);
  // Return the most recently created session (highest createdAt timestamp)
  return activeSessions.length > 0
    ? activeSessions.reduce((latest, current) => 
        current.createdAt > latest.createdAt ? current : latest
      )
    : null;
}

export function lockAttendance(date: string) {
  const sessions = readSessions();
  for (const s of sessions) {
    if (s.dateKey === date) s.locked = true;
  }
  writeSessions(sessions);
}

export function listAttendanceForDate(date: string): AttendanceRecord[] {
  return readRecords().filter((r) => r.dateKey === date);
}

export function setManualPresence(
  date: string,
  studentId: StudentId,
  present: boolean,
) {
  const recs = readRecords();
  const idx = recs.findIndex(
    (r) => r.dateKey === date && r.studentId === studentId,
  );
  const base: AttendanceRecord = {
    studentId,
    dateKey: date,
    time: new Date().toISOString(),
    status: present ? "present" : "absent",
  };
  if (idx >= 0) recs[idx] = { ...recs[idx], ...base };
  else recs.push(base);
  writeRecords(recs);
  void syncAttendanceToSql(base).catch(() => {
    console.warn("Failed to mirror attendance to SQL Server", studentId, date);
  });
}

export function finalizeAttendance(date: string) {
  const allStudents = listStudents();
  const recs = readRecords();
  const presentSet = new Set(
    recs
      .filter((r) => r.dateKey === date && r.status === "present")
      .map((r) => r.studentId),
  );
  for (const s of allStudents) {
    if (!presentSet.has(s.id)) {
      const existingIdx = recs.findIndex(
        (r) => r.dateKey === date && r.studentId === s.id,
      );
      const base: AttendanceRecord = {
        studentId: s.id,
        dateKey: date,
        time: new Date().toISOString(),
        status: "absent",
      };
      if (existingIdx >= 0)
        recs[existingIdx] = { ...recs[existingIdx], ...base };
      else recs.push(base);
    }
  }
  writeRecords(recs);
  lockAttendance(date);
  for (const record of recs.filter((r) => r.dateKey === date)) {
    void syncAttendanceToSql(record).catch(() => {
      console.warn("Failed to mirror attendance to SQL Server", record.studentId, date);
    });
  }
}

export function markAttendanceWithToken(
  token: string,
  studentId: StudentId,
  point?: GeoPoint,
) {
  const session = getActiveAttendanceSession();
  if (!session || session.token !== token)
    throw new Error("Invalid or expired QR");
  if (Date.now() > session.expiresAt) throw new Error("QR expired");
  if (point && !withinFence(point)) throw new Error("Outside hostel geofence");

  const recs = readRecords();
  const idx = recs.findIndex(
    (r) => r.dateKey === session.dateKey && r.studentId === studentId,
  );
  const base: AttendanceRecord = {
    studentId,
    dateKey: session.dateKey,
    time: new Date().toISOString(),
    status: "present",
    location: point,
  };
  if (idx >= 0) recs[idx] = { ...recs[idx], ...base };
  else recs.push(base);
  writeRecords(recs);
  void syncAttendanceToSql(base).catch(() => {
    console.warn("Failed to mirror attendance to SQL Server", studentId, session.dateKey);
  });
  return base;
}

export function getAbsenteesForDate(date: string): StudentRecord[] {
  const recs = listAttendanceForDate(date);
  const presentSet = new Set(
    recs.filter((r) => r.status === "present").map((r) => r.studentId),
  );
  return listStudents().filter((s) => !presentSet.has(s.id));
}

export function formatWhatsAppLink(phone: string, message: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// -------------------- Payments (frontend-only demo) --------------------
export type PaymentMethod = "cash" | "upi" | "online";
export type Payment = {
  id: string;
  studentId: StudentId;
  amount: number;
  method: PaymentMethod;
  dateISO: string;
  note?: string;
};

const PAYMENTS_KEY = "campusstay.payments.v1";

function readPayments(): Payment[] {
  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    return raw ? (JSON.parse(raw) as Payment[]) : [];
  } catch {
    return [];
  }
}
function writePayments(p: Payment[]) {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(p));
}

export function listPaymentsByStudent(studentId: StudentId): Payment[] {
  return readPayments()
    .filter((p) => p.studentId === studentId)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

export function addPayment(
  studentId: StudentId,
  amount: number,
  method: PaymentMethod,
  date = new Date(),
  note?: string,
): Payment {
  const rec: Payment = {
    id: uid(),
    studentId,
    amount: Number(amount) || 0,
    method,
    dateISO: date.toISOString(),
    note,
  };
  const all = readPayments();
  all.push(rec);
  writePayments(all);
  return rec;
}

export function paymentTotals(studentId: StudentId): {
  rent: number;
  paid: number;
  due: number;
} {
  const s = getStudent(studentId);
  const rent = s?.details.totalAmount ?? 0;
  const paid = listPaymentsByStudent(studentId).reduce(
    (sum, r) => sum + r.amount,
    0,
  );
  const due = Math.max(0, (rent || 0) - paid);
  return { rent: rent || 0, paid, due };
}

export type PaymentStatus = "paid" | "pending" | "overdue";
export function computeStatus(
  t: { rent: number; paid: number; due: number },
  overdueDay = 10,
): PaymentStatus {
  if (t.due <= 0) return "paid";
  const today = new Date();
  return today.getDate() > overdueDay ? "overdue" : "pending";
}

export function paymentSummaryAll(): {
  id: StudentId;
  name: string;
  rent: number;
  paid: number;
  due: number;
  status: PaymentStatus;
}[] {
  return listStudents().map((s) => {
    const t = paymentTotals(s.id);
    return {
      id: s.id,
      name: s.details.name,
      rent: t.rent,
      paid: t.paid,
      due: t.due,
      status: computeStatus(t),
    };
  });
}

export function exportPaymentsCSV(): string {
  const rows = ["Name,Total Rent,Total Paid,Total Due,Status"];
  for (const row of paymentSummaryAll()) {
    rows.push(`"${row.name}",${row.rent},${row.paid},${row.due},${row.status}`);
  }
  return rows.join("\n");
}

// -------------------- Complaints (frontend-only demo) --------------------
export const COMPLAINT_CATEGORIES = [
  "Food",
  "Room",
  "Cleanliness",
  "Electricity",
  "Water",
  "Other",
] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];
export type ComplaintStatus = "pending" | "done";
export type Complaint = {
  id: string;
  text: string;
  category: ComplaintCategory;
  submittedAt: string; // ISO
  upvotes: number;
  status: ComplaintStatus;
  doneAt?: string; // ISO
};

const COMPLAINTS_KEY = "campusstay.complaints.v1";
const COMPLAINT_UPVOTED_IDS_KEY = "campusstay.complaints.upvoted.ids.v1"; // device-level safeguard

function readComplaints(): Complaint[] {
  try {
    const raw = localStorage.getItem(COMPLAINTS_KEY);
    return raw ? (JSON.parse(raw) as Complaint[]) : [];
  } catch {
    return [];
  }
}
function writeComplaints(c: Complaint[]) {
  localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(c));
}

function readUpvotedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(COMPLAINT_UPVOTED_IDS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function writeUpvotedIds(set: Set<string>) {
  localStorage.setItem(
    COMPLAINT_UPVOTED_IDS_KEY,
    JSON.stringify(Array.from(set)),
  );
}

export function createComplaint(
  text: string,
  category: ComplaintCategory,
): Complaint {
  const c: Complaint = {
    id: uid(),
    text: text.trim(),
    category,
    submittedAt: new Date().toISOString(),
    upvotes: 0,
    status: "pending",
  };
  const all = readComplaints();
  all.push(c);
  writeComplaints(all);
  return c;
}

export function listComplaints(): Complaint[] {
  const all = readComplaints();
  // sort by upvotes desc, then newest
  return all.sort(
    (a, b) =>
      b.upvotes - a.upvotes || b.submittedAt.localeCompare(a.submittedAt),
  );
}
export function listActiveComplaints(): Complaint[] {
  return listComplaints().filter((c) => c.status === "pending");
}

export function hasUpvotedComplaint(id: string): boolean {
  return readUpvotedIds().has(id);
}

export function upvoteComplaint(id: string) {
  const ids = readUpvotedIds();
  if (ids.has(id)) return; // already upvoted on this device
  const all = readComplaints();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], upvotes: all[idx].upvotes + 1 };
  writeComplaints(all);
  ids.add(id);
  writeUpvotedIds(ids);
}

export function setComplaintStatus(id: string, status: ComplaintStatus) {
  const all = readComplaints();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return;
  const doneAt = status === "done" ? new Date().toISOString() : undefined;
  all[idx] = { ...all[idx], status, doneAt };
  writeComplaints(all);
}

export function complaintDaysTaken(c: Complaint): number {
  if (!c.doneAt) return 0;
  const start = new Date(c.submittedAt).getTime();
  const end = new Date(c.doneAt).getTime();
  return Math.max(0, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
}

// -------------------- Mess Polling (frontend-only demo) --------------------
export const WEEK_DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];
export const MEALS3 = ["Breakfast", "Lunch", "Dinner"] as const;
export type Meal3 = (typeof MEALS3)[number];
export const MEAL_SLOTS = [
  "Milk",
  "Breakfast",
  "Lunch",
  "Snacks",
  "Dinner",
] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export type WeeklyPoll = {
  id: string;
  weekKey: string; // Monday date key
  open: boolean;
  options: Record<WeekDay, Record<Meal3, string[]>>;
  votes: Record<
    StudentId,
    Partial<Record<WeekDay, Partial<Record<Meal3, string>>>>
  >;
};
export type WeeklyMenu = Record<WeekDay, Record<Meal3, string>>;

export type DailyMealPoll = {
  id: string;
  dateKey: string;
  meal: MealSlot;
  menuText?: string;
  cutoffAt: number;
  open: boolean;
  responses: Record<StudentId, "eating" | "not">;
};

const WEEKLY_POLLS_KEY = "campusstay.mess.weekly.polls.v1";
const WEEKLY_MENUS_KEY = "campusstay.mess.weekly.menus.v1"; // { [weekKey]: WeeklyMenu }
const DAILY_MEAL_POLLS_KEY = "campusstay.mess.daily.polls.v1";

function readWeeklyPolls(): WeeklyPoll[] {
  try {
    const raw = localStorage.getItem(WEEKLY_POLLS_KEY);
    return raw ? (JSON.parse(raw) as WeeklyPoll[]) : [];
  } catch {
    return [];
  }
}
function writeWeeklyPolls(p: WeeklyPoll[]) {
  localStorage.setItem(WEEKLY_POLLS_KEY, JSON.stringify(p));
}
function readWeeklyMenus(): Record<string, WeeklyMenu> {
  try {
    const raw = localStorage.getItem(WEEKLY_MENUS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, WeeklyMenu>) : {};
  } catch {
    return {};
  }
}
function writeWeeklyMenus(m: Record<string, WeeklyMenu>) {
  localStorage.setItem(WEEKLY_MENUS_KEY, JSON.stringify(m));
}
function readDailyMealPolls(): DailyMealPoll[] {
  try {
    const raw = localStorage.getItem(DAILY_MEAL_POLLS_KEY);
    return raw ? (JSON.parse(raw) as DailyMealPoll[]) : [];
  } catch {
    return [];
  }
}
function writeDailyMealPolls(p: DailyMealPoll[]) {
  localStorage.setItem(DAILY_MEAL_POLLS_KEY, JSON.stringify(p));
}

export function weekStartKey(d = new Date()) {
  const day = d.getDay(); // 0 Sun -> 6 Sat
  const delta = (day + 6) % 7; // to Monday
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - delta);
  return dateKey(monday);
}

export function createWeeklyPoll(
  optionsForAllMeals: string[] = ["Idli", "Upma", "Poha", "Dosa", "Paratha"],
) {
  const week = weekStartKey();
  const base: Record<Meal3, string[]> = {
    Breakfast: optionsForAllMeals,
    Lunch: optionsForAllMeals,
    Dinner: optionsForAllMeals,
  };
  const options: WeeklyPoll["options"] = Object.fromEntries(
    WEEK_DAYS.map((d) => [d, { ...base }]),
  ) as any;
  const poll: WeeklyPoll = {
    id: uid(),
    weekKey: week,
    open: true,
    options,
    votes: {},
  };
  const polls = readWeeklyPolls();
  polls.push(poll);
  writeWeeklyPolls(polls);
  return poll;
}

export function getActiveWeeklyPoll(): WeeklyPoll | null {
  const wk = weekStartKey();
  const polls = readWeeklyPolls();
  return polls.find((p) => p.weekKey === wk && p.open) || null;
}

export function voteWeekly(
  day: WeekDay,
  meal: Meal3,
  option: string,
  studentId: StudentId,
) {
  const poll = getActiveWeeklyPoll();
  if (!poll) throw new Error("No active weekly poll");
  if (!poll.options[day][meal].includes(option))
    throw new Error("Invalid option");
  poll.votes[studentId] = poll.votes[studentId] || {};
  poll.votes[studentId]![day] = poll.votes[studentId]![day] || {};
  (poll.votes[studentId]![day] as any)[meal] = option;
  const polls = readWeeklyPolls();
  const idx = polls.findIndex((p) => p.id === poll.id);
  polls[idx] = poll;
  writeWeeklyPolls(polls);
}

export function closeWeeklyPoll() {
  const poll = getActiveWeeklyPoll();
  if (!poll) return null;
  const menu: WeeklyMenu = Object.fromEntries(
    WEEK_DAYS.map((d) => [
      d,
      Object.fromEntries(
        MEALS3.map((m) => {
          const counts: Record<string, number> = {};
          Object.values(poll.votes).forEach((perStudent) => {
            const choice = (perStudent[d] || ({} as any))[m];
            if (choice) counts[choice] = (counts[choice] || 0) + 1;
          });
          let best = poll.options[d][m][0];
          let bestCount = -1;
          for (const opt of poll.options[d][m]) {
            const c = counts[opt] || 0;
            if (c > bestCount) {
              best = opt;
              bestCount = c;
            }
          }
          return [m, best];
        }),
      ) as Record<Meal3, string>,
    ]),
  ) as any;

  poll.open = false;
  const polls = readWeeklyPolls();
  polls[polls.findIndex((p) => p.id === poll.id)] = poll;
  writeWeeklyPolls(polls);
  const menus = readWeeklyMenus();
  menus[poll.weekKey] = menu;
  writeWeeklyMenus(menus);
  return { poll, menu };
}

export function getWeeklyResults() {
  const poll = getActiveWeeklyPoll();
  const target = poll || readWeeklyPolls().slice(-1)[0];
  if (!target) return null;
  const totals = Object.keys(target.votes).length || 0;
  const result: Record<
    WeekDay,
    Record<Meal3, { option: string; percent: number }[]>
  > = {} as any;
  for (const d of WEEK_DAYS) {
    result[d] = {} as any;
    for (const m of MEALS3) {
      const counts: Record<string, number> = {};
      Object.values(target.votes).forEach((s) => {
        const choice = (s[d] || ({} as any))[m];
        if (choice) counts[choice] = (counts[choice] || 0) + 1;
      });
      result[d][m] = target.options[d][m].map((opt) => ({
        option: opt,
        percent: totals ? Math.round(((counts[opt] || 0) / totals) * 100) : 0,
      }));
    }
  }
  return { poll: target, result, totals };
}

export function getMenuForWeek(weekKey = weekStartKey()): WeeklyMenu | null {
  const menus = readWeeklyMenus();
  return menus[weekKey] || null;
}

// Daily meal attendance polls
export function createDailyMealPoll(
  meal: MealSlot,
  { cutoffMinutes = 60, menuText = "" } = {},
) {
  const dKey = dateKey();
  const p: DailyMealPoll = {
    id: uid(),
    dateKey: dKey,
    meal,
    menuText,
    cutoffAt: Date.now() + cutoffMinutes * 60 * 1000,
    open: true,
    responses: {},
  };
  const polls = readDailyMealPolls();
  polls.push(p);
  writeDailyMealPolls(polls);
  return p;
}

export function getActiveDailyMealPolls(forDate = dateKey()): DailyMealPoll[] {
  const now = Date.now();
  return readDailyMealPolls().filter(
    (p) => p.dateKey === forDate && p.open && now < p.cutoffAt,
  );
}

export function respondDailyMeal(
  studentId: StudentId,
  pollId: string,
  value: "eating" | "not",
) {
  const polls = readDailyMealPolls();
  const idx = polls.findIndex((p) => p.id === pollId);
  if (idx === -1) throw new Error("Poll not found");
  const p = polls[idx];
  if (!p.open || Date.now() > p.cutoffAt) throw new Error("Poll closed");
  p.responses[studentId] = value;
  polls[idx] = p;
  writeDailyMealPolls(polls);
}

export function closeDailyMealPoll(pollId: string) {
  const polls = readDailyMealPolls();
  const idx = polls.findIndex((p) => p.id === pollId);
  if (idx === -1) return;
  polls[idx].open = false;
  writeDailyMealPolls(polls);
}

export function listDailyPollsForDate(dKey = dateKey()) {
  return readDailyMealPolls().filter((p) => p.dateKey === dKey);
}

export function skippedMealsCount(
  studentId: StudentId,
  monthKey = new Date().toISOString().slice(0, 7),
) {
  const polls = readDailyMealPolls().filter((p) =>
    p.dateKey.startsWith(monthKey),
  );
  let count = 0;
  for (const p of polls) {
    if (p.responses[studentId] === "not") count++;
  }
  return count;
}

// -------------------- Student OTP Login & Session --------------------
const STUDENT_SESSION_KEY = "campusstay.student.session.v1";
const STUDENT_OTP_REQUEST_KEY = "campusstay.student.otp.request.v1";
const STUDENT_OTP_DEBUG_KEY = "campusstay.student.otp.debug.v1";

export type StudentLoginSession = {
  studentId: string;
  usn: string;
  token: string;
  loginTime: number;
};

export async function requestStudentOtp(usn: string): Promise<string | undefined> {
  const normalized = usn.trim().toUpperCase();
  try {
    const response = await generateStudentOtp({ usn: normalized });
    const messageOtpMatch = response.message?.match(/\b(\d{6})\b/);
    const debugOtp = response.debugOtp || messageOtpMatch?.[1] || undefined;
    localStorage.setItem(STUDENT_OTP_REQUEST_KEY, JSON.stringify({ usn: normalized, requestedAt: Date.now() }));
    if (debugOtp) {
      localStorage.setItem(
        STUDENT_OTP_DEBUG_KEY,
        JSON.stringify({ usn: normalized, otp: debugOtp, requestedAt: Date.now() }),
      );
    } else {
      localStorage.removeItem(STUDENT_OTP_DEBUG_KEY);
    }
    return debugOtp;
  } catch (error) {
    throw error;
  }
}

export async function verifyAndLoginStudent(usn: string, otp: string): Promise<StudentLoginSession> {
  const normalized = usn.trim().toUpperCase();
  try {
    const result = await verifyStudentOtp({ usn: normalized, otp });
    const session: StudentLoginSession = {
      studentId: result.studentId,
      usn: normalized,
      token: result.token,
      loginTime: Date.now(),
    };
    localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(STUDENT_OTP_REQUEST_KEY);
    return session;
  } catch (error) {
    throw error;
  }
}

export function getCurrentStudentSession(): StudentLoginSession | null {
  try {
    const raw = localStorage.getItem(STUDENT_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StudentLoginSession;
  } catch {
    return null;
  }
}

export function logoutStudentSession(): void {
  localStorage.removeItem(STUDENT_SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ACCESS_SESSION_KEY);
}

export function getLastRequestedStudentOtpDebug(): string | null {
  try {
    const raw = localStorage.getItem(STUDENT_OTP_DEBUG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { otp?: string };
    return parsed.otp || null;
  } catch {
    return null;
  }
}

export async function requestRemoveStudentAccount(studentId: string): Promise<void> {
  // Reset access to pending so warden can review removal request
  const existing = getStudent(studentId);
  if (!existing) return;

  const usn = existing.details.usn;
  if (!usn) return;

  resetAccessToPending(usn);
  logoutStudentSession();
}
