import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listRooms,
  createRoom,
  setRoomCapacity,
  deleteRoom,
  availableSeats,
  resetAllBookings,
  listRequests,
  approveRequest,
  rejectRequest,
} from "@/lib/roomStore";
import { getStudentPublic } from "@/lib/studentStore";

export function WardenRoomsPanel() {
  const [now, setNow] = useState(Date.now());
  const [roomName, setRoomName] = useState("");
  const [capacity, setCapacity] = useState(2);
  const rooms = useMemo(() => listRooms(), [now]);
  const requests = useMemo(() => listRequests("pending"), [now]);
  const allRequests = useMemo(() => listRequests(), [now]);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1500);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Rooms & Allotments</CardTitle>
          <CardDescription>
            Add rooms, view seats, and reset bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Room name (e.g. A-101)"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Capacity"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value || 2))}
            />
            <Button
              onClick={() => {
                if (!roomName.trim()) return;
                try {
                  createRoom(roomName.trim(), Math.max(1, capacity));
                  setRoomName("");
                  setNow(Date.now());
                } catch (e: any) {
                  alert(e?.message || "Failed to add room");
                }
              }}
            >
              Add Room
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.length ? (
              rooms.map((r) => (
                <div key={r.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.name}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        deleteRoom(r.id);
                        setNow(Date.now());
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                  <div className="mt-1">Capacity: {r.capacity}</div>
                  <div>Available: {availableSeats(r.id)}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Set capacity
                    </span>
                    <Input
                      type="number"
                      className="h-8 w-20"
                      defaultValue={r.capacity}
                      onBlur={(e) => {
                        setRoomCapacity(
                          r.id,
                          Number(e.target.value || r.capacity),
                        );
                        setNow(Date.now());
                      }}
                    />
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-medium">Occupants</div>
                    {r.occupants.length ? (
                      <ul className="list-disc pl-5">
                        {r.occupants.map((id) => (
                          <li key={id}>
                            {getStudentPublic(id)?.details.name || id}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-muted-foreground">None</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No rooms yet.</div>
            )}
          </div>

          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Reset all bookings?")) {
                resetAllBookings();
                setNow(Date.now());
              }
            }}
          >
            Reset All Bookings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>
            Approve or reject leave/change requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.length ? (
            requests.map((rq) => {
              const s = getStudentPublic(rq.studentId);
              const target = rq.targetRoomId
                ? listRooms().find((x) => x.id === rq.targetRoomId)
                : null;
              return (
                <div key={rq.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">
                    {s?.details.name || rq.studentId}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rq.type === "leave"
                      ? "Leave room"
                      : `Change to ${target?.name || rq.targetRoomId}`}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const res = approveRequest(rq.id);
                        if (!res.ok) alert(res.error);
                        setNow(Date.now());
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        rejectRequest(rq.id);
                        setNow(Date.now());
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-muted-foreground">
              No pending requests
            </div>
          )}

          <div className="pt-2">
            <div className="mb-1 text-sm font-medium">History</div>
            {allRequests.filter((r) => r.status !== "pending").length ? (
              allRequests
                .filter((r) => r.status !== "pending")
                .map((rq) => {
                  const s = getStudentPublic(rq.studentId);
                  const target = rq.targetRoomId
                    ? listRooms().find((x) => x.id === rq.targetRoomId)
                    : null;
                  return (
                    <div key={rq.id} className="rounded-md border p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span>{s?.details.name || rq.studentId}</span>
                        <span
                          className={
                            rq.status === "approved"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }
                        >
                          {rq.status}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {rq.type === "leave"
                          ? "Leave room"
                          : `Change to ${target?.name || rq.targetRoomId}`}
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-xs text-muted-foreground">
                No history yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
