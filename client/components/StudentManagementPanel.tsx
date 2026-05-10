import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StudentRecord, saveStudentDetailsByUsn, syncStudentRecordToSql } from "@/lib/studentStore";
import { useToast } from "@/hooks/use-toast";

type Props = {
  students: StudentRecord[];
  title?: string;
  description?: string;
};

function deriveYear(student: StudentRecord): string {
  const joining = student.details.joiningDate
    ? new Date(student.details.joiningDate)
    : null;
  if (joining && !Number.isNaN(joining.getTime())) {
    return String(joining.getFullYear());
  }

  const usn = student.details.usn || student.credentials?.username || "";
  const found = usn.match(/\b(20\d{2})\b|\b(\d{2})[A-Za-z]{2,}\d{2,}\b/);
  if (!found) return "Unknown";
  if (found[1]) return found[1];
  if (found[2]) return `20${found[2]}`;
  return "Unknown";
}

export function StudentManagementPanel({
  students,
  title = "Student Management",
  description = "Search by name/USN and filter by year. View complete student details.",
}: Props) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");

  const withYear = useMemo(
    () =>
      students.map((student) => ({
        student,
        year: deriveYear(student),
      })),
    [students],
  );

  const years = useMemo(() => {
    const values = Array.from(new Set(withYear.map((x) => x.year))).sort((a, b) =>
      b.localeCompare(a),
    );
    return ["all", ...values];
  }, [withYear]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withYear.filter(({ student, year }) => {
      const matchesText =
        !q ||
        student.details.name.toLowerCase().includes(q) ||
        (student.details.usn || "").toLowerCase().includes(q);
      const matchesYear = selectedYear === "all" || year === selectedYear;
      return matchesText && matchesYear;
    });
  }, [withYear, query, selectedYear]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            placeholder="Search by name or USN"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:col-span-2"
          />
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year === "all" ? "All years" : year}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {filtered.length ? (
            filtered.map(({ student, year }) => (
              <div
                key={student.id}
                className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="font-medium">{student.details.name}</div>
                  <div className="text-xs text-muted-foreground">
                    USN: {student.details.usn || "-"} | Year: {year}
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">View Details</Button>
                  </DialogTrigger>
                  <StudentDetailsDialog student={student} year={year} onSave={() => {
                    // Trigger refresh in parent
                    window.dispatchEvent(new Event("student-data-updated"));
                  }} />
                </Dialog>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              No students found for current filters.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words">{value}</div>
    </div>
  );
}

function StudentDetailsDialog({
  student,
  year,
  onSave,
}: {
  student: StudentRecord;
  year: string;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [roomNumber, setRoomNumber] = useState(student.details.roomNumber || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveRoomNumber = async () => {
    if (!student.details.usn) {
      toast({
        title: "Error",
        description: "Student USN is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const updated = saveStudentDetailsByUsn(student.details.usn, {
        ...student.details,
        roomNumber,
      });
      await syncStudentRecordToSql(updated);
      toast({
        title: "Success",
        description: "Room number updated successfully",
      });
      onSave();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update room number",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{student.details.name}</DialogTitle>
        <DialogDescription>
          Complete student registration details
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <DetailItem label="USN" value={student.details.usn || "-"} />
        <DetailItem label="Year" value={year} />
        <div className="rounded-md border p-3 space-y-2">
          <Label htmlFor="room-number" className="text-xs text-muted-foreground">
            Room Number
          </Label>
          <div className="flex gap-2">
            <Input
              id="room-number"
              placeholder="e.g. A-101"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleSaveRoomNumber}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
        <DetailItem label="Father Name" value={student.details.fatherName || "-"} />
        <DetailItem label="Mother Name" value={student.details.motherName || "-"} />
        <DetailItem label="Father Contact" value={student.details.fatherContact || "-"} />
        <DetailItem label="Mother Contact" value={student.details.motherContact || "-"} />
        <DetailItem label="Student Contact" value={student.details.studentContact || "-"} />
        <DetailItem label="Email" value={student.details.email || "-"} />
        <DetailItem label="Joining Date" value={student.details.joiningDate || "-"} />
        <DetailItem
          label="Total Amount"
          value={
            student.details.totalAmount !== null
              ? String(student.details.totalAmount)
              : "-"
          }
        />
        <div className="sm:col-span-2 rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Address</div>
          <div className="mt-1">{student.details.address || "-"}</div>
        </div>
        <div className="sm:col-span-2 rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Documents Uploaded</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(student.details.documents || []).length ? (
              student.details.documents?.map((doc) => (
                <Badge key={doc.name} variant="secondary">
                  {doc.name}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">No documents</span>
            )}
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
