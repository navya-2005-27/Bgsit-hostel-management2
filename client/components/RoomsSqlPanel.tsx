import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createRoomApi, listRoomsApi } from "@/lib/roomApi";
import type { RoomApiItem } from "@shared/api";

export function RoomsSqlPanel() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(2);
  const [items, setItems] = useState<RoomApiItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadRooms() {
    setLoading(true);
    try {
      setItems(await listRoomsApi());
    } catch (error: any) {
      toast({
        title: "Could not load rooms",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  async function onCreate() {
    try {
      await createRoomApi({ name, capacity });
      setName("");
      setCapacity(2);
      toast({
        title: "Room created",
        description: "Saved in SQL Server.",
      });
      loadRooms();
    } catch (error: any) {
      toast({
        title: "Could not create room",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Room (SQL Server)</CardTitle>
          <CardDescription>Creates room directly in SQL via /api/rooms.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Room Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="A-101" />
          </div>
          <div>
            <Label>Capacity</Label>
            <Input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value || 2))}
            />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={onCreate}>Create Room</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rooms</CardTitle>
          <CardDescription>{loading ? "Loading from SQL..." : "Loaded from SQL Server API."}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Capacity</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((room) => (
                    <tr key={room.id} className="border-t">
                      <td className="p-3">{room.id}</td>
                      <td className="p-3">{room.name}</td>
                      <td className="p-3">{room.capacity}</td>
                      <td className="p-3">{room.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      No rooms found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
