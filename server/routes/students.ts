import { RequestHandler } from "express";
import { runQuery, sql } from "../db";
import type { CreateStudentApiBody, StudentApiItem } from "@shared/api";

function cleanText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeDocuments(documents: CreateStudentApiBody["documents"]) {
  if (!documents?.length) return [];
  return documents
    .map((doc) => ({
      name: String(doc?.name ?? "").trim(),
      dataUrl: String(doc?.dataUrl ?? "").trim(),
    }))
    .filter((doc) => doc.name && doc.dataUrl);
}

let ensureRoomNumberColumnPromise: Promise<void> | null = null;

export function ensureStudentSchema() {
  if (!ensureRoomNumberColumnPromise) {
    ensureRoomNumberColumnPromise = runQuery(`
      IF COL_LENGTH('app.students', 'room_number') IS NULL
      BEGIN
        ALTER TABLE app.students ADD room_number NVARCHAR(50) NULL;
      END;
    `).then(() => undefined);
  }

  return ensureRoomNumberColumnPromise;
}

export const listStudentsFromSql: RequestHandler = async (_req, res) => {
  try {
    await ensureStudentSchema();

    const result = await runQuery<StudentApiItem>(`
      SELECT
        id,
        student_id,
        roll_number,
        name,
        usn,
        room_number,
        year,
        joining_year,
        father_name,
        mother_name,
        father_contact,
        mother_contact,
        student_contact,
        address,
        email,
        total_amount,
        joining_date,
        profile_photo_data_url,
        created_at
      FROM app.students
      ORDER BY created_at DESC;
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error?.message || "Failed to list students" });
  }
};

export const createStudentInSql: RequestHandler = async (req, res) => {
  const body = req.body as Partial<CreateStudentApiBody>;
  const documents = normalizeDocuments(body.documents);

  if (!body.id || !body.student_id || !body.name) {
    res.status(400).json({
      ok: false,
      message: "id, student_id and name are required",
    });
    return;
  }

  try {
    await ensureStudentSchema();

    await runQuery(
      `
      MERGE app.students AS target
      USING (
        SELECT
          @id AS id,
          @student_id AS student_id,
          COALESCE(NULLIF(@roll_number, ''), @student_id) AS roll_number,
          @name AS name,
          @usn AS usn,
          @room_number AS room_number,
          @year AS year,
          @joining_year AS joining_year,
          @father_name AS father_name,
          @mother_name AS mother_name,
          @father_contact AS father_contact,
          @mother_contact AS mother_contact,
          @student_contact AS student_contact,
          @address AS address,
          @email AS email,
          @total_amount AS total_amount,
          TRY_CONVERT(date, @joining_date) AS joining_date,
          @profile_photo_data_url AS profile_photo_data_url
      ) AS source
      ON target.id = source.id
      WHEN MATCHED THEN
        UPDATE SET
          student_id = source.student_id,
          roll_number = source.roll_number,
          name = source.name,
          usn = source.usn,
          room_number = source.room_number,
          year = source.year,
          joining_year = source.joining_year,
          father_name = source.father_name,
          mother_name = source.mother_name,
          father_contact = source.father_contact,
          mother_contact = source.mother_contact,
          student_contact = source.student_contact,
          address = source.address,
          email = source.email,
          total_amount = source.total_amount,
          joining_date = source.joining_date,
          profile_photo_data_url = source.profile_photo_data_url,
          updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (
          id,
          student_id,
          roll_number,
          name,
          usn,
          room_number,
          year,
          joining_year,
          father_name,
          mother_name,
          father_contact,
          mother_contact,
          student_contact,
          address,
          email,
          total_amount,
          joining_date,
          profile_photo_data_url
        )
        VALUES (
          source.id,
          source.student_id,
          source.roll_number,
          source.name,
          source.usn,
          source.room_number,
          source.year,
          source.joining_year,
          source.father_name,
          source.mother_name,
          source.father_contact,
          source.mother_contact,
          source.student_contact,
          source.address,
          source.email,
          source.total_amount,
          source.joining_date,
          source.profile_photo_data_url
        );
      `,
      [
        { name: "id", type: sql.NVarChar(80), value: body.id.trim() },
        { name: "student_id", type: sql.NVarChar(80), value: body.student_id.trim() },
        { name: "roll_number", type: sql.NVarChar(80), value: cleanText(body.roll_number) },
        { name: "name", type: sql.NVarChar(150), value: body.name.trim() },
        { name: "usn", type: sql.NVarChar(80), value: cleanText(body.usn) },
        { name: "room_number", type: sql.NVarChar(50), value: cleanText(body.room_number) },
        { name: "year", type: sql.NVarChar(30), value: cleanText(body.year) },
        { name: "joining_year", type: sql.Int, value: body.joining_year ?? null },
        { name: "father_name", type: sql.NVarChar(150), value: cleanText(body.father_name) },
        { name: "mother_name", type: sql.NVarChar(150), value: cleanText(body.mother_name) },
        {
          name: "father_contact",
          type: sql.NVarChar(30),
          value: cleanText(body.father_contact),
        },
        {
          name: "mother_contact",
          type: sql.NVarChar(30),
          value: cleanText(body.mother_contact),
        },
        {
          name: "student_contact",
          type: sql.NVarChar(30),
          value: cleanText(body.student_contact),
        },
        { name: "address", type: sql.NVarChar(500), value: cleanText(body.address) },
        { name: "email", type: sql.NVarChar(255), value: cleanText(body.email) },
        { name: "total_amount", type: sql.Decimal(12, 2), value: body.total_amount ?? null },
        { name: "joining_date", type: sql.NVarChar(30), value: cleanText(body.joining_date) },
        {
          name: "profile_photo_data_url",
          type: sql.NVarChar(sql.MAX),
          value: cleanText(body.profile_photo_data_url),
        },
      ],
    );

    await runQuery(
      `
      DELETE FROM app.student_documents
      WHERE student_id = @student_id;
      `,
      [{ name: "student_id", type: sql.NVarChar(80), value: body.student_id.trim() }],
    );

    for (const doc of documents) {
      await runQuery(
        `
        INSERT INTO app.student_documents (
          student_id,
          document_name,
          document_data_url
        )
        VALUES (
          @student_id,
          @document_name,
          @document_data_url
        );
        `,
        [
          { name: "student_id", type: sql.NVarChar(80), value: body.student_id.trim() },
          { name: "document_name", type: sql.NVarChar(255), value: doc.name },
          {
            name: "document_data_url",
            type: sql.NVarChar(sql.MAX),
            value: doc.dataUrl,
          },
        ],
      );
    }

    res.status(201).json({ ok: true, message: "Student synced to SQL Server" });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error?.message || "Failed to create student" });
  }
};
