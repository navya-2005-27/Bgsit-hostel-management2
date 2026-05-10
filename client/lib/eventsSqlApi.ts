import type { CreateEventSqlApiBody, EventSqlApiItem } from "@shared/api";

export async function listEventsSqlApi(): Promise<EventSqlApiItem[]> {
  const response = await fetch("/api/events");
  if (!response.ok) {
    throw new Error("Failed to fetch events");
  }
  return (await response.json()) as EventSqlApiItem[];
}

export async function createEventSqlApi(payload: CreateEventSqlApiBody): Promise<EventSqlApiItem> {
  const response = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || "Failed to create event");
  }

  return (await response.json()) as EventSqlApiItem;
}
