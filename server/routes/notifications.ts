import { RequestHandler } from "express";

type AbsenteePayload = {
  name: string;
  phone: string;
};

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

async function sendWhatsAppText(to: string, message: string) {
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_ID}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `WhatsApp API error (${response.status})`);
  }
}

export const sendAbsenteeWhatsAppNotifications: RequestHandler = async (
  req,
  res,
) => {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    res.status(503).json({
      ok: false,
      message:
        "WhatsApp service is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
    });
    return;
  }

  const absentees = (req.body?.absentees || []) as AbsenteePayload[];
  const date = String(req.body?.date || "").trim();

  if (!Array.isArray(absentees) || !absentees.length || !date) {
    res.status(400).json({
      ok: false,
      message: "absentees[] and date are required.",
    });
    return;
  }

  const prepared = absentees
    .map((a) => ({ name: String(a.name || "").trim(), phone: normalizePhone(String(a.phone || "")) }))
    .filter((a) => a.name && a.phone);

  const results: Array<{ name: string; phone: string; ok: boolean; error?: string }> = [];

  for (const item of prepared) {
    const note = `Your child ${item.name} was absent on ${date}.`;
    try {
      await sendWhatsAppText(item.phone, note);
      results.push({ name: item.name, phone: item.phone, ok: true });
    } catch (e: any) {
      results.push({
        name: item.name,
        phone: item.phone,
        ok: false,
        error: e?.message || "Failed to send",
      });
    }
  }

  const sentCount = results.filter((r) => r.ok).length;
  res.json({
    ok: true,
    requested: prepared.length,
    sentCount,
    failedCount: prepared.length - sentCount,
    results,
  });
};
