/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export interface StudentApiItem {
  id: string;
  student_id: string;
  roll_number?: string | null;
  name: string;
  usn?: string | null;
  room_number?: string | null;
  year?: string | null;
  joining_year?: number | null;
  father_name?: string | null;
  mother_name?: string | null;
  father_contact?: string | null;
  mother_contact?: string | null;
  student_contact?: string | null;
  address?: string | null;
  email?: string | null;
  total_amount?: number | null;
  joining_date?: string | null;
  profile_photo_data_url?: string | null;
  created_at?: string;
}

export interface CreateStudentApiBody {
  id: string;
  student_id: string;
  roll_number?: string;
  name: string;
  usn?: string;
  room_number?: string;
  year?: string;
  joining_year?: number;
  father_name?: string;
  mother_name?: string;
  father_contact?: string;
  mother_contact?: string;
  student_contact?: string;
  address?: string;
  email?: string;
  total_amount?: number;
  joining_date?: string;
  profile_photo_data_url?: string;
  documents?: StudentDocumentApiBody[];
}

export interface StudentDocumentApiBody {
  name: string;
  dataUrl: string;
}

export interface ResidentApiItem {
  id: number;
  name: string;
  roomNumber: string;
  status: string;
}

export interface CreateResidentApiBody {
  name: string;
  roomNumber: string;
  phoneNumber: string;
  email: string;
}

export interface RoomApiItem {
  id: string;
  name: string;
  capacity: number;
  status: string;
}

export interface CreateRoomApiBody {
  name: string;
  capacity: number;
}

export interface ParcelApiItem {
  id: string;
  studentId: string;
  parcelCode: string;
  carrier?: string | null;
  collected: boolean;
  status: string;
  receivedAt: string;
}

export interface CreateParcelApiBody {
  id: string;
  studentId: string;
  parcelCode: string;
  carrier?: string;
}

export interface NotificationApiItem {
  id: string;
  title: string;
  description: string;
  imageDataUrl?: string | null;
  dateISO: string;
  status: string;
}

export interface CreateNotificationApiBody {
  title: string;
  description: string;
  imageDataUrl?: string;
  dateISO?: string;
}

export interface EventSqlApiItem {
  id: string;
  name: string;
  venue: string;
  status: string;
  dateISO: string;
}

export interface CreateEventSqlApiBody {
  id: string;
  name: string;
  description: string;
  organizerRole: "student" | "warden";
  eventType: string;
  dateISO: string;
  venue: string;
}

export interface AttendanceSqlApiItem {
  studentId: string;
  dateKey: string;
  status: "present" | "absent";
  markedAt: string;
}

export interface UpsertAttendanceSqlApiBody {
  studentId: string;
  dateKey: string;
  status: "present" | "absent";
}

export type UserAccountRole = "admin" | "warden" | "student";

export interface AuthLoginApiBody {
  username: string;
  password: string;
  role: UserAccountRole;
}

export interface AuthLoginApiResponse {
  ok: true;
  id: string;
  role: UserAccountRole;
  username: string;
  studentId?: string | null;
  source: "sql" | "legacy";
}

export interface UpdateWardenAccountApiBody {
  username: string;
  password: string;
}

export interface UpdateWardenAccountApiResponse {
  ok: true;
  id: string;
  role: "warden";
  username: string;
}

export interface UpsertStudentAccountApiBody {
  studentId: string;
  username: string;
  password: string;
}

export interface UpsertStudentAccountApiResponse {
  ok: true;
  id: string;
  role: "student";
  username: string;
  studentId: string;
}

export type AccessRequestStatus = "pending" | "approved" | "rejected";

export interface AccessRequestApiItem {
  id: string;
  name: string;
  usn: string;
  phone: string;
  status: AccessRequestStatus;
  requestedAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export interface CreateAccessRequestApiBody {
  name: string;
  usn: string;
  phone: string;
}

export interface UpdateAccessRequestApiBody {
  status: "approved" | "rejected";
}

export interface GenerateStudentOtpApiBody {
  usn: string;
}

export interface GenerateStudentOtpApiResponse {
  ok: true;
  message: string;
  debugOtp?: string;
}

export interface VerifyStudentOtpApiBody {
  usn: string;
  otp: string;
}

export interface VerifyStudentOtpApiResponse {
  ok: true;
  studentId: string;
  token: string;
  message: string;
}

export interface RemoveStudentAccountApiBody {
  studentId: string;
}

export interface RemoveStudentAccountApiResponse {
  ok: true;
  message: string;
}
