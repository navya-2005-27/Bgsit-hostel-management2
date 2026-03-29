import type { StudentId } from "./studentStore";

export type ParcelId = string;
export type Parcel = {
  id: ParcelId;
  studentId: StudentId;
  parcelCode: string;
  carrier?: string;
  receivedAt: number; // epoch ms
  collected: boolean;
  collectedAt?: number;
  otp: string; // 6-digit
  note?: string;
};

const PARCELS_KEY = "campusstay.parcels.v1";

function read(): Parcel[] {
  try {
    const raw = localStorage.getItem(PARCELS_KEY);
    return raw ? (JSON.parse(raw) as Parcel[]) : [];
  } catch {
    return [];
  }
}
function write(p: Parcel[]) {
  localStorage.setItem(PARCELS_KEY, JSON.stringify(p));
}
function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function genOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function createParcel(
  studentId: StudentId,
  parcelCode: string,
  carrier?: string,
  receivedAt = Date.now(),
  note?: string,
): Parcel {
  const p: Parcel = {
    id: uid(),
    studentId,
    parcelCode: parcelCode.trim(),
    carrier: carrier?.trim() || undefined,
    receivedAt,
    collected: false,
    otp: genOtp(),
    note,
  };
  const all = read();
  all.push(p);
  write(all);
  return p;
}

export function listAllParcels(): Parcel[] {
  return read().sort((a, b) => b.receivedAt - a.receivedAt);
}
export function listPendingParcels(): Parcel[] {
  return listAllParcels().filter((p) => !p.collected);
}
export function listParcelsByStudent(studentId: StudentId): Parcel[] {
  return listAllParcels().filter((p) => p.studentId === studentId);
}

export function markCollectedWithOtp(
  id: ParcelId,
  otp: string,
): { ok: true } | { ok: false; error: string } {
  const all = read();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return { ok: false, error: "Parcel not found" };
  if (all[idx].collected) return { ok: false, error: "Already collected" };
  if (all[idx].otp !== otp) return { ok: false, error: "Invalid OTP" };
  all[idx].collected = true;
  all[idx].collectedAt = Date.now();
  write(all);
  return { ok: true };
}

export function adminOverrideCollected(id: ParcelId) {
  const all = read();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return;
  all[idx].collected = true;
  all[idx].collectedAt = Date.now();
  write(all);
}

export function deleteParcel(id: ParcelId) {
  const all = read().filter((p) => p.id !== id);
  write(all);
}
