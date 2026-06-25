// Bank redirect target. Fetches transactions, then hands them to the app
// (same-origin localStorage) and redirects home. No database involved.
import { psuHeaders, eb, normalizeTx } from "../lib/eb.js";
export default async function handler(req, res) {
  const { code, error } = req.query;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (error) return res.status(200).send(errPage("Connection cancelled."));
  if (!code) return res.status(200).send(errPage("No authorisation code returned."));
  try {
    const created = await eb("/sessions", { method:"POST", headers:psuHeaders(req), body:{ code } });
    if (!created.ok) return res.status(200).send(errPage(JSON.stringify(created.data)));
    const sid = created.data.session_id;
    const sess = await eb(`/sessions/${sid}`, { headers:psuHeaders(req) });
    const uids = sess.data?.accounts || created.data.accounts || [];
    const bank = sess.data?.aspsp?.name || "Bank";
    const tx = [];
    for (const uid of uids) {
      const r = await eb(`/accounts/${uid}/transactions`, { headers:psuHeaders(req) });
      (r.data?.transactions || []).forEach(t => {
        const n = normalizeTx(t);
        tx.push({ date:n.booking_date, desc:n.description, amount:n.amount, account:bank });
      });
    }
    return res.status(200).send(okPage({ bank, tx }));
  } catch (e) { return res.status(200).send(errPage(String(e.message||e))); }
}
function okPage(payload){
  const safe = JSON.stringify(JSON.stringify(payload)).replace(/</g,"\\u003c");
  return `<!doctype html><meta charset="utf-8"><title>Syncing</title>`
    + `<body style="font-family:-apple-system,system-ui,sans-serif;background:#ECECEF;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#14161C">`
    + `<p>Syncing your transactions…</p>`
    + `<script>try{localStorage.setItem("ledger_import",${safe});}catch(e){}location.replace("/");</script></body>`;
}
function errPage(msg){
  return `<!doctype html><meta charset="utf-8"><title>Connection</title>`
    + `<body style="font-family:-apple-system,system-ui,sans-serif;background:#ECECEF;padding:40px;color:#14161C">`
    + `<h2>Could not connect</h2><p style="color:#555">${String(msg).replace(/</g,"&lt;")}</p>`
    + `<p><a href="/" style="color:#18A999;font-weight:600">Back to Ledger</a></p></body>`;
}
