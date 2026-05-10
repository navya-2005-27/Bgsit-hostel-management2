import { RequestHandler } from "express";
import { runQuery, sql } from "../db";
import type {
  AccessRequestApiItem,
  CreateAccessRequestApiBody,
  UpdateAccessRequestApiBody,
} from "@shared/api";

type AccessRequestRow = {
  id: string;
  name: string;
  usn: string;
  phone: string;
  status: AccessRequestApiItem["status"];
  requested_at: Date | string;
  approved_at: Date | string | null;
  rejected_at: Date | string | null;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeUsn(value: unknown): string {
  return normalizeText(value).toUpperCase();
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toApiItem(row: AccessRequestRow): AccessRequestApiItem {
  return {
    id: row.id,
    name: row.name,
    usn: row.usn,
    phone: row.phone,
    status: row.status,
    requestedAt:
      row.requested_at instanceof Date ? row.requested_at.toISOString() : new Date(row.requested_at).toISOString(),
    approvedAt: row.approved_at ? new Date(row.approved_at).toISOString() : null,
    rejectedAt: row.rejected_at ? new Date(row.rejected_at).toISOString() : null,
  };
}

export const listAccessRequestsFromSql: RequestHandler = async (_req, res) => {
  try {
    const result = await runQuery<AccessRequestRow>(`
      SELECT
        id,
        name,
        usn,
        phone,
        status,
        requested_at,
        approved_at,
        rejected_at
      FROM app.access_requests
      ORDER BY requested_at DESC, id DESC;
    `);

    res.json(result.recordset.map(toApiItem));
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to list access requests" });
  }
};

export const createAccessRequestInSql: RequestHandler = async (req, res) => {
  const body = req.body as Partial<CreateAccessRequestApiBody>;
  const name = normalizeText(body.name);
  const usn = normalizeUsn(body.usn);
  const phone = normalizeText(body.phone);

  if (!name || !usn || !phone) {
    res.status(400).json({ message: "name, usn and phone are required" });
    return;
  }

  try {
    const latest = await runQuery<AccessRequestRow>(
      `
      SELECT TOP 1
        id,
        name,
        usn,
        phone,
        status,
        requested_at,
        approved_at,
        rejected_at
      FROM app.access_requests
      WHERE usn = @usn
      ORDER BY requested_at DESC, id DESC;
      `,
      [{ name: "usn", type: sql.NVarChar, value: usn }],
    );

    const activeRequest = latest.recordset[0];
    if (activeRequest && activeRequest.status !== "approved") {
      res.status(409).json({
        message: "This USN already has a pending or denied access request.",
        existing: toApiItem(activeRequest),
      });
      return;
    }

    const id = makeId();
    const result = await runQuery<AccessRequestRow>(
      `
      INSERT INTO app.access_requests (
        id,
        name,
        usn,
        phone,
        status,
        requested_at,
        approved_at,
        rejected_at
      )
      OUTPUT
        INSERTED.id,
        INSERTED.name,
        INSERTED.usn,
        INSERTED.phone,
        INSERTED.status,
        INSERTED.requested_at,
        INSERTED.approved_at,
        INSERTED.rejected_at
      VALUES (
        @id,
        @name,
        @usn,
        @phone,
        'pending',
        SYSUTCDATETIME(),
        NULL,
        NULL
      );
      `,
      [
        { name: "id", type: sql.NVarChar, value: id },
        { name: "name", type: sql.NVarChar, value: name },
        { name: "usn", type: sql.NVarChar, value: usn },
        { name: "phone", type: sql.NVarChar, value: phone },
      ],
    );

    res.status(201).json(toApiItem(result.recordset[0]));
  } catch (error: any) {
    if (String(error?.message || "").includes("UX_access_requests_active_usn")) {
      res.status(409).json({
        message: "This USN already has a pending or denied access request.",
      });
      return;
    }

    res.status(500).json({ message: error?.message || "Failed to create access request" });
  }
};

export const updateAccessRequestStatusInSql: RequestHandler = async (req, res) => {
  const id = normalizeText(req.params.id);
  const body = req.body as Partial<UpdateAccessRequestApiBody>;
  const status = body.status;

  if (!id) {
    res.status(400).json({ message: "id is required" });
    return;
  }

  if (status !== "approved" && status !== "rejected") {
    res.status(400).json({ message: "status must be approved or rejected" });
    return;
  }

  try {
    const result = await runQuery<AccessRequestRow>(
      `
      UPDATE app.access_requests
      SET
        status = @status,
        approved_at = CASE WHEN @status = 'approved' THEN COALESCE(approved_at, SYSUTCDATETIME()) ELSE approved_at END,
        rejected_at = CASE WHEN @status = 'rejected' THEN COALESCE(rejected_at, SYSUTCDATETIME()) ELSE rejected_at END
      OUTPUT
        INSERTED.id,
        INSERTED.name,
        INSERTED.usn,
        INSERTED.phone,
        INSERTED.status,
        INSERTED.requested_at,
        INSERTED.approved_at,
        INSERTED.rejected_at
      WHERE id = @id;
      `,
      [
        { name: "id", type: sql.NVarChar, value: id },
        { name: "status", type: sql.NVarChar, value: status },
      ],
    );

    const updated = result.recordset[0];
    if (!updated) {
      res.status(404).json({ message: "Access request not found" });
      return;
    }

    res.json(toApiItem(updated));
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to update access request" });
  }
};