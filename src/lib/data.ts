import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp,
  updateDoc, type DocumentData,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { DEFAULT_SHARE, type Log, type Place, type Profile } from './types';

const userDoc = (uid: string) => doc(db, 'users', uid);
const logsCol = (uid: string) => collection(db, 'users', uid, 'logs');
const placesCol = (uid: string) => collection(db, 'users', uid, 'places');

export function toLog(id: string, d: DocumentData): Log {
  return {
    id,
    kind: d.kind,
    at: d.at instanceof Timestamp ? d.at.toMillis() : Number(d.at),
    placeId: d.placeId ?? null,
    placeLabel: d.placeLabel ?? null,
    method: d.method ?? null,
    altitude: d.altitude ?? null,
    reasons: d.reasons ?? [],
    with: d.with ?? null,
    amount: d.amount ?? null,
    moodBefore: d.moodBefore ?? null,
    note: d.note ?? null,
  };
}

export function watchProfile(uid: string, cb: (p: Profile | null) => void) {
  return onSnapshot(userDoc(uid), (s) => {
    if (!s.exists()) return cb(null);
    const d = s.data();
    cb({
      firstName: d.firstName,
      timezone: d.timezone,
      shareToken: d.shareToken ?? null,
      shareSettings: { ...DEFAULT_SHARE, ...(d.shareSettings ?? {}) },
    });
  });
}

export function createProfile(uid: string, firstName: string) {
  return setDoc(userDoc(uid), {
    firstName: firstName.trim().slice(0, 40),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    shareToken: null,
    shareSettings: DEFAULT_SHARE,
    createdAt: serverTimestamp(),
  });
}

export function updateProfile(uid: string, patch: Partial<Omit<Profile, 'shareToken'>>) {
  return updateDoc(userDoc(uid), patch);
}

export function watchLogs(uid: string, cb: (logs: Log[]) => void) {
  return onSnapshot(query(logsCol(uid), orderBy('at', 'desc')), (s) => cb(s.docs.map((d) => toLog(d.id, d.data()))));
}

type LogInput = Omit<Log, 'id'>;
const toDoc = (l: LogInput) => ({ ...l, at: Timestamp.fromMillis(l.at) });

// Writes return immediately against the local cache; don't await server ack (works offline).
export function addLog(uid: string, l: LogInput) {
  const ref = doc(logsCol(uid));
  void setDoc(ref, toDoc(l));
  return ref.id;
}
export const saveLog = (uid: string, id: string, l: LogInput) => void setDoc(doc(logsCol(uid), id), toDoc(l));
export const deleteLog = (uid: string, id: string) => void deleteDoc(doc(logsCol(uid), id));

export function watchPlaces(uid: string, cb: (p: Place[]) => void) {
  return onSnapshot(query(placesCol(uid), orderBy('name')), (s) =>
    cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Place, 'id'>) }))));
}
export const addPlace = (uid: string, p: Omit<Place, 'id'>) => addDoc(placesCol(uid), p);
export const updatePlace = (uid: string, id: string, p: Partial<Omit<Place, 'id'>>) => updateDoc(doc(placesCol(uid), id), p);
export const deletePlace = (uid: string, id: string) => deleteDoc(doc(placesCol(uid), id));

export const rotateShare = httpsCallable<void, { token: string }>(functions, 'rotateShare');
export const disableShare = httpsCallable<void, { ok: true }>(functions, 'disableShare');
export const deleteAccountData = httpsCallable<void, { ok: true }>(functions, 'deleteAccountData');

export async function exportCsv(uid: string) {
  const s = await getDocs(query(logsCol(uid), orderBy('at')));
  const rows = s.docs.map((d) => toLog(d.id, d.data()));
  const cols = ['at', 'kind', 'placeLabel', 'method', 'altitude', 'reasons', 'with', 'amount', 'moodBefore', 'note'] as const;
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.join(','), ...rows.map((r) =>
    cols.map((c) => esc(c === 'at' ? new Date(r.at).toISOString() : c === 'reasons' ? r.reasons.join('|') : r[c])).join(','))];
  return lines.join('\n');
}

