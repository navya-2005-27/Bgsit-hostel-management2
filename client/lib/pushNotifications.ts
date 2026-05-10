import { HostelNotification, listNotifications, subscribeNotifications } from "@/lib/notificationStore";

const LAST_SEEN_KEY = "campusstay.notifications.lastSeenAt.v1";

function persistLastSeen(timestamp: number) {
  localStorage.setItem(LAST_SEEN_KEY, String(timestamp));
}

function getLastSeen(): number {
  return Number(localStorage.getItem(LAST_SEEN_KEY) || 0);
}

function showBrowserNotification(item: HostelNotification) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(item.title, {
    body: item.content,
    tag: item.id,
  });
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported" as const;
  }
  if (Notification.permission === "granted") return "granted" as const;
  return Notification.requestPermission();
}

export function startNotificationListener() {
  let lastSeen = getLastSeen();

  const sync = () => {
    const latest = listNotifications();
    const unseen = latest
      .filter((item) => item.createdAt > lastSeen)
      .sort((a, b) => a.createdAt - b.createdAt);

    unseen.forEach((item) => showBrowserNotification(item));

    const newest = latest[0]?.createdAt ?? lastSeen;
    if (newest > lastSeen) {
      lastSeen = newest;
      persistLastSeen(lastSeen);
    }
  };

  sync();
  const unsub = subscribeNotifications(sync);
  return () => unsub();
}
