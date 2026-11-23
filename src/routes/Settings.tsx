import { signOut } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '../firebase';
import { addPlace, deleteAccountData, deletePlace, disableShare, exportCsv, rotateShare, updatePlace, updateProfile } from '../lib/data';
import { getPosition } from '../lib/places';
import { useStore } from '../lib/store';
import type { ShareSettings } from '../lib/types';

export function Settings() {
  const { user, profile, places } = useStore();
  const [name, setName] = useState(profile?.firstName ?? '');
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);
  const [newPlace, setNewPlace] = useState('');
  if (!user || !profile) return null;

  const shareUrl = profile.shareToken ? `${location.origin}/s/${profile.shareToken}` : null;
  const setShare = (patch: Partial<ShareSettings>) => updateProfile(user.uid, { shareSettings: { ...profile.shareSettings, ...patch } });
  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try { await fn(); } catch { alert('Something went wrong. Check your connection and try again.'); } finally { setBusy(''); }
  };

  return (
    <main className="page settings">
      <h1>Settings</h1>

      <section className="card">
        <h3>Name</h3>
        <div className="row">
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <button className="btn" disabled={!name.trim() || name === profile.firstName} onClick={() => updateProfile(user.uid, { firstName: name.trim() })}>Save</button>
        </div>
      </section>

      <section className="card">
        <h3>Places</h3>
        <p className="muted small">Logs auto-match to a saved place when you're within ~150 m. Exact locations are never shared.</p>
        {places.map((p) => (
          <div className="row place" key={p.id}>
            <span>{p.emoji}</span>
            <input defaultValue={p.name} maxLength={30} onBlur={(e) => e.target.value.trim() && e.target.value !== p.name && updatePlace(user.uid, p.id, { name: e.target.value.trim() })} />
            <button className="icon-btn" aria-label={`Delete ${p.name}`} onClick={() => confirm(`Delete "${p.name}"? Past logs keep the name.`) && deletePlace(user.uid, p.id)}>🗑</button>
          </div>
        ))}
        <div className="row">
          <input placeholder="Add where you are now…" value={newPlace} maxLength={30} onChange={(e) => setNewPlace(e.target.value)} />
          <button className="btn" disabled={!newPlace.trim() || !!busy} onClick={() => run('place', async () => {
            const pos = await getPosition();
            if (!pos) { alert('Location unavailable. Allow location access for this app.'); return; }
            await addPlace(user.uid, { name: newPlace.trim(), emoji: '📍', lat: pos.lat, lng: pos.lng, radiusM: 150 });
            setNewPlace('');
          })}>{busy === 'place' ? '…' : 'Add'}</button>
        </div>
      </section>

      <section className="card">
        <h3>Sharing</h3>
        <p className="muted small">Anyone with the link can see your stats (read-only). Notes are never shared. You can turn it off or make a new link any time — the old one stops working.</p>
        {shareUrl ? (
          <>
            <div className="share-url">
              <code>{shareUrl}</code>
              <button className="btn" onClick={async () => {
                if (navigator.share) await navigator.share({ title: `${profile.firstName}'s Altitude`, url: shareUrl }).catch(() => {});
                else { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }
              }}>{copied ? 'Copied' : 'Share'}</button>
            </div>
            <a className="link-btn" href={shareUrl} target="_blank" rel="noreferrer">Preview what they see ↗</a>
            <Toggle label="Show places" on={profile.shareSettings.showPlaces} set={(v) => setShare({ showPlaces: v })} />
            <Toggle label="Show reasons" on={profile.shareSettings.showReasons} set={(v) => setShare({ showReasons: v })} />
            <Toggle label="Show individual logs (not just stats)" on={profile.shareSettings.showLogList} set={(v) => setShare({ showLogList: v })} />
            <div className="row">
              <button className="btn" disabled={!!busy} onClick={() => confirm('Make a new link? The current one will stop working.') && run('rotate', () => rotateShare())}>New link</button>
              <button className="btn danger" disabled={!!busy} onClick={() => run('off', () => disableShare())}>Turn off</button>
            </div>
          </>
        ) : (
          <button className="btn primary" disabled={!!busy} onClick={() => run('rotate', () => rotateShare())}>{busy ? 'Creating…' : 'Create share link'}</button>
        )}
      </section>

      <section className="card">
        <h3>Your data</h3>
        <div className="row wrap">
          <button className="btn" onClick={() => run('csv', async () => {
            const csv = await exportCsv(user.uid);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = `altitude-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
          })}>Export CSV</button>
          <button className="btn" onClick={() => signOut(auth)}>Sign out</button>
          <button className="btn danger" onClick={() => {
            if (prompt('This permanently deletes your account and every log. Type DELETE to confirm.') === 'DELETE')
              run('delete', async () => { await deleteAccountData(); await signOut(auth); });
          }}>Delete everything</button>
        </div>
      </section>
    </main>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} />
    </label>
  );
}
