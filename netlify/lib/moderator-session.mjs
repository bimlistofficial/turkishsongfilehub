import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "tsfh_moderator";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function signature(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function makeSessionCookie(secret) {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + SESSION_TTL_SECONDS * 1000 }),
  ).toString("base64url");
  const token = `${payload}.${signature(payload, secret)}`;
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export function hasModeratorSession(request, secret) {
  const cookies = request.headers.get("cookie") || "";
  const match = cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!match) return false;

  const token = match.slice(COOKIE_NAME.length + 1);
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return false;

  const expectedSignature = signature(payload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(data.exp) && data.exp > Date.now();
  } catch {
    return false;
  }
}

export { SESSION_TTL_SECONDS };
