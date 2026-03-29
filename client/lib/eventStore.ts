import { type StudentId } from "./studentStore";

export type OrganizerType = "student" | "warden";
export type EventType =
  | "Cultural"
  | "Sports"
  | "Workshop"
  | "Festival"
  | "Party"
  | "Other";

export type EventComment = {
  id: string;
  author: OrganizerType;
  text: string;
  dateISO: string;
};

export type EventRecord = {
  id: string;
  name: string;
  description: string;
  organizer: OrganizerType;
  organizerName?: string;
  type: EventType | string;
  dateISO: string; // start datetime
  venue: string;
  expected?: number | null;
  budget?: number | null; // visible only to warden
  posterDataUrl?: string;
  status: "pending" | "approved" | "rejected" | "completed";
  createdAt: string;
  registrations: StudentId[]; // student ids
  comments: EventComment[];
};

const EVENTS_KEY = "campusstay.events.v1";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readEvents(): EventRecord[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as EventRecord[]) : [];
  } catch {
    return [];
  }
}
function writeEvents(e: EventRecord[]) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(e));
}

export function listEvents() {
  return readEvents().sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}
export function listUpcoming(now = new Date()) {
  return listEvents().filter(
    (e) => e.status !== "rejected" && new Date(e.dateISO) >= now,
  );
}
export function listPast(now = new Date()) {
  return listEvents().filter((e) => new Date(e.dateISO) < now);
}
export function listPendingProposals() {
  return readEvents().filter((e) => e.status === "pending");
}

export type NewEvent = {
  name: string;
  description: string;
  type: EventRecord["type"];
  dateISO: string;
  venue: string;
  expected?: number | null;
  budget?: number | null;
  posterDataUrl?: string;
};

export function createEvent(
  payload: NewEvent,
  organizer: OrganizerType,
  organizerName?: string,
) {
  const rec: EventRecord = {
    id: uid(),
    name: payload.name.trim(),
    description: payload.description.trim(),
    organizer,
    organizerName,
    type: payload.type,
    dateISO: payload.dateISO,
    venue: payload.venue,
    expected: payload.expected ?? null,
    budget: payload.budget ?? null,
    posterDataUrl: payload.posterDataUrl,
    status: organizer === "student" ? "pending" : "approved",
    createdAt: new Date().toISOString(),
    registrations: [],
    comments: [],
  };
  const all = readEvents();
  all.push(rec);
  writeEvents(all);
  return rec;
}

export function approveEvent(id: string) {
  const all = readEvents();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return;
  all[idx].status = "approved";
  writeEvents(all);
}
export function rejectEvent(id: string) {
  const all = readEvents();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return;
  all[idx].status = "rejected";
  writeEvents(all);
}
export function completeEvent(id: string) {
  const all = readEvents();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return;
  all[idx].status = "completed";
  writeEvents(all);
}

export function registerForEvent(eventId: string, studentId: StudentId) {
  const all = readEvents();
  const idx = all.findIndex((e) => e.id === eventId);
  if (idx === -1) throw new Error("Event not found");
  const e = all[idx];
  if (e.status !== "approved") throw new Error("Registration closed");
  if (!e.registrations.includes(studentId)) e.registrations.push(studentId);
  writeEvents(all);
}

export function addEventComment(
  eventId: string,
  author: OrganizerType,
  text: string,
) {
  const all = readEvents();
  const idx = all.findIndex((e) => e.id === eventId);
  if (idx === -1) return;
  all[idx].comments.push({
    id: uid(),
    author,
    text: text.trim(),
    dateISO: new Date().toISOString(),
  });
  writeEvents(all);
}

export function eventAnalytics() {
  const all = readEvents();
  const participants = all.map((e) => ({
    id: e.id,
    name: e.name,
    count: e.registrations.length,
  }));
  const byType: Record<string, number> = {};
  for (const e of all) byType[e.type] = (byType[e.type] || 0) + 1;
  const ratio = {
    student: all.filter((e) => e.organizer === "student").length,
    warden: all.filter((e) => e.organizer === "warden").length,
  };
  return { participants, byType, ratio };
}
