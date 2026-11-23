import { useEffect, useState } from 'react';
import { ALTITUDES, AMOUNTS, METHODS, MOODS, OTHER_PLACE, REASONS, WITH, type ReasonId } from '../lib/buckets';
import { addLog, addPlace, deleteLog, saveLog } from '../lib/data';
import { getPosition, matchPlace } from '../lib/places';
import { useStore } from '../lib/store';
import type { Log, LogKind } from '../lib/types';
import { Chips, toggle } from './Chips';

interface Props {
  kind: LogKind;
  existing?: Log;
  onClose: (savedId?: string) => void;
}

const toLocalInput = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const PLACE_EMOJI = ['🏠', '👥', '🌳', '🚗', '🏫', '💼', '🎮', '📍'];

export function LogSheet({ kind, existing, onClose }: Props) {
  const { user, places } = useStore();
  const [at, setAt] = useState(existing?.at ?? Date.now());
  const [placeId, setPlaceId] = useState<string | null>(existing?.placeId ?? null);
  const [locating, setLocating] = useState(!existing);
  const [newSpot, setNewSpot] = useState<{ lat: number; lng: number } | null>(null);
  const [spotName, setSpotName] = useState('');
  const [spotEmoji, setSpotEmoji] = useState('🏠');
  const [method, setMethod] = useState(existing?.method ?? null);
  const [altitude, setAltitude] = useState<number | null>(existing?.altitude ?? null);
  const [reasons, setReasons] = useState<ReasonId[]>(existing?.reasons ?? []);
  const [more, setMore] = useState(false);
  const [withWho, setWith] = useState(existing?.with ?? null);
  const [amount, setAmount] = useState(existing?.amount ?? null);
  const [mood, setMood] = useState<number | null>(existing?.moodBefore ?? null);
  const [note, setNote] = useState(existing?.note ?? '');

  useEffect(() => {
    if (existing) return;
    let live = true;
    getPosition().then((pos) => {
      if (!live) return;
      setLocating(false);
      if (!pos) return;
      const m = matchPlace(places, pos);
      if (m) setPlaceId(m.id);
      else { setPlaceId(OTHER_PLACE.id); setNewSpot({ lat: pos.lat, lng: pos.lng }); }
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;
  const isUse = kind === 'use';
  const valid = isUse ? method != null && altitude != null : true;

  async function save() {
    if (!user || !valid) return;
    let pid = placeId === OTHER_PLACE.id ? null : placeId;
    let label = pid ? places.find((p) => p.id === pid)?.name ?? null : placeId === OTHER_PLACE.id ? OTHER_PLACE.name : null;
    if (newSpot && spotName.trim() && placeId === OTHER_PLACE.id) {
      const ref = await addPlace(user.uid, { name: spotName.trim().slice(0, 30), emoji: spotEmoji, ...newSpot, radiusM: 150 });
      pid = ref.id;
      label = spotName.trim();
    }
    const data: Omit<Log, 'id'> = {
      kind, at, placeId: pid, placeLabel: label,
      method: isUse ? method : null,
      altitude: isUse ? altitude : null,
      reasons,
      with: isUse ? withWho : null,
      amount: isUse ? amount : null,
      moodBefore: mood,
      note: note.trim() ? note.trim().slice(0, 500) : null,
    };
    if (existing) { saveLog(user.uid, existing.id, data); onClose(existing.id); }
    else onClose(addLog(user.uid, data));
  }

  const placeOpts = [...places.map((p) => ({ id: p.id, label: p.name, emoji: p.emoji })), { id: OTHER_PLACE.id, label: OTHER_PLACE.name, emoji: OTHER_PLACE.emoji }];

  return (
    <div className="sheet-backdrop" onClick={() => onClose()}>
      <div className="sheet" role="dialog" aria-label={isUse ? 'Log a session' : 'Log a skipped urge'} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>{existing ? 'Edit' : isUse ? 'New log' : 'Skipped an urge 💪'}</h2>
          <button className="icon-btn" onClick={() => onClose()} aria-label="Close">✕</button>
        </header>

        <div className="meta-row">
          <input type="datetime-local" value={toLocalInput(at)} max={toLocalInput(Date.now())}
            onChange={(e) => e.target.value && setAt(new Date(e.target.value).getTime())} aria-label="When" />
        </div>
        <section>
          <h3>Where {locating && <small className="muted">locating…</small>}</h3>
          <Chips options={placeOpts} value={placeId} onChange={(v) => setPlaceId(v === placeId ? null : v)} />
          {newSpot && placeId === OTHER_PLACE.id && (
            <div className="new-spot">
              <small className="muted">New spot? Name it and it'll be recognized next time (optional):</small>
              <div className="row">
                <select value={spotEmoji} onChange={(e) => setSpotEmoji(e.target.value)} aria-label="Icon">
                  {PLACE_EMOJI.map((e) => <option key={e}>{e}</option>)}
                </select>
                <input placeholder="e.g. Home, Alex's" value={spotName} maxLength={30} onChange={(e) => setSpotName(e.target.value)} />
              </div>
            </div>
          )}
        </section>

        {isUse && (
          <>
            <section><h3>What</h3><Chips options={METHODS} value={method} onChange={setMethod} /></section>
            <section><h3>Altitude</h3><Chips options={ALTITUDES} value={altitude} onChange={setAltitude} big /></section>
          </>
        )}
        <section>
          <h3>{isUse ? 'Why' : 'What was pulling you?'} <small className="muted">pick any</small></h3>
          <Chips options={REASONS} value={reasons} onChange={(v) => setReasons(toggle(reasons, v))} />
        </section>

        <button type="button" className="link-btn" onClick={() => setMore(!more)}>{more ? '− Less' : '+ More details (optional)'}</button>
        {more && (
          <>
            {isUse && <section><h3>With</h3><Chips options={WITH} value={withWho} onChange={(v) => setWith(v === withWho ? null : v)} /></section>}
            {isUse && <section><h3>How much</h3><Chips options={AMOUNTS} value={amount} onChange={(v) => setAmount(v === amount ? null : v)} /></section>}
            <section><h3>Mood before</h3><Chips options={MOODS} value={mood} onChange={(v) => setMood(v === mood ? null : v)} /></section>
            <section>
              <h3>Note <small className="muted">private — never shared</small></h3>
              <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </section>
          </>
        )}

        <div className="sheet-actions">
          {existing && user && (
            <button className="btn danger" onClick={() => { if (confirm('Delete this log?')) { deleteLog(user.uid, existing.id); onClose(); } }}>Delete</button>
          )}
          <button className="btn primary grow" disabled={!valid} onClick={save}>
            {valid ? 'Save' : 'Pick what + altitude'}
          </button>
        </div>
      </div>
    </div>
  );
}
