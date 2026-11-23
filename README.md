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
6. Project settings → Your apps → **Add web app** → copy the `firebaseConfig` block. Put the values in `.env.production` (committed; these values are public by design and ship in the app anyway), **except** set `VITE_FIREBASE_AUTH_DOMAIN=<project-id>.web.app` instead of `.firebaseapp.com` so Google sign-in works in the installed iPhone app. Set the same project ID in `.firebaserc`.
7. Auth → Settings → **Authorized domains**: confirm `<project-id>.web.app` is listed (usually automatic).
   Also: Google Cloud console → APIs & Services → Credentials → OAuth 2.0 Client IDs → **Web client (auto created by Google Service)** →
   add Authorized JavaScript origin `https://<project-id>.web.app` and Authorized redirect URI `https://<project-id>.web.app/__/auth/handler`. Without this, sign-in fails with `redirect_uri_mismatch`.
8. **Service account for CI**: Google Cloud console → IAM & Admin → Service accounts → Create `github-deploy` with roles: Firebase Admin, Cloud Functions Admin, Service Account User, Cloud Build Editor, Artifact Registry Administrator. Then the account → Keys → Add key → JSON (downloads a file).
9. GitHub repo → Settings → Secrets and variables → Actions → New repository secret: name `FIREBASE_SERVICE_ACCOUNT`, value = entire contents of that JSON file. This is the only secret.
10. Push to `main` → Action tests then deploys.

(First deploy may fail until the Cloud Functions API (and others it names) are enabled; the error includes an enable link. Enable, then Actions → Test & deploy → Run workflow.)

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
