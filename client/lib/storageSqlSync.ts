const STARTED_FLAG = "__campusstay_sql_sync_started__";

const IGNORED_KEY_PREFIXES = ["__vite", "vite-"];

type SyncItem = {
  key: string;
  value: string | null;
};

function shouldSyncKey(key: string): boolean {
  if (!key) return false;
  return !IGNORED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

async function fetchSyncedState() {
  const response = await fetch(`/api/state-sync?prefix=`);
  if (!response.ok) {
    console.warn("Failed to load synced state from SQL Server", response.status);
    return [] as SyncItem[];
  }
  const body = (await response.json()) as { ok?: boolean; data?: SyncItem[] };
  return Array.isArray(body.data) ? body.data : [];
}

async function syncItemToSql(item: SyncItem) {
  const response = await fetch("/api/state-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    console.warn("Failed to sync localStorage item to SQL Server", item.key, response.status);
  }
}

export async function startStorageSqlSync() {
  const g = window as typeof window & { [STARTED_FLAG]?: boolean };
  if (g[STARTED_FLAG]) return;
  g[STARTED_FLAG] = true;

  const nativeSetItem = window.localStorage.setItem.bind(window.localStorage);
  const nativeRemoveItem = window.localStorage.removeItem.bind(window.localStorage);
  const localSnapshot = new Map<string, string | null>();
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !shouldSyncKey(key)) continue;
    localSnapshot.set(key, window.localStorage.getItem(key));
  }

  let hydrating = true;
  const syncedKeys = new Set<string>();
  try {
    const items = await fetchSyncedState();
    for (const item of items) {
      if (!shouldSyncKey(item.key)) continue;
      syncedKeys.add(item.key);
      nativeSetItem(item.key, item.value ?? "");
    }
  } catch {
    // Keep app usable even if sync bootstrap fails.
  } finally {
    hydrating = false;
  }

  for (const [key, value] of localSnapshot) {
    if (syncedKeys.has(key)) continue;
    void syncItemToSql({ key, value });
  }

  window.localStorage.setItem = ((key: string, value: string) => {
    nativeSetItem(key, value);
    if (!hydrating && shouldSyncKey(key)) {
      void syncItemToSql({ key, value });
    }
  }) as Storage["setItem"];

  window.localStorage.removeItem = ((key: string) => {
    nativeRemoveItem(key);
    if (!hydrating && shouldSyncKey(key)) {
      void syncItemToSql({ key, value: null });
    }
  }) as Storage["removeItem"];

  window.addEventListener("storage", (event) => {
    if (hydrating) return;
    if (!event.key || !shouldSyncKey(event.key)) return;
    void syncItemToSql({ key: event.key, value: event.newValue });
  });
}
