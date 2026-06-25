// The bank redirects here after the user approves access.
// Flow: verify signed state -> identify user -> create session ->
// read accounts + balances + transactions -> store them in Supabase
// (under that user) -> send the user back to the app.
import { psuHeaders, eb, verifyState, normalizeTx, pickBalance } from "../lib/eb.js";
import { admin } from "../lib/supabase.js";

export default async function handler(req, res) {
  const { code, state, error } = req.query;
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (error) return res.status(200).send(page("Connection cancelled", "No access was granted. Close this tab and try again."));
  if (!code) return res.status(200).send(page("Almost there", "No authorisation code was returned."));

  let userId;
  try { userId = verifyState(state); }
  catch { return res.status(200).send(page("Could not verify", "The connection request couldn't be verified. Please start again from the app.")); }

  try {
    const sb = admin();

    // 1) code -> session
    const created = await eb("/sessions", { method: "POST", headers: psuHeaders(req), body: { code } });
    if (!created.ok) return res.status(200).send(page("Could not finish", `<pre>${esc(JSON.stringify(created.data, null, 2))}</pre>`));
    const sessionId = created.data.session_id;

    // 2) session details (account UIDs, bank, consent expiry)
    const sess = await eb(`/sessions/${sessionId}`, { headers: psuHeaders(req) });
    const accountUids = (sess.data && sess.data.accounts) || created.data.accounts || [];
    const bankName = sess.data?.aspsp?.name || null;
    const validUntil = sess.data?.access?.valid_until || null;

    let totalTx = 0;
    for (const uid of accountUids) {
      const details = await eb(`/accounts/${uid}/details`, { headers: psuHeaders(req) });
      const balances = await eb(`/accounts/${uid}/balances`, { headers: psuHeaders(req) });
      const txResp = await eb(`/accounts/${uid}/transactions`, { headers: psuHeaders(req) });

      // upsert the account, get its row id
      const { data: acct, error: acctErr } = await sb
        .from("accounts")
        .upsert({
          user_id: userId,
          eb_account_uid: uid,
          eb_session_id: sessionId,
          bank_name: bankName,
          name: details.data?.name || details.data?.product || null,
          iban: details.data?.account_id?.iban || null,
          currency: details.data?.currency || pickCurrency(balances.data) || null,
          balance: pickBalance(balances.data),
          valid_until: validUntil,
        }, { onConflict: "user_id,eb_account_uid" })
        .select("id")
        .single();
      if (acctErr) throw acctErr;

      const txList = (txResp.data && txResp.data.transactions) || [];
      const rows = txList.map((t) => {
        const n = normalizeTx(t);
        return { ...n, user_id: userId, account_id: acct.id };
      });
      if (rows.length) {
        const { error: txErr } = await sb
          .from("transactions")
          .upsert(rows, { onConflict: "account_id,eb_tx_id", ignoreDuplicates: true });
        if (txErr) throw txErr;
        totalTx += rows.length;
      }
    }

    return res.status(200).send(page(
      "Connected",
      `Linked ${accountUids.length} account(s) and saved ${totalTx} transactions to your private database.
       <p style="margin-top:14px"><a href="/?connected=1" style="color:#18A999;font-weight:600">Back to Ledger →</a></p>`
    ));
  } catch (e) {
    return res.status(200).send(page("Error", `<pre>${esc(String(e.message || e))}</pre>`));
  }
}

function pickCurrency(balances) {
  const arr = balances?.balances || [];
  return arr[0]?.balance_amount?.currency || null;
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function page(title, message) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" /><title>${title}</title>
  <style>
    body{margin:0;font-family:-apple-system,system-ui,sans-serif;background:#ECECEF;color:#14161C;
         display:flex;justify-content:center;padding:28px}
    .wrap{max-width:420px;width:100%}
    .tick{width:46px;height:46px;border-radius:50%;background:#E6F5F2;color:#18A999;display:flex;
          align-items:center;justify-content:center;font-size:24px;margin-bottom:12px}
    h1{font-size:22px;margin:0 0 6px}
    p{font-size:14px;color:#555;line-height:1.5;margin:0}
    pre{background:#0f1117;color:#d6e2ff;padding:12px;border-radius:10px;overflow:auto;font-size:11px}
  </style></head><body><div class="wrap"><div class="tick">✓</div><h1>${title}</h1><p>${message}</p></div></body></html>`;
}
