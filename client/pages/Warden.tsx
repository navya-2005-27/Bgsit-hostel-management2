import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  StudentRecord,
  StudentId,
  listPendingAccessRequests,
  approveAccessRequest,
  listStudents,
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

export default function Warden() {
  const { toast } = useToast();
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

  // Attendance state
  const [session, setSession] = useState<AttendanceSession | null>(
    getActiveAttendanceSession(),
  );
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
    setStudents(listStudents());
  }, []);

  useEffect(() => {
    if (studentName && !username) setUsername(suggestUsername(studentName));
  }, [studentName, username]);

  useEffect(() => {
    const i = setInterval(() => {
      setNow(Date.now());
      setSession(getActiveAttendanceSession());
      setWeeklyActive(getActiveWeeklyPoll());
      setActiveDayPolls(getActiveDailyMealPolls());
      setPendingAccess(listPendingAccessRequests());
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const selected = useMemo(
    () => students.find((s) => s.id === selectedId),
    [students, selectedId],
  );

  const refresh = () => setStudents(listStudents());

  function handleCreateLogin() {
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
    setCredentials(record.id, { username: user, password: pass });
    refresh();
    setSelectedId(record.id);
    setShowPassword(false);
    toast({ title: "Login created", description: `Roll number: ${user}` });
  }

  function handleResetPassword() {
    if (!selected) {
      toast({
        title: "Select a student",
        description: "Choose a student to reset password.",
      });
      return;
    }
    const pass = generatePassword();
    resetPassword(selected.id, pass);
    refresh();
    setShowPassword(false);
    toast({ title: "Password reset", description: `New password generated.` });
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
        phone: (s.details.parentContact || s.details.studentContact).replace(
          /[^0-9]/g,
          "",
        ),
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white dark:to-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Warden Section</h1>
        </div>

        <Tabs defaultValue="access" className="w-full">
          <TabsList>
            <TabsTrigger value="access">Access Requests</TabsTrigger>
            <TabsTrigger value="attendance">Attendance Management</TabsTrigger>
          </TabsList>

          {/* Access Requests */}
          <TabsContent value="access" className="mt-6">
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
                      className="rounded-md border p-3 text-sm flex items-center justify-between gap-3"
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
                      <Button
                        onClick={() => {
                          try {
                            approveAccessRequest(req.id);
                            setPendingAccess(listPendingAccessRequests());
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
                      >
                        Accept
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No pending access requests.
                  </div>
                )}
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
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(session.token)}`}
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
                    Toggle present/absent. Submitting locks for the day.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {students.map((s) => {
                      const present = presentSet.has(s.id);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-md border p-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {s.details.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              Roll: {s.credentials?.username || "-"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={present ? "default" : "outline"}
                              onClick={() =>
                                setManualPresence(activeDate, s.id, true)
                              }
                            >
                              Present
                            </Button>
                            <Button
                              size="sm"
                              variant={!present ? "destructive" : "outline"}
                              onClick={() =>
                                setManualPresence(activeDate, s.id, false)
                              }
                            >
                              Absent
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {session ? (
                    <Button onClick={submitAttendance} className="mt-4">
                      Submit Attendance
                    </Button>
                  ) : null}

                  {absentees.length ? (
                    <div className="mt-6">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Bell className="h-4 w-4" /> Parent Notifications
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-sm text-muted-foreground">
                          {absentees.length} absent student(s) will receive the
                          same configured note for today.
                        </div>
                        <Button
                          className="mt-3"
                          onClick={sendAllParentNotifications}
                          disabled={isSendingNotifications}
                        >
                          {isSendingNotifications
                            ? "Sending WhatsApp notifications..."
                            : "Notify All Absentees via WhatsApp"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
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
                  <Button onClick={handleCreateLogin} className="w-full">
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
                  <Button onClick={handleResetPassword} disabled={!selected}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Issue new password
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
