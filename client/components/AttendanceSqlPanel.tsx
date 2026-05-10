import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { listAttendanceSqlApi, upsertAttendanceSqlApi } from "@/lib/attendanceSqlApi";
import type { AttendanceSqlApiItem } from "@shared/api";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceSqlPanel() {
  const { toast } = useToast();
  const [dateKey, setDateKey] = useState(todayKey());
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<"present" | "absent">("present");
  const [items, setItems] = useState<AttendanceSqlApiItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadAttendance() {
    setLoading(true);
    try {
      setItems(await listAttendanceSqlApi(dateKey));
    } catch (error: any) {
      toast({
        title: "Could not load attendance",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    try {
      await upsertAttendanceSqlApi({ studentId, dateKey, status });
      setStudentId("");
      toast({ title: "Attendance saved", description: "Saved in SQL Server." });
      loadAttendance();
    } catch (error: any) {
      toast({
        title: "Could not save attendance",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Attendance (SQL Server)</CardTitle>
          <CardDescription>Save and list attendance using /api/attendance.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Date Key</Label>
            <Input value={dateKey} onChange={(e) => setDateKey(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <Label>Student ID</Label>
            <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="std-1001" />
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as "present" | "absent")}
            >
              <option value="present">present</option>
              <option value="absent">absent</option>
            </select>
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <Button onClick={onSave}>Save Attendance</Button>
            <Button variant="outline" onClick={loadAttendance}>Load for Date</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>{loading ? "Loading from SQL..." : "Loaded from SQL Server API."}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">Student ID</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Marked At</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((item) => (
                    <tr key={`${item.studentId}-${item.dateKey}`} className="border-t">
                      <td className="p-3">{item.studentId}</td>
                      <td className="p-3">{item.dateKey}</td>
                      <td className="p-3">{item.status}</td>
                      <td className="p-3">{item.markedAt}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
