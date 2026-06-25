// The bank redirects here after the user approves access.
// It exchanges the `code` for a session, then reads accounts + balances +
// transactions and shows them. (Next step: store these in Supabase instead.)
import { psuHeaders, eb } from "../lib/eb.js";

export default async function handler(req, res) {
  const { code, error } = req.query;
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (error) return res.status(200).send(page("Connection cancelled", "No access was granted. Close this tab and try again from the app."));
  if (!code) return res.status(200).send(page("Almost there", "No authorisation code was returned."));

  try {
    // 1) Code -> session (returns the list of account IDs the user shared)
    const s = await eb("/sessions", { method: "POST", headers: psuHeaders(req), body: { code } });
    if (!s.ok) return res.status(200).send(page("Could not finish connecting", `<pre>${esc(JSON.stringify(s.data, null, 2))}</pre>`));

    const sessionId = s.data.session_id;
    const accountIds = s.data.accounts || [];

    // 2) For each account, pull balances + transactions
    const accounts = [];
    for (const id of accountIds) {
      const bal = await eb(`/accounts/${id}/balances`, { headers: psuHeaders(req) });
      const tx = await eb(`/accounts/${id}/transactions`, { headers: psuHeaders(req) });
      const txList = (tx.data && tx.data.transactions) || [];
      accounts.push({ id, balances: bal.data, txCount: txList.length, transactions: txList.slice(0, 5), rawTx: tx.data });
    }

    return res.status(200).send(resultPage(sessionId, accounts));
  } catch (e) {
    return res.status(200).send(page("Error", `<pre>${esc(String(e.message || e))}</pre>`));
  }
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function resultPage(sessionId, accounts) {
  const blocks = accounts.map((a) => `
    <div class="acct">
      <div class="aid">Account <code>${esc(a.id)}</code></div>
      <div class="meta">${a.txCount} transactions found</div>
      <details><summary>Balances</summary><pre>${esc(JSON.stringify(a.balances, null, 2))}</pre></details>
      <details><summary>First 5 transactions</summary><pre>${esc(JSON.stringify(a.transactions, null, 2))}</pre></details>
    </div>`).join("");
  return shell("Connected", `
    <div class="tick">✓</div>
    <h1>It works</h1>
    <p>Session <code>${esc(sessionId)}</code> · ${accounts.length} account(s) linked.</p>
    ${blocks}
    <p class="foot">This is your real sandbox data flowing through. Next we'll store it and show it in the app.</p>
  `);
}

function page(title, message) {
  return shell(title, `<div class="tick">✓</div><h1>${title}</h1><p>${message}</p>`);
}

function shell(title, inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" /><title>${title}</title>
  <style>
    body{margin:0;font-family:-apple-system,system-ui,sans-serif;background:#ECECEF;color:#14161C;
         display:flex;justify-content:center;padding:24px}
    .wrap{max-width:480px;width:100%}
    .tick{width:46px;height:46px;border-radius:50%;background:#E6F5F2;color:#18A999;display:flex;
          align-items:center;justify-content:center;font-size:24px;margin-bottom:12px}
    h1{font-size:22px;margin:0 0 6px}
    p{font-size:14px;color:#555;line-height:1.5}
    code{background:#fff;padding:1px 6px;border-radius:6px;font-size:12px}
    .acct{background:#fff;border-radius:16px;padding:14px;margin:12px 0;box-shadow:0 6px 20px rgba(0,0,0,.05)}
    .aid{font-weight:600;font-size:14px}.meta{font-size:12px;color:#18A999;margin:4px 0 8px}
    details{margin:6px 0}summary{cursor:pointer;font-size:13px;font-weight:600}
    pre{background:#0f1117;color:#d6e2ff;padding:12px;border-radius:10px;overflow:auto;font-size:11px}
    .foot{margin-top:16px}
  </style></head><body><div class="wrap">${inner}</div></body></html>`;
}
