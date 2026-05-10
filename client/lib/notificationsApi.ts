import type { CreateNotificationApiBody, NotificationApiItem } from "@shared/api";

export async function listNotificationsApi(): Promise<NotificationApiItem[]> {
  const response = await fetch("/api/notifications");
  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }
  return (await response.json()) as NotificationApiItem[];
}

export async function createNotificationApi(
  payload: CreateNotificationApiBody,
): Promise<NotificationApiItem> {
  const response = await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || "Failed to create notification");
  }

  return (await response.json()) as NotificationApiItem;
}

export async function deleteNotificationApi(id: string): Promise<void> {
  const response = await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || "Failed to delete notification");
  }
}
