// GET /api/connect?name=<bank>&country=<XX>
// Called by the app with the logged-in user's token in the Authorization header.
// Verifies the user, starts a bank authorization tied to that user (via signed
// state), and returns { url } for the app to navigate to.
import { psuHeaders, eb, signState } from "../lib/eb.js";
import { userFromToken } from "../lib/supabase.js";

export default async function handler(req, res) {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const user = await userFromToken(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { name, country } = req.query;
    if (!name || !country) {
      return res.status(400).json({ error: "Provide ?name=<bank>&country=<XX>." });
    }

    const redirectUrl = `https://${req.headers.host}/api/eb-callback`;
    const validUntil = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(); // 10d sandbox; up to 90 in prod

    const r = await eb("/auth", {
      method: "POST",
      headers: psuHeaders(req),
      body: {
        access: { valid_until: validUntil },
        aspsp: { name, country },
        state: signState(user.id),
        redirect_url: redirectUrl,
        psu_type: "personal",
      },
    });

    if (!r.ok || !r.data || !r.data.url) {
      return res.status(r.status || 500).json({ error: r.data });
    }
    res.status(200).json({ url: r.data.url });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
