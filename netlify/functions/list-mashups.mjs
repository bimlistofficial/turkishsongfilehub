import { getStore } from "@netlify/blobs";

export default async (request) => {
  if (request.method !== "GET") return Response.json({ error: "Yalnızca GET isteği kabul edilir." }, { status: 405 });
  const store = getStore("tsfh-submissions", { consistency: "strong" });
  const { blobs } = await store.list();
  const mashups = [];
  for (const item of blobs) {
    const record = await store.get(item.key, { type: "json" });
    if (record?.status === "approved") {
      mashups.push({
        id: record.id,
        title: record.title,
        artist: record.artist,
        submitter: record.submitter,
        genre: record.genre,
        createdAt: record.createdAt,
        audioUrl: `/.netlify/functions/submission-media?id=${encodeURIComponent(record.id)}&type=audio`,
        coverUrl: record.hasCover ? `/.netlify/functions/submission-media?id=${encodeURIComponent(record.id)}&type=cover` : null,
      });
    }
  }
  mashups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ mashups }, { headers: { "Cache-Control": "no-store" } });
};
