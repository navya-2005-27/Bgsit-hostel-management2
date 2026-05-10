import type { CreateParcelApiBody, ParcelApiItem } from "@shared/api";

export async function listParcelsApi(): Promise<ParcelApiItem[]> {
  const response = await fetch("/api/parcels");
  if (!response.ok) {
    throw new Error("Failed to fetch parcels");
  }
  return (await response.json()) as ParcelApiItem[];
}

export async function createParcelApi(payload: CreateParcelApiBody): Promise<ParcelApiItem> {
  const response = await fetch("/api/parcels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || "Failed to create parcel");
  }

  return (await response.json()) as ParcelApiItem;
}
