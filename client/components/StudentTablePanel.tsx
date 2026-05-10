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
import { StudentRecord } from "@/lib/studentStore";
import { getProfileImage } from "@/lib/profileImages";
import { Eye } from "lucide-react";

const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;

function normalizeYearLabel(year?: string) {
  return YEAR_OPTIONS.includes(year as (typeof YEAR_OPTIONS)[number])
    ? (year as string)
    : "Unknown";
}

function deriveJoiningYear(student: StudentRecord): string {
  if (typeof student.details.joiningYear === "number") {
    return String(student.details.joiningYear);
  }
  if (student.details.joiningDate) {
    const parsed = new Date(student.details.joiningDate);
    if (!Number.isNaN(parsed.getTime())) {
      return String(parsed.getFullYear());
    }
  }
  return "-";
}

type Props = {
  students: StudentRecord[];
  onViewDetails: (student: StudentRecord) => void;
  title?: string;
  description?: string;
};

function deriveYear(student: StudentRecord): string {
  return normalizeYearLabel(student.details.year);
}

function parseRoom(room?: string) {
  const value = (room || "").trim();
  if (!value) return { block: "Z", num: Infinity, raw: "" };
  const match = value.match(/^([A-Z])[-\s]?(\d+)$/i);
  if (match) {
    return {
      block: match[1].toUpperCase(),
      num: parseInt(match[2], 10),
      raw: value,
    };
  }
  return { block: value.charAt(0).toUpperCase(), num: Number.MAX_SAFE_INTEGER, raw: value };
}

export function StudentTablePanel({
  students,
  onViewDetails,
  title = "Student Management",
  description = "Search by name/USN and filter by year.",
}: Props) {
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
    return ["all", ...YEAR_OPTIONS];
  }, [withYear]);

  const sorted = useMemo(() => {
    return [...withYear].sort((a, b) => {
      const roomA = parseRoom(a.student.details.roomNumber);
      const roomB = parseRoom(b.student.details.roomNumber);
      const blockOrder = ["A", "B", "C", "D"];
      const blockA = blockOrder.includes(roomA.block) ? blockOrder.indexOf(roomA.block) : 999;
      const blockB = blockOrder.includes(roomB.block) ? blockOrder.indexOf(roomB.block) : 999;
      if (blockA !== blockB) return blockA - blockB;
      if (roomA.num !== roomB.num) return roomA.num - roomB.num;
      return (a.student.details.name || "").localeCompare(b.student.details.name || "");
    });
  }, [withYear]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter(({ student, year }) => {
      const matchesText =
        !q ||
        student.details.name.toLowerCase().includes(q) ||
        (student.details.usn || "").toLowerCase().includes(q);
      const matchesYear = selectedYear === "all" || year === selectedYear;
      return matchesText && matchesYear;
    });
  }, [sorted, query, selectedYear]);

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

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left font-semibold">Photo</th>
                <th className="p-3 text-left font-semibold">Name</th>
                <th className="p-3 text-left font-semibold">USN</th>
                <th className="p-3 text-left font-semibold">Room</th>
                <th className="p-3 text-left font-semibold">Year</th>
                <th className="p-3 text-left font-semibold">Joining Year</th>
                <th className="p-3 text-left font-semibold">Contact</th>
                <th className="p-3 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map(({ student, year }) => (
                  <tr key={student.id} className="border-t hover:bg-muted/50">
                    <td className="p-3">
                      <img
                        src={getProfileImage(student.details.profilePhotoDataUrl)}
                        alt={student.details.name}
                        className="h-10 w-10 rounded-full object-cover border"
                      />
                    </td>
                    <td className="p-3 font-medium">{student.details.name}</td>
                    <td className="p-3">{student.details.usn || "-"}</td>
                    <td className="p-3">{student.details.roomNumber || "-"}</td>
                    <td className="p-3">{year}</td>
                    <td className="p-3">{deriveJoiningYear(student)}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {student.details.studentContact || "-"}
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewDetails(student)}
                        className="gap-1"
                      >
                        <Eye className="h-3 w-3" /> View
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    No students found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
