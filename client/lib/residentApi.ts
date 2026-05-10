import type { CreateResidentApiBody, ResidentApiItem } from "@shared/api";

export async function listResidentsApi(): Promise<ResidentApiItem[]> {
  const response = await fetch("/api/residents");
  if (!response.ok) {
    throw new Error("Failed to fetch residents");
  }
  return (await response.json()) as ResidentApiItem[];
}

export async function createResidentApi(
  payload: CreateResidentApiBody,
): Promise<ResidentApiItem> {
  const response = await fetch("/api/residents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || "Failed to create resident");
  }

  return (await response.json()) as ResidentApiItem;
}
