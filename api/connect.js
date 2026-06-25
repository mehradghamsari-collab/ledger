// GET https://<your-app>.vercel.app/api/connect?name=<bank>&country=<XX>
// Starts the bank authorization and redirects the user to their bank's login.
// Use the exact name + country shown by /api/banks.
import { psuHeaders, eb } from "../lib/eb.js";

export default async function handler(req, res) {
  try {
    const { name, country } = req.query;
    if (!name || !country) {
      return res.status(400).json({
        error: "Provide ?name=<bank>&country=<XX>. See /api/banks for the exact values.",
      });
    }

    // Must EXACTLY match a redirect URL whitelisted in the Enable Banking control panel.
    const redirectUrl = `https://${req.headers.host}/api/eb-callback`;

    // Consent window. Sandbox is happy with ~10 days; production AIS allows up to 90.
    const validUntil = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    const r = await eb("/auth", {
      method: "POST",
      headers: psuHeaders(req),
      body: {
        access: { valid_until: validUntil },
        aspsp: { name, country },
        state: Math.random().toString(36).slice(2),
        redirect_url: redirectUrl,
        psu_type: "personal",
      },
    });

    if (!r.ok || !r.data || !r.data.url) {
      return res.status(r.status || 500).json({ error: r.data });
    }
    // Off to the bank.
    res.redirect(302, r.data.url);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
