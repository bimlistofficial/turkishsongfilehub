import { clearSessionCookie } from "../lib/moderator-session.mjs";

export default async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Yalnızca POST isteği kabul edilir." }, { status: 405 });
  }
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
};
