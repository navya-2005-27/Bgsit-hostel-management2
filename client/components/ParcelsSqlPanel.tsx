import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createParcelApi, listParcelsApi } from "@/lib/parcelApi";
import type { ParcelApiItem } from "@shared/api";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ParcelsSqlPanel() {
  const { toast } = useToast();
  const [studentId, setStudentId] = useState("");
  const [parcelCode, setParcelCode] = useState("");
  const [carrier, setCarrier] = useState("");
  const [items, setItems] = useState<ParcelApiItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadParcels() {
    setLoading(true);
    try {
      setItems(await listParcelsApi());
    } catch (error: any) {
      toast({
        title: "Could not load parcels",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadParcels();
  }, []);

  async function onCreate() {
    try {
      await createParcelApi({
        id: uid(),
        studentId,
        parcelCode,
        carrier,
      });
      setStudentId("");
      setParcelCode("");
      setCarrier("");
      toast({ title: "Parcel created", description: "Saved in SQL Server." });
      loadParcels();
    } catch (error: any) {
      toast({
        title: "Could not create parcel",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Parcel (SQL Server)</CardTitle>
          <CardDescription>Creates parcel directly in SQL via /api/parcels.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Student ID</Label>
            <Input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="std-1001"
            />
          </div>
          <div>
            <Label>Parcel Code</Label>
            <Input
              value={parcelCode}
              onChange={(e) => setParcelCode(e.target.value)}
              placeholder="PKG-001"
            />
          </div>
          <div>
            <Label>Carrier</Label>
            <Input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="DTDC"
            />
          </div>
          <div className="sm:col-span-3">
            <Button onClick={onCreate}>Create Parcel</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parcels</CardTitle>
          <CardDescription>{loading ? "Loading from SQL..." : "Loaded from SQL Server API."}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Student ID</th>
                  <th className="p-3 text-left">Parcel Code</th>
                  <th className="p-3 text-left">Carrier</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">{item.id}</td>
                      <td className="p-3">{item.studentId}</td>
                      <td className="p-3">{item.parcelCode}</td>
                      <td className="p-3">{item.carrier || "-"}</td>
                      <td className="p-3">{item.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No parcels found.
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
