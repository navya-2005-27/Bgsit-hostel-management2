import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createNotificationApi, deleteNotificationApi, listNotificationsApi } from "@/lib/notificationsApi";
import type { NotificationApiItem } from "@shared/api";

export function NotificationsSqlPanel() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [dateISO, setDateISO] = useState("");
  const [items, setItems] = useState<NotificationApiItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadNotifications() {
    setLoading(true);
    try {
      setItems(await listNotificationsApi());
    } catch (error: any) {
      toast({
        title: "Could not load notifications",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function removeNotification(id: string) {
    try {
      await deleteNotificationApi(id);
      toast({ title: "Notification deleted", description: "Removed from SQL Server." });
      loadNotifications();
    } catch (error: any) {
      toast({
        title: "Could not delete notification",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function onCreate() {
    try {
      await createNotificationApi({
        title,
        description,
        imageDataUrl: imageDataUrl || undefined,
        dateISO: dateISO || undefined,
      });
      setTitle("");
      setDescription("");
      setImageDataUrl("");
      setDateISO("");
      toast({ title: "Notification created", description: "Saved in SQL Server." });
      loadNotifications();
    } catch (error: any) {
      toast({
        title: "Could not create notification",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Notification (SQL Server)</CardTitle>
          <CardDescription>Creates notification directly in SQL via /api/notifications.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hostel Notice" />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Message for students"
              className="min-h-24"
            />
          </div>
          <div>
            <Label>Date (Optional ISO)</Label>
            <Input
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              placeholder="2026-04-04T10:30:00Z"
            />
          </div>
          <div>
            <Label>Image Data URL (Optional)</Label>
            <Input
              value={imageDataUrl}
              onChange={(e) => setImageDataUrl(e.target.value)}
              placeholder="data:image/..."
            />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={onCreate}>Create Notification</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>{loading ? "Loading from SQL..." : "Loaded from SQL Server API."}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.length ? (
              items.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{item.title}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">{item.status}</div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void removeNotification(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.dateISO}</div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
                No notifications found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
