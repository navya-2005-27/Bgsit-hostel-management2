import { RequestHandler } from "express";
import { runQuery, sql } from "../db";
import type { CreateEventSqlApiBody, EventSqlApiItem } from "@shared/api";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

export const listEventsFromSql: RequestHandler = async (_req, res) => {
  try {
    const result = await runQuery<EventSqlApiItem>(`
      SELECT
        id,
        name,
        venue,
        status,
        CONVERT(VARCHAR(33), date_iso, 127) AS dateISO
      FROM app.events
      ORDER BY date_iso DESC;
    `);

    res.json(result.recordset);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to list events" });
  }
};

export const createEventInSql: RequestHandler = async (req, res) => {
  const body = req.body as Partial<CreateEventSqlApiBody>;
  const id = normalizeText(body.id);
  const name = normalizeText(body.name);
  const description = normalizeText(body.description);
  const organizerRole = normalizeText(body.organizerRole);
  const eventType = normalizeText(body.eventType);
  const dateISO = normalizeText(body.dateISO);
  const venue = normalizeText(body.venue);

  if (!id || !name || !description || !organizerRole || !eventType || !dateISO || !venue) {
    res.status(400).json({
      message: "id, name, description, organizerRole, eventType, dateISO and venue are required",
    });
    return;
  }

  if (organizerRole !== "student" && organizerRole !== "warden") {
    res.status(400).json({ message: "organizerRole must be student or warden" });
    return;
  }

  try {
    const result = await runQuery<EventSqlApiItem>(
      `
      INSERT INTO app.events (
        id,
        name,
        description,
        organizer_role,
        organizer_name,
        event_type,
        date_iso,
        venue,
        expected_count,
        budget,
        poster_data_url,
        status,
        created_at
      )
      OUTPUT
        INSERTED.id,
        INSERTED.name,
        INSERTED.venue,
        INSERTED.status,
        CONVERT(VARCHAR(33), INSERTED.date_iso, 127) AS dateISO
      VALUES (
        @id,
        @name,
        @description,
        @organizer_role,
        NULL,
        @event_type,
        TRY_CAST(@date_iso AS DATETIME2),
        @venue,
        NULL,
        NULL,
        NULL,
        CASE WHEN @organizer_role = 'student' THEN 'pending' ELSE 'approved' END,
        SYSUTCDATETIME()
      );
      `,
      [
        { name: "id", type: sql.NVarChar, value: id },
        { name: "name", type: sql.NVarChar, value: name },
        { name: "description", type: sql.NVarChar, value: description },
        { name: "organizer_role", type: sql.NVarChar, value: organizerRole },
        { name: "event_type", type: sql.NVarChar, value: eventType },
        { name: "date_iso", type: sql.NVarChar, value: dateISO },
        { name: "venue", type: sql.NVarChar, value: venue },
      ],
    );

    res.status(201).json(result.recordset[0]);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to create event" });
  }
};
