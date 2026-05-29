# Deploying Study Tracker to a VPS (Hostinger)

The app has two parts now:

- **Frontend** — static files built into `dist/` (the React PWA).
- **API server** — a small Node/Express app in `server/` that holds the AI
  provider keys and exposes `/api/ai/*`. Keys live here so they never ship to
  the browser.

The simplest setup runs **one Node process** that serves both the static
frontend and the API.

---

## 1. One-time setup on the VPS

```bash
# Install Node 18+ (20 LTS recommended). Then:
git clone <your-repo> study-tracker
cd study-tracker
npm install
cp .env.example .env       # then edit .env with your real values
```

Fill in `.env`:

- Firebase `VITE_*` values (safe to be public).
- At least one **server-side** AI key (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`, …).
- `VITE_AI_ENABLED=true`
- `SERVE_STATIC=true`  ← so this process also serves the built frontend.

> ⚠️ **Rotate any AI key that was previously deployed with a `VITE_` prefix.**
> If the old build was ever public, that key is already exposed and must be
> regenerated in the provider console.

## 2. Build the frontend

```bash
npm run build      # produces dist/
```

## 3. Run the API + frontend

```bash
npm start          # node server/index.js — serves dist/ + /api on PORT (default 8787)
```

For production, keep it alive with a process manager:

```bash
npm install -g pm2
pm2 start npm --name study-tracker -- start
pm2 save
pm2 startup        # follow the printed instructions to start on boot
```

## 4. Put nginx in front (recommended for HTTPS + port 80/443)

Point your domain at the VPS, then reverse-proxy to the Node process:

```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then run `certbot --nginx` for a free Let's Encrypt certificate.

---

## Alternative: split frontend and API

If you'd rather serve the static `dist/` directly via nginx and run Node only
for the API:

- Leave `SERVE_STATIC` unset (Node serves `/api` only).
- Serve `dist/` as the nginx web root.
- nginx `location /api { proxy_pass http://localhost:8787; }`.
- If the API is on a different origin, set `CORS_ORIGIN` in `.env` and
  `VITE_API_BASE_URL` to the API URL before building.

---

## Firestore security rules

Deploy the rules in `firestore.rules` so each user can only read/write their own
document:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

Or paste the contents of `firestore.rules` into the Firebase Console →
Firestore Database → Rules → Publish.

---

## Local development

Run the API and the Vite dev server in two terminals:

```bash
npm run server     # API on :8787 (auto-restarts on change)
npm run dev        # Vite on :5173, proxies /api -> :8787
```
