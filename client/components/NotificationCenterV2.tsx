import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ChevronDown, ChevronUp, Plus, Upload } from "lucide-react";
import {
  createNotificationApi,
  deleteNotificationApi,
  listNotificationsApi,
} from "@/lib/notificationsApi";
import type { NotificationWithImage } from "@/lib/notificationStoreV2";
import { useToast } from "@/hooks/use-toast";

type Props = {
  canPost?: boolean;
  canDelete?: boolean;
  title?: string;
  description?: string;
};

export function NotificationCenterV2({
  canPost = false,
  canDelete = false,
  title = "Notification Center",
  description = "Latest updates with images are shown first.",
}: Props) {
  const PAGE_SIZE = 3;
  const { toast } = useToast();
  const [items, setItems] = useState<NotificationWithImage[]>([]);
  const [search, setSearch] = useState("");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [showComposer, setShowComposer] = useState(false);
  const [highlightComposer, setHighlightComposer] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NotificationWithImage | null>(null);
  const [jumpRequestTick, setJumpRequestTick] = useState(0);
  const composerCardRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    date: "",
    description: "",
    imageDataUrl: "",
  });

  useEffect(() => {
    let alive = true;

    void listNotificationsApi()
      .then((rows) => {
        if (!alive) return;
        setItems(
          rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            imageDataUrl: row.imageDataUrl || undefined,
            dateISO: row.dateISO,
            createdAt: Date.parse(row.dateISO) || Date.now(),
          })),
        );
      })
      .catch(() => {
        if (!alive) return;
        setItems([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!jumpRequestTick || !showComposer) return;

    const scrollToComposerTop = () => {
      const card = composerCardRef.current;
      if (!card) return;

      const topOffset = window.innerWidth < 640 ? 84 : 108;
      const targetTop = card.getBoundingClientRect().top + window.scrollY - topOffset;
      window.scrollTo({ top: Math.max(targetTop, 0), behavior: "smooth" });
    };

    let rafTwo: number | null = null;
    let settleTimeout: number | null = null;

    const rafOne = window.requestAnimationFrame(() => {
      rafTwo = window.requestAnimationFrame(() => {
        scrollToComposerTop();
      });

      settleTimeout = window.setTimeout(() => {
        scrollToComposerTop();

        try {
          titleInputRef.current?.focus({ preventScroll: true });
        } catch {
          titleInputRef.current?.focus();
        }
      }, 320);
    });

    return () => {
      window.cancelAnimationFrame(rafOne);
      if (rafTwo !== null) {
        window.cancelAnimationFrame(rafTwo);
      }
      if (settleTimeout !== null) {
        window.clearTimeout(settleTimeout);
      }
    };
  }, [jumpRequestTick, showComposer]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    );
  }, [items, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const first = Date.parse(a.dateISO) || a.createdAt || 0;
      const second = Date.parse(b.dateISO) || b.createdAt || 0;
      return dateSort === "newest" ? second - first : first - second;
    });
    return list;
  }, [filtered, dateSort]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)),
    [sorted.length],
  );

  const visibleItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  useEffect(() => {
    setPage(1);
  }, [search, dateSort]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function onImageUpload(files?: FileList | null) {
    if (!files || !files.length) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, imageDataUrl: String(reader.result) }));
    };
    reader.readAsDataURL(files[0]);
  }

  function submitNotification() {
    void createNotificationApi({
      title: form.title,
      description: form.description,
      imageDataUrl: form.imageDataUrl || undefined,
      dateISO: form.date || undefined,
    })
      .then(() => {
        setForm({ title: "", date: "", description: "", imageDataUrl: "" });
        toast({
          title: "Notification posted",
          description: "Saved in SQL Server.",
        });
        return listNotificationsApi();
      })
      .then((rows) => {
        if (!rows) return;
        setItems(
          rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            imageDataUrl: row.imageDataUrl || undefined,
            dateISO: row.dateISO,
            createdAt: Date.parse(row.dateISO) || Date.now(),
          })),
        );
      })
      .catch((error: any) => {
        toast({
          title: "Could not post notification",
          description: error?.message || "Please fill all fields.",
          variant: "destructive",
        });
      });
  }

  function removeNotification(id: string) {
    void deleteNotificationApi(id)
      .then(() => listNotificationsApi())
      .then((rows) => {
        if (!rows) return;
        setItems(
          rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            imageDataUrl: row.imageDataUrl || undefined,
            dateISO: row.dateISO,
            createdAt: Date.parse(row.dateISO) || Date.now(),
          })),
        );
        toast({ title: "Notification deleted", description: "Removed successfully." });
      })
      .catch((error: any) => {
        toast({
          title: "Could not delete notification",
          description: error?.message || "Notification was not found.",
          variant: "destructive",
        });
      });
  }

  function jumpToComposer() {
    setShowComposer(true);
    setHighlightComposer(true);
    setJumpRequestTick((prev) => prev + 1);

    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightComposer(false);
    }, 1400);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
            {canPost ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={jumpToComposer}
                aria-label="Go to create notification"
                className="h-9 w-9 shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or keyword..."
          />
          <div className="overflow-hidden rounded-md border">
            <div className="grid grid-cols-[0.8fr_1.5fr_0.7fr] sm:grid-cols-[1.2fr_2fr_1fr] items-center gap-2 sm:gap-3 border-b bg-muted/30 px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold">
              <div>Title</div>
              <div>Description</div>
              <button
                type="button"
                onClick={() =>
                  setDateSort((prev) => (prev === "newest" ? "oldest" : "newest"))
                }
                className="ml-auto inline-flex items-center gap-0.5 sm:gap-1 text-right text-xs sm:text-sm font-semibold hover:text-primary"
                aria-label="Sort by date"
              >
                Date
                <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  {dateSort === "newest" ? "Newest" : "Oldest"}
                </span>
              </button>
            </div>

            {visibleItems.length ? (
              <div>
                {visibleItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[0.8fr_1.5fr_0.7fr] sm:grid-cols-[1.2fr_2fr_1fr] gap-2 sm:gap-3 border-b px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm last:border-b-0"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-xs sm:text-sm line-clamp-1">{item.title}</div>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                          className="h-6 px-1.5 text-xs"
                        >
                          View
                        </Button>
                        {canDelete ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeNotification(item.id)}
                            className="h-6 px-1.5 text-xs"
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="min-w-0 overflow-hidden">
                      <p className="truncate text-muted-foreground text-xs sm:text-sm">
                        {item.description}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-muted-foreground text-xs sm:text-sm line-clamp-2">
                        {new Date(item.dateISO).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground m-3">
                No notifications found.
              </div>
            )}
          </div>

          {sorted.length > 0 ? (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-xl">
          {selectedItem ? (
            <div className="space-y-4">
              <DialogHeader className="text-left">
                <DialogTitle className="pr-8">{selectedItem.title}</DialogTitle>
                <DialogDescription>
                  {new Date(selectedItem.dateISO).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {selectedItem.description}
                </p>

                {selectedItem.imageDataUrl ? (
                  <img
                    src={selectedItem.imageDataUrl}
                    alt={selectedItem.title}
                    className="max-h-[420px] w-full rounded-md border object-contain bg-muted"
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {canPost ? (
        <Card
          ref={composerCardRef}
          className={`scroll-mt-20 transition-all duration-500 sm:scroll-mt-24 ${
            highlightComposer
              ? "ring-2 ring-primary/70 shadow-[0_0_0_6px_hsl(var(--primary)/0.15)]"
              : ""
          }`}
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg sm:text-xl">Create Notification</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowComposer((prev) => !prev)}
                aria-label={showComposer ? "Collapse create notification" : "Expand create notification"}
                className="h-9 w-9 shrink-0"
              >
                {showComposer ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
            <CardDescription>
              Add title, description, image, and date to notify students.
            </CardDescription>
          </CardHeader>
          <CardContent
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              showComposer ? "max-h-[1100px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="space-y-4 pb-1">
              <div>
                <Label>Title</Label>
                <Input
                  ref={titleInputRef}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Hostel meeting notice"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Detailed message for students..."
                  className="min-h-28"
                />
              </div>
              <div>
                <Label>Image (Optional)</Label>
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onImageUpload(e.currentTarget.files)}
                    className="w-full sm:flex-1"
                  />
                  {form.imageDataUrl && (
                    <img
                      src={form.imageDataUrl}
                      alt="Preview"
                      className="h-32 w-full rounded border object-cover sm:h-16 sm:w-16"
                    />
                  )}
                </div>
              </div>
              <div>
                <Label>Date (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <Button onClick={submitNotification} className="w-full gap-2 sm:w-auto">
                <Upload className="h-4 w-4" /> Post Notification
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}) {
  const pages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const values: Array<number | "ellipsis"> = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) values.push("ellipsis");
    for (let i = start; i <= end; i += 1) values.push(i);
    if (end < totalPages - 1) values.push("ellipsis");

    values.push(totalPages);
    return values;
  }, [page, totalPages]);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        Previous
      </Button>

      {pages.map((value, index) =>
        value === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Button
            key={value}
            type="button"
            variant={value === page ? "default" : "outline"}
            onClick={() => onPageChange(value)}
            className="min-w-10"
          >
            {value}
          </Button>
        ),
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        Next
      </Button>
    </div>
  );
}
