import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "betwars_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export type SessionUser = {
  userId: number;
  email: string;
  role: string;
};

type SessionPayload = SessionUser & {
  exp: number;
};

function getSessionSecret() {
  return process.env.SESSION_SECRET || "bet-wars-dev-session-secret";
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return new Map<string, string>();

  return new Map(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        if (separator === -1) return [part, ""];
        return [part.slice(0, separator), part.slice(separator + 1)];
      })
  );
}

export function createSessionToken(user: SessionUser) {
  const payload: SessionPayload = {
    ...user,
    exp: Date.now() + SESSION_DURATION_MS,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function readSessionToken(token: string | null): SessionUser | null {
  if (!token) return null;

  const [payloadSegment, signatureSegment] = token.split(".");
  if (!payloadSegment || !signatureSegment) return null;

  const expectedSignature = sign(payloadSegment);
  const providedSignature = Buffer.from(signatureSegment, "utf8");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");

  if (providedSignature.length !== expectedSignatureBuffer.length) return null;
  if (!timingSafeEqual(providedSignature, expectedSignatureBuffer)) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(payloadSegment)) as SessionPayload;
    if (payload.exp <= Date.now()) return null;

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function getSessionFromCookieHeader(cookieHeader: string | null) {
  const cookies = parseCookieHeader(cookieHeader);
  const token = cookies.get(SESSION_COOKIE_NAME) ?? null;
  return readSessionToken(token);
}

export function getSessionFromRequest(req: Request) {
  return getSessionFromCookieHeader(req.headers.get("cookie"));
}

export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  return readSessionToken(token);
}

export function setSessionCookie(response: NextResponse, user: SessionUser) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(user),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
