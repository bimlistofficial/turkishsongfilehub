import { createHash, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

export default async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Yalnızca POST isteği kabul edilir." }, { status: 405 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "İstek okunamadı." }, { status: 400 }); }
  const { id, token } = body || {};
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id) || typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    return Response.json({ error: "Gönderi bilgisi geçersiz." }, { status: 400 });
  }

  const store = getStore("tsfh-submissions", { consistency: "strong" });
  const record = await store.get(id, { type: "json" });
  if (!record?.trackingTokenHash) return Response.json({ error: "Gönderi bulunamadı." }, { status: 404 });
  const expected = Buffer.from(record.trackingTokenHash, "hex");
  const actual = createHash("sha256").update(token).digest();
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return Response.json({ error: "Gönderi bulunamadı." }, { status: 404 });
  }

  return Response.json({
    id: record.id,
    title: record.title,
    status: record.status,
    createdAt: record.createdAt,
    reviewedAt: record.reviewedAt || null,
    youtubeUrl: record.status === "approved" ? record.youtubeUrl || null : null,
  }, { headers: { "Cache-Control": "no-store" } });
};
