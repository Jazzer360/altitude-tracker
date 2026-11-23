// Run via: npm run test:rules  (starts the Firestore emulator)
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const goodLog = () => ({
  kind: 'use', at: Timestamp.now(), placeId: null, placeLabel: 'Home', method: 'vape', altitude: 3,
  reasons: ['bored', 'social'], with: null, amount: null, moodBefore: 3, note: 'x',
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-altitude',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  await env.clearFirestore();
});
afterAll(() => env?.cleanup());

describe('firestore rules', () => {
  it('owner can create profile + valid log', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice'), { firstName: 'Al', timezone: 'UTC', shareToken: null, shareSettings: {} }));
    await assertSucceeds(setDoc(doc(db, 'users/alice/logs/1'), goodLog()));
    await assertSucceeds(setDoc(doc(db, 'users/alice/logs/2'), { ...goodLog(), kind: 'urge_skipped', method: null, altitude: null }));
  });
  it('rejects invalid logs', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice/logs/3'), { ...goodLog(), altitude: 9 }));
    await assertFails(setDoc(doc(db, 'users/alice/logs/3'), { ...goodLog(), method: 'pipe' }));
    await assertFails(setDoc(doc(db, 'users/alice/logs/3'), { ...goodLog(), reasons: ['nope'] }));
    await assertFails(setDoc(doc(db, 'users/alice/logs/3'), { ...goodLog(), extra: 1 }));
    await assertFails(setDoc(doc(db, 'users/alice/logs/3'), { ...goodLog(), method: null }));
  });
  it('blocks other users and anonymous reads', async () => {
    await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/logs/1')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice')));
  });
  it('client cannot set shareToken or touch shares/', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(updateDoc(doc(db, 'users/alice'), { shareToken: 'hijack' }));
    await assertFails(setDoc(doc(db, 'shares/abc'), { uid: 'alice' }));
    await assertFails(getDoc(doc(db, 'shares/abc')));
    await assertSucceeds(updateDoc(doc(db, 'users/alice'), { firstName: 'Alice' }));
  });
});
