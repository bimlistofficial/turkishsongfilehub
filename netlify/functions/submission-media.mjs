import { getStore } from "@netlify/blobs";
import { hasModeratorSession } from "../lib/moderator-session.mjs";

export default async (request) => {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const params = new URL(request.url).searchParams;
  const id = params.get("id") || "";
  const type = params.get("type") || "";
  if (!/^[a-f0-9-]{36}$/i.test(id) || !["audio", "cover"].includes(type)) return new Response("Not found", { status: 404 });

  const submissions = getStore("tsfh-submissions", { consistency: "strong" });
  const record = await submissions.get(id, { type: "json" });
  if (!record || record.status === "rejected") return new Response("Not found", { status: 404 });
  if (record.status !== "approved") {
    const secret = process.env.MODERATOR_PASSWORD;
    if (!secret || !hasModeratorSession(request, secret)) return new Response("Not found", { status: 404 });
  }
  if (type === "cover" && !record.hasCover) return new Response("Not found", { status: 404 });

  const media = getStore("tsfh-submission-media", { consistency: "strong" });
  const item = await media.getWithMetadata(`${id}/${type}`, { type: "blob" });
  if (!item) return new Response("Not found", { status: 404 });
  return new Response(item.data, {
    headers: {
      "Content-Type": item.metadata?.contentType || (type === "cover" ? "image/jpeg" : "application/octet-stream"),
      "Cache-Control": record.status === "approved" ? "public, max-age=300" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
