import { RequestHandler } from "express";
import { runQuery, sql } from "../db";
import type { CreateRoomApiBody, RoomApiItem } from "@shared/api";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function makeRoomId(name: string): string {
  return `room-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export const listRoomsFromSql: RequestHandler = async (_req, res) => {
  try {
    const result = await runQuery<RoomApiItem>(`
      SELECT
        id,
        name,
        capacity,
        'Active' AS status
      FROM app.rooms
      ORDER BY name ASC;
    `);

    res.json(result.recordset);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to list rooms" });
  }
};

export const createRoomInSql: RequestHandler = async (req, res) => {
  const body = req.body as Partial<CreateRoomApiBody>;
  const name = normalizeText(body.name);
  const capacity = Number(body.capacity ?? 0);

  if (!name || !Number.isFinite(capacity) || capacity < 1) {
    res.status(400).json({ message: "name and valid capacity are required" });
    return;
  }

  const id = makeRoomId(name);

  try {
    const result = await runQuery<RoomApiItem>(
      `
      INSERT INTO app.rooms (id, name, capacity)
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.capacity, 'Active' AS status
      VALUES (@id, @name, @capacity);
      `,
      [
        { name: "id", type: sql.NVarChar, value: id },
        { name: "name", type: sql.NVarChar, value: name },
        { name: "capacity", type: sql.Int, value: Math.floor(capacity) },
      ],
    );

    res.status(201).json(result.recordset[0]);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to create room" });
  }
};
