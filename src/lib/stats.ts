// Pure aggregation functions. Used by both the owner's Stats screen and the shared view.
import { ALTITUDES, METHODS, REASONS, find } from './buckets';
import type { Log } from './types';

const DAY = 86400000;

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Local calendar parts in the user's timezone. */
export function localParts(ms: number, tz: string) {
  const parts = Object.fromEntries(fmt(tz).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return {
    dayKey: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WD.indexOf(parts.weekday),
    hour: Number(parts.hour) % 24,
  };
}

const keyToUtc = (k: string) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
export const daysBetween = (a: string, b: string) => Math.round((keyToUtc(b) - keyToUtc(a)) / DAY);
const addDays = (k: string, n: number) => new Date(keyToUtc(k) + n * DAY).toISOString().slice(0, 10);

export type RangeDays = 7 | 30 | 90 | null; // null = all time

/** Logs inside the last N local calendar days (today inclusive). */
export function inRange(logs: Log[], range: RangeDays, tz: string, now = Date.now()) {
  if (range == null) return logs;
  const start = addDays(localParts(now, tz).dayKey, -(range - 1));
  return logs.filter((l) => localParts(l.at, tz).dayKey >= start);
}

export const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', test: (h: number) => h >= 5 && h < 12 },
  { id: 'afternoon', label: 'Afternoon', test: (h: number) => h >= 12 && h < 17 },
  { id: 'evening', label: 'Evening', test: (h: number) => h >= 17 && h < 21 },
  { id: 'night', label: 'Late night', test: (h: number) => h >= 21 || h < 5 },
] as const;
export const slotOf = (h: number) => TIME_SLOTS.findIndex((s) => s.test(h));

export interface Summary {
  uses: number;
  urgesSkipped: number;
  days: number; // calendar days in window
  daysUsed: number;
  daysOff: number;
  currentOffRun: number; // days since last use (0 if used today)
  longestOffRun: number; // within window
  avgAltitude: number | null;
  perWeek: number; // uses per 7 days
}

export function summarize(all: Log[], range: RangeDays, tz: string, now = Date.now()): Summary {
  const today = localParts(now, tz).dayKey;
  const logs = inRange(all, range, tz, now);
  const uses = logs.filter((l) => l.kind === 'use');
  const usedDays = new Set(uses.map((l) => localParts(l.at, tz).dayKey));

  // Window start: range start, or first log day for all-time.
  // Window starts at the range start, but never before the first log (new users aren't credited with
  // "days off" from before they started tracking).
  const firstDay = localParts(all.reduce((m, l) => Math.min(m, l.at), now), tz).dayKey;
  let start = range != null ? addDays(today, -(range - 1)) : firstDay;
  if (firstDay > start) start = firstDay;
  const days = daysBetween(start, today) + 1;

  let longest = 0, run = 0;
  for (let i = 0; i < days; i++) {
    if (usedDays.has(addDays(start, i))) run = 0;
    else longest = Math.max(longest, ++run);
  }

  const allUseDays = all.filter((l) => l.kind === 'use').map((l) => localParts(l.at, tz).dayKey).sort();
  const last = allUseDays[allUseDays.length - 1];
  const currentOffRun = last ? daysBetween(last, today) : days;

  const alts = uses.map((l) => l.altitude).filter((a): a is number => a != null);
  return {
    uses: uses.length,
    urgesSkipped: logs.filter((l) => l.kind === 'urge_skipped').length,
    days,
    daysUsed: usedDays.size,
    daysOff: days - usedDays.size,
    currentOffRun,
    longestOffRun: longest,
    avgAltitude: alts.length ? alts.reduce((a, b) => a + b, 0) / alts.length : null,
    perWeek: days ? (uses.length / days) * 7 : 0,
  };
}

export function countBy<T extends string | number>(logs: Log[], key: (l: Log) => T | T[] | null) {
  const m = new Map<T, number>();
  for (const l of logs) {
    const k = key(l);
    for (const v of Array.isArray(k) ? k : k == null ? [] : [k]) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** weekday (0=Sun) x time slot grid of use counts. */
export function heatmap(logs: Log[], tz: string) {
  const grid = Array.from({ length: 7 }, () => [0, 0, 0, 0]);
  for (const l of logs) {
    if (l.kind !== 'use') continue;
    const p = localParts(l.at, tz);
    grid[p.weekday][slotOf(p.hour)]++;
  }
  return grid;
}

/** Uses and skipped urges per local week (Mon start), oldest first. */
export function weekly(logs: Log[], tz: string, weeks: number, now = Date.now()) {
  const today = localParts(now, tz);
  const monday = addDays(today.dayKey, -((today.weekday + 6) % 7));
  const out = Array.from({ length: weeks }, (_, i) => ({ start: addDays(monday, -7 * (weeks - 1 - i)), uses: 0, skipped: 0, altSum: 0 }));
  for (const l of logs) {
    const k = localParts(l.at, tz).dayKey;
    const back = Math.ceil(Math.max(daysBetween(k, monday), 0) / 7); // weeks before current
    const w = out[weeks - 1 - back];
    if (!w) continue;
    if (l.kind === 'use') { w.uses++; w.altSum += l.altitude ?? 0; } else w.skipped++;
  }
  return out.map((w) => ({ ...w, avgAlt: w.uses ? w.altSum / w.uses : null }));
}

/** Plain-language observations. Neutral tone, no judgement. */
export function insights(logs: Log[], tz: string, s: Summary): string[] {
  const out: string[] = [];
  const uses = logs.filter((l) => l.kind === 'use');
  if (!logs.length) return ['No logs in this period yet.'];
  if (s.currentOffRun >= 2) out.push(`${s.currentOffRun} days since last use.`);
  if (s.daysOff > 0) out.push(`${s.daysOff} of ${s.days} days off.`);
  const topReason = countBy(logs, (l) => l.reasons)[0];
  if (topReason) out.push(`Top reason: ${find(REASONS, topReason[0])?.label.toLowerCase()} (${topReason[1]}×).`);
  if (uses.length >= 4) {
    const grid = heatmap(uses, tz);
    let best = [0, 0, 0];
    grid.forEach((row, d) => row.forEach((c, t) => { if (c > best[2]) best = [d, t, c]; }));
    out.push(`Most common time: ${WD[best[0]]} ${TIME_SLOTS[best[1]].label.toLowerCase()}.`);
    const topMethod = countBy(uses, (l) => l.method)[0];
    if (topMethod) out.push(`Mostly ${find(METHODS, topMethod[0])?.label.toLowerCase()}.`);
  }
  const deep = uses.filter((l) => (l.altitude ?? 0) >= 5).length;
  if (deep) out.push(`${deep}× ${ALTITUDES[4].label} — worth noticing what led there.`);
  if (s.urgesSkipped) out.push(`Skipped ${s.urgesSkipped} urge${s.urgesSkipped > 1 ? 's' : ''}. 💪`);
  return out;
}
