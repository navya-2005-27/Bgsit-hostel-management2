import { RequestHandler } from "express";

export const getStorageStatus: RequestHandler = (_req, res) => {
  res.json({
    sqlServer: {
      enabled: [
        "api.db.health",
        "api.residents.create",
        "api.residents.list",
        "api.rooms.create",
        "api.rooms.list",
        "api.parcels.create",
        "api.parcels.list",
        "api.notifications.create",
        "api.notifications.list",
        "api.events.create",
        "api.events.list",
        "api.attendance.get",
        "api.attendance.post",
        "api.state-sync.get",
        "api.state-sync.post",
        "api.students.create",
        "api.students.list",
      ],
      tables: [
        "app.client_state",
        "app.events",
        "app.attendance_records",
        "app.parcels",
        "app.residents",
        "app.rooms",
        "app.students",
      ],
    },
    localStorage: {
      enabled: [
        "browser cache for app state",
        "mirrored to SQL via app.client_state",
      ],
      files: [
        "client/lib/studentStore.ts",
        "client/lib/roomStore.ts",
        "client/lib/parcelStore.ts",
        "client/lib/eventStore.ts",
        "client/lib/notificationStore.ts",
        "client/lib/notificationStoreV2.ts",
      ],
    },
  });
};
