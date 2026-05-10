import { RequestHandler } from "express";
import { runQuery, sql } from "../db";
import type { AttendanceSqlApiItem, UpsertAttendanceSqlApiBody } from "@shared/api";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

export const listAttendanceFromSql: RequestHandler = async (req, res) => {
  const dateKey = normalizeText(req.query.dateKey);

  if (!dateKey) {
    res.status(400).json({ message: "dateKey query param is required (YYYY-MM-DD)" });
    return;
  }

  try {
    const result = await runQuery<AttendanceSqlApiItem>(
      `
      SELECT
        student_id AS studentId,
        CONVERT(VARCHAR(10), date_key, 120) AS dateKey,
        status,
        CONVERT(VARCHAR(33), marked_at, 127) AS markedAt
      FROM app.attendance_records
      WHERE date_key = TRY_CAST(@date_key AS DATE)
      ORDER BY student_id ASC;
      `,
      [{ name: "date_key", type: sql.NVarChar, value: dateKey }],
    );

    res.json(result.recordset);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to list attendance" });
  }
};

export const upsertAttendanceInSql: RequestHandler = async (req, res) => {
  const body = req.body as Partial<UpsertAttendanceSqlApiBody>;
  const studentId = normalizeText(body.studentId);
  const dateKey = normalizeText(body.dateKey);
  const status = normalizeText(body.status);

  if (!studentId || !dateKey || (status !== "present" && status !== "absent")) {
    res.status(400).json({
      message: "studentId, dateKey, and status (present/absent) are required",
    });
    return;
  }

  try {
    const result = await runQuery<AttendanceSqlApiItem>(
      `
      MERGE app.attendance_records AS target
      USING (
        SELECT
          @student_id AS student_id,
          TRY_CAST(@date_key AS DATE) AS date_key,
          @status AS status
      ) AS source
      ON target.student_id = source.student_id AND target.date_key = source.date_key
      WHEN MATCHED THEN
        UPDATE SET
          target.status = source.status,
          target.marked_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (student_id, date_key, marked_at, status, latitude, longitude)
        VALUES (source.student_id, source.date_key, SYSUTCDATETIME(), source.status, NULL, NULL)
      OUTPUT
        INSERTED.student_id AS studentId,
        CONVERT(VARCHAR(10), INSERTED.date_key, 120) AS dateKey,
        INSERTED.status,
        CONVERT(VARCHAR(33), INSERTED.marked_at, 127) AS markedAt;
      `,
      [
        { name: "student_id", type: sql.NVarChar, value: studentId },
        { name: "date_key", type: sql.NVarChar, value: dateKey },
        { name: "status", type: sql.NVarChar, value: status },
      ],
    );

    res.json(result.recordset[0]);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to save attendance" });
  }
};
