import { cn } from "@/lib/utils";
import { Shield, Phone, QrCode } from "lucide-react";

export type StudentIDData = {
  id: string;
  name: string;
  contact?: string;
  photoDataUrl?: string;
  hostelName?: string;
  username?: string;
};

export function StudentIDCard({
  data,
  className,
}: {
  data: StudentIDData;
  className?: string;
}) {
  const hostel = data.hostelName || "BGSIT Girls Hostel";
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
    JSON.stringify({
      id: data.id,
      name: data.name,
      contact: data.contact || "",
    }),
  )}`;

  return (
    <div
      className={cn(
        "relative grid w-full max-w-sm grid-cols-[1fr_auto] overflow-hidden rounded-2xl border bg-gradient-to-br from-white to-white/60 p-4 shadow-xl dark:from-background dark:to-background/80",
        className,
      )}
    >
      {/* Brand stripe */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-fuchsia-500" />

      <div className="pr-4">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <Shield className="h-5 w-5" />
          <span className="text-xs font-semibold tracking-wide uppercase">
            {hostel}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-xl ring-1 ring-border">
            {data.photoDataUrl ? (
              <img
                src={data.photoDataUrl}
                alt={data.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                ID
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold leading-tight">
              {data.name}
            </div>
            {data.username ? (
              <div className="truncate text-xs text-muted-foreground">
                @{data.username}
              </div>
            ) : null}
            {data.contact ? (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {data.contact}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
          <div className="rounded-md border p-2">
            <div className="font-medium text-foreground/80">Student ID</div>
            <div className="font-mono text-[11px]">
              {data.id.slice(-8).toUpperCase()}
            </div>
          </div>
          <div className="rounded-md border p-2">
            <div className="font-medium text-foreground/80">Valid</div>
            <div>2025 • Internal</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between">
        <img alt="QR" src={qr} className="h-20 w-20 rounded-md" />
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          <QrCode className="h-3 w-3" /> Scan
        </div>
      </div>
    </div>
  );
}
