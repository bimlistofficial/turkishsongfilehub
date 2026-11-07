import { getStore } from "@netlify/blobs";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const AUDIO_LIMIT = 4.5 * 1024 * 1024;
const audioTypes = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4", "audio/aac"]);
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export default async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Yalnızca POST isteği kabul edilir." }, { status: 405 });

  let form;
  try { form = await request.formData(); }
  catch { return Response.json({ error: "Gönderi okunamadı." }, { status: 400 }); }

  const title = String(form.get("title") || "").trim().slice(0, 100);
  const submitter = String(form.get("submitter") || "").trim().slice(0, 50);
  const artist = String(form.get("artist") || "").trim().slice(0, 80);
  const level = String(form.get("level") || "").trim().slice(0, 100);
  const youtubeUrl = String(form.get("youtubeUrl") || "").trim().slice(0, 500);
  const genre = String(form.get("genre") || "Mashup").trim().slice(0, 32) || "Mashup";
  const rightsConfirmed = form.get("rights") === "yes";
  const audio = form.get("audio");
  const cover = form.get("cover");

  if (!title || !submitter || !artist || !level || !rightsConfirmed || !audio || typeof audio.arrayBuffer !== "function" || !audio.size || !youtubeUrl) {
    return Response.json({ error: "Gönderen adı, mashup adı, level, şarkı adı, YouTube bağlantısı ve ses dosyası gerekli." }, { status: 400 });
  }
  let parsedYoutubeUrl;
  try { parsedYoutubeUrl = new URL(youtubeUrl); } catch {}
  if (!parsedYoutubeUrl || parsedYoutubeUrl.protocol !== "https:" || !["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(parsedYoutubeUrl.hostname)) {
    return Response.json({ error: "Geçerli bir HTTPS YouTube bağlantısı gir." }, { status: 400 });
  }
  if (!audioTypes.has(audio.type)) return Response.json({ error: "Ses dosyası MP3, WAV, OGG, AAC veya M4A olmalı." }, { status: 415 });
  if (audio.size + (cover?.size || 0) > AUDIO_LIMIT) return Response.json({ error: "Ses ve kapak dosyalarının toplamı 4,5 MB’ı geçmemeli." }, { status: 413 });
  if (cover?.size && (!imageTypes.has(cover.type) || cover.size > AUDIO_LIMIT)) {
    return Response.json({ error: "Kapak JPG, PNG veya WEBP olmalı." }, { status: 415 });
  }

  const id = randomUUID();
  const trackingToken = randomBytes(32).toString("hex");
  const submissions = getStore("tsfh-submissions", { consistency: "strong" });
  const media = getStore("tsfh-submission-media", { consistency: "strong" });
  const createdAt = new Date().toISOString();

  await media.set(`${id}/audio`, audio, { metadata: { contentType: audio.type } });
  if (cover?.size) await media.set(`${id}/cover`, cover, { metadata: { contentType: cover.type } });
  await submissions.set(id, JSON.stringify({ id, title, submitter, artist, level, youtubeUrl: parsedYoutubeUrl.href, trackingTokenHash: createHash("sha256").update(trackingToken).digest("hex"), genre, createdAt, status: "pending", hasCover: !!cover?.size }));

  return Response.json({ ok: true, id, trackingToken }, { status: 201 });
};



