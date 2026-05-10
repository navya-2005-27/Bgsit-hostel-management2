import { RequestHandler } from "express";
import { runQuery, sql } from "../db";
import type { CreateResidentApiBody, ResidentApiItem } from "@shared/api";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

export const listResidentsFromSql: RequestHandler = async (_req, res) => {
  try {
    const result = await runQuery<ResidentApiItem>(`
      SELECT
        id,
        name,
        room_number AS roomNumber,
        status
      FROM app.residents
      ORDER BY id DESC;
    `);

    res.json(result.recordset);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to list residents" });
  }
};

export const createResidentInSql: RequestHandler = async (req, res) => {
  const body = req.body as Partial<CreateResidentApiBody>;
  const name = normalizeText(body.name);
  const roomNumber = normalizeText(body.roomNumber);
  const phoneNumber = normalizeText(body.phoneNumber);
  const email = normalizeText(body.email);

  if (!name || !roomNumber || !phoneNumber || !email) {
    res.status(400).json({
      message: "name, roomNumber, phoneNumber and email are required",
    });
    return;
  }

  try {
    const result = await runQuery<ResidentApiItem>(
      `
      INSERT INTO app.residents (
        name,
        room_number,
        phone_number,
        email,
        status
      )
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.room_number AS roomNumber, INSERTED.status
      VALUES (
        @name,
        @room_number,
        @phone_number,
        @email,
        @status
      );
      `,
      [
        { name: "name", type: sql.NVarChar, value: name },
        { name: "room_number", type: sql.NVarChar, value: roomNumber },
        { name: "phone_number", type: sql.NVarChar, value: phoneNumber },
        { name: "email", type: sql.NVarChar, value: email },
        { name: "status", type: sql.NVarChar, value: "Active" },
      ],
    );

    const inserted = result.recordset[0];
    res.status(201).json(inserted);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to create resident" });
  }
};
