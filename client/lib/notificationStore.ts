export type HostelNotification = {
  id: string;
  title: string;
  content: string;
  dateISO: string;
  createdAt: number;
};

const STORAGE_KEY = "campusstay.notifications.v1";
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

function readAll(): HostelNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HostelNotification[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: HostelNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
}

export function listNotifications(): HostelNotification[] {
  return readAll().sort(
    (a, b) =>
      new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime() ||
      b.createdAt - a.createdAt,
  );
}

export function createNotification(input: {
  title: string;
  content: string;
  date?: string;
}): HostelNotification {
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title || !content) {
    throw new Error("Notification title and message are required.");
  }

  const item: HostelNotification = {
    id: uid(),
    title,
    content,
    dateISO: normalizeDate(input.date),
    createdAt: Date.now(),
  };

  const all = readAll();
  all.push(item);
  writeAll(all);
  return item;
}

export function deleteNotification(id: string): boolean {
  const all = readAll();
  const next = all.filter((item) => item.id !== id);
  if (next.length === all.length) return false;
  writeAll(next);
  return true;
}

export function subscribeNotifications(listener: () => void) {
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
