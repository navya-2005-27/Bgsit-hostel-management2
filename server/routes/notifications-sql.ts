import { RequestHandler } from "express";
import { runQuery, sql } from "../db";
import type { CreateNotificationApiBody, NotificationApiItem } from "@shared/api";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const listNotificationsFromSql: RequestHandler = async (_req, res) => {
  try {
    const result = await runQuery<NotificationApiItem>(`
      SELECT
        id,
        title,
        COALESCE(description, content) AS description,
        image_data_url AS imageDataUrl,
        CONVERT(VARCHAR(33), date_iso, 127) AS dateISO,
        'Active' AS status
      FROM app.notifications
      ORDER BY date_iso DESC, created_at DESC;
    `);

    res.json(result.recordset);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to list notifications" });
  }
};

export const createNotificationInSql: RequestHandler = async (req, res) => {
  const body = req.body as Partial<CreateNotificationApiBody>;
  const title = normalizeText(body.title);
  const description = normalizeText(body.description);
  const imageDataUrl = normalizeText(body.imageDataUrl);
  const dateISO = normalizeText(body.dateISO);

  if (!title || !description) {
    res.status(400).json({ message: "title and description are required" });
    return;
  }

  const id = makeId();

  try {
    const result = await runQuery<NotificationApiItem>(
      `
      INSERT INTO app.notifications (
        id,
        title,
        content,
        description,
        image_data_url,
        date_iso,
        created_at
      )
      OUTPUT
        INSERTED.id,
        INSERTED.title,
        COALESCE(INSERTED.description, INSERTED.content) AS description,
        INSERTED.image_data_url AS imageDataUrl,
        CONVERT(VARCHAR(33), INSERTED.date_iso, 127) AS dateISO,
        'Active' AS status
      VALUES (
        @id,
        @title,
        @content,
        @description,
        @image_data_url,
        COALESCE(TRY_CAST(@date_iso AS DATETIME2), SYSUTCDATETIME()),
        SYSUTCDATETIME()
      );
      `,
      [
        { name: "id", type: sql.NVarChar, value: id },
        { name: "title", type: sql.NVarChar, value: title },
        { name: "content", type: sql.NVarChar, value: description },
        { name: "description", type: sql.NVarChar, value: description },
        { name: "image_data_url", type: sql.NVarChar, value: imageDataUrl || null },
        { name: "date_iso", type: sql.NVarChar, value: dateISO || null },
      ],
    );

    res.status(201).json(result.recordset[0]);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to create notification" });
  }
};

export const deleteNotificationFromSql: RequestHandler = async (req, res) => {
  const id = normalizeText(req.params.id);
  if (!id) {
    res.status(400).json({ message: "id is required" });
    return;
  }

  try {
    const result = await runQuery<{ id: string }>(
      `
      DELETE FROM app.notifications
      OUTPUT DELETED.id
      WHERE id = @id;
      `,
      [{ name: "id", type: sql.NVarChar, value: id }],
    );

    if (!result.recordset[0]) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    res.json({ ok: true, id });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to delete notification" });
  }
};
