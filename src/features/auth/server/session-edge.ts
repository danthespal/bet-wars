type SessionUser = {
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

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
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

async function sign(value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function getSessionFromCookieHeaderEdge(cookieHeader: string | null): Promise<SessionUser | null> {
  const cookies = parseCookieHeader(cookieHeader);
  const token = cookies.get("betwars_session");
  if (!token) return null;

  const [payloadSegment, signatureSegment] = token.split(".");
  if (!payloadSegment || !signatureSegment) return null;

  const expectedSignature = await sign(payloadSegment);
  if (expectedSignature !== signatureSegment) return null;

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
