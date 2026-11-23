import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { ALTITUDES, METHODS, REASONS, find } from '../lib/buckets';
import { countBy, heatmap, inRange, insights, summarize, TIME_SLOTS, weekly, type RangeDays } from '../lib/stats';
import type { Log } from '../lib/types';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Validated (dark surface #12142b): lightness band, CVD ΔE ≥ 8, contrast ≥ 3:1.
export const C_USE = '#8a78f0';
export const C_SKIP = '#22a679';
const INK2 = '#a9acc9';
const GRID = 'rgba(255,255,255,0.06)';

const RANGES: { id: RangeDays; label: string }[] = [
  { id: 7, label: '7 days' }, { id: 30, label: '30 days' }, { id: 90, label: '90 days' }, { id: null, label: 'All' },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  logs: Log[];
  tz: string;
  showPlaces?: boolean;
  showReasons?: boolean;
}

export function StatsView({ logs, tz, showPlaces = true, showReasons = true }: Props) {
  const [range, setRange] = useState<RangeDays>(30);
  const now = useMemo(() => Date.now(), [logs]); // eslint-disable-line react-hooks/exhaustive-deps
  const s = useMemo(() => summarize(logs, range, tz, now), [logs, range, tz, now]);
  const win = useMemo(() => inRange(logs, range, tz, now), [logs, range, tz, now]);
  const uses = win.filter((l) => l.kind === 'use');
  const weeks = range === 7 ? 4 : range === 30 ? 8 : range === 90 ? 13 : Math.min(26, Math.max(4, Math.ceil(s.days / 7)));
  const wk = useMemo(() => weekly(logs, tz, weeks, now), [logs, tz, weeks, now]);
  const grid = heatmap(uses, tz);
  const gridMax = Math.max(1, ...grid.flat());

  if (!logs.length) return <p className="empty">Nothing logged yet. Stats show up after your first few logs.</p>;

  return (
    <div className="stats">
      <div className="seg" role="tablist">
        {RANGES.map((r) => (
          <button key={String(r.id)} role="tab" aria-selected={range === r.id} className={range === r.id ? 'on' : ''} onClick={() => setRange(r.id)}>{r.label}</button>
        ))}
      </div>

      <div className="tiles">
        <Tile big value={s.currentOffRun} label={s.currentOffRun === 1 ? 'day since last use' : 'days since last use'} accent />
        <Tile value={`${s.daysOff}/${s.days}`} label="days off" />
        <Tile value={s.uses} label="sessions" />
        <Tile value={s.perWeek.toFixed(1)} label="per week" />
        <Tile value={s.avgAltitude ? altName(s.avgAltitude) : '—'} label="avg altitude" />
        <Tile value={s.urgesSkipped} label="urges skipped" />
      </div>

      <Card title="Insights">
        <ul className="insights">{insights(win, tz, s).map((t) => <li key={t}>{t}</li>)}</ul>
      </Card>

      <Card title="Per week">
        <div className="chart-box">
          <Bar
            aria-label="Sessions and skipped urges per week"
            data={{
              labels: wk.map((w) => fmtWeek(w.start)),
              datasets: [
                { label: 'Sessions', data: wk.map((w) => w.uses), backgroundColor: C_USE, borderRadius: 4, borderSkipped: 'start', maxBarThickness: 18 },
                { label: 'Urges skipped', data: wk.map((w) => w.skipped), backgroundColor: C_SKIP, borderRadius: 4, borderSkipped: 'start', maxBarThickness: 18 },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                legend: { position: 'top', align: 'start', labels: { color: INK2, boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 2 } },
                tooltip: { callbacks: { title: (i) => `Week of ${i[0].label}` } },
              },
              scales: {
                x: { ticks: { color: INK2, maxRotation: 0, autoSkip: true }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { color: INK2, precision: 0 }, grid: { color: GRID }, border: { display: false } },
              },
            }}
          />
        </div>
      </Card>

      <Card title="When">
        <div className="heat" role="table" aria-label="Sessions by weekday and time of day">
          <div role="row" className="heat-row">
            <span />
            {TIME_SLOTS.map((t) => <span key={t.id} className="heat-col">{t.label.replace('Late night', 'Night')}</span>)}
          </div>
          {DAYS.map((d, i) => {
            const row = grid[(i + 1) % 7];
            return (
              <div role="row" className="heat-row" key={d}>
                <span className="heat-day">{d}</span>
                {row.map((c, t) => (
                  <span key={t} role="cell" className="heat-cell" title={`${d} ${TIME_SLOTS[t].label}: ${c}`}
                    style={{ background: c ? `color-mix(in oklab, ${C_USE} ${20 + (80 * c) / gridMax}%, transparent)` : undefined }}>
                    {c || ''}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </Card>

      {showReasons && <Breakdown title="Why" rows={countBy(win, (l) => l.reasons).map(([k, n]) => [labelOf(REASONS, k), n])} />}
      <Breakdown title="What" rows={countBy(uses, (l) => l.method).map(([k, n]) => [labelOf(METHODS, k), n])} />
      <Breakdown title="Altitude" rows={ALTITUDES.map((a) => [`${a.emoji} ${a.label}`, uses.filter((l) => l.altitude === a.id).length] as [string, number]).filter(([, n]) => n)} keepOrder />
      {showPlaces && <Breakdown title="Where" rows={countBy(uses, (l) => l.placeLabel ?? 'Not set').map(([k, n]) => [String(k), n])} />}
    </div>
  );
}

function labelOf<K extends string | number>(list: readonly { id: K; label: string; emoji: string }[], id: K) {
  const o = find(list, id);
  return o ? `${o.emoji} ${o.label}` : String(id);
}
function altName(avg: number) {
  const a = ALTITUDES[Math.round(avg) - 1];
  return `${a.emoji} ${avg.toFixed(1)}`;
}
function fmtWeek(k: string) {
  return new Date(k + 'T12:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function Tile({ value, label, big, accent }: { value: string | number; label: string; big?: boolean; accent?: boolean }) {
  return (
    <div className={`tile${big ? ' tile-big' : ''}${accent ? ' tile-accent' : ''}`}>
      <div className="tile-v">{value}</div>
      <div className="tile-l">{label}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card"><h3>{title}</h3>{children}</section>;
}

function Breakdown({ title, rows, keepOrder }: { title: string; rows: [string, number][]; keepOrder?: boolean }) {
  if (!rows.length) return null;
  const total = rows.reduce((a, [, n]) => a + n, 0);
  const max = Math.max(...rows.map(([, n]) => n));
  const shown = keepOrder ? rows : rows.slice(0, 8);
  return (
    <Card title={title}>
      <div className="bars">
        {shown.map(([k, n]) => (
          <div className="bar-row" key={k} title={`${k}: ${n} (${Math.round((100 * n) / total)}%)`}>
            <span className="bar-label">{k}</span>
            <span className="bar-track"><span className="bar-fill" style={{ width: `${(100 * n) / max}%` }} /></span>
            <span className="bar-n">{n}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
