# Ledger

A private two-person personal-finance app. Connects UK bank accounts via
Enable Banking (Open Banking), stores transactions in Supabase, and shows
spending, income, a direct-debit calendar, and activity.

## File structure

```
ledger/
├── index.html            App + login (contains your Supabase URL + anon key)
├── package.json
├── .gitignore
├── supabase_schema.sql   Run once in Supabase SQL editor
├── lib/
│   ├── eb.js             Enable Banking helpers (JWT, state, normalisers)
│   └── supabase.js       Server-side Supabase admin client
└── api/
    ├── banks.js          GET /api/banks  — list available banks
    ├── connect.js        GET /api/connect — start a bank authorization
    └── eb-callback.js    Bank redirect target — saves data to Supabase
```

## Keys

- In `index.html` (frontend, safe to expose): `SUPABASE_URL`, `SUPABASE_ANON_KEY` — already filled in.
- In Vercel → Settings → Environment Variables (secret, server-side only):
  - `EB_APP_ID`                   Enable Banking application ID (UUID)
  - `EB_PRIVATE_KEY`              full contents of the Enable Banking .pem
  - `SUPABASE_URL`                your Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY`   Supabase service_role key
  - `STATE_SECRET`                any long random string
- Never commit the `.pem` file.

## Setup recap

1. Run `supabase_schema.sql` in Supabase (SQL Editor).
2. Create your two users in Supabase → Authentication → Users (Auto Confirm).
3. Set the Vercel environment variables above, then redeploy.
4. Open the site, sign in, tap ＋ to connect a bank.
