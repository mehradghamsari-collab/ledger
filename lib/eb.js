// Enable Banking helpers. No npm packages — uses Node's built-in crypto + global fetch.
import crypto from "crypto";

export const BASE_URL = "https://api.enablebanking.com";
const b64url = (s) => Buffer.from(s).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");

export function makeJWT() {
  const appId = process.env.EB_APP_ID;
  let key = (process.env.EB_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!appId || !key) throw new Error("Missing EB_APP_ID or EB_PRIVATE_KEY");
  const header = b64url(JSON.stringify({ typ:"JWT", alg:"RS256", kid:appId }));
  const now = Math.floor(Date.now()/1000);
  const body = b64url(JSON.stringify({ iss:"enablebanking.com", aud:"api.enablebanking.com", iat:now, exp:now+3600 }));
  const sig = crypto.createSign("RSA-SHA256").update(`${header}.${body}`).sign(key)
    .toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  return `${header}.${body}.${sig}`;
}
export const authHeaders = () => ({ Authorization:`Bearer ${makeJWT()}`, "Content-Type":"application/json" });
export function psuHeaders(req){
  const fwd = (req.headers["x-forwarded-for"]||"").split(",")[0].trim();
  return { ...authHeaders(), "psu-ip-address": fwd||"1.1.1.1", "psu-user-agent": req.headers["user-agent"]||"Mozilla/5.0" };
}
export async function eb(path,{method="GET",headers,body}={}){
  const res = await fetch(`${BASE_URL}${path}`,{ method, headers, body: body?JSON.stringify(body):undefined });
  const text = await res.text(); let data; try{data=JSON.parse(text);}catch{data=text;}
  return { ok:res.ok, status:res.status, data };
}
export function normalizeTx(t){
  const amt = Math.abs(parseFloat(t.transaction_amount?.amount ?? t.amount ?? "0"))||0;
  const dir = t.credit_debit_indicator || t.creditDebitIndicator || "";
  const signed = dir==="DBIT" ? -amt : amt;
  const remit = Array.isArray(t.remittance_information) ? t.remittance_information.join(" ") : (t.remittance_information||"");
  const name = t.creditor?.name || t.debtor?.name || remit || "Transaction";
  const date = t.booking_date || t.value_date || t.transaction_date || null;
  return { booking_date:date, amount:signed, description:String(name).slice(0,200) };
}
