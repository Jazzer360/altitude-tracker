import { ALTITUDES, METHODS, REASONS, find } from '../lib/buckets';
import type { Log } from '../lib/types';

interface Props {
  logs: Log[];
  onSelect?: (l: Log) => void;
  showPlaces?: boolean;
  showReasons?: boolean;
  limit?: number;
}

/** Day-grouped, reverse-chron list. Read-only when onSelect is omitted. */
export function LogList({ logs, onSelect, showPlaces = true, showReasons = true, limit }: Props) {
  const list = limit ? logs.slice(0, limit) : logs;
  const groups = new Map<string, Log[]>();
  for (const l of list) {
    const k = new Date(l.at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  if (!list.length) return <p className="empty">No logs yet.</p>;
  return (
    <div className="loglist">
      {[...groups].map(([day, items]) => (
        <section key={day}>
          <h4 className="day">{day}</h4>
          {items.map((l) => {
            const alt = find(ALTITUDES, l.altitude);
            const m = find(METHODS, l.method);
            const Tag = onSelect ? 'button' : 'div';
            return (
              <Tag key={l.id} className={`logrow ${l.kind}`} onClick={onSelect ? () => onSelect(l) : undefined}>
                <span className="logrow-icon">{l.kind === 'use' ? alt?.emoji : '💪'}</span>
                <span className="logrow-main">
                  <strong>{l.kind === 'use' ? `${alt?.label} · ${m?.label}` : 'Skipped an urge'}</strong>
                  <small>
                    {new Date(l.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    {showPlaces && l.placeLabel && ` · ${l.placeLabel}`}
                    {showReasons && l.reasons.length > 0 && ` · ${l.reasons.map((r) => find(REASONS, r)?.label).join(', ')}`}
                  </small>
                </span>
              </Tag>
            );
          })}
        </section>
      ))}
    </div>
  );
}
