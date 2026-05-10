import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { loginUserAccount, upsertStudentAccount, upsertWardenAccount, generateStudentOtp, verifyStudentOtp } from "./routes/auth";
import { sendAbsenteeWhatsAppNotifications } from "./routes/notifications";
import { checkDatabaseHealth } from "./db";
import { createStudentInSql, listStudentsFromSql } from "./routes/students";
import { createResidentInSql, listResidentsFromSql } from "./routes/residents";
import { getStorageStatus } from "./routes/storage-status";
import { createRoomInSql, listRoomsFromSql } from "./routes/rooms";
import { listSyncedState, upsertSyncedState } from "./routes/state-sync";
import { createParcelInSql, listParcelsFromSql } from "./routes/parcels";
import { createNotificationInSql, deleteNotificationFromSql, listNotificationsFromSql } from "./routes/notifications-sql";
import { createEventInSql, listEventsFromSql } from "./routes/events-sql";
import { listAttendanceFromSql, upsertAttendanceInSql } from "./routes/attendance-sql";
import {
  createAccessRequestInSql,
  listAccessRequestsFromSql,
  updateAccessRequestStatusInSql,
} from "./routes/access-requests";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/auth/login", loginUserAccount);
  app.put("/api/auth/warden", upsertWardenAccount);
  app.put("/api/auth/student", upsertStudentAccount);
  app.post("/api/auth/student/otp/generate", generateStudentOtp);
  app.post("/api/auth/student/otp/verify", verifyStudentOtp);
  app.get("/api/students", listStudentsFromSql);
  app.post("/api/students", createStudentInSql);
  app.get("/api/residents", listResidentsFromSql);
  app.post("/api/residents", createResidentInSql);
  app.get("/api/rooms", listRoomsFromSql);
  app.post("/api/rooms", createRoomInSql);
  app.get("/api/parcels", listParcelsFromSql);
  app.post("/api/parcels", createParcelInSql);
  app.get("/api/notifications", listNotificationsFromSql);
  app.post("/api/notifications", createNotificationInSql);
  app.delete("/api/notifications/:id", deleteNotificationFromSql);
  app.get("/api/events", listEventsFromSql);
  app.post("/api/events", createEventInSql);
  app.get("/api/attendance", listAttendanceFromSql);
  app.post("/api/attendance", upsertAttendanceInSql);
  app.get("/api/access-requests", listAccessRequestsFromSql);
  app.post("/api/access-requests", createAccessRequestInSql);
  app.patch("/api/access-requests/:id", updateAccessRequestStatusInSql);
  app.get("/api/state-sync", listSyncedState);
  app.post("/api/state-sync", upsertSyncedState);
  app.get("/api/storage-status", getStorageStatus);
  app.get("/api/db/health", async (_req, res) => {
    const ok = await checkDatabaseHealth();
    if (!ok) {
      res.status(503).json({ ok: false, message: "SQL Server connection failed" });
      return;
    }

    res.json({ ok: true, message: "SQL Server connection is healthy" });
  });
  app.post("/api/notifications/absentees-whatsapp", sendAbsenteeWhatsAppNotifications);

  return app;
}
