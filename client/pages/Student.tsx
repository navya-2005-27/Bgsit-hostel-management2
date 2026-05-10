import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getStudentPublic,
  StudentId,
  getActiveAttendanceSession,
  markAttendanceWithToken,
  getCurrentAccessUsn,
  getLatestAccessRequestByUsn,
  submitAccessRequest,
  ensureStudentRecordForUsn,
  saveStudentDetailsByUsn,
  importFilesToDataUrls,
  logoutStudent,
  getCurrentStudentId,
  authenticateStudent,
  setCredentials,
  syncStudentRecordToSql,
} from "@/lib/studentStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { User, Clock, Bell } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NotificationCenterV2 } from "@/components/NotificationCenterV2";
import {
  requestBrowserNotificationPermission,
  startNotificationListener,
} from "@/lib/pushNotifications";
import { getProfileImage } from "@/lib/profileImages";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const profileFormRef = useRef<HTMLFormElement | null>(null);
  const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const [currentStudentId, setCurrentStudentId] = useState<StudentId | null>(
    () => getCurrentStudentId(),
  );
  const [accessUsn, setAccessUsn] = useState(getCurrentAccessUsn() || "");
  const [requestForm, setRequestForm] = useState({
    name: "",
    usn: getCurrentAccessUsn() || "",
    phone: "",
  });
  const [loginUsn, setLoginUsn] = useState(getCurrentAccessUsn() || "");
  const [loginOtp, setLoginOtp] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [details, setDetails] = useState({
    name: "",
    usn: getCurrentAccessUsn() || "",
    roomNumber: "",
    year: "",
    joiningYear: "",
    fatherName: "",
    motherName: "",
    fatherContact: "",
    motherContact: "",
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
  const [isEditingProfile, setIsEditingProfile] = useState(true);
  const [geoDialog, setGeoDialog] = useState<{
    open: boolean;
    title: string;
    desc?: string;
  }>({ open: false, title: "", desc: "" });
  const [studentTab, setStudentTab] = useState("profile");
  const accessRequest = useMemo(
    () => (accessUsn ? getLatestAccessRequestByUsn(accessUsn) : null),
    [accessUsn, now],
  );
  const isApproved = accessRequest?.status === "approved";
  const selected = useMemo(
    () => (currentStudentId ? getStudentPublic(currentStudentId) : undefined),
    [currentStudentId, now],
  );

  const isLoggedIn =
    !!selected &&
    !!accessUsn &&
    isApproved &&
    (selected.details.usn || "").toUpperCase() === accessUsn.toUpperCase();

  const flowStage = useMemo<"request" | "pending" | "login" | "student">(() => {
    // If the approved/pending request is missing (for example after DB reset),
    // show request form instead of a blank page.
    if (!accessUsn || !accessRequest) return "request";
    if (accessRequest.status !== "approved") return "pending";
    if (!isLoggedIn) return "login";
    return "student";
  }, [accessUsn, accessRequest?.id, accessRequest?.status, isLoggedIn]);

  useEffect(() => {
    const i = setInterval(() => {
      setNow(Date.now());
    }, 1500);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    requestBrowserNotificationPermission();
    const stop = startNotificationListener();
    return () => stop();
  }, []);

  useEffect(() => {
    if (!accessRequest || accessRequest.status !== "approved") {
      return;
    }

    const rec = ensureStudentRecordForUsn(
      accessRequest.usn,
      accessRequest.name,
      accessRequest.phone,
    );

    const legacyParentName = (rec.details as any).parentName || "";
    const legacyParentContact = (rec.details as any).parentContact || "";
    const savedFatherName = (rec.details as any).fatherName || legacyParentName;
    const savedMotherName = (rec.details as any).motherName || "";
    const savedFatherContact =
      (rec.details as any).fatherContact || legacyParentContact;
    const savedMotherContact = (rec.details as any).motherContact || "";
    const savedYear = (rec.details as any).year || "";
    const savedJoiningYear =
      (rec.details as any).joiningYear?.toString() ||
      (rec.details.joiningDate
        ? new Date(rec.details.joiningDate).getFullYear().toString()
        : "");

    setDetails({
      name: rec.details.name || accessRequest.name,
      usn: rec.details.usn || accessRequest.usn,
      roomNumber: rec.details.roomNumber || "",
      year: savedYear,
      joiningYear: savedJoiningYear,
      fatherName: savedFatherName,
      motherName: savedMotherName,
      fatherContact: savedFatherContact,
      motherContact: savedMotherContact,
      studentContact: rec.details.studentContact || accessRequest.phone,
      address: rec.details.address || "",
      email: rec.details.email || "",
      totalAmount: rec.details.totalAmount?.toString() || "",
      joiningDate: rec.details.joiningDate || "",
      profilePhotoDataUrl: rec.details.profilePhotoDataUrl || "",
      documents: rec.details.documents || [],
    });

    const isComplete =
      !!(
        rec.details.name &&
        savedFatherName &&
        savedMotherName &&
        savedFatherContact &&
        savedMotherContact &&
        savedYear &&
        savedJoiningYear &&
        rec.details.studentContact &&
        rec.details.address &&
        rec.details.email &&
        rec.details.totalAmount !== null &&
        rec.details.joiningDate &&
        rec.details.profilePhotoDataUrl &&
        (rec.details.documents || []).length
      );
    setIsEditingProfile(!isComplete);
  }, [accessRequest?.id, accessRequest?.status]);

  useEffect(() => {
    if (!accessUsn) return;
    setRequestForm((prev) => ({ ...prev, usn: accessUsn }));
    setLoginUsn(accessUsn);
    setDetails((prev) => ({ ...prev, usn: accessUsn }));
  }, [accessUsn]);

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

  async function sendOtp() {
    if (!isApproved || !accessRequest) {
      toast({
        title: "Not approved yet",
        description: "Wait for warden approval before logging in.",
        variant: "destructive",
      });
      return;
    }

    const usn = loginUsn.trim().toUpperCase();
    if (!usn) {
      toast({
        title: "USN required",
        description: "Enter your USN to receive OTP.",
        variant: "destructive",
      });
      return;
    }

    if (usn !== accessRequest.usn.toUpperCase()) {
      toast({
        title: "USN mismatch",
        description: "Use the same approved USN from your access request.",
        variant: "destructive",
      });
      return;
    }

    const student = ensureStudentRecordForUsn(
      accessRequest.usn,
      accessRequest.name,
      accessRequest.phone,
    );

    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      await setCredentials(student.id, { username: usn, password: otp });
      setSentOtp(otp);
      setOtpSentAt(Date.now());
      setStatus("OTP sent. Enter the 6-digit code to login.");
      toast({
        title: "OTP sent",
        description: `Demo OTP: ${otp}`,
      });
    } catch (error: any) {
      toast({
        title: "Could not send OTP",
        description: error?.message || "Failed to generate OTP.",
        variant: "destructive",
      });
    }
  }

  async function loginWithOtp() {
    const usn = loginUsn.trim().toUpperCase();
    const otp = loginOtp.trim();

    if (!usn || !otp) {
      toast({
        title: "Missing details",
        description: "Enter both USN and OTP.",
        variant: "destructive",
      });
      return;
    }

    if (!sentOtp) {
      toast({
        title: "OTP not sent",
        description: "Click Send OTP first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const student = await authenticateStudent(usn, otp);
      if (!student) {
        toast({
          title: "Invalid OTP",
          description: "Please check your OTP and try again.",
          variant: "destructive",
        });
        return;
      }

      setCurrentStudentId(student.id);
      setLoginOtp("");
      setStatus("Login successful.");
      toast({ title: "Welcome", description: "Student login successful." });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error?.message || "Could not validate OTP.",
        variant: "destructive",
      });
    }
  }

  async function removeAccountFromDevice() {
    if (!accessUsn) return;
    const latestApproved = getLatestAccessRequestByUsn(accessUsn);
    if (!latestApproved || latestApproved.status !== "approved") {
      toast({
        title: "No approved access",
        description: "Only approved accounts can be removed.",
        variant: "destructive",
      });
      return;
    }

    try {
      await submitAccessRequest({
        name: latestApproved.name,
        usn: latestApproved.usn,
        phone: latestApproved.phone,
      });
      logoutStudent();
      setCurrentStudentId(null);
      setSentOtp("");
      setOtpSentAt(null);
      setLoginOtp("");
      setStatus("Account removed. Waiting for warden approval again.");
      setNow(Date.now());
      toast({
        title: "Account removed",
        description: "A new access request has been sent for warden approval.",
      });
    } catch (error: any) {
      toast({
        title: "Could not remove account",
        description: error?.message || "Try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-white dark:to-background pb-28 md:pb-0">
      <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 sm:py-10">
        {flowStage === "request" ? (
          <Card>
            <CardHeader>
              <CardTitle>Request for Access</CardTitle>
              <CardDescription>
                Submit your Name, USN, and phone number. You will stay on this
                page until warden approval.
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
              <div className="sm:col-span-2">
                <Button
                  className="w-full"
                  onClick={async () => {
                    try {
                      const req = await submitAccessRequest(requestForm);
                      setAccessUsn(req.usn);
                      setRequestForm({ ...requestForm, usn: req.usn });
                      setStatus("Request submitted. Waiting for warden approval.");
                      setNow(Date.now());
                    } catch (e: any) {
                      toast({
                        title: "Could not submit request",
                        description: e?.message || "Try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Request for Access
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {flowStage === "pending" && accessRequest ? (
          <Card>
            <CardHeader>
              <CardTitle>Access Request Status</CardTitle>
              <CardDescription>
                Stay on this page until warden approves your request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className={cn("rounded-md border p-3 text-sm", {
                  "border-destructive/50 bg-destructive/5":
                    accessRequest.status === "rejected",
                  "border-green-500/50 bg-green-500/5":
                    accessRequest.status === "approved",
                })}
              >
                <div>
                  Current status:{" "}
                  <span
                    className={cn("font-medium", {
                      "text-destructive": accessRequest.status === "rejected",
                      "text-green-600": accessRequest.status === "approved",
                    })}
                  >
                    {accessRequest.status}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {accessRequest.status === "rejected"
                    ? "Your request was denied. Contact the warden."
                    : "Waiting for warden approval."}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Requested {new Date(accessRequest.requestedAt).toLocaleString()}
                  {accessRequest.approvedAt
                    ? ` · Approved ${new Date(accessRequest.approvedAt).toLocaleString()}`
                    : null}
                  {accessRequest.rejectedAt
                    ? ` · Denied ${new Date(accessRequest.rejectedAt).toLocaleString()}`
                    : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {flowStage === "login" && accessRequest ? (
          <Card>
            <CardHeader>
              <CardTitle>Student Login</CardTitle>
              <CardDescription>
                Use your approved USN. OTP is required to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Username (USN)</Label>
                <Input
                  value={loginUsn}
                  onChange={(e) => setLoginUsn(e.target.value)}
                  placeholder="e.g. 22CSE123"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={sendOtp}>Send OTP</Button>
                {otpSentAt ? (
                  <span className="text-xs text-muted-foreground self-center">
                    OTP sent at {new Date(otpSentAt).toLocaleTimeString()}
                  </span>
                ) : null}
              </div>
              <div>
                <Label>OTP</Label>
                <Input
                  value={loginOtp}
                  onChange={(e) => setLoginOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                />
              </div>
              <Button className="w-full" onClick={loginWithOtp}>
                Login as Student
              </Button>
              {status ? (
                <div className="text-sm text-muted-foreground">{status}</div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {flowStage === "student" ? (
          <>
            <div className="sticky top-0 z-30 -mx-4 mb-4 hidden border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:block md:-mx-6 md:px-6 md:py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h1 className="text-lg font-semibold md:text-xl">Student Dashboard</h1>
              <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs md:text-sm"
                onClick={() => {
                  logoutStudent();
                  setCurrentStudentId(null);
                  setSentOtp("");
                  setOtpSentAt(null);
                  setLoginOtp("");
                  setStatus("Logged out. Login required.");
                }}
              >
                Logout
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs md:text-sm"
                onClick={removeAccountFromDevice}
              >
                Remove
              </Button>
              </div>
            </div>
            </div>

            <Tabs value={studentTab} onValueChange={setStudentTab} className="w-full">
              <TabsList className="sticky top-14 z-20 hidden w-full flex-wrap justify-start gap-1 rounded-full bg-muted/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-muted/80 md:flex md:top-16">
                <TabsTrigger value="profile" className="rounded-full text-xs md:text-sm">
                  Profile
                </TabsTrigger>
                <TabsTrigger value="attendance" className="rounded-full text-xs md:text-sm">
                  Attendance
                </TabsTrigger>
                <TabsTrigger value="notifications" className="rounded-full text-xs md:text-sm">
                  Notifications
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Student Profile</CardTitle>
                    <CardDescription>
                      Fill and update your profile details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isApproved && accessUsn ? (
                  <form
                    ref={profileFormRef}
                    className="relative border rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-6"
                    onSubmit={async (e) => {
                      e.preventDefault();

                      if (!details.profilePhotoDataUrl) {
                        setStatus("Profile photo is required.");
                        return;
                      }
                      if (!details.documents.length) {
                        setStatus("At least one document is required.");
                        return;
                      }

                      try {
                        const saved = saveStudentDetailsByUsn(accessUsn, {
                          name: details.name,
                          usn: details.usn,
                          roomNumber: details.roomNumber,
                          year: details.year,
                          joiningYear: details.joiningYear ? Number(details.joiningYear) : null,
                          fatherName: details.fatherName,
                          motherName: details.motherName,
                          fatherContact: details.fatherContact,
                          motherContact: details.motherContact,
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

                        await syncStudentRecordToSql(saved);
                        window.dispatchEvent(new Event("student-data-updated"));

                        setCurrentStudentId(saved.id);
                        setNow(Date.now());
                        setStatus("Details saved successfully.");
                        setIsEditingProfile(false);
                      } catch (error: any) {
                        setStatus(
                          error?.message ||
                            "Profile saved locally, but SQL sync failed. Please try again.",
                        );
                        toast({
                          title: "Save failed",
                          description:
                            error?.message ||
                            "Profile saved locally, but SQL sync failed.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <div className="absolute top-4 sm:top-6 right-4 sm:right-6 w-24 sm:w-32 md:w-40 flex flex-col gap-2">
                      <Label className="text-xs sm:text-sm">Profile Photo</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => onUploadPhoto(e.currentTarget.files)}
                        disabled={!isEditingProfile}
                        className="text-xs h-8 sm:h-9"
                      />
                      {details.profilePhotoDataUrl ? (
                        <img
                          src={details.profilePhotoDataUrl}
                          alt="Profile"
                          className="w-full h-auto rounded-md object-cover ring-1 ring-border"
                        />
                      ) : (
                        <div className="flex h-24 sm:h-32 md:h-40 w-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                          Upload photo
                        </div>
                      )}
                    </div>

                    <div className="pr-4 sm:pr-6 md:pr-44 lg:pr-48">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <Label className="text-xs sm:text-sm">Name</Label>
                            <Input
                              value={details.name}
                              onChange={(e) =>
                                setDetails({ ...details, name: e.target.value })
                              }
                              required
                              disabled={!isEditingProfile}
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label className="text-xs sm:text-sm">USN</Label>
                            <Input
                              value={details.usn}
                              onChange={(e) =>
                                setDetails({
                                  ...details,
                                  usn: e.target.value.toUpperCase(),
                                })
                              }
                              required
                              disabled={!isEditingProfile}
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label className="text-xs sm:text-sm">Room Number</Label>
                            <Input
                              value={details.roomNumber}
                              onChange={(e) =>
                                setDetails({
                                  ...details,
                                  roomNumber: e.target.value,
                                })
                              }
                              placeholder="e.g. A-101"
                              disabled={!isEditingProfile}
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm">Year</Label>
                            <select
                              className="h-9 sm:h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
                              value={details.year}
                              onChange={(e) =>
                                setDetails({ ...details, year: e.target.value })
                              }
                              disabled={!isEditingProfile}
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
                            <Label className="text-xs sm:text-sm">Joining Year</Label>
                            <Input
                              type="number"
                              value={details.joiningYear}
                              onChange={(e) =>
                                setDetails({
                                  ...details,
                                  joiningYear: e.target.value,
                                })
                              }
                              required
                              disabled={!isEditingProfile}
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm">Father Name</Label>
                            <Input
                              value={details.fatherName}
                              onChange={(e) =>
                                setDetails({ ...details, fatherName: e.target.value })
                              }
                              required
                              disabled={!isEditingProfile}
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm">Mother Name</Label>
                            <Input
                              value={details.motherName}
                              onChange={(e) =>
                                setDetails({ ...details, motherName: e.target.value })
                              }
                              required
                              disabled={!isEditingProfile}
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm">Father Contact</Label>
                            <Input
                              value={details.fatherContact}
                              onChange={(e) =>
                                setDetails({
                                  ...details,
                                  fatherContact: e.target.value,
                                })
                              }
                              required
                              disabled={!isEditingProfile}
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm">Mother Contact</Label>
                            <Input
                              value={details.motherContact}
                              onChange={(e) =>
                                setDetails({
                                  ...details,
                                  motherContact: e.target.value,
                                })
                              }
                              required
                              disabled={!isEditingProfile}
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm">Student Contact</Label>
                            <Input
                              value={details.studentContact}
                              onChange={(e) =>
                                setDetails({
                                  ...details,
                                  studentContact: e.target.value,
                                })
                              }
                              required
                              disabled={!isEditingProfile}
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm">Email</Label>
                            <Input
                              type="email"
                              value={details.email}
                              onChange={(e) =>
                                setDetails({ ...details, email: e.target.value })
                              }
                              required
                              disabled={!isEditingProfile}
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label className="text-xs sm:text-sm">Address</Label>
                            <Textarea
                              value={details.address}
                              onChange={(e) =>
                                setDetails({ ...details, address: e.target.value })
                              }
                              required
                              disabled={!isEditingProfile}
                              className="min-h-20 sm:min-h-24 text-sm resize-none"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm">Total Amount / Fee</Label>
                            <Input
                              type="number"
                              value={details.totalAmount}
                              onChange={(e) =>
                                setDetails({ ...details, totalAmount: e.target.value })
                              }
                              required
                              disabled={!isEditingProfile}
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm">Joining Date</Label>
                            <Input
                              type="date"
                              value={details.joiningDate}
                              onChange={(e) =>
                                setDetails({ ...details, joiningDate: e.target.value })
                              }
                              required
                              disabled={!isEditingProfile}
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label className="text-xs sm:text-sm">Documents</Label>
                            <Input
                              type="file"
                              multiple
                              onChange={(e) => onUploadDocs(e.currentTarget.files)}
                              disabled={!isEditingProfile}
                              className="text-xs sm:text-sm h-9 sm:h-10"
                            />
                            {details.documents.length ? (
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs sm:text-sm">
                                {details.documents.map((d, i) => (
                                  <li key={i} className="truncate">
                                    {d.name}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            type="button"
                            variant={isEditingProfile ? "default" : "outline"}
                            onClick={() => {
                              if (!isEditingProfile) {
                                setStatus("");
                                setIsEditingProfile(true);
                                return;
                              }
                              profileFormRef.current?.requestSubmit();
                            }}
                            className="text-sm sm:text-base"
                          >
                            {isEditingProfile ? "Save Changes" : "Edit Info"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Your profile unlocks after approval and login.
                  </div>
                )}

                {!selected ? (
                  <div className="text-sm text-muted-foreground">No saved details yet.</div>
                ) : null}
              </CardContent>
            </Card>
              </TabsContent>

              <TabsContent value="notifications" className="mt-6">
                <NotificationCenterV2
                  title="Student Notifications"
                  description="Latest updates from warden/admin are listed here."
                />
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

            {/* Mobile Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
              <div className="w-full flex divide-x divide-border">
                <button
                  onClick={() => setStudentTab("profile")}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-medium transition-colors",
                    studentTab === "profile"
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <User className="h-5 w-5" />
                  <span className="line-clamp-1">Profile</span>
                </button>
                <button
                  onClick={() => setStudentTab("attendance")}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-medium transition-colors",
                    studentTab === "attendance"
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Clock className="h-5 w-5" />
                  <span className="line-clamp-1">Attendance</span>
                </button>
                <button
                  onClick={() => setStudentTab("notifications")}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-medium transition-colors",
                    studentTab === "notifications"
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Bell className="h-5 w-5" />
                  <span className="line-clamp-1">Alerts</span>
                </button>
              </div>
            </div>
          </>
        ) : null}

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
