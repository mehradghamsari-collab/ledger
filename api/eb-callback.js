// Place this file at:  /api/eb-callback.js  in your repo.
// Live URL becomes:     https://<your-project>.vercel.app/api/eb-callback
//
// This is a STUB. It just confirms the bank redirected the user back here.
// The real code-for-session exchange (using your Enable Banking private key)
// goes where the TODO is — we'll build that next.

export default function handler(req, res) {
  const { code, state, error } = req.query;

  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (error) {
    return res.status(200).send(page(
      "Connection cancelled",
      "No access was granted. You can close this tab and try again from the app."
    ));
  }

  // TODO (next step): use `code` + your EB private key to call POST /sessions,
  // store the session + accounts in Supabase, then redirect back to "/".
  // For now we just acknowledge the redirect landed correctly.

  return res.status(200).send(page(
    "Connected",
    code
      ? "Your bank approved access. You can close this tab — setup will continue in the app."
      : "Callback reached, but no authorisation code was returned yet."
  ));
}

function page(title, message) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body{margin:0;font-family:-apple-system,system-ui,sans-serif;background:#ECECEF;
       color:#14161C;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#fff;border-radius:22px;padding:28px 26px;max-width:340px;
        box-shadow:0 10px 30px rgba(20,22,28,.08);text-align:center}
  h1{font-size:20px;margin:0 0 8px}
  p{font-size:14px;color:#767B85;line-height:1.5;margin:0}
  .tick{width:46px;height:46px;border-radius:50%;background:#E6F5F2;color:#18A999;
        display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:24px}
</style></head>
<body><div class="card"><div class="tick">✓</div><h1>${title}</h1><p>${message}</p></div></body></html>`;
}
