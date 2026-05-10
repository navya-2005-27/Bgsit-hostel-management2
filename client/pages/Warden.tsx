import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  KeyRound,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
  Shield,
  QrCode,
  Bell,
  PieChart,
  Users,
  Clock,
  Download,
} from "lucide-react";
import {
  StudentRecord,
  StudentId,
  listPendingAccessRequests,
  listAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  listStudents,
  hydrateStudentsFromSql,
  createStudent,
  setCredentials,
  resetPassword,
  suggestUsername,
  generatePassword,
  // Attendance
  AttendanceSession,
  createAttendanceSession,
  getActiveAttendanceSession,
  listAttendanceForDate,
  setManualPresence,
  finalizeAttendance,
  getAbsenteesForDate,
  dateKey as getDateKey,
  getHostelSettings,
  setHostelSettings,
  HostelSettings,
  // Mess
  WEEK_DAYS,
  MEALS3,
  getActiveWeeklyPoll,
  createWeeklyPoll,
  closeWeeklyPoll,
  getWeeklyResults,
  createDailyMealPoll,
  getActiveDailyMealPolls,
  listDailyPollsForDate,
  closeDailyMealPoll,
  MEAL_SLOTS,
  skippedMealsCount,
  // Payments
  paymentSummaryAll,
  addPayment,
  listPaymentsByStudent,
  paymentTotals,
  exportPaymentsCSV,
  // Complaints
  listComplaints,
  setComplaintStatus,
  complaintDaysTaken,
} from "@/lib/studentStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { PaymentsOverview, StudentPaymentPanel } from "./components.payments";
import {
  EventCreator,
  EventProposals,
  AllEventsTable,
  EventAnalytics,
} from "./components.events.warden";
import {
  createEvent as createEventRecord,
  approveEvent,
  rejectEvent,
  completeEvent,
  listPendingProposals as listEventProposals,
  listEvents as listAllEvents,
  eventAnalytics,
} from "@/lib/eventStore";
import { useToast } from "@/hooks/use-toast";
import { WardenRoomsPanel } from "./components.rooms.warden";
import { WardenParcelsPanel } from "./components.parcels.warden";
import { StudentManagementPanel } from "@/components/StudentManagementPanel";
import { NotificationCenter } from "@/components/NotificationCenter";
import { StudentTablePanel } from "@/components/StudentTablePanel";
import { NotificationCenterV2 } from "@/components/NotificationCenterV2";
import {
  authenticateWarden,
  isWardenLoggedIn,
  logoutWarden,
} from "@/lib/adminStore";
import { useNavigate } from "react-router-dom";

export default function Warden() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(() => isWardenLoggedIn());
  const [wardenUsername, setWardenUsername] = useState("");
  const [wardenPassword, setWardenPassword] = useState("");
  const [activeTab, setActiveTab] = useState("access");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<StudentId | "new" | "">("");
  const [showPassword, setShowPassword] = useState(false);

  // Account form state
  const [studentName, setStudentName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Details form state
  const [pendingAccess, setPendingAccess] = useState(() =>
    listPendingAccessRequests(),
  );
  const [accessHistory, setAccessHistory] = useState(() => listAccessRequests());
  const [accessHistorySearch, setAccessHistorySearch] = useState("");
  const [accessHistoryBlock, setAccessHistoryBlock] = useState("all");

  // Attendance state
  const [session, setSession] = useState<AttendanceSession | null>(
    getActiveAttendanceSession(),
  );
  const [qrImageUrl, setQrImageUrl] = useState<string>("");
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string>(getDateKey());
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [settings, setSettings] = useState<HostelSettings | null>(
    getHostelSettings(),
  );

  // Mess state
  const [weeklyOptions, setWeeklyOptions] = useState(
    "Idli, Upma, Poha, Dosa, Paratha",
  );
  const [weeklyActive, setWeeklyActive] = useState(() => getActiveWeeklyPoll());
  const [activeDayPolls, setActiveDayPolls] = useState(() =>
    getActiveDailyMealPolls(),
  );

  useEffect(() => {
    void hydrateStudentsFromSql().then((rows) => setStudents(rows));
  }, []);

  useEffect(() => {
    if (studentName && !username) setUsername(suggestUsername(studentName));
  }, [studentName, username]);

  useEffect(() => {
    const refreshStudents = () => {
      void hydrateStudentsFromSql().then((rows) => setStudents(rows));
    };
    window.addEventListener("student-data-updated", refreshStudents);
    return () => window.removeEventListener("student-data-updated", refreshStudents);
  }, []);

  useEffect(() => {
    const i = setInterval(() => {
      setNow(Date.now());
      setSession(getActiveAttendanceSession());
      setWeeklyActive(getActiveWeeklyPoll());
      setActiveDayPolls(getActiveDailyMealPolls());
      setPendingAccess(listPendingAccessRequests());
      setAccessHistory(listAccessRequests());
    }, 1000);
    return () => clearInterval(i);
  }, []);

  // Generate QR code whenever session changes
  useEffect(() => {
    if (!session || !session.token) {
      setQrImageUrl("");
      return;
    }
    
    QRCode.toDataURL(session.token, {
      width: 220,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => {
        console.log("QR generated successfully for token:", session.token);
        setQrImageUrl(url);
      })
      .catch((error) => {
        console.error("QR generation failed:", error);
        setQrImageUrl("");
      });
  }, [session?.id, session?.token]);

  const selected = useMemo(
    () => students.find((s) => s.id === selectedId),
    [students, selectedId],
  );

  // Deduplicate access history by USN (keep latest), add room numbers, group by block
  const processedAccessHistory = useMemo(() => {
    const deduped = new Map();
    const parseRoom = (room: string) => {
      if (room === "—") return { block: "Z", num: Infinity };
      const match = room.match(/^([A-Z])[-\s]?(\d+)$/i);
      if (match) {
        return { block: match[1].toUpperCase(), num: parseInt(match[2], 10) };
      }
      return { block: "Z", num: Infinity };
    };
    
    // Keep only the latest entry for each USN
    accessHistory.forEach((req) => {
      const existing = deduped.get(req.usn);
      if (!existing || new Date(req.requestedAt) > new Date(existing.requestedAt)) {
        deduped.set(req.usn, req);
      }
    });

    let history = Array.from(deduped.values());

    // Add room number from student details
    history = history.map((req) => {
      const student = students.find(
        (s) => (s.details?.usn || "").toUpperCase() === (req.usn || "").toUpperCase()
      );
      return {
        ...req,
        roomNumber: student?.details?.roomNumber || "—",
      };
    });

    // Filter by search (name or USN only)
    if (accessHistorySearch.trim()) {
      const search = accessHistorySearch.toLowerCase();
      history = history.filter(
        (req) =>
          req.name.toLowerCase().includes(search) ||
          req.usn.toLowerCase().includes(search)
      );
    }

    if (accessHistoryBlock !== "all") {
      history = history.filter((req) => {
        const roomData = parseRoom(req.roomNumber);
        return roomData.block === accessHistoryBlock;
      });
    }

    const grouped = new Map<string, typeof history>();
    history.forEach((item) => {
      const roomData = parseRoom(item.roomNumber);
      const block = roomData.block;
      if (!grouped.has(block)) {
        grouped.set(block, []);
      }
      grouped.get(block)!.push(item);
    });

    // Sort each group by room number and return as array of { block, items }
    const blocks = ["A", "B", "C", "D", "Z"];
    return blocks
      .map((block) => {
        const items = grouped.get(block) || [];
        items.sort((a, b) => {
          const roomA = parseRoom(a.roomNumber);
          const roomB = parseRoom(b.roomNumber);
          return roomA.num - roomB.num;
        });
        return { block, items };
      })
      .filter((g) => g.items.length > 0);
  }, [accessHistory, students, accessHistorySearch, accessHistoryBlock]);

  const refresh = () => {
    void hydrateStudentsFromSql().then((rows) => setStudents(rows));
  };

  async function handleCreateLogin() {
    const name = studentName.trim();
    if (!name) {
      toast({
        title: "Name required",
        description: "Enter student name first.",
      });
      return;
    }
    const user = username.trim() || suggestUsername(name);
    const pass = password || generatePassword();

    const record = createStudent({ name });
    try {
      await setCredentials(record.id, { username: user, password: pass });
      refresh();
      setSelectedId(record.id);
      setShowPassword(false);
      toast({ title: "Login created", description: `Roll number: ${user}` });
    } catch (error: any) {
      toast({
        title: "Could not create login",
        description: error?.message || "Failed to sync student credentials.",
        variant: "destructive",
      });
    }
  }

  async function handleResetPassword() {
    if (!selected) {
      toast({
        title: "Select a student",
        description: "Choose a student to reset password.",
      });
      return;
    }
    const pass = generatePassword();
    try {
      await resetPassword(selected.id, pass);
      refresh();
      setShowPassword(false);
      toast({ title: "Password reset", description: `New password generated.` });
    } catch (error: any) {
      toast({
        title: "Could not reset password",
        description: error?.message || "Failed to sync student password.",
        variant: "destructive",
      });
    }
  }

  // ----- Attendance helpers
  const activeDate = session?.dateKey || getDateKey();
  const attendance = listAttendanceForDate(activeDate);
  const presentSet = new Set(
    attendance.filter((a) => a.status === "present").map((a) => a.studentId),
  );
  const remainingMs = session ? Math.max(0, session.expiresAt - now) : 0;
  const countdown = session
    ? new Date(remainingMs).toISOString().slice(14, 19)
    : "00:00";

  function startSession() {
    const s = createAttendanceSession();
    setSession(s);
    
    // Generate QR code immediately
    QRCode.toDataURL(s.token, {
      width: 220,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => {
        console.log("QR generated immediately:", url.substring(0, 50) + "...");
        setQrImageUrl(url);
      })
      .catch((error) => {
        console.error("QR generation failed immediately:", error);
        setQrImageUrl("");
      });
    
    toast({ title: "QR generated", description: "Valid for 1 hour." });
  }

  function submitAttendance() {
    finalizeAttendance(activeDate);
    setSession(getActiveAttendanceSession());
    toast({
      title: "Attendance submitted",
      description: "Locked for the day.",
    });
  }

  function saveSettings() {
    if (!settings) return;
    setHostelSettings(settings);
    toast({
      title: "Geofence saved",
      description: `${settings.radiusM}m radius`,
    });
  }

  const absentees = useMemo(
    () => getAbsenteesForDate(activeDate),
    [activeDate, now, session],
  );

  async function sendAllParentNotifications() {
    if (isSendingNotifications) return;
    const targets = absentees
      .map((s) => ({
        name: s.details.name,
        phone: (
          s.details.fatherContact ||
          s.details.motherContact ||
          s.details.parentContact ||
          s.details.studentContact
        ).replace(/[^0-9]/g, ""),
      }))
      .filter((x) => x.phone);

    if (!targets.length) {
      toast({
        title: "No parent numbers",
        description: "No valid parent or student contact numbers were found.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSendingNotifications(true);
      const response = await fetch("/api/notifications/absentees-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: activeDate,
          absentees: targets,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.message || "Failed to send notifications");
      }
      toast({
        title: "Notifications sent",
        description: `Sent to ${payload.sentCount ?? targets.length} parent(s).`,
      });
    } catch (e: any) {
      toast({
        title: "Send failed",
        description: e?.message || "Could not send WhatsApp notifications.",
        variant: "destructive",
      });
    } finally {
      setIsSendingNotifications(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-white dark:to-background">
        <div className="mx-auto grid min-h-screen max-w-md place-items-center px-6 py-10">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Warden Login
              </CardTitle>
              <CardDescription>
                Sign in with credentials set by Admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Username</Label>
                <Input
                  value={wardenUsername}
                  onChange={(e) => setWardenUsername(e.target.value)}
                  placeholder="warden"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={wardenPassword}
                  onChange={(e) => setWardenPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              <Button
                className="w-full"
                onClick={async () => {
                  try {
                    const ok = await authenticateWarden(wardenUsername, wardenPassword);
                    if (!ok) {
                      toast({
                        title: "Invalid warden credentials",
                        description: "Please check username and password.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setIsLoggedIn(true);
                    toast({ title: "Welcome, Warden" });
                  } catch (error: any) {
                    toast({
                      title: "Could not sign in",
                      description: error?.message || "Login validation failed.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Login as Warden
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-white dark:to-background pb-28 md:pb-0">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-0 z-30 -mx-4 mb-5 hidden border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:block md:-mx-6 md:px-6 md:py-4">
            <div className="flex items-start justify-between gap-2 md:items-center md:gap-3">
              <div className="flex min-w-0 items-center gap-2 md:gap-3">
                <Shield className="h-5 w-5 shrink-0 text-primary md:h-6 md:w-6" />
                <h1 className="truncate text-lg font-bold md:text-2xl">Warden Section</h1>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  logoutWarden();
                  setIsLoggedIn(false);
                }}
              >
                Logout
              </Button>
            </div>
            <TabsList className="mt-4 w-full flex-wrap justify-start gap-2 rounded-full bg-muted/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
              <TabsTrigger value="access">Access Requests</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="attendance">Attendance Management</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="notifications" className="mt-4 sm:mt-6">
            <NotificationCenterV2 canPost canDelete />
          </TabsContent>

          <TabsContent value="students" className="mt-4 sm:mt-6">
            <StudentTablePanel
              students={students}
              onViewDetails={(student: StudentRecord) => {
                navigate(`/warden/student/${student.id}`);
              }}
            />
          </TabsContent>          

          {/* Access Requests */}
          <TabsContent value="access" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Incoming Student Access Requests</CardTitle>
                <CardDescription>
                  Approve a request to unlock the full registration form in the
                  student section.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingAccess.length ? (
                  pendingAccess.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-md border p-3 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-medium">{req.name}</div>
                        <div className="text-muted-foreground">
                          USN: {req.usn} | Phone: {req.phone}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Requested {new Date(req.requestedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          onClick={async () => {
                            try {
                              await approveAccessRequest(req.id);
                              setPendingAccess(listPendingAccessRequests());
                              setAccessHistory(listAccessRequests());
                              refresh();
                              toast({
                                title: "Request approved",
                                description: `${req.name} can now complete profile details.`,
                              });
                            } catch (e: any) {
                              toast({
                                title: "Could not approve",
                                description: e?.message || "Unknown error",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="flex-1 sm:flex-none"
                        >
                          Accept
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            try {
                              await rejectAccessRequest(req.id);
                              setPendingAccess(listPendingAccessRequests());
                              setAccessHistory(listAccessRequests());
                              refresh();
                              toast({
                                title: "Request denied",
                                description: `${req.name} has been denied access.`,
                              });
                            } catch (e: any) {
                              toast({
                                title: "Could not deny",
                                description: e?.message || "Unknown error",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="flex-1 sm:flex-none"
                        >
                          Deny
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No pending access requests.
                  </div>
                )}

                <div className="pt-4 border-t space-y-4">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Recent Decisions & History</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Search by name or USN..."
                        value={accessHistorySearch}
                        onChange={(e) => setAccessHistorySearch(e.target.value)}
                        className="h-9 text-sm"
                      />
                      <select
                        value={accessHistoryBlock}
                        onChange={(e) => setAccessHistoryBlock(e.target.value)}
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="all">All blocks</option>
                        <option value="A">Block A</option>
                        <option value="B">Block B</option>
                        <option value="C">Block C</option>
                        <option value="D">Block D</option>
                        <option value="Z">Unassigned</option>
                      </select>
                    </div>
                  </div>
                  {processedAccessHistory.length ? (
                    processedAccessHistory.map((group) => (
                      <div key={`block-${group.block}`} className="space-y-2">
                        <div className="text-sm font-semibold text-primary">
                          {group.block === "Z" ? "Unassigned" : `Block ${group.block}`}
                        </div>
                        <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                          {group.items.slice(0, 10).map((req: any) => (
                            <div
                              key={`${req.id}-history`}
                              className="rounded-md border px-3 py-2 text-sm flex flex-col gap-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{req.name}</span>
                                <span
                                  className={cn("text-xs font-medium capitalize", {
                                    "text-amber-600": req.status === "pending",
                                    "text-green-600": req.status === "approved",
                                    "text-destructive": req.status === "rejected",
                                  })}
                                >
                                  {req.status}
                                </span>
                              </div>
                              <div className="text-muted-foreground text-xs">
                                USN: {req.usn} | Room: {req.roomNumber} | Requested {new Date(req.requestedAt).toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {req.approvedAt
                                  ? `Approved ${new Date(req.approvedAt).toLocaleString()}`
                                  : req.rejectedAt
                                  ? `Denied ${new Date(req.rejectedAt).toLocaleString()}`
                                  : "Waiting for warden review."}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {accessHistory.length === 0
                        ? "No access request history yet."
                        : "No results matching your search."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mess Management */}
          <TabsContent value="mess" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" /> Weekly Menu Poll
                  </CardTitle>
                  <CardDescription>
                    Create a weekly poll with options applied to all meals.
                    Students vote for each meal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!weeklyActive ? (
                    <div className="space-y-2">
                      <Label>Options (comma-separated)</Label>
                      <Input
                        value={weeklyOptions}
                        onChange={(e) => setWeeklyOptions(e.target.value)}
                      />
                      <Button
                        onClick={() => {
                          createWeeklyPoll(
                            weeklyOptions
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          );
                          setWeeklyActive(getActiveWeeklyPoll());
                        }}
                      >
                        Create Weekly Poll
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-md border p-3 text-sm">
                        Week starting {weeklyActive.weekKey}. Poll is live.
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          closeWeeklyPoll();
                          setWeeklyActive(getActiveWeeklyPoll());
                        }}
                      >
                        Close Weekly Poll
                      </Button>
                      {(() => {
                        const r = getWeeklyResults();
                        if (!r) return null;
                        return (
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            {WEEK_DAYS.map((d) => (
                              <div key={d} className="rounded-md border p-3">
                                <div className="mb-2 font-medium">{d}</div>
                                {MEALS3.map((m) => (
                                  <div key={m} className="mb-2">
                                    <div className="mb-1 text-xs text-muted-foreground">
                                      {m}
                                    </div>
                                    {r.result[d][m].map((row) => (
                                      <div key={row.option} className="mb-1">
                                        <div className="flex items-center justify-between text-xs">
                                          <span>{row.option}</span>
                                          <span>{row.percent}%</span>
                                        </div>
                                        <Progress value={row.percent} />
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Daily Food Attendance</CardTitle>
                  <CardDescription>
                    Start quick polls per meal with cutoff time and optional
                    menu text.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {MEAL_SLOTS.map((meal) => (
                    <div key={meal} className="rounded-md border p-3 space-y-2">
                      <div className="text-sm font-medium">{meal}</div>
                      <Input
                        placeholder="Menu (optional)"
                        id={`menu-${meal}`}
                      />
                      <Input
                        placeholder="Cutoff minutes"
                        defaultValue={60}
                        id={`cut-${meal}`}
                      />
                      <Button
                        onClick={() => {
                          const menu =
                            (
                              document.getElementById(
                                `menu-${meal}`,
                              ) as HTMLInputElement
                            )?.value || "";
                          const cut = Number(
                            (
                              document.getElementById(
                                `cut-${meal}`,
                              ) as HTMLInputElement
                            )?.value || 60,
                          );
                          createDailyMealPoll(meal as any, {
                            cutoffMinutes: cut,
                            menuText: menu,
                          });
                          setActiveDayPolls(getActiveDailyMealPolls());
                        }}
                      >
                        Start
                      </Button>
                    </div>
                  ))}

                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      Active polls today
                    </div>
                    {activeDayPolls.length ? (
                      activeDayPolls.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-md border p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              {p.meal} • ends{" "}
                              {new Date(p.cutoffAt).toLocaleTimeString()}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                closeDailyMealPoll(p.id);
                                setActiveDayPolls(getActiveDailyMealPolls());
                              }}
                            >
                              Close
                            </Button>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Responses: {Object.keys(p.responses).length} /{" "}
                            {students.length}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No active polls
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      Skipped meals this month
                    </div>
                    <ul className="space-y-1 text-sm">
                      {students.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between"
                        >
                          <span className="truncate">{s.details.name}</span>
                          <span className="text-muted-foreground">
                            {skippedMealsCount(s.id)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Events */}
          <TabsContent value="events" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Create Event</CardTitle>
                  <CardDescription>
                    Warden can create events directly. Students will see
                    approved events in feed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EventCreator />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Proposals & Analytics</CardTitle>
                  <CardDescription>
                    Approve/reject student proposals. See participation
                    insights.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EventProposals />
                  <div className="mt-4">
                    <EventAnalytics />
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>All Events</CardTitle>
                  <CardDescription>
                    Manage status and view participants.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AllEventsTable />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rooms */}
          <TabsContent value="rooms" className="mt-6">
            <WardenRoomsPanel />
          </TabsContent>

          {/* Payments */}
          <TabsContent value="payments" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Payments Dashboard</CardTitle>
                  <CardDescription>
                    View all students and filter by payment status. Export as
                    CSV or print.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentsOverview />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Student Report</CardTitle>
                  <CardDescription>
                    Add or update payments, view history.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StudentPaymentPanel students={students} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Complaints */}
          <TabsContent value="complaints" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Complaint Dashboard</CardTitle>
                <CardDescription>
                  Review, prioritize by upvotes, and mark completed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2">Complaint ID</th>
                        <th className="p-2">Complaint Text</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Submitted</th>
                        <th className="p-2">Upvotes</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Days Taken</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listComplaints().map((c) => (
                        <tr key={c.id} className="border-t align-top">
                          <td className="p-2 font-mono text-xs">
                            {c.id.slice(-8)}
                          </td>
                          <td className="p-2 max-w-md">{c.text}</td>
                          <td className="p-2">{c.category}</td>
                          <td className="p-2">
                            {new Date(c.submittedAt).toLocaleString()}
                          </td>
                          <td className="p-2">{c.upvotes}</td>
                          <td className="p-2">
                            {c.status === "pending" ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setComplaintStatus(c.id, "done");
                                }}
                              >
                                Mark Done ✅
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setComplaintStatus(c.id, "pending");
                                }}
                              >
                                Reopen
                              </Button>
                            )}
                          </td>
                          <td className="p-2">
                            {c.doneAt ? complaintDaysTaken(c) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parcels */}
          <TabsContent value="parcels" className="mt-6">
            <WardenParcelsPanel />
          </TabsContent>

          {/* Attendance */}
          <TabsContent value="attendance" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" /> QR Code
                  </CardTitle>
                  <CardDescription>
                    Generate a QR valid for 1 hour. Students scan to mark
                    present.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {session ? (
                    <div className="space-y-3">
                      <div className="rounded-lg border p-3 text-center">
                        <img
                          alt="QR"
                          className="mx-auto aspect-square h-52 w-52"
                          src={qrImageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Crect fill='%23f0f0f0' width='220' height='220'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='14'%3EGenerating QR...%3C/text%3E%3C/svg%3E"}
                        />
                        <div className="mt-2 text-sm text-muted-foreground">
                          Expires in {countdown}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Date: {activeDate}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-left">
                          <input
                            readOnly
                            className="col-span-2 rounded-md border px-3 py-2 text-xs"
                            value={session.token}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  session.token,
                                );
                                alert("Token copied");
                              } catch {
                                alert("Copy failed. Select and copy manually.");
                              }
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Share token for manual entry if scanning fails.
                        </div>
                      </div>
                      <Button
                        onClick={submitAttendance}
                        variant="secondary"
                        className="w-full"
                      >
                        Submit Attendance
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={startSession} className="w-full">
                      Generate QR
                    </Button>
                  )}

                  <div className="pt-2">
                    <div className="mb-2 text-sm font-medium">Geofence</div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Latitude"
                        value={settings?.center.lat ?? ""}
                        onChange={(e) =>
                          setSettings({
                            center: {
                              lat: Number(e.target.value || 0),
                              lng: settings?.center.lng ?? 0,
                            },
                            radiusM: settings?.radiusM ?? 50,
                          })
                        }
                      />
                      <Input
                        placeholder="Longitude"
                        value={settings?.center.lng ?? ""}
                        onChange={(e) =>
                          setSettings({
                            center: {
                              lat: settings?.center.lat ?? 0,
                              lng: Number(e.target.value || 0),
                            },
                            radiusM: settings?.radiusM ?? 50,
                          })
                        }
                      />
                      <Input
                        placeholder="Radius (m)"
                        value={settings?.radiusM ?? 50}
                        onChange={(e) =>
                          setSettings({
                            center: settings?.center ?? { lat: 0, lng: 0 },
                            radiusM: Number(e.target.value || 0),
                          })
                        }
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button onClick={saveSettings} variant="outline">
                        Save Geofence
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          try {
                            const pos = await new Promise<GeolocationPosition>(
                              (resolve, reject) =>
                                navigator.geolocation.getCurrentPosition(
                                  resolve,
                                  reject,
                                ),
                            );
                            setSettings({
                              center: {
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude,
                              },
                              radiusM: settings?.radiusM ?? 50,
                            });
                          } catch {
                            alert("Unable to access location.");
                          }
                        }}
                      >
                        Use current location
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Attendance Sheet</CardTitle>
                  <CardDescription>
                    Select a date, toggle present/absent, and export to Excel.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                    <div>
                      <Label htmlFor="attendance-date">Select Date</Label>
                      <Input
                        id="attendance-date"
                        type="date"
                        value={selectedAttendanceDate}
                        onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="attendance-block">Block</Label>
                      <select
                        id="attendance-block"
                        className="h-10 rounded-md border bg-background px-3 text-sm mt-1"
                        value={selectedBlock}
                        onChange={(e) => setSelectedBlock(e.target.value)}
                      >
                        <option value="all">All Blocks</option>
                        <option value="A">Block A</option>
                        <option value="B">Block B</option>
                        <option value="C">Block C</option>
                        <option value="D">Block D</option>
                      </select>
                    </div>
                    <Button
                      onClick={() => {
                        const attendanceData = listAttendanceForDate(selectedAttendanceDate);
                        const presentSet = new Set(
                          attendanceData.filter((a) => a.status === "present").map((a) => a.studentId)
                        );

                        const exportRows: any[] = [];
                        const roomMap = new Map<string, typeof students>();

                        students.forEach((s) => {
                          const room = s.details.roomNumber || "Unassigned";
                          if (!roomMap.has(room)) {
                            roomMap.set(room, []);
                          }
                          roomMap.get(room)!.push(s);
                        });

                        function roomBlock(room: string) {
                          const m = String(room || "").trim().match(/^([A-Za-z])/);
                          const b = m ? m[1].toUpperCase() : "";
                          if (["A","B","C","D"].includes(b)) return b;
                          return "Z"; // Unassigned
                        }

                        const filteredRooms = Array.from(roomMap.keys()).filter((r) => {
                          if (selectedBlock === "all") return true;
                          return roomBlock(r) === selectedBlock;
                        });

                        const sortedRooms = filteredRooms.sort((a, b) => {
                          if (a === "Unassigned") return 1;
                          if (b === "Unassigned") return -1;
                          return a.localeCompare(b, undefined, { numeric: true });
                        });

                        sortedRooms.forEach((room) => {
                          const roomStudents = roomMap.get(room) || [];
                          roomStudents.forEach((s) => {
                            const present = presentSet.has(s.id);
                            exportRows.push({
                              Room: room,
                              Name: s.details.name,
                              USN: s.details.usn || s.credentials?.username || "-",
                              Status: present ? "Present" : "Absent",
                            });
                          });
                        });

                        const ws = XLSX.utils.json_to_sheet(exportRows);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Attendance");
                        XLSX.writeFile(wb, `attendance_${selectedAttendanceDate}.xlsx`);
                        toast({ title: "Exported", description: "Attendance data exported to Excel." });
                      }}
                    >
                      Download Excel
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {useMemo(() => {
                      const attendanceData = listAttendanceForDate(selectedAttendanceDate);
                      const presentSet = new Set(
                        attendanceData.filter((a) => a.status === "present").map((a) => a.studentId)
                      );

                      const roomMap = new Map<string, typeof students>();
                      students.forEach((s) => {
                        const room = s.details.roomNumber || "Unassigned";
                        if (!roomMap.has(room)) {
                          roomMap.set(room, []);
                        }
                        roomMap.get(room)!.push(s);
                      });

                      function roomBlock(room: string) {
                        const m = String(room || "").trim().match(/^([A-Za-z])/);
                        const b = m ? m[1].toUpperCase() : "";
                        if (["A","B","C","D"].includes(b)) return b;
                        return "Z";
                      }

                      const filteredRooms = Array.from(roomMap.keys())
                        .filter((r) => selectedBlock === "all" ? true : roomBlock(r) === selectedBlock)
                        .sort((a, b) => {
                          if (a === "Unassigned") return 1;
                          if (b === "Unassigned") return -1;
                          return a.localeCompare(b, undefined, { numeric: true });
                        });

                      return filteredRooms.map((room) => {
                        const roomStudents = roomMap.get(room) || [];
                        const present = roomStudents.filter((s) => presentSet.has(s.id)).length;

                        return (
                          <div key={room} className="rounded-lg border p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">
                                {room}
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {present}/{roomStudents.length} present
                                </span>
                              </h4>
                            </div>
                            <div className="space-y-1.5 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
                              {roomStudents.map((s) => {
                                const isPresent = presentSet.has(s.id);
                                return (
                                  <div
                                    key={s.id}
                                    className="flex items-center justify-between rounded-md bg-muted/50 p-2"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-sm font-medium">
                                        {s.details.name}
                                      </div>
                                      <div className="truncate text-xs text-muted-foreground">
                                        {s.details.usn || s.credentials?.username || "-"}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Button
                                        size="sm"
                                        variant={isPresent ? "default" : "outline"}
                                        onClick={() =>
                                          setManualPresence(selectedAttendanceDate, s.id, true)
                                        }
                                        className="h-7 px-2 text-xs"
                                      >
                                        P
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={!isPresent ? "destructive" : "outline"}
                                        onClick={() =>
                                          setManualPresence(selectedAttendanceDate, s.id, false)
                                        }
                                        className="h-7 px-2 text-xs"
                                      >
                                        A
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    }, [selectedAttendanceDate, students, now, selectedBlock])}
                  </div>

                  {session && selectedAttendanceDate === activeDate ? (
                    <Button onClick={submitAttendance} className="w-full">
                      Submit Attendance
                    </Button>
                  ) : null}

                  {useMemo(() => {
                    if (selectedAttendanceDate !== activeDate) return null;
                    const attendanceData = listAttendanceForDate(selectedAttendanceDate);
                    const presentSet = new Set(
                      attendanceData.filter((a) => a.status === "present").map((a) => a.studentId)
                    );
                    const absentCount = students.length - presentSet.size;
                    
                    if (!absentCount) return null;
                    
                    return (
                      <div className="rounded-md border p-3 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Bell className="h-4 w-4" /> Parent Notifications
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {absentCount} absent student(s) will receive notification for today.
                        </div>
                        <Button
                          className="w-full"
                          onClick={sendAllParentNotifications}
                          disabled={isSendingNotifications}
                        >
                          {isSendingNotifications
                            ? "Sending WhatsApp notifications..."
                            : "Notify All Absentees via WhatsApp"}
                        </Button>
                      </div>
                    );
                  }, [selectedAttendanceDate, activeDate, students, now, isSendingNotifications])}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Account */}
          <TabsContent value="account" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5" /> Create Student Login
                  </CardTitle>
                  <CardDescription>
                    Generate roll number and password for a student. Only warden
                    can view/change credentials.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Student Name</Label>
                    <Input
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Riya Sharma"
                    />
                  </div>
                  <div>
                    <Label>Roll number</Label>
                    <div className="flex gap-2">
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="auto-generated"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setUsername(suggestUsername(studentName || "student"))
                        }
                      >
                        Suggest
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Password</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="auto-generated"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setPassword(generatePassword())}
                      >
                        Generate
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Credentials are visible only here (warden). Not shown in
                      student view.
                    </p>
                  </div>
                  <Button onClick={() => void handleCreateLogin()} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Create Login
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" /> Reset Password
                  </CardTitle>
                  <CardDescription>
                    Select a student and issue a new password.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Select Student</Label>
                    <Select
                      value={selectedId}
                      onValueChange={(v) => setSelectedId(v as StudentId)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.details.name}{" "}
                            {s.credentials
                              ? `(roll: ${s.credentials.username})`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selected?.credentials ? (
                    <div className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Current roll number</span>
                        <span className="font-medium">
                          {selected.credentials.username}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span>Password (warden only)</span>
                        <span className="font-mono">
                          {showPassword
                            ? selected.credentials.password
                            : "••••••••"}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <Button onClick={() => void handleResetPassword()} disabled={!selected}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Issue new password
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
          <div className="w-full flex divide-x divide-border">
            <button
              onClick={() => setActiveTab("access")}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-medium transition-colors",
                activeTab === "access"
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Shield className="h-5 w-5" />
              <span className="line-clamp-1">Access</span>
            </button>
            <button
              onClick={() => setActiveTab("students")}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-medium transition-colors",
                activeTab === "students"
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Users className="h-5 w-5" />
              <span className="line-clamp-1">Students</span>
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-medium transition-colors",
                activeTab === "notifications"
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Bell className="h-5 w-5" />
              <span className="line-clamp-1">Alerts</span>
            </button>
            <button
              onClick={() => setActiveTab("attendance")}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-medium transition-colors",
                activeTab === "attendance"
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Clock className="h-5 w-5" />
              <span className="line-clamp-1">Clock</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
