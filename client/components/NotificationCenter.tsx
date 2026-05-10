import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  createNotification,
  deleteNotification,
  listNotifications,
  subscribeNotifications,
} from "@/lib/notificationStore";
import { useToast } from "@/hooks/use-toast";

type Props = {
  canPost?: boolean;
  canDelete?: boolean;
  title?: string;
  description?: string;
};

export function NotificationCenter({
  canPost = false,
  canDelete = false,
  title = "Notification Center",
  description = "Latest notifications are shown first. Search older ones by keyword or title.",
}: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState(() => listNotifications());
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    date: "",
    content: "",
  });

  useEffect(() => {
    const refresh = () => setItems(listNotifications());
    const unsub = subscribeNotifications(refresh);
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q),
    );
  }, [items, search]);

  function submitNotification() {
    try {
      createNotification({
        title: form.title,
        date: form.date,
        content: form.content,
      });
      setForm({ title: "", date: "", content: "" });
      toast({
        title: "Notification posted",
        description: "Students will see this immediately.",
      });
    } catch (error: any) {
      toast({
        title: "Could not post notification",
        description: error?.message || "Please fill all fields.",
        variant: "destructive",
      });
    }
  }

  function removeNotification(id: string) {
    const removed = deleteNotification(id);
    if (removed) {
      setItems(listNotifications());
      toast({ title: "Notification deleted", description: "Removed successfully." });
      return;
    }

    toast({
      title: "Could not delete notification",
      description: "Notification was not found.",
      variant: "destructive",
    });
  }

  return (
    <div className="space-y-6">
      {canPost ? (
        <Card>
          <CardHeader>
            <CardTitle>Send Notification</CardTitle>
            <CardDescription>
              Add title, date, and detailed content to notify students.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title of Notification</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Hostel meeting notice"
              />
            </div>
            <div>
              <Label>Date (optional)</Label>
              <Input
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Detailed Content/Message</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Tomorrow's curfew is 8:30 PM due to campus event..."
                className="min-h-28"
              />
            </div>
            <Button onClick={submitNotification}>Submit Notification</Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications by title or keyword"
          />
          <div className="space-y-2">
            {filtered.length ? (
              filtered.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-medium">{item.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.dateISO).toLocaleString()}
                      </span>
                      {canDelete ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeNotification(item.id)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                No notifications found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
