import { getStore } from "@netlify/blobs";
import { hasModeratorSession } from "../lib/moderator-session.mjs";

const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export default async (request) => {
  const secret = process.env.MODERATOR_PASSWORD;
  if (!secret || !hasModeratorSession(request, secret)) return json({ error: "Moderatör girişi gerekli." }, 401);
  const store = getStore("tsfh-submissions", { consistency: "strong" });

  if (request.method === "GET") {
    const { blobs } = await store.list();
    const submissions = [];
    for (const item of blobs) {
      const record = await store.get(item.key, { type: "json" });
      if (record?.status === "pending") {
        submissions.push({
          ...record,
          audioUrl: `/.netlify/functions/submission-media?id=${encodeURIComponent(record.id)}&type=audio`,
          coverUrl: record.hasCover ? `/.netlify/functions/submission-media?id=${encodeURIComponent(record.id)}&type=cover` : null,
        });
      }
    }
    submissions.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return json({ submissions });
  }

  if (request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "İstek okunamadı." }, 400); }
    const { id, action } = body || {};
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id) || !["approve", "reject", "delete"].includes(action)) {
      return json({ error: "Geçersiz işlem." }, 400);
    }
    const record = await store.get(id, { type: "json" });
    if (!record || !["pending", "approved"].includes(record.status)) return json({ error: "Mashup bulunamadı." }, 404);
    if (action === "delete" ? record.status !== "approved" : record.status !== "pending") {
      return json({ error: "Bu işlem bu mashup durumu için kullanılamıyor." }, 409);
    }

    if (action === "approve") {
      await store.set(id, JSON.stringify({ ...record, status: "approved", reviewedAt: new Date().toISOString() }));
      return json({ ok: true });
    }

    await store.delete(id);
    const media = getStore("tsfh-submission-media", { consistency: "strong" });
    await media.delete(`${id}/audio`);
    if (record.hasCover) await media.delete(`${id}/cover`);
    return json({ ok: true });
  }
  return json({ error: "Yalnızca GET veya POST isteği kabul edilir." }, 405);
};
