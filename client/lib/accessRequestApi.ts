import type {
  AccessRequestApiItem,
  CreateAccessRequestApiBody,
  UpdateAccessRequestApiBody,
} from "@shared/api";

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return body?.message || fallback;
}

export async function listAccessRequestsApi(): Promise<AccessRequestApiItem[]> {
  const response = await fetch("/api/access-requests");
  if (!response.ok) {
    throw new Error("Failed to fetch access requests");
  }

  return (await response.json()) as AccessRequestApiItem[];
}

export async function createAccessRequestApi(
  payload: CreateAccessRequestApiBody,
): Promise<AccessRequestApiItem> {
  const response = await fetch("/api/access-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to create access request"));
  }

  return (await response.json()) as AccessRequestApiItem;
}

export async function updateAccessRequestApi(
  id: string,
  payload: UpdateAccessRequestApiBody,
): Promise<AccessRequestApiItem> {
  const response = await fetch(`/api/access-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to update access request"));
  }

  return (await response.json()) as AccessRequestApiItem;
}