import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Users, Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  authenticateAdmin,
  getWardenCredentials,
  isAdminLoggedIn,
  logoutAdmin,
  updateWardenCredentials,
} from "@/lib/adminStore";
import {
  hydrateStudentsFromSql,
  listStudents,
  StudentRecord,
} from "@/lib/studentStore";
import { StudentTablePanel } from "@/components/StudentTablePanel";
import { NotificationCenterV2 } from "@/components/NotificationCenterV2";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(() => isAdminLoggedIn());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("students");

  const [wardenCreds, setWardenCreds] = useState(() => getWardenCredentials());
  const [students, setStudents] = useState<StudentRecord[]>([]);

  useEffect(() => {
    if (!isLoggedIn) return;
    void hydrateStudentsFromSql().then((rows) => setStudents(rows));
  }, [isLoggedIn]);

  useEffect(() => {
    const refresh = () => {
      void hydrateStudentsFromSql().then((rows) => setStudents(rows));
    };
    window.addEventListener("student-data-updated", refresh);
    return () => window.removeEventListener("student-data-updated", refresh);
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-white dark:to-background">
        <div className="mx-auto grid min-h-screen max-w-md place-items-center px-6 py-10">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Admin Login
              </CardTitle>
              <CardDescription>
                Login as administrator to manage students, wardens, and notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              <Button
                className="w-full"
                onClick={async () => {
                  try {
                    const ok = await authenticateAdmin(username, password);
                    if (!ok) {
                      toast({
                        title: "Invalid admin credentials",
                        description: "Please check username and password.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setIsLoggedIn(true);
                    toast({ title: "Welcome, Admin" });
                  } catch (error: any) {
                    toast({
                      title: "Could not sign in",
                      description: error?.message || "Login validation failed.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Login as Admin
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
                <ShieldCheck className="h-5 w-5 shrink-0 text-primary md:h-6 md:w-6" />
                <h1 className="truncate text-lg font-bold md:text-2xl">Admin Dashboard</h1>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  logoutAdmin();
                  setIsLoggedIn(false);
                }}
              >
                Logout
              </Button>
            </div>
            <TabsList className="mt-4 w-full flex-wrap justify-start gap-2 rounded-full bg-muted/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="warden">Warden Control</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="students" className="mt-4 sm:mt-6">
            <StudentTablePanel
              students={students}
              onViewDetails={(student: StudentRecord) => {
                navigate(`/admin/student/${student.id}`);
              }}
            />
          </TabsContent>

          <TabsContent value="notifications" className="mt-4 sm:mt-6">
            <NotificationCenterV2 canPost canDelete />
          </TabsContent>

          <TabsContent value="warden" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Manage Warden Login</CardTitle>
                <CardDescription>
                  Update warden credentials. Warden login page will use these values.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Warden Username</Label>
                  <Input
                    value={wardenCreds.username}
                    onChange={(e) =>
                      setWardenCreds((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Warden Password</Label>
                  <Input
                    type="password"
                    value={wardenCreds.password}
                    onChange={(e) =>
                      setWardenCreds((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button
                    onClick={async () => {
                      try {
                        await updateWardenCredentials(wardenCreds);
                        toast({
                          title: "Warden credentials updated",
                          description: "Changes are now active.",
                        });
                      } catch (error: any) {
                        toast({
                          title: "Could not update credentials",
                          description: error?.message,
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Save Warden Credentials
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
          <div className="w-full flex divide-x divide-border">
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
              onClick={() => setActiveTab("warden")}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-medium transition-colors",
                activeTab === "warden"
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Settings className="h-5 w-5" />
              <span className="line-clamp-1">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
