import { useEffect, useState } from 'react';
import { InstallHint } from '../components/InstallHint';
import { LogList } from '../components/LogList';
import { LogSheet } from '../components/LogSheet';
import { deleteLog } from '../lib/data';
import { summarize } from '../lib/stats';
import { useStore } from '../lib/store';
import type { Log, LogKind } from '../lib/types';

export function Home() {
  const { user, profile, logs } = useStore();
  const [sheet, setSheet] = useState<{ kind: LogKind; existing?: Log } | null>(null);
  const [toast, setToast] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!profile || !user) return null;
  const s = summarize(logs, 7, profile.timezone);
  const hasUse = logs.some((l) => l.kind === 'use');

  return (
    <main className="page home">
      <p className="hello">Hey {profile.firstName}</p>
      {hasUse && (
        <div className="hero">
          {s.currentOffRun > 0
            ? <div className="hero-n">{s.currentOffRun}</div>
            : <div className="hero-n neutral">Today</div>}
          <div className="hero-l">
            {s.currentOffRun > 0 ? `${s.currentOffRun === 1 ? 'day' : 'days'} since last use · ` : 'last logged · '}
            {s.daysOff}/{s.days} days off this week
          </div>
        </div>
      )}

      <button className="btn primary huge" onClick={() => setSheet({ kind: 'use' })}>+ Log</button>
      <button className="btn ghost" onClick={() => setSheet({ kind: 'urge_skipped' })}>💪 Skipped an urge</button>

      <InstallHint />

      <h3 className="section-title">Recent</h3>
      <LogList logs={logs} limit={5} onSelect={(l) => setSheet({ kind: l.kind, existing: l })} />

      {sheet && (
        <LogSheet kind={sheet.kind} existing={sheet.existing} onClose={(id) => {
          if (id && !sheet.existing) setToast({ id, text: sheet.kind === 'use' ? 'Logged.' : 'Nice. Logged. 💪' });
          setSheet(null);
        }} />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast.text}
          <button onClick={() => { deleteLog(user.uid, toast.id); setToast(null); }}>Undo</button>
        </div>
      )}
    </main>
  );
}
