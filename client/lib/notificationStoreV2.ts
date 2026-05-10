export type NotificationWithImage = {
  id: string;
  title: string;
  description: string;
  imageDataUrl?: string;
  dateISO: string;
  createdAt: number;
};

const STORAGE_KEY = "campusstay.notifications.v2";
const UPDATED_EVENT = "campusstay.notifications.updated";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDate(input?: string): string {
  if (!input?.trim()) return new Date().toISOString();
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function readAll(): NotificationWithImage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NotificationWithImage[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: NotificationWithImage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
}

export function listNotificationsV2(): NotificationWithImage[] {
  return readAll().sort(
    (a, b) =>
      new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime() ||
      b.createdAt - a.createdAt,
  );
}

export function createNotificationV2(input: {
  title: string;
  description: string;
  imageDataUrl?: string;
  date?: string;
}): NotificationWithImage {
  const title = input.title.trim();
  const description = input.description.trim();

  if (!title || !description) {
    throw new Error("Notification title and description are required.");
  }

  const item: NotificationWithImage = {
    id: uid(),
    title,
    description,
    imageDataUrl: input.imageDataUrl,
    dateISO: normalizeDate(input.date),
    createdAt: Date.now(),
  };

  const all = readAll();
  all.push(item);
  writeAll(all);
  return item;
}

export function deleteNotificationV2(id: string): boolean {
  const all = readAll();
  const next = all.filter((item) => item.id !== id);
  if (next.length === all.length) return false;
  writeAll(next);
  return true;
}

export function subscribeNotificationsV2(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  const onUpdated = () => listener();

  window.addEventListener("storage", onStorage);
  window.addEventListener(UPDATED_EVENT, onUpdated);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(UPDATED_EVENT, onUpdated);
  };
}
