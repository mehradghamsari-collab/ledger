# Ledger

A private personal-finance web app for two people, connecting UK bank accounts
through Enable Banking (Open Banking).

## What's in here

| File | What it is |
|------|------------|
| `index.html` | The app itself (Home, Spending, Calendar, Activity). Currently shows sample data. |
| `api/eb-callback.js` | The page banks redirect users back to after they approve access. Currently a stub. |
| `package.json` | Tells Vercel to run the function as a modern ES module. |
| `.gitignore` | Keeps secrets (your `.pem` key, `.env`) out of the repo. |

## Repo layout

```
ledger/
├── index.html
├── api/
│   └── eb-callback.js
├── package.json
└── .gitignore
```

The `api/` folder matters: Vercel turns any file in there into a serverless
function. `api/eb-callback.js` becomes the live URL `…/api/eb-callback`.

## Deploy (no command line)

1. Create a GitHub repo and upload these files (keep `eb-callback.js` inside an
   `api/` folder).
2. On vercel.com → Add New → Project → import the repo → Deploy.
3. Your live URL appears, e.g. `https://ledger-xyz.vercel.app`.
4. Your Enable Banking redirect URL is:
   `https://ledger-xyz.vercel.app/api/eb-callback`

## Secrets (do NOT put these in the code)

In Vercel → Project → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `EB_APP_ID` | Your Enable Banking application ID (the UUID). |
| `EB_PRIVATE_KEY` | The full contents of the downloaded `.pem` file. |

Add Supabase keys here later too. Redeploy after adding variables.

⚠️ Never upload the `.pem` file to GitHub. The `.gitignore` blocks it, but
double-check before committing.

## Not done yet

- Real bank data (the session exchange inside `eb-callback.js`)
- Supabase database for the two users + accounts + transactions
- Category classifier
- 90-day re-consent reminder
