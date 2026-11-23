import { useState } from 'react';
import { LogList } from '../components/LogList';
import { LogSheet } from '../components/LogSheet';
import { useStore } from '../lib/store';
import type { Log } from '../lib/types';

export function History() {
  const { logs } = useStore();
  const [edit, setEdit] = useState<Log | null>(null);
  return (
    <main className="page">
      <h1>History</h1>
      <LogList logs={logs} onSelect={setEdit} />
      {edit && <LogSheet kind={edit.kind} existing={edit} onClose={() => setEdit(null)} />}
    </main>
  );
}
