export const DEFAULT_PROFILE_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='30' r='20' fill='%23cbd5e0'/%3E%3Cpath d='M20 100 Q20 70 50 70 Q80 70 80 100' fill='%23cbd5e0'/%3E%3C/svg%3E";

export function getProfileImage(photoDataUrl?: string): string {
  return photoDataUrl || DEFAULT_PROFILE_IMAGE;
}
