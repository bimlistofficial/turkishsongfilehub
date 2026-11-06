import { timingSafeEqual } from "node:crypto";

export default async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Yalnızca POST isteği kabul edilir." }, { status: 405 });
  }

  const expected = process.env.MODERATOR_PASSWORD;
  if (!expected) {
    return Response.json(
      { error: "MODERATOR_PASSWORD Netlify ortam ayarında tanımlanmamış." },
      { status: 503 },
    );
  }

  let submitted;
  try {
    const body = await request.json();
    submitted = typeof body.password === "string" ? body.password : "";
  } catch {
    return Response.json({ error: "İstek okunamadı." }, { status: 400 });
  }

  const provided = Buffer.from(submitted, "utf8");
  const configured = Buffer.from(expected, "utf8");
  const matches = provided.length === configured.length && timingSafeEqual(provided, configured);

  if (!matches) {
    return Response.json({ error: "Şifre yanlış." }, { status: 401 });
  }

  return Response.json({ ok: true });
};
