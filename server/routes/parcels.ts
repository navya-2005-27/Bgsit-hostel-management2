import { RequestHandler } from "express";
import { runQuery, sql } from "../db";
import type { CreateParcelApiBody, ParcelApiItem } from "@shared/api";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function makeOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const listParcelsFromSql: RequestHandler = async (_req, res) => {
  try {
    const result = await runQuery<ParcelApiItem>(`
      SELECT
        id,
        student_id AS studentId,
        parcel_code AS parcelCode,
        carrier,
        collected,
        CASE WHEN collected = 1 THEN 'Collected' ELSE 'Pending' END AS status,
        received_at AS receivedAt
      FROM app.parcels
      ORDER BY received_at DESC;
    `);

    res.json(result.recordset);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to list parcels" });
  }
};

export const createParcelInSql: RequestHandler = async (req, res) => {
  const body = req.body as Partial<CreateParcelApiBody>;
  const id = normalizeText(body.id);
  const studentId = normalizeText(body.studentId);
  const parcelCode = normalizeText(body.parcelCode);
  const carrier = normalizeText(body.carrier);

  if (!id || !studentId || !parcelCode) {
    res.status(400).json({
      message: "id, studentId and parcelCode are required",
    });
    return;
  }

  try {
    const result = await runQuery<ParcelApiItem>(
      `
      INSERT INTO app.parcels (
        id,
        student_id,
        parcel_code,
        carrier,
        received_at,
        collected,
        otp,
        note
      )
      OUTPUT
        INSERTED.id,
        INSERTED.student_id AS studentId,
        INSERTED.parcel_code AS parcelCode,
        INSERTED.carrier,
        INSERTED.collected,
        CASE WHEN INSERTED.collected = 1 THEN 'Collected' ELSE 'Pending' END AS status,
        INSERTED.received_at AS receivedAt
      VALUES (
        @id,
        @student_id,
        @parcel_code,
        @carrier,
        SYSUTCDATETIME(),
        0,
        @otp,
        NULL
      );
      `,
      [
        { name: "id", type: sql.NVarChar, value: id },
        { name: "student_id", type: sql.NVarChar, value: studentId },
        { name: "parcel_code", type: sql.NVarChar, value: parcelCode },
        { name: "carrier", type: sql.NVarChar, value: carrier || null },
        { name: "otp", type: sql.NVarChar, value: makeOtp() },
      ],
    );

    res.status(201).json(result.recordset[0]);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to create parcel" });
  }
};
