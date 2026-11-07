import { hasModeratorSession } from "../lib/moderator-session.mjs";

export default async (request) => {
  if (request.method !== "GET") {
    return Response.json({ error: "Yalnızca GET isteği kabul edilir." }, { status: 405 });
  }

  const secret = process.env.MODERATOR_PASSWORD;
  if (!secret) return Response.json({ authenticated: false }, { status: 503 });
  return Response.json(
    { authenticated: hasModeratorSession(request, secret) },
    { headers: { "Cache-Control": "no-store" } },
  );
};
