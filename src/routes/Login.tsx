import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '../firebase';

export function Login() {
  const [err, setErr] = useState('');
  async function go() {
    setErr('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      // Installed iOS PWAs often block popups; fall back to a full-page redirect.
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider);
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        console.error('sign-in', code, e);
        setErr('Sign-in failed. Try again.');
      }
    }
  }
  return (
    <main className="center">
      <div className="logo">🛰️</div>
      <h1>Altitude</h1>
      <p className="muted">A private log, just for you.<br />Notice patterns. No judgement.</p>
      <button className="btn primary big" onClick={go}>Continue with Google</button>
      {err && <p className="error">{err}</p>}
    </main>
  );
}
