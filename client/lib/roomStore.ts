import type { StudentId } from "./studentStore";

export type RoomId = string;
export type RequestId = string;

export type Room = {
  id: RoomId;
  name: string;
  capacity: number; // 2–3 typical
  occupants: StudentId[]; // studentIds
};

export type RequestStatus = "pending" | "approved" | "rejected";
export type RequestType = "leave" | "change";

export type RoomRequest = {
  id: RequestId;
  type: RequestType;
  studentId: StudentId;
  targetRoomId?: RoomId; // for change
  status: RequestStatus;
  createdAt: number;
  resolvedAt?: number;
  note?: string;
};

const ROOMS_KEY = "campusstay.rooms.v1";
const REQUESTS_KEY = "campusstay.rooms.requests.v1";

function readRooms(): Room[] {
  try {
    const raw = localStorage.getItem(ROOMS_KEY);
    return raw ? (JSON.parse(raw) as Room[]) : [];
  } catch {
    return [];
  }
}
function writeRooms(r: Room[]) {
  localStorage.setItem(ROOMS_KEY, JSON.stringify(r));
}
function readRequests(): RoomRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    return raw ? (JSON.parse(raw) as RoomRequest[]) : [];
  } catch {
    return [];
  }
}
function writeRequests(reqs: RoomRequest[]) {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(reqs));
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listRooms(): Room[] {
  return readRooms().sort((a, b) => a.name.localeCompare(b.name));
}

export function createRoom(name: string, capacity = 2): Room {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Room name is required");
  const all = readRooms();
  const exists = all.some((r) => r.name.trim().toLowerCase() === trimmed.toLowerCase());
  if (exists) throw new Error("Room already exists!");
  const room: Room = {
    id: uid(),
    name: trimmed,
    capacity: Math.max(1, capacity),
    occupants: [],
  };
  all.push(room);
  writeRooms(all);
  return room;
}

export function deleteRoom(id: RoomId) {
  const all = readRooms().filter((r) => r.id !== id);
  writeRooms(all);
}

export function setRoomCapacity(id: RoomId, capacity: number) {
  const all = readRooms();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Room not found");
  all[idx].capacity = Math.max(1, Math.floor(capacity));
  // If shrinking, keep earliest occupants up to capacity
  if (all[idx].occupants.length > all[idx].capacity) {
    all[idx].occupants = all[idx].occupants.slice(0, all[idx].capacity);
  }
  writeRooms(all);
}

export function availableSeats(roomId: RoomId): number {
  const r = readRooms().find((x) => x.id === roomId);
  if (!r) return 0;
  return Math.max(0, r.capacity - r.occupants.length);
}

export function findStudentRoom(studentId: StudentId): Room | null {
  for (const r of readRooms()) {
    if (r.occupants.includes(studentId)) return r;
  }
  return null;
}

export function resetAllBookings() {
  const all = readRooms();
  for (const r of all) r.occupants = [];
  writeRooms(all);
}

export function bookRoom(
  studentId: StudentId,
  roomId: RoomId,
): { room: Room; roommates: StudentId[] } {
  const all = readRooms();
  const current = findStudentRoom(studentId);
  if (current) throw new Error("Student already has a room");
  const idx = all.findIndex((r) => r.id === roomId);
  if (idx === -1) throw new Error("Room not found");
  const r = all[idx];
  if (r.occupants.length >= r.capacity) throw new Error("Room is full");
  r.occupants.push(studentId);
  all[idx] = r;
  writeRooms(all);
  return { room: r, roommates: r.occupants.filter((id) => id !== studentId) };
}

export function unbookStudent(studentId: StudentId) {
  const all = readRooms();
  for (const r of all) {
    const i = r.occupants.indexOf(studentId);
    if (i !== -1) {
      r.occupants.splice(i, 1);
      writeRooms(all);
      return;
    }
  }
}

export function moveStudent(studentId: StudentId, targetRoomId: RoomId) {
  const all = readRooms();
  const fromIdx = all.findIndex((r) => r.occupants.includes(studentId));
  const toIdx = all.findIndex((r) => r.id === targetRoomId);
  if (toIdx === -1) throw new Error("Target room not found");
  if (fromIdx === -1) throw new Error("Student has no current room");
  if (all[toIdx].occupants.length >= all[toIdx].capacity)
    throw new Error("Target room full");
  // remove from old
  all[fromIdx].occupants = all[fromIdx].occupants.filter(
    (id) => id !== studentId,
  );
  // add to new
  all[toIdx].occupants.push(studentId);
  writeRooms(all);
}

// Requests
export function listRequests(status?: RequestStatus): RoomRequest[] {
  const all = readRequests().sort((a, b) => b.createdAt - a.createdAt);
  return status ? all.filter((r) => r.status === status) : all;
}

export function createLeaveRequest(
  studentId: StudentId,
  note?: string,
): RoomRequest {
  const req: RoomRequest = {
    id: uid(),
    type: "leave",
    studentId,
    status: "pending",
    createdAt: Date.now(),
    note,
  };
  const all = readRequests();
  all.push(req);
  writeRequests(all);
  return req;
}

export function createChangeRequest(
  studentId: StudentId,
  targetRoomId: RoomId,
  note?: string,
): RoomRequest {
  const req: RoomRequest = {
    id: uid(),
    type: "change",
    studentId,
    targetRoomId,
    status: "pending",
    createdAt: Date.now(),
    note,
  };
  const all = readRequests();
  all.push(req);
  writeRequests(all);
  return req;
}

export function approveRequest(
  id: RequestId,
): { ok: true } | { ok: false; error: string } {
  const reqs = readRequests();
  const idx = reqs.findIndex((r) => r.id === id);
  if (idx === -1) return { ok: false, error: "Request not found" };
  const req = reqs[idx];
  try {
    if (req.type === "leave") {
      unbookStudent(req.studentId);
    } else if (req.type === "change") {
      if (!req.targetRoomId) throw new Error("Missing target room");
      moveStudent(req.studentId, req.targetRoomId);
    }
    req.status = "approved";
    req.resolvedAt = Date.now();
    reqs[idx] = req;
    writeRequests(reqs);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed" };
  }
}

export function rejectRequest(id: RequestId, note?: string) {
  const reqs = readRequests();
  const idx = reqs.findIndex((r) => r.id === id);
  if (idx === -1) return;
  reqs[idx].status = "rejected";
  reqs[idx].resolvedAt = Date.now();
  if (note) reqs[idx].note = note;
  writeRequests(reqs);
}

export function clearAllRequests() {
  writeRequests([]);
}
