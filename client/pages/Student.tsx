import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listStudents,
  getStudentPublic,
  StudentId,
  getActiveAttendanceSession,
  markAttendanceWithToken,
  getCurrentAccessUsn,
  getLatestAccessRequestByUsn,
  submitAccessRequest,
  clearCurrentAccessUsn,
  resetAccessToPending,
  ensureStudentRecordForUsn,
  saveStudentDetailsByUsn,
  importFilesToDataUrls,
  logoutStudent,
} from "@/lib/studentStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Student() {
  const [students, setStudents] = useState(listStudents());
  const [selectedId, setSelectedId] = useState<StudentId | "">("");
  const [accessUsn, setAccessUsn] = useState(getCurrentAccessUsn() || "");
  const [requestForm, setRequestForm] = useState({
    name: "",
    usn: getCurrentAccessUsn() || "",
    phone: "",
  });
  const [details, setDetails] = useState({
    name: "",
    parentName: "",
    parentContact: "",
    studentContact: "",
    address: "",
    email: "",
    totalAmount: "",
    joiningDate: "",
    profilePhotoDataUrl: "",
    documents: [] as { name: string; dataUrl: string }[],
  });
  const [now, setNow] = useState(Date.now());
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<string>("");
  const [geoDialog, setGeoDialog] = useState<{
    open: boolean;
    title: string;
    desc?: string;
  }>({ open: false, title: "", desc: "" });
  const accessRequest = useMemo(
    () => (accessUsn ? getLatestAccessRequestByUsn(accessUsn) : null),
    [accessUsn, now],
  );
  const isApproved = accessRequest?.status === "approved";

  useEffect(() => {
    const i = setInterval(() => {
      setNow(Date.now());
    }, 1500);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    setStudents(listStudents());
  }, [now]);

  useEffect(() => {
    if (!accessRequest || accessRequest.status !== "approved") {
      setSelectedId("");
      return;
    }

    const rec = ensureStudentRecordForUsn(
      accessRequest.usn,
      accessRequest.name,
      accessRequest.phone,
    );
    setSelectedId(rec.id);
    setDetails({
      name: rec.details.name || accessRequest.name,
      parentName: rec.details.parentName || "",
      parentContact: rec.details.parentContact || "",
      studentContact: rec.details.studentContact || accessRequest.phone,
      address: rec.details.address || "",
      email: rec.details.email || "",
      totalAmount: rec.details.totalAmount?.toString() || "",
      joiningDate: rec.details.joiningDate || "",
      profilePhotoDataUrl: rec.details.profilePhotoDataUrl || "",
      documents: rec.details.documents || [],
    });
  }, [accessRequest?.id, accessRequest?.status]);

  const selected = useMemo(
    () => (selectedId ? getStudentPublic(selectedId) : undefined),
    [selectedId, now],
  );
  const active = getActiveAttendanceSession();

  async function scanWithCamera() {
    try {
      // @ts-ignore
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      await new Promise((r) => setTimeout(r, 500));
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No ctx");
      ctx.drawImage(video, 0, 0);
      const bitmap = await createImageBitmap(canvas);
      const codes = await detector.detect(bitmap as any);
      stream.getTracks().forEach((t) => t.stop());
      if (codes && codes[0]?.rawValue) setToken(String(codes[0].rawValue));
      else alert("Could not read QR. Try manual entry.");
    } catch {
      alert("Camera scan not supported. Enter code manually.");
    }
  }

  async function mark() {
    if (!selected) {
      setStatus("Select your profile first.");
      return;
    }
    if (!token) {
      setStatus("Enter or scan QR token.");
      return;
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject),
      );
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      markAttendanceWithToken(token, selected.id, point);
      setStatus("✔ Attendance Marked for Today.");
    } catch (e: any) {
      const msg: string = e?.message || "Could not mark attendance.";
      setStatus(msg);
      let title = "Attendance error";
      if (/denied|permission/i.test(msg)) title = "Location permission denied";
      if (/geofence/i.test(msg)) title = "Outside geofence";
      setGeoDialog({ open: true, title, desc: msg });
    }
  }

  async function onUploadPhoto(files?: FileList | null) {
    if (!files || !files.length) return;
    const [img] = await importFilesToDataUrls([files[0]]);
    setDetails((d) => ({ ...d, profilePhotoDataUrl: img.dataUrl }));
  }

  async function onUploadDocs(files?: FileList | null) {
    if (!files || !files.length) return;
    const docs = await importFilesToDataUrls(files);
    setDetails((d) => ({ ...d, documents: [...d.documents, ...docs] }));
  }

  const defaultTab = isApproved ? "profile" : "login";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white dark:to-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full justify-start gap-2 rounded-full bg-muted/60 p-1">
            <TabsTrigger value="login" className="rounded-full">
              Access Request
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-full">
              Profile
            </TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-full">
              Attendance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Request for Access</CardTitle>
                <CardDescription>
                  Submit your Name, USN, and phone number. Warden approval is
                  required before you can fill full details.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g. Riya Sharma"
                    value={requestForm.name}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>USN</Label>
                  <Input
                    placeholder="e.g. 22CSE123"
                    value={requestForm.usn}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, usn: e.target.value })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="e.g. 9876543210"
                    value={requestForm.phone}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, phone: e.target.value })
                    }
                  />
                </div>
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      try {
                        const req = submitAccessRequest(requestForm);
                        setAccessUsn(req.usn);
                        setRequestForm({ ...requestForm, usn: req.usn });
                        setStatus("Request submitted. Waiting for warden approval.");
                        setNow(Date.now());
                      } catch (e: any) {
                        alert(e?.message || "Could not submit request");
                      }
                    }}
                  >
                    Request for Access
                  </Button>

                  {accessUsn ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetAccessToPending(accessUsn);
                        clearCurrentAccessUsn();
                        logoutStudent();
                        setSelectedId("");
                        setAccessUsn("");
                        setRequestForm({ name: "", usn: "", phone: "" });
                        setStatus("Logged out. Submit a fresh request for approval.");
                        setNow(Date.now());
                      }}
                    >
                      Logout
                    </Button>
                  ) : null}
                </div>
                {accessRequest ? (
                  <div className="sm:col-span-2 rounded-md border p-3 text-sm">
                    <div>
                      Current status: <span className="font-medium">{accessRequest.status}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {accessRequest.status === "approved"
                        ? "Approved. Open Profile tab to fill or edit your details."
                        : "Waiting for Warden Approval."}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Section</CardTitle>
                <CardDescription>
                  Fill and update your member details after approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isApproved && accessUsn ? (
                  <form
                    className="grid gap-4 sm:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const saved = saveStudentDetailsByUsn(accessUsn, {
                        name: details.name,
                        parentName: details.parentName,
                        parentContact: details.parentContact,
                        studentContact: details.studentContact,
                        address: details.address,
                        email: details.email,
                        totalAmount: details.totalAmount
                          ? Number(details.totalAmount)
                          : null,
                        joiningDate: details.joiningDate,
                        profilePhotoDataUrl:
                          details.profilePhotoDataUrl || undefined,
                        documents: details.documents,
                      });
                      setSelectedId(saved.id);
                      setNow(Date.now());
                      setStatus("Details saved successfully.");
                    }}
                  >
                    <div className="sm:col-span-2">
                      <Label>Name</Label>
                      <Input
                        value={details.name}
                        onChange={(e) =>
                          setDetails({ ...details, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Parent's Name</Label>
                      <Input
                        value={details.parentName}
                        onChange={(e) =>
                          setDetails({ ...details, parentName: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Parent's Contact Number</Label>
                      <Input
                        value={details.parentContact}
                        onChange={(e) =>
                          setDetails({ ...details, parentContact: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Student Contact Number</Label>
                      <Input
                        value={details.studentContact}
                        onChange={(e) =>
                          setDetails({
                            ...details,
                            studentContact: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={details.email}
                        onChange={(e) =>
                          setDetails({ ...details, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Address</Label>
                      <Textarea
                        value={details.address}
                        onChange={(e) =>
                          setDetails({ ...details, address: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Total Amount / Hostel Fee</Label>
                      <Input
                        type="number"
                        value={details.totalAmount}
                        onChange={(e) =>
                          setDetails({ ...details, totalAmount: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Joining Date</Label>
                      <Input
                        type="date"
                        value={details.joiningDate}
                        onChange={(e) =>
                          setDetails({ ...details, joiningDate: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Profile Photo</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => onUploadPhoto(e.currentTarget.files)}
                      />
                      {details.profilePhotoDataUrl ? (
                        <img
                          src={details.profilePhotoDataUrl}
                          alt="Profile"
                          className="mt-2 h-24 w-24 rounded-md object-cover ring-1 ring-border"
                        />
                      ) : null}
                    </div>
                    <div>
                      <Label>Documents</Label>
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => onUploadDocs(e.currentTarget.files)}
                      />
                      {details.documents.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                          {details.documents.map((d, i) => (
                            <li key={i} className="truncate">
                              {d.name}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="sm:col-span-2">
                      <Button type="submit">Save Member Details</Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Submit access request first. Once approved by the warden,
                    this form will be unlocked.
                  </div>
                )}

                {selected ? (
                  <div className="space-y-2 border-t pt-4 text-sm">
                    <div className="font-medium">Saved Preview</div>
                    <div>{selected.details.name}</div>
                    <div className="text-muted-foreground">USN: {accessUsn || "-"}</div>
                    {selected.details.profilePhotoDataUrl ? (
                      <img
                        src={selected.details.profilePhotoDataUrl}
                        alt="Profile"
                        className="mt-2 h-24 w-24 rounded-md object-cover ring-1 ring-border"
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No saved details yet.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Mark Attendance</CardTitle>
                <CardDescription>
                  {active
                    ? `QR valid until ${new Date(active.expiresAt).toLocaleTimeString()}`
                    : "Waiting for warden to start session."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-md border px-3 py-2 text-sm"
                    placeholder="Paste scanned QR token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={scanWithCamera}
                  >
                    Use Camera
                  </Button>
                </div>
                <Button onClick={mark} disabled={!active}>
                  Mark Attendance
                </Button>
                {status ? (
                  <div className="text-sm text-muted-foreground">{status}</div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog
          open={geoDialog.open}
          onOpenChange={(o) => setGeoDialog((s) => ({ ...s, open: o }))}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {geoDialog.title || "Location required"}
              </AlertDialogTitle>
              {geoDialog.desc ? (
                <AlertDialogDescription>
                  {geoDialog.desc}
                </AlertDialogDescription>
              ) : null}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() =>
                  setGeoDialog({ open: false, title: "", desc: "" })
                }
              >
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
