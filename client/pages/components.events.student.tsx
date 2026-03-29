import { useEffect, useMemo, useState } from "react";
import {
  listUpcoming as listUpcomingEvents,
  listPast as listPastEvents,
  registerForEvent,
  addEventComment,
  createEvent as createEventProposal,
} from "@/lib/eventStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function EventFeed({ selectedId }: { selectedId: string | "" }) {
  const [tick, setTick] = useState(0);
  const upcoming = useMemo(() => listUpcomingEvents(), [tick]);
  const past = useMemo(() => listPastEvents(), [tick]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Upcoming</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {upcoming.map((e) => (
          <div key={e.id} className="rounded-md border p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">{e.name}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(e.dateISO).toLocaleString()}
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Organizer: {e.organizer}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span>Registered: {e.registrations.length}</span>
              <Button
                size="sm"
                onClick={() => {
                  if (!selectedId) return;
                  registerForEvent(e.id, selectedId as any);
                  setTick((x) => x + 1);
                }}
              >
                Register
              </Button>
            </div>
            <CommentBox eventId={e.id} onPosted={() => setTick((x) => x + 1)} />
          </div>
        ))}
        {!upcoming.length ? (
          <div className="text-sm text-muted-foreground">
            No upcoming events.
          </div>
        ) : null}
      </div>

      <div className="text-sm font-medium">Past</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {past.map((e) => (
          <div key={e.id} className="rounded-md border p-3 text-sm">
            <div className="font-medium">{e.name}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(e.dateISO).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Organizer: {e.organizer}
            </div>
          </div>
        ))}
        {!past.length ? (
          <div className="text-sm text-muted-foreground">
            No past events yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CommentBox({
  eventId,
  onPosted,
}: {
  eventId: string;
  onPosted: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="mt-3 flex gap-2">
      <Input
        placeholder="Comment or question"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          if (!text.trim()) return;
          addEventComment(eventId, "student", text.trim());
          setText("");
          onPosted();
        }}
      >
        Post
      </Button>
    </div>
  );
}

export function EventProposalForm({
  onSubmitted,
}: {
  onSubmitted: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "Cultural",
    dateISO: "",
    venue: "",
    expected: "",
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
    createEventProposal(
      {
        name: form.name,
        description: form.description,
        type: form.type,
        dateISO: form.dateISO,
        venue: form.venue,
        expected: Number(form.expected) || undefined,
        posterDataUrl: form.poster,
      },
      "student",
      "Student",
    );
    setForm({
      name: "",
      description: "",
      type: "Cultural",
      dateISO: "",
      venue: "",
      expected: "",
      poster: "",
    });
    onSubmitted();
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
      <Input
        type="file"
        accept="image/*"
        onChange={(e) => onPoster(e.currentTarget.files)}
      />
      <Button onClick={submit}>Submit Proposal</Button>
    </div>
  );
}
