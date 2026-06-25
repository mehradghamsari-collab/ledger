// Shared Enable Banking helpers. Lives in /lib (NOT /api) so it isn't a route.
// Uses Node's built-in crypto — no npm packages needed.
import crypto from "crypto";

export const BASE_URL = "https://api.enablebanking.com";

const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

// Build a short-lived JWT signed with your application private key (RS256).
export function makeJWT() {
  const appId = process.env.EB_APP_ID;
  let key = process.env.EB_PRIVATE_KEY || "";
  key = key.replace(/\\n/g, "\n"); // tolerate escaped newlines if pasted that way
  if (!appId || !key) throw new Error("Missing EB_APP_ID or EB_PRIVATE_KEY environment variables");

  const header = b64url(JSON.stringify({ typ: "JWT", alg: "RS256", kid: appId }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({
    iss: "enablebanking.com",
    aud: "api.enablebanking.com",
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${body}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(signingInput)
    .sign(key)
    .toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${signingInput}.${signature}`;
}

export function authHeaders() {
  return { Authorization: `Bearer ${makeJWT()}`, "Content-Type": "application/json" };
}

// /auth, /sessions and /accounts/* calls require these "PSU" (end-user) headers.
export function psuHeaders(req) {
  const fwd = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return {
    ...authHeaders(),
    "psu-ip-address": fwd || "1.1.1.1",
    "psu-user-agent": req.headers["user-agent"] || "Mozilla/5.0",
  };
}

// Thin fetch wrapper that always returns { ok, status, data }.
export async function eb(path, { method = "GET", headers, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}
