// GET https://<your-app>.vercel.app/api/banks
// Lists the banks your app can connect to. If this returns a list, your
// JWT signing + environment variables are working. In SANDBOX you'll see
// the mock bank(s); in production you'll see the real UK banks.
import { authHeaders, eb } from "../lib/eb.js";

export default async function handler(req, res) {
  try {
    const r = await eb("/aspsps", { headers: authHeaders() });
    if (!r.ok) return res.status(r.status).json({ error: r.data });

    const arr = Array.isArray(r.data) ? r.data : (r.data.aspsps || []);
    const banks = arr.map((a) => ({ name: a.name, country: a.country }));
    res.status(200).json({ count: banks.length, banks });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
