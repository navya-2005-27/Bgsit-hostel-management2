import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createEventSqlApi, listEventsSqlApi } from "@/lib/eventsSqlApi";
import type { EventSqlApiItem } from "@shared/api";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function EventsSqlPanel() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("Other");
  const [dateISO, setDateISO] = useState("");
  const [venue, setVenue] = useState("");
  const [items, setItems] = useState<EventSqlApiItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadEvents() {
    setLoading(true);
    try {
      setItems(await listEventsSqlApi());
    } catch (error: any) {
      toast({
        title: "Could not load events",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function onCreate() {
    try {
      await createEventSqlApi({
        id: uid(),
        name,
        description,
        organizerRole: "warden",
        eventType,
        dateISO,
        venue,
      });
      setName("");
      setDescription("");
      setEventType("Other");
      setDateISO("");
      setVenue("");
      toast({ title: "Event created", description: "Saved in SQL Server." });
      loadEvents();
    } catch (error: any) {
      toast({
        title: "Could not create event",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Event (SQL Server)</CardTitle>
          <CardDescription>Creates event directly in SQL via /api/events.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Annual Day" />
          </div>
          <div>
            <Label>Type</Label>
            <Input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="Cultural" />
          </div>
          <div>
            <Label>Date ISO</Label>
            <Input value={dateISO} onChange={(e) => setDateISO(e.target.value)} placeholder="2026-04-05T10:00:00Z" />
          </div>
          <div>
            <Label>Venue</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Main Hall" />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24" />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={onCreate}>Create Event</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>{loading ? "Loading from SQL..." : "Loaded from SQL Server API."}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.length ? (
              items.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.status}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{item.venue}</div>
                  <div className="text-xs text-muted-foreground">{item.dateISO}</div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
                No events found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
