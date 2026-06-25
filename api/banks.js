// GET /api/banks — lists banks your Enable Banking app can connect to.
import { authHeaders, eb } from "../lib/eb.js";
export default async function handler(req, res) {
  try {
    const r = await eb("/aspsps", { headers: authHeaders() });
    if (!r.ok) return res.status(r.status).json({ error: r.data });
    const arr = Array.isArray(r.data) ? r.data : (r.data.aspsps || []);
    res.status(200).json({ banks: arr.map(a => ({ name:a.name, country:a.country })) });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
}
