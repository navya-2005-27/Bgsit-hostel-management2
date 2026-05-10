import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { StudentDetailsView } from "@/components/StudentDetailsView";
import { listStudents } from "@/lib/studentStore";

type Props = {
  role: "admin" | "warden";
};

export default function StudentDetailsPage({ role }: Props) {
  const { id } = useParams<{ id: string }>();
  const students = useMemo(() => listStudents(), []);
  const student = useMemo(
    () => students.find((s) => s.id === id),
    [students, id],
  );

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-white dark:to-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Student Not Found</h1>
          <p className="text-muted-foreground">The student you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return <StudentDetailsView student={student} allStudents={students} />;
}
