import { useEffect, useState } from "react";
import {
  listActiveComplaints,
  upvoteComplaint,
  hasUpvotedComplaint,
} from "@/lib/studentStore";
import { Button } from "@/components/ui/button";

export function ComplaintFeed() {
  const [items, setItems] = useState(listActiveComplaints());
  useEffect(() => {
    const i = setInterval(() => setItems(listActiveComplaints()), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <ul className="space-y-2">
      {items.map((c) => (
        <li key={c.id} className="rounded-md border p-3 text-sm">
          <div className="mb-1 font-medium">{c.text}</div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {new Date(c.submittedAt).toLocaleString()} • {c.category}
            </span>
            <Button
              size="sm"
              variant={hasUpvotedComplaint(c.id) ? "secondary" : "outline"}
              onClick={() => {
                upvoteComplaint(c.id);
                setItems(listActiveComplaints());
              }}
            >
              👍 {c.upvotes}
            </Button>
          </div>
        </li>
      ))}
      {!items.length ? (
        <div className="text-sm text-muted-foreground">No complaints yet.</div>
      ) : null}
    </ul>
  );
}
