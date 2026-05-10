import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createResidentApi, listResidentsApi } from "@/lib/residentApi";
import type { ResidentApiItem } from "@shared/api";

const EMPTY_FORM = {
  name: "",
  roomNumber: "",
  phoneNumber: "",
  email: "",
};

export function ResidentsPanel() {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState<ResidentApiItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadResidents() {
    setLoading(true);
    try {
      const list = await listResidentsApi();
      setItems(list);
    } catch (error: any) {
      toast({
        title: "Could not load residents",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResidents();
  }, []);

  async function handleCreate() {
    try {
      await createResidentApi(form);
      setForm(EMPTY_FORM);
      toast({
        title: "Resident added",
        description: "Saved in SQL Server successfully.",
      });
      loadResidents();
    } catch (error: any) {
      toast({
        title: "Could not create resident",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Resident (SQL Server)</CardTitle>
          <CardDescription>
            This form writes directly to SQL Server using /api/residents.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Shreya"
            />
          </div>
          <div>
            <Label>Room Number</Label>
            <Input
              value={form.roomNumber}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, roomNumber: e.target.value }))
              }
              placeholder="101"
            />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input
              value={form.phoneNumber}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))
              }
              placeholder="9876543210"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="shreya@example.com"
            />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={handleCreate}>Create Resident</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Residents</CardTitle>
          <CardDescription>
            {loading ? "Loading from SQL Server..." : "Data is loaded from SQL Server API."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Room Number</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">{item.id}</td>
                      <td className="p-3">{item.name}</td>
                      <td className="p-3">{item.roomNumber}</td>
                      <td className="p-3">{item.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      No residents found.
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
