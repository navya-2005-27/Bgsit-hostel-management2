import { RequestHandler } from "express";
import { runQuery, sql } from "../db";
import type {
  AuthLoginApiBody,
  AuthLoginApiResponse,
  UpsertStudentAccountApiBody,
  UpsertStudentAccountApiResponse,
  UpdateWardenAccountApiBody,
  UpdateWardenAccountApiResponse,
} from "@shared/api";

const DEFAULT_ADMIN = {
  username: "admin",
  password: "Admin@123",
};

const DEFAULT_WARDEN = {
  username: "warden",
  password: "Warden@123",
};

const VALID_ROLES = new Set(["admin", "warden", "student"]);

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function passwordHashExpression(): string {
  return "CONVERT(NVARCHAR(64), HASHBYTES('SHA2_256', @password), 2)";
}

function isLegacyFallback(role: string, username: string, password: string): boolean {
  const normalizedUsername = username.trim().toLowerCase();

  if (role === "admin") {
    return (
      normalizedUsername === DEFAULT_ADMIN.username &&
      password === DEFAULT_ADMIN.password
    );
  }

  if (role === "warden") {
    return (
      normalizedUsername === DEFAULT_WARDEN.username &&
      password === DEFAULT_WARDEN.password
    );
  }

  return false;
}

export const loginUserAccount: RequestHandler = async (req, res) => {
  const body = req.body as Partial<AuthLoginApiBody>;
  const username = normalizeText(body.username);
  const password = normalizeText(body.password);
  const role = normalizeText(body.role).toLowerCase();

  if (!username || !password || !role) {
    res.status(400).json({ ok: false, message: "username, password and role are required" });
    return;
  }

  if (!VALID_ROLES.has(role)) {
    res.status(400).json({ ok: false, message: "role must be admin, warden, or student" });
    return;
  }

  try {
    const result = await runQuery<{
      id: string;
      role: string;
      username: string;
      student_id: string | null;
    }>(
      `
      SELECT TOP 1
        id,
        role,
        username,
        student_id
      FROM app.user_accounts
      WHERE LOWER(username) = LOWER(@username)
        AND role = @role
        AND is_active = 1
        AND (
          password_hash = @password
          OR password_hash = ${passwordHashExpression()}
        );
      `,
      [
        { name: "username", type: sql.NVarChar, value: username },
        { name: "role", type: sql.NVarChar, value: role },
        { name: "password", type: sql.NVarChar, value: password },
      ],
    );

    const account = result.recordset[0];
    if (account) {
      const response: AuthLoginApiResponse = {
        ok: true,
        id: account.id,
        role: account.role as AuthLoginApiResponse["role"],
        username: account.username,
        studentId: account.student_id,
        source: "sql",
      };
      res.json(response);
      return;
    }

    if (isLegacyFallback(role, username, password)) {
      const response: AuthLoginApiResponse = {
        ok: true,
        id: `legacy-${role}`,
        role: role as AuthLoginApiResponse["role"],
        username,
        studentId: null,
        source: "legacy",
      };
      res.json(response);
      return;
    }

    res.status(401).json({ ok: false, message: "Invalid username or password" });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error?.message || "Failed to validate login" });
  }
};

export const upsertWardenAccount: RequestHandler = async (req, res) => {
  const body = req.body as Partial<UpdateWardenAccountApiBody>;
  const username = normalizeText(body.username);
  const password = normalizeText(body.password);

  if (!username || !password) {
    res.status(400).json({ ok: false, message: "username and password are required" });
    return;
  }

  try {
    const result = await runQuery<UpdateWardenAccountApiResponse>(
      `
      MERGE app.user_accounts AS target
      USING (
        SELECT
          'warden' AS role,
          @username AS username,
          @password AS password
      ) AS source
      ON target.role = source.role
      WHEN MATCHED THEN
        UPDATE SET
          username = source.username,
          password_hash = ${passwordHashExpression()},
          student_id = NULL,
          is_active = 1,
          updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (id, role, username, password_hash, student_id, is_active)
        VALUES (
          CONCAT('acct-', source.role),
          source.role,
          source.username,
          ${passwordHashExpression()},
          NULL,
          1
        )
      OUTPUT
        INSERTED.id,
        INSERTED.role,
        INSERTED.username;
      `,
      [
        { name: "username", type: sql.NVarChar, value: username },
        { name: "password", type: sql.NVarChar, value: password },
      ],
    );

    const account = result.recordset[0];
    res.json({
      ok: true,
      id: account.id,
      role: "warden",
      username: account.username,
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error?.message || "Failed to update warden account" });
  }
};

export const upsertStudentAccount: RequestHandler = async (req, res) => {
  const body = req.body as Partial<UpsertStudentAccountApiBody>;
  const studentId = normalizeText(body.studentId);
  const username = normalizeText(body.username);
  const password = normalizeText(body.password);

  if (!studentId || !username || !password) {
    res.status(400).json({ ok: false, message: "studentId, username and password are required" });
    return;
  }

  try {
    const result = await runQuery<UpsertStudentAccountApiResponse>(
      `
      MERGE app.user_accounts AS target
      USING (
        SELECT
          @student_id AS student_id,
          @username AS username,
          @password AS password
      ) AS source
      ON target.role = 'student' AND target.student_id = source.student_id
      WHEN MATCHED THEN
        UPDATE SET
          username = source.username,
          password_hash = ${passwordHashExpression()},
          is_active = 1,
          updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (id, role, username, password_hash, student_id, is_active)
        VALUES (
          CONCAT('acct-student-', source.student_id),
          'student',
          source.username,
          ${passwordHashExpression()},
          source.student_id,
          1
        )
      OUTPUT
        INSERTED.id,
        INSERTED.role,
        INSERTED.username,
        INSERTED.student_id;
      `,
      [
        { name: "student_id", type: sql.NVarChar, value: studentId },
        { name: "username", type: sql.NVarChar, value: username },
        { name: "password", type: sql.NVarChar, value: password },
      ],
    );

    const account = result.recordset[0];
    res.json({
      ok: true,
      id: account.id,
      role: "student",
      username: account.username,
      studentId: account.studentId,
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error?.message || "Failed to update student account" });
  }
};

// OTP storage - in production, use Redis or a proper session store
const otpStore = new Map<string, { otp: string; createdAt: number; studentId?: string }>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const generateStudentOtp: RequestHandler = async (req, res) => {
  const body = req.body as Partial<{
    usn: string;
  }>;
  const usn = normalizeText(body.usn);

  if (!usn) {
    res.status(400).json({ ok: false, message: "USN is required" });
    return;
  }

  try {
    // Check if there's an approved access request for this USN
    const accessResult = await runQuery<{ id: string }>(
      `
      SELECT TOP 1 id
      FROM app.access_requests
      WHERE UPPER(usn) = UPPER(@usn)
        AND status = 'approved'
      `,
      [{ name: "usn", type: sql.NVarChar, value: usn }],
    );

    if (!accessResult.recordset[0]) {
      res.status(404).json({ ok: false, message: "Access request not approved yet. Please wait for warden approval." });
      return;
    }

    const otp = generateOtp();
    const now = Date.now();

    // Store OTP with expiry (10 minutes)
    otpStore.set(usn.toUpperCase(), {
      otp,
      createdAt: now,
      studentId: undefined,
    });

    // Clean up old OTPs
    for (const [key, value] of otpStore.entries()) {
      if (now - value.createdAt > 600000) {
        otpStore.delete(key);
      }
    }

    // In production, send OTP via SMS or email
    console.log(`[OTP for ${usn}]: ${otp}`);

    res.json({
      ok: true,
      message: `OTP sent to registered phone number. (Debug: ${otp})`,
      debugOtp: otp,
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error?.message || "Failed to generate OTP" });
  }
};

export const verifyStudentOtp: RequestHandler = async (req, res) => {
  const body = req.body as Partial<{
    usn: string;
    otp: string;
  }>;
  const usn = normalizeText(body.usn);
  const otp = normalizeText(body.otp);

  if (!usn || !otp) {
    res.status(400).json({ ok: false, message: "USN and OTP are required" });
    return;
  }

  try {
    const stored = otpStore.get(usn.toUpperCase());

    if (!stored) {
      res.status(401).json({ ok: false, message: "OTP expired or not requested. Please generate a new OTP." });
      return;
    }

    if (stored.otp !== otp) {
      res.status(401).json({ ok: false, message: "Invalid OTP. Please try again." });
      return;
    }

    // Check expiry (10 minutes)
    if (Date.now() - stored.createdAt > 600000) {
      otpStore.delete(usn.toUpperCase());
      res.status(401).json({ ok: false, message: "OTP expired. Please request a new one." });
      return;
    }

    // OTP verified successfully
    const studentId = stored.studentId;
    const token = `student-token-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    otpStore.delete(usn.toUpperCase());

    res.json({
      ok: true,
      studentId: studentId || "",
      token,
      message: "OTP verified successfully",
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error?.message || "Failed to verify OTP" });
  }
};