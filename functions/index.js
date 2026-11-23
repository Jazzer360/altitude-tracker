// Altitude Cloud Functions: share link read endpoint + share/account management.
import { randomBytes } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();
const DEFAULT_SHARE = { showPlaces: true, showReasons: true, showLogList: true };
const TOKEN_RE = /^[A-Za-z0-9_-]{32,64}$/;

const newToken = () => randomBytes(24).toString('base64url'); // 32 chars, 192 bits

/** GET /api/share/:token → filtered, read-only payload. Never returns notes or coordinates. */
export const share = onRequest({ cors: false, maxInstances: 5 }, async (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Cache-Control', 'private, max-age=30');
  if (req.method !== 'GET') { res.status(405).end(); return; }
  const token = req.path.split('/').filter(Boolean).pop() ?? '';
  if (!TOKEN_RE.test(token)) { res.status(404).json({ error: 'not_found' }); return; }

  const shareSnap = await db.doc(`shares/${token}`).get();
  if (!shareSnap.exists) { res.status(404).json({ error: 'not_found' }); return; }
  const { uid } = shareSnap.data();
  const user = (await db.doc(`users/${uid}`).get()).data();
  if (!user || user.shareToken !== token) { res.status(404).json({ error: 'not_found' }); return; }

  const settings = { ...DEFAULT_SHARE, ...(user.shareSettings ?? {}) };
  const logsSnap = await db.collection(`users/${uid}/logs`).orderBy('at', 'desc').limit(3000).get();
  const logs = logsSnap.docs.map((d) => {
    const l = d.data();
    return {
      id: d.id,
      kind: l.kind,
      at: l.at.toMillis(),
      placeId: null,
      placeLabel: settings.showPlaces ? l.placeLabel ?? null : null,
      method: l.method ?? null,
      altitude: l.altitude ?? null,
      reasons: settings.showReasons ? l.reasons ?? [] : [],
      with: l.with ?? null,
      amount: l.amount ?? null,
      moodBefore: l.moodBefore ?? null,
      note: null,
    };
  });
  res.json({ firstName: user.firstName, timezone: user.timezone, settings, logs });
});

function requireUid(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  return req.auth.uid;
}

/** Create a share link, or replace the existing one (old link stops working). */
export const rotateShare = onCall(async (req) => {
  const uid = requireUid(req);
  const token = newToken();
  await db.runTransaction(async (tx) => {
    const userRef = db.doc(`users/${uid}`);
    const u = await tx.get(userRef);
    if (!u.exists) throw new HttpsError('failed-precondition', 'No profile.');
    const old = u.data().shareToken;
    if (old) tx.delete(db.doc(`shares/${old}`));
    tx.set(db.doc(`shares/${token}`), { uid, createdAt: new Date() });
    tx.update(userRef, { shareToken: token });
  });
  return { token };
});

export const disableShare = onCall(async (req) => {
  const uid = requireUid(req);
  await db.runTransaction(async (tx) => {
    const userRef = db.doc(`users/${uid}`);
    const u = await tx.get(userRef);
    const old = u.data()?.shareToken;
    if (old) tx.delete(db.doc(`shares/${old}`));
    if (u.exists) tx.update(userRef, { shareToken: null });
  });
  return { ok: true };
});

/** Permanently delete the profile, all logs/places, the share link, and the auth account. */
export const deleteAccountData = onCall(async (req) => {
  const uid = requireUid(req);
  const userRef = db.doc(`users/${uid}`);
  const token = (await userRef.get()).data()?.shareToken;
  if (token) await db.doc(`shares/${token}`).delete();
  await db.recursiveDelete(userRef);
  await getAuth().deleteUser(uid).catch(() => {});
  return { ok: true };
});
