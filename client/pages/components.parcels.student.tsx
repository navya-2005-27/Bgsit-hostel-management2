import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StudentId } from "@/lib/studentStore";
import { listParcelsByStudent, Parcel } from "@/lib/parcelStore";

export function StudentParcelsPanel({
  studentId,
}: {
  studentId: StudentId | "";
}) {
  const [now, setNow] = useState(Date.now());
  const parcels = useMemo(
    () => (studentId ? listParcelsByStudent(studentId) : []),
    [studentId, now],
  );

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1500);
    return () => clearInterval(i);
  }, []);

  if (!studentId) {
    return (
      <div className="text-sm text-muted-foreground">
        Login to view parcels.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Parcels</CardTitle>
        <CardDescription>
          Track received and collected parcels. Share OTP at collection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {parcels.length ? (
          parcels.map((p: Parcel) => (
            <div key={p.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{p.parcelCode}</div>
                <span
                  className={
                    p.collected ? "text-emerald-600" : "text-orange-600"
                  }
                >
                  {p.collected ? "Collected" : "Pending"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Received: {new Date(p.receivedAt).toLocaleString()}
              </div>
              {p.carrier ? (
                <div className="text-xs text-muted-foreground">
                  Carrier: {p.carrier}
                </div>
              ) : null}
              {!p.collected ? (
                <div className="mt-2 text-xs">
                  OTP: <span className="font-mono font-medium">{p.otp}</span>
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">
                  Collected at {new Date(p.collectedAt!).toLocaleString()}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No parcels found.</div>
        )}
      </CardContent>
    </Card>
  );
}
