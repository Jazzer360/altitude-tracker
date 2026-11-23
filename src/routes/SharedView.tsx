import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LogList } from '../components/LogList';
import { StatsView } from '../components/StatsView';
import type { SharedPayload } from '../lib/types';

export function SharedView() {
  const { token } = useParams();
  const [data, setData] = useState<SharedPayload | null | 'gone'>(null);

  useEffect(() => {
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex,nofollow';
    document.head.appendChild(m);
    fetch(`/api/share/${encodeURIComponent(token ?? '')}`)
      .then((r) => (r.ok ? r.json() : 'gone'))
      .then(setData)
      .catch(() => setData('gone'));
    return () => m.remove();
  }, [token]);

  if (data === null) return <main className="center"><p className="muted">Loading…</p></main>;
  if (data === 'gone') return (
    <main className="center">
      <div className="logo">🔒</div>
      <h1>Link not active</h1>
      <p className="muted">This share link was turned off or replaced.</p>
    </main>
  );

  const { firstName, timezone, settings, logs } = data;
  return (
    <main className="page shared">
      <div className="banner">Shared by {firstName} · read-only</div>
      <h1>{firstName}'s Altitude</h1>
      <StatsView logs={logs} tz={timezone} showPlaces={settings.showPlaces} showReasons={settings.showReasons} />
      {settings.showLogList && (
        <>
          <h3 className="section-title">Recent logs</h3>
          <LogList logs={logs} limit={50} showPlaces={settings.showPlaces} showReasons={settings.showReasons} />
        </>
      )}
    </main>
  );
}
