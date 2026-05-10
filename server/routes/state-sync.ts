import { RequestHandler } from "express";
import { runQuery, sql } from "../db";

type StateRow = {
  state_key: string;
  state_value: string;
};

function normalizeKey(input: unknown): string {
  return String(input ?? "").trim();
}

export const listSyncedState: RequestHandler = async (req, res) => {
  const prefix = String(req.query.prefix ?? "campusstay.").trim();

  try {
    const result = await runQuery<StateRow>(
      `
      SELECT state_key, state_value
      FROM app.client_state
      WHERE state_key LIKE @prefix + '%'
      ORDER BY updated_at DESC;
      `,
      [{ name: "prefix", type: sql.NVarChar, value: prefix }],
    );

    res.json({
      ok: true,
      data: result.recordset.map((row) => ({ key: row.state_key, value: row.state_value })),
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error?.message || "Failed to load synced state" });
  }
};

export const upsertSyncedState: RequestHandler = async (req, res) => {
  const key = normalizeKey(req.body?.key);
  const value = req.body?.value;

  if (!key) {
    res.status(400).json({ ok: false, message: "key is required" });
    return;
  }

  try {
    if (value === null) {
      await runQuery(
        `DELETE FROM app.client_state WHERE state_key = @state_key;`,
        [{ name: "state_key", type: sql.NVarChar, value: key }],
      );

      res.json({ ok: true, message: "state removed" });
      return;
    }

    const normalizedValue = String(value);

    await runQuery(
      `
      MERGE app.client_state AS target
      USING (SELECT @state_key AS state_key, @state_value AS state_value) AS source
      ON target.state_key = source.state_key
      WHEN MATCHED THEN
        UPDATE SET
          state_value = source.state_value,
          updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (state_key, state_value, updated_at)
        VALUES (source.state_key, source.state_value, SYSUTCDATETIME());
      `,
      [
        { name: "state_key", type: sql.NVarChar, value: key },
        { name: "state_value", value: normalizedValue },
      ],
    );

    res.json({ ok: true, message: "state synced" });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error?.message || "Failed to sync state" });
  }
};
