import type { CreateRoomApiBody, RoomApiItem } from "@shared/api";

export async function listRoomsApi(): Promise<RoomApiItem[]> {
  const response = await fetch("/api/rooms");
  if (!response.ok) {
    throw new Error("Failed to fetch rooms");
  }
  return (await response.json()) as RoomApiItem[];
}

export async function createRoomApi(payload: CreateRoomApiBody): Promise<RoomApiItem> {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || "Failed to create room");
  }

  return (await response.json()) as RoomApiItem;
}
