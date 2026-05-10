import type { AttendanceSqlApiItem, UpsertAttendanceSqlApiBody } from "@shared/api";

export async function listAttendanceSqlApi(dateKey: string): Promise<AttendanceSqlApiItem[]> {
  const response = await fetch(`/api/attendance?dateKey=${encodeURIComponent(dateKey)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch attendance");
  }
  return (await response.json()) as AttendanceSqlApiItem[];
}

export async function upsertAttendanceSqlApi(
  payload: UpsertAttendanceSqlApiBody,
): Promise<AttendanceSqlApiItem> {
  const response = await fetch("/api/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || "Failed to save attendance");
  }

  return (await response.json()) as AttendanceSqlApiItem;
}
