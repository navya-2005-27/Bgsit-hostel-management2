import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listStudents, getStudentPublic } from "@/lib/studentStore";
import {
  createParcel,
  listPendingParcels,
  listAllParcels,
  markCollectedWithOtp,
  deleteParcel,
} from "@/lib/parcelStore";

export function WardenParcelsPanel() {
  const [now, setNow] = useState(Date.now());
  const [studentId, setStudentId] = useState("");
  const [parcelCode, setParcelCode] = useState("");
  const [carrier, setCarrier] = useState("");
  const [note, setNote] = useState("");
  const students = useMemo(() => listStudents(), [now]);
  const pending = useMemo(() => listPendingParcels(), [now]);
  const all = useMemo(() => listAllParcels(), [now]);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1200);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Add Incoming Parcel</CardTitle>
          <CardDescription>
            Store parcel against a student. OTP is generated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.details.name}{" "}
                    {s.credentials ? `(roll: ${s.credentials.username})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Parcel ID / Description"
            value={parcelCode}
            onChange={(e) => setParcelCode(e.target.value)}
          />
          <Input
            placeholder="Carrier (optional)"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          />
          <Button
            onClick={() => {
              if (!studentId || !parcelCode.trim()) return;
              const rec = createParcel(
                studentId,
                parcelCode,
                carrier || undefined,
                Date.now(),
                note || undefined,
              );
              alert(`Parcel added with OTP ${rec.otp}`);
              setParcelCode("");
              setCarrier("");
              setNote("");
              setNow(Date.now());
            }}
          >
            Add Parcel
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Pending Parcels</CardTitle>
          <CardDescription>Verify OTP and mark collected.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length ? (
            pending.map((p) => (
              <div key={p.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.parcelCode}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.receivedAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Student:{" "}
                  {getStudentPublic(p.studentId)?.details.name || p.studentId}
                  {p.carrier ? ` • ${p.carrier}` : ""}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    placeholder="Enter OTP"
                    className="h-8 w-40"
                    id={`otp-${p.id}`}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const otp = (
                        document.getElementById(
                          `otp-${p.id}`,
                        ) as HTMLInputElement
                      )?.value;
                      const res = markCollectedWithOtp(p.id, otp || "");
                      if (!res.ok) alert(res.error);
                      setNow(Date.now());
                    }}
                  >
                    Mark Collected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Delete parcel?")) {
                        deleteParcel(p.id);
                        setNow(Date.now());
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">
              No pending parcels.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>All parcels with status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {all.length ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2">Parcel</th>
                    <th className="p-2">Student</th>
                    <th className="p-2">Received</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {all.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2">{p.parcelCode}</td>
                      <td className="p-2">
                        {getStudentPublic(p.studentId)?.details.name ||
                          p.studentId}
                      </td>
                      <td className="p-2">
                        {new Date(p.receivedAt).toLocaleString()}
                      </td>
                      <td className="p-2">
                        {p.collected
                          ? `Collected at ${new Date(p.collectedAt!).toLocaleString()}`
                          : "Pending"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No parcels yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
