# Ledger

A private personal-finance app with a polished UI. Works offline (CSV import +
manual entry, saved on your device) and can optionally sync live from your bank
via Enable Banking. No database, no login, no npm dependencies.

## Files
```
ledger/
├── index.html        The app (works on its own, even without the backend)
├── package.json
├── .gitignore
├── lib/eb.js          Enable Banking helper (JWT, fetch)
└── api/
    ├── banks.js       GET /api/banks — list banks
    ├── connect.js     GET /api/connect?name=&country= — start a bank link
    └── eb-callback.js Bank redirect — fetches transactions, hands them to the app
```

## Backend keys (Vercel → Settings → Environment Variables)
- `EB_APP_ID`        Enable Banking application ID (UUID)
- `EB_PRIVATE_KEY`   full contents of the Enable Banking .pem
Never commit the .pem.

## Deploy notes (learned the hard way)
- After setting env vars, **redeploy**.
- Vercel → Settings → **Deployment Protection** → turn **off** (the bank must be
  able to redirect to /api/eb-callback, and you open the app without a Vercel login).
- Make sure your newest deployment is promoted to **Production**; the clean
  domain only serves the Production deployment.
- The app also runs with no backend at all — just open index.html.
