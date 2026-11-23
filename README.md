# Altitude

Private, installable (PWA) cannabis-use self-tracker. Firebase Hosting + Auth (Google) + Firestore + Cloud Functions.

- Log in ~3 taps: what (flower/vape/dab/edible/other) → altitude (🌱 Ground Level … 🚀 Deep Space) → why. Time + place auto-filled.
- "Skipped an urge" logs triggers without use.
- Stats: days since last use, days off, per-week chart, weekday×time heatmap, reasons/method/altitude/place breakdowns, plain-language insights.
- Share: secret read-only link `/s/<token>`, served by a Cloud Function that strips notes + coordinates; owner toggles places/reasons/log list; rotate or turn off anytime.
- Places: GPS matched to named places (≤150 m) on-device. Raw GPS is never stored on logs; only saved-place coords are stored (owner-only), never shared.
- Works offline (Firestore local cache); writes sync later.

## One-time setup (you)

1. **Firebase project**: console.firebase.google.com → Add project.
2. **Blaze plan** (needed for Cloud Functions; $0 at this scale). Set a budget alert (e.g. $1) under Billing.
3. **Auth** → Sign-in method → enable **Google**.
4. **Firestore** → Create database (production mode; any region, `us-central1` matches the functions).
5. **Hosting** → Get started (just to enable; deploy comes from CI).
6. Project settings → Your apps → **Add web app** → copy config values.
7. **Auth domain**: set `VITE_FIREBASE_AUTH_DOMAIN` to `<project-id>.web.app` (not `.firebaseapp.com`) so Google sign-in works inside the installed iPhone app. Add that domain under Auth → Settings → Authorized domains if missing.
8. **Service account for CI**: Google Cloud console → IAM → Service accounts → create `github-deploy` with roles: Firebase Admin, Cloud Functions Admin, Service Account User, Cloud Build Editor, Artifact Registry Administrator. Keys → Add key → JSON.
9. **GitHub repo secrets** (Settings → Secrets and variables → Actions):
   `FIREBASE_SERVICE_ACCOUNT` (the JSON), `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
10. Edit `.firebaserc` → replace `demo-altitude` with your project ID. Push to `main` → Action tests then deploys.

(First functions deploy may ask to enable APIs; if the Action fails on that, run `npx firebase deploy` once locally after `npx firebase login`.)

## Install on phone
- **iPhone**: open the site in Safari → Share ⬆️ → Add to Home Screen.
- **Android**: Chrome shows an Install banner / button on the home screen card.

## Dev

```bash
npm install && (cd functions && npm install)
npm run build:emu        # build against emulators
npm run emulators        # auth, firestore, functions, hosting on :5000
npm run test:e2e         # Playwright full flow (another terminal)
npm test                 # unit tests (stats, place matching)
npm run test:rules       # Firestore rules tests (needs Java)
```
Emulator builds expose `window.__testSignIn(name)` (emulator-only) since Google's popup isn't available offline.

## Layout
| Path | What |
|---|---|
| `src/lib/buckets.ts` | All enums/labels (methods, altitudes, reasons, …). Keep `firestore.rules` lists in sync. |
| `src/lib/stats.ts` | Pure aggregations (timezone-aware), shared by owner + share view |
| `src/lib/data.ts` | Firestore reads/writes, callables, CSV export |
| `src/components/LogSheet.tsx` | The log form |
| `functions/index.js` | `share` (GET API), `rotateShare`, `disableShare`, `deleteAccountData` |
| `firestore.rules` | Owner-only access, field validation, `shares/` server-only |

## Adding a reason/method
Add it in `src/lib/buckets.ts` **and** the matching list in `firestore.rules`, else writes are rejected.

## Privacy notes
- Share link = bearer secret. Anyone with it sees what's toggled on. Rotate if it leaks.
- Notes are owner-only, always.
- "Delete everything" removes profile, logs, places, share link, and the auth account.
