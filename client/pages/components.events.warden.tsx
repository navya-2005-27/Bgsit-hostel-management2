import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  createEvent as createEventRecord,
  approveEvent,
  rejectEvent,
  completeEvent,
  listPendingProposals as listEventProposals,
  listEvents as listAllEvents,
  eventAnalytics,
} from "@/lib/eventStore";
import { listStudents } from "@/lib/studentStore";

export function EventCreator() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "Cultural",
    dateISO: "",
    venue: "",
    expected: "",
    budget: "",
    poster: "",
  });
  function onPoster(files?: FileList | null) {
    if (!files || !files.length) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () =>
      setForm((f) => ({ ...f, poster: String(reader.result) }));
    reader.readAsDataURL(file);
  }
  function submit() {
    if (!form.name || !form.dateISO || !form.venue) return;
    createEventRecord(
      {
        name: form.name,
        description: form.description,
        type: form.type,
        dateISO: form.dateISO,
        venue: form.venue,
        expected: Number(form.expected) || undefined,
        budget: Number(form.budget) || undefined,
        posterDataUrl: form.poster,
      },
      "warden",
      "Warden",
    );
    setForm({
      name: "",
      description: "",
      type: "Cultural",
      dateISO: "",
      venue: "",
      expected: "",
      budget: "",
      poster: "",
    });
  }
  return (
    <div className="space-y-2">
      <Input
        placeholder="Event Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <Textarea
        placeholder="Event Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          className="rounded-md border bg-background px-2 py-2"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          {["Cultural", "Sports", "Workshop", "Festival", "Party", "Other"].map(
            (t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ),
          )}
        </select>
        <Input
          type="datetime-local"
          value={form.dateISO}
          onChange={(e) => setForm({ ...form, dateISO: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Venue / Location"
          value={form.venue}
          onChange={(e) => setForm({ ...form, venue: e.target.value })}
        />
        <Input
          placeholder="Expected Participants"
          value={form.expected}
          onChange={(e) => setForm({ ...form, expected: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Budget (optional)"
          value={form.budget}
          onChange={(e) => setForm({ ...form, budget: e.target.value })}
        />
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => onPoster(e.currentTarget.files)}
        />
      </div>
      <Button onClick={submit}>Create Event</Button>
    </div>
  );
}

export function EventProposals() {
  const [tick, setTick] = useState(0);
  const proposals = useMemo(() => listEventProposals(), [tick]);
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Pending Proposals</div>
      <ul className="space-y-2 text-sm max-h-64 overflow-auto pr-1">
        {proposals.map((p) => (
          <li key={p.id} className="rounded-md border p-2">
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(p.dateISO).toLocaleString()} • {p.type}
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  approveEvent(p.id);
                  setTick((x) => x + 1);
                }}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  rejectEvent(p.id);
                  setTick((x) => x + 1);
                }}
              >
                Reject
              </Button>
            </div>
          </li>
        ))}
        {!proposals.length ? (
          <div className="text-sm text-muted-foreground">No proposals.</div>
        ) : null}
      </ul>
    </div>
  );
}

export function AllEventsTable() {
  const [tick, setTick] = useState(0);
  const events = useMemo(() => listAllEvents(), [tick]);
  const students = listStudents();
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Date</th>
            <th className="p-2">Organizer</th>
            <th className="p-2">Type</th>
            <th className="p-2">Participants</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-t align-top">
              <td className="p-2">{e.name}</td>
              <td className="p-2">{new Date(e.dateISO).toLocaleString()}</td>
              <td className="p-2 capitalize">{e.organizer}</td>
              <td className="p-2">{e.type}</td>
              <td className="p-2">
                {e.registrations.length} / {students.length}
              </td>
              <td className="p-2">
                {e.status !== "completed" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      completeEvent(e.id);
                      setTick((x) => x + 1);
                    }}
                  >
                    Mark Completed
                  </Button>
                ) : (
                  <span className="text-muted-foreground">Completed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EventAnalytics() {
  const data = eventAnalytics();
  const total = data.ratio.student + data.ratio.warden || 1;
  return (
    <div className="rounded-md border p-3 text-sm space-y-2">
      <div className="font-medium">Analytics</div>
      <div className="flex items-center justify-between">
        <span>Student-organized</span>
        <span>{data.ratio.student}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>Warden-organized</span>
        <span>{data.ratio.warden}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>Student/Warden Ratio</span>
        <span>
          {Math.round((data.ratio.student / total) * 100)}% /{" "}
          {Math.round((data.ratio.warden / total) * 100)}%
        </span>
      </div>
    </div>
  );
}
