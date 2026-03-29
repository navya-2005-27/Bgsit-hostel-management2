import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listRooms,
  availableSeats,
  bookRoom,
  findStudentRoom,
  createChangeRequest,
  createLeaveRequest,
} from "@/lib/roomStore";
import { StudentId, getStudentPublic } from "@/lib/studentStore";

export function StudentRoomsPanel({
  studentId,
  onUpdated,
}: {
  studentId: StudentId | "";
  onUpdated?: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [targetRoom, setTargetRoom] = useState<string>("");
  const rooms = useMemo(() => listRooms(), [now]);
  const bookedRoom = useMemo(
    () => (studentId ? findStudentRoom(studentId) : null),
    [studentId, now],
  );

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1200);
    return () => clearInterval(i);
  }, []);

  if (!studentId) {
    return (
      <div className="text-sm text-muted-foreground">Login to book a room.</div>
    );
  }

  if (bookedRoom) {
    const roommates = bookedRoom.occupants.filter((id) => id !== studentId);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Booking Confirmation</CardTitle>
          <CardDescription>Your current room and roommates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-md border p-3">
            <div className="font-medium">Room: {bookedRoom.name}</div>
            <div>Capacity: {bookedRoom.capacity}</div>
            <div>
              Seats filled: {bookedRoom.occupants.length} /{" "}
              {bookedRoom.capacity}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">Roommates</div>
            {roommates.length ? (
              <ul className="list-disc pl-5">
                {roommates.map((rid) => {
                  const s = getStudentPublic(rid);
                  return <li key={rid}>{s?.details.name || rid}</li>;
                })}
              </ul>
            ) : (
              <div className="text-muted-foreground">No roommates yet.</div>
            )}
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">Request to change room</div>
            <Select value={targetRoom} onValueChange={setTargetRoom}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select target room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} (available {availableSeats(r.id)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!targetRoom}
              onClick={() => {
                createChangeRequest(studentId, targetRoom);
                alert("Change request submitted to warden.");
                onUpdated && onUpdated();
              }}
            >
              Submit Change Request
            </Button>
          </div>
          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">
              Request to leave room
            </div>
            <Button
              variant="outline"
              onClick={() => {
                createLeaveRequest(studentId);
                alert("Leave request submitted to warden.");
                onUpdated && onUpdated();
              }}
            >
              Submit Leave Request
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Rooms</CardTitle>
        <CardDescription>
          Select a room to book. Auto-locked when full.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {rooms.length ? (
          rooms.map((r) => {
            const avail = availableSeats(r.id);
            return (
              <div key={r.id} className="rounded-md border p-3">
                <div className="font-medium">{r.name}</div>
                <div className="text-sm text-muted-foreground">
                  Capacity {r.capacity}
                </div>
                <div className="text-sm">Available: {avail}</div>
                <Button
                  className="mt-2"
                  disabled={avail <= 0}
                  onClick={() => {
                    try {
                      const { room } = bookRoom(studentId, r.id);
                      alert(`Booked ${room.name}`);
                      setNow(Date.now());
                      onUpdated && onUpdated();
                    } catch (e: any) {
                      alert(e?.message || "Could not book");
                    }
                  }}
                >
                  {avail > 0 ? "Book Room" : "Full"}
                </Button>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-muted-foreground">
            No rooms yet. Ask warden to add rooms.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
