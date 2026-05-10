import { loginUserAccount, updateWardenAccount } from "@/lib/authApi";

type AdminCredentials = {
  username: string;
  password: string;
};

type WardenCredentials = {
  username: string;
  password: string;
};

const ADMIN_CREDS_KEY = "campusstay.admin.credentials.v1";
const ADMIN_SESSION_KEY = "campusstay.admin.session.v1";
const WARDEN_CREDS_KEY = "campusstay.warden.credentials.v1";
const WARDEN_SESSION_KEY = "campusstay.warden.session.v1";

const DEFAULT_ADMIN: AdminCredentials = {
  username: "admin",
  password: "Admin@123",
};

const DEFAULT_WARDEN: WardenCredentials = {
  username: "warden",
  password: "Warden@123",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getAdminCredentials(): AdminCredentials {
  const creds = read(ADMIN_CREDS_KEY, DEFAULT_ADMIN);
  if (!localStorage.getItem(ADMIN_CREDS_KEY)) {
    write(ADMIN_CREDS_KEY, creds);
  }
  return creds;
}

export function getWardenCredentials(): WardenCredentials {
  const creds = read(WARDEN_CREDS_KEY, DEFAULT_WARDEN);
  if (!localStorage.getItem(WARDEN_CREDS_KEY)) {
    write(WARDEN_CREDS_KEY, creds);
  }
  return creds;
}

export async function updateWardenCredentials(next: WardenCredentials) {
  const normalized = {
    username: next.username.trim(),
    password: next.password,
  };
  if (!normalized.username || !normalized.password) {
    throw new Error("Warden username and password are required.");
  }
  await updateWardenAccount(normalized);
  write(WARDEN_CREDS_KEY, normalized);
}

export async function authenticateAdmin(
  username: string,
  password: string,
): Promise<boolean> {
  const result = await loginUserAccount({ username, password, role: "admin" });
  if (result.ok) localStorage.setItem(ADMIN_SESSION_KEY, result.username);
  return result.ok;
}

export async function authenticateWarden(
  username: string,
  password: string,
): Promise<boolean> {
  const result = await loginUserAccount({ username, password, role: "warden" });
  if (result.ok) localStorage.setItem(WARDEN_SESSION_KEY, result.username);
  return result.ok;
}

export function isAdminLoggedIn(): boolean {
  return !!localStorage.getItem(ADMIN_SESSION_KEY);
}

export function isWardenLoggedIn(): boolean {
  return !!localStorage.getItem(WARDEN_SESSION_KEY);
}

export function logoutAdmin() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function logoutWarden() {
  localStorage.removeItem(WARDEN_SESSION_KEY);
}
