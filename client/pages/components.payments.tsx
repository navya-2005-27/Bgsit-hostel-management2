import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  paymentSummaryAll,
  exportPaymentsCSV,
  paymentTotals,
  addPayment,
  listPaymentsByStudent,
  type PaymentMethod,
} from "@/lib/studentStore";

export function PaymentsOverview() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "overdue">(
    "all",
  );
  const rows = paymentSummaryAll();
  const filtered = rows.filter(
    (r) =>
      (filter === "all" ? true : r.status === filter) &&
      r.name.toLowerCase().includes(query.toLowerCase()),
  );

  function downloadCSV() {
    const csv = exportPaymentsCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-2">
          {(["all", "paid", "pending", "overdue"] as const).map((k) => (
            <Button
              key={k}
              variant={filter === k ? "default" : "outline"}
              onClick={() => setFilter(k)}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={downloadCSV}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Total Rent</th>
              <th className="p-2">Total Paid</th>
              <th className="p-2">Total Due</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.name}</td>
                <td className="p-2">₹{r.rent}</td>
                <td className="p-2">₹{r.paid}</td>
                <td className="p-2">₹{r.due}</td>
                <td className="p-2 capitalize">{r.status}</td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={5}>
                  No results
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StudentPaymentPanel({
  students,
}: {
  students: {
    id: string;
    details: { name: string; totalAmount: number | null };
  }[];
}) {
  const [selected, setSelected] = useState<string>(students[0]?.id || "");
  const totals = selected
    ? paymentTotals(selected)
    : { rent: 0, paid: 0, due: 0 };
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const payments = selected ? listPaymentsByStudent(selected) : [];

  function add() {
    if (!selected || !Number(amount)) return;
    addPayment(selected, Number(amount), method, new Date());
    setAmount("");
  }

  return (
    <div className="space-y-3">
      <div className="text-sm">Select Student</div>
      <select
        className="w-full rounded-md border bg-background px-2 py-2"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.details.name}
          </option>
        ))}
      </select>

      <div className="rounded-md border p-3 text-sm">
        <div className="flex items-center justify-between">
          <span>Total Rent</span>
          <span className="font-medium">₹{totals.rent}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Total Paid</span>
          <span className="font-medium">₹{totals.paid}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Total Due</span>
          <span className="font-medium">₹{totals.due}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Record Payment</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select
            className="rounded-md border bg-background px-2"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="online">Online</option>
          </select>
          <Button onClick={add}>Add</Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Payment History</div>
        <ul className="space-y-2 text-sm max-h-64 overflow-auto pr-1">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <span>
                {new Date(p.dateISO).toLocaleDateString()} • {p.method}
              </span>
              <span className="font-medium">₹{p.amount}</span>
            </li>
          ))}
          {!payments.length ? (
            <div className="text-muted-foreground">No payments yet.</div>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
