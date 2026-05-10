import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit2 } from "lucide-react";
import { StudentRecord, updateDetails, importFilesToDataUrls } from "@/lib/studentStore";
import { getProfileImage } from "@/lib/profileImages";
import { Badge } from "@/components/ui/badge";

type Props = {
  student: StudentRecord;
  allStudents: StudentRecord[];
};

export function StudentDetailsView({ student, allStudents }: Props) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: student.details.name,
    usn: student.details.usn || "",
    roomNumber: student.details.roomNumber || "",
    year: student.details.year || "",
    joiningYear: student.details.joiningYear?.toString() || "",
    fatherName: student.details.fatherName || "",
    motherName: student.details.motherName || "",
    fatherContact: student.details.fatherContact || "",
    motherContact: student.details.motherContact || "",
    studentContact: student.details.studentContact || "",
    email: student.details.email || "",
    address: student.details.address || "",
    totalAmount: student.details.totalAmount?.toString() || "",
    joiningDate: student.details.joiningDate || "",
    profilePhotoDataUrl: student.details.profilePhotoDataUrl || "",
  });

  const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  const deriveYear = () => {
    return formData.year || "Unknown";
  };

  async function onPhotoUpload(files?: FileList | null) {
    if (!files || !files.length) return;
    const [img] = await importFilesToDataUrls([files[0]]);
    setFormData((prev) => ({ ...prev, profilePhotoDataUrl: img.dataUrl }));
  }

  function saveChanges() {
    updateDetails(student.id, {
      name: formData.name,
      usn: formData.usn,
      roomNumber: formData.roomNumber,
      fatherName: formData.fatherName,
      motherName: formData.motherName,
      fatherContact: formData.fatherContact,
      motherContact: formData.motherContact,
      studentContact: formData.studentContact,
      email: formData.email,
      address: formData.address,
      totalAmount: formData.totalAmount ? Number(formData.totalAmount) : null,
      year: formData.year,
      joiningYear: formData.joiningYear ? Number(formData.joiningYear) : null,
      joiningDate: formData.joiningDate,
      profilePhotoDataUrl: formData.profilePhotoDataUrl,
      documents: student.details.documents,
    });
    setIsEditing(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white dark:to-background">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => (isEditing ? saveChanges() : setIsEditing(true))}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            {isEditing ? "Save Changes" : "Edit"}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Profile Section */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex flex-col items-center">
                  <img
                    src={getProfileImage(formData.profilePhotoDataUrl)}
                    alt={formData.name}
                    className="h-40 w-40 rounded-lg border-2 border-border object-cover"
                  />
                  {isEditing && (
                    <div className="mt-4 w-full">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => onPhotoUpload(e.currentTarget.files)}
                      />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold">{formData.name}</h2>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Section */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
              <CardDescription>
                Complete registration details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>USN</Label>
                  <Input
                    value={formData.usn}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, usn: e.target.value }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Room Number</Label>
                  <Input
                    placeholder="e.g. A-101"
                    value={formData.roomNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, roomNumber: e.target.value }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Year</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, year: e.target.value }))
                    }
                    disabled={!isEditing}
                  >
                    <option value="">Select year</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Joining Year</Label>
                  <Input
                    type="number"
                    value={formData.joiningYear}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        joiningYear: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Father Name</Label>
                  <Input
                    value={formData.fatherName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fatherName: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Mother Name</Label>
                  <Input
                    value={formData.motherName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        motherName: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Father Contact</Label>
                  <Input
                    value={formData.fatherContact}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fatherContact: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Mother Contact</Label>
                  <Input
                    value={formData.motherContact}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        motherContact: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Student Contact</Label>
                  <Input
                    value={formData.studentContact}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        studentContact: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Total Amount / Fee</Label>
                  <Input
                    type="number"
                    value={formData.totalAmount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        totalAmount: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Joining Date</Label>
                  <Input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        joiningDate: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Address</Label>
                  <textarea
                    className="h-24 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Documents Section */}
        {student.details.documents && student.details.documents.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {student.details.documents.map((doc) => (
                  <Badge key={doc.name} variant="secondary">
                    {doc.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
