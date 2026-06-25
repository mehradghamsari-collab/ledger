// GET /api/connect?name=<bank>&country=<XX> — starts a bank authorization, returns { url }.
import { psuHeaders, eb } from "../lib/eb.js";
export default async function handler(req, res) {
  try {
    const { name, country } = req.query;
    if (!name || !country) return res.status(400).json({ error: "name and country required" });
    const redirectUrl = `https://${req.headers.host}/api/eb-callback`;
    const validUntil = new Date(Date.now() + 10*24*60*60*1000).toISOString();
    const r = await eb("/auth", { method:"POST", headers:psuHeaders(req), body:{
      access:{ valid_until:validUntil }, aspsp:{ name, country },
      state:"ledger", redirect_url:redirectUrl, psu_type:"personal"
    }});
    if (!r.ok || !r.data?.url) return res.status(r.status||500).json({ error: r.data });
    res.status(200).json({ url: r.data.url });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
}
