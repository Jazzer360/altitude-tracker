import { useState } from 'react';
import { createProfile } from '../lib/data';
import { useStore } from '../lib/store';

export function Onboard() {
  const { user } = useStore();
  const [name, setName] = useState(user?.displayName?.split(' ')[0] ?? '');
  const [busy, setBusy] = useState(false);
  return (
    <main className="center">
      <div className="logo">👋</div>
      <h1>What should we call you?</h1>
      <p className="muted">First name only. Shown on your share page if you ever make one.</p>
      <form onSubmit={async (e) => { e.preventDefault(); if (!user || !name.trim()) return; setBusy(true); await createProfile(user.uid, name); }}>
        <input className="big-input" autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="First name" />
        <button className="btn primary big" disabled={!name.trim() || busy}>Let's go</button>
      </form>
      <div className="card left">
        <h3>How it works</h3>
        <ul className="plain">
          <li>Tap <b>+ Log</b> each time. Takes ~5 seconds.</li>
          <li>Tap <b>Skipped an urge</b> when you didn't — those count too.</li>
          <li>Your data is private. Sharing is off until you turn it on.</li>
        </ul>
      </div>
    </main>
  );
}
