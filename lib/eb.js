// Shared Enable Banking helpers. Lives in /lib (NOT /api) so it isn't a route.
// Uses Node's built-in crypto — no extra packages needed for these.
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

export function psuHeaders(req) {
  const fwd = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return {
    ...authHeaders(),
    "psu-ip-address": fwd || "1.1.1.1",
    "psu-user-agent": req.headers["user-agent"] || "Mozilla/5.0",
  };
}

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

// ---- "state" carries the logged-in user id through the bank redirect, signed ----
export function signState(userId) {
  const secret = process.env.STATE_SECRET;
  if (!secret) throw new Error("Missing STATE_SECRET environment variable");
  const sig = crypto.createHmac("sha256", secret).update(userId).digest("base64url");
  return `${Buffer.from(userId).toString("base64url")}.${sig}`;
}

export function verifyState(state) {
  const secret = process.env.STATE_SECRET;
  if (!secret) throw new Error("Missing STATE_SECRET environment variable");
  const [b, sig] = String(state || "").split(".");
  if (!b || !sig) throw new Error("Bad state");
  const userId = Buffer.from(b, "base64url").toString();
  const expect = crypto.createHmac("sha256", secret).update(userId).digest("base64url");
  if (sig !== expect) throw new Error("State signature mismatch");
  return userId;
}

// ---- Normalise an Enable Banking transaction into our flat shape ----
export function normalizeTx(t) {
  const rawAmt = t.transaction_amount?.amount ?? t.amount ?? "0";
  const amt = Math.abs(parseFloat(rawAmt)) || 0;
  const dir = t.credit_debit_indicator || t.creditDebitIndicator || "";
  const signed = dir === "DBIT" ? -amt : amt; // DBIT = money out (negative)
  const remit = Array.isArray(t.remittance_information)
    ? t.remittance_information.join(" ")
    : (t.remittance_information || "");
  const name = t.creditor?.name || t.debtor?.name || remit || "Transaction";
  const date = t.booking_date || t.value_date || t.transaction_date || null;
  const id = t.entry_reference || t.transaction_id ||
    crypto.createHash("sha1").update(`${date}|${signed}|${name}`).digest("hex");
  return {
    eb_tx_id: String(id).slice(0, 200),
    booking_date: date,
    amount: signed,
    currency: t.transaction_amount?.currency || null,
    description: String(name).slice(0, 300),
    raw: t,
  };
}

// ---- Pick a sensible single balance figure from the balances response ----
export function pickBalance(balances) {
  const arr = balances?.balances || (Array.isArray(balances) ? balances : []);
  const pref = arr.find((b) => ["CLBD", "ITAV", "XPCD", "CLAV"].includes(b.balance_type)) || arr[0];
  if (!pref) return null;
  const amt = pref.balance_amount?.amount ?? pref.amount ?? null;
  return amt == null ? null : parseFloat(amt);
}
