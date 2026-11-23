import { describe, expect, it } from 'vitest';
import { heatmap, inRange, localParts, summarize, weekly } from '../src/lib/stats';
import { matchPlace } from '../src/lib/places';
import type { Log } from '../src/lib/types';

const TZ = 'America/Chicago';
// Wed 2026-11-18 12:00 local (CST = UTC-6)
const NOW = Date.UTC(2026, 10, 18, 18);
const at = (y: number, m: number, d: number, h: number) => Date.UTC(y, m - 1, d, h + 6);

const log = (ms: number, extra: Partial<Log> = {}): Log => ({
  id: String(ms), kind: 'use', at: ms, placeId: null, placeLabel: null, method: 'flower', altitude: 3,
  reasons: ['bored'], with: null, amount: null, moodBefore: null, note: null, ...extra,
});

describe('localParts', () => {
  it('buckets by user timezone, not UTC', () => {
    // 11pm local on the 17th = 5am UTC on the 18th
    expect(localParts(at(2026, 11, 17, 23), TZ).dayKey).toBe('2026-11-17');
    expect(localParts(at(2026, 11, 17, 23), TZ).hour).toBe(23);
    expect(localParts(at(2026, 11, 18, 0), TZ).weekday).toBe(3);
  });
});

describe('summarize', () => {
  const logs = [
    log(at(2026, 11, 12, 20)),
    log(at(2026, 11, 14, 21), { altitude: 5 }),
    log(at(2026, 11, 14, 22), { altitude: 1 }),
    log(at(2026, 11, 16, 15), { kind: 'urge_skipped', method: null, altitude: null }),
  ];
  it('computes 7-day window stats', () => {
    const s = summarize(logs, 7, TZ, NOW);
    // window 11/12..11/18 = 7 days; used 12th, 14th
    expect(s.days).toBe(7);
    expect(s.uses).toBe(3);
    expect(s.daysUsed).toBe(2);
    expect(s.daysOff).toBe(5);
    expect(s.urgesSkipped).toBe(1);
    expect(s.currentOffRun).toBe(4); // 15,16,17,18
    expect(s.longestOffRun).toBe(4);
    expect(s.avgAltitude).toBe(3);
  });
  it('window never starts before first log', () => {
    const s = summarize([log(at(2026, 11, 17, 9))], 30, TZ, NOW);
    expect(s.days).toBe(2);
    expect(s.daysOff).toBe(1);
  });
  it('current run is 0 when used today', () => {
    expect(summarize([log(at(2026, 11, 18, 9))], 7, TZ, NOW).currentOffRun).toBe(0);
  });
  it('inRange excludes older logs', () => {
    expect(inRange(logs, 7, TZ, NOW)).toHaveLength(4);
    expect(inRange([log(at(2026, 11, 11, 23))], 7, TZ, NOW)).toHaveLength(0);
  });
});

describe('weekly + heatmap', () => {
  it('assigns logs to Monday-start weeks', () => {
    // current week starts Mon 11/16
    const w = weekly([log(at(2026, 11, 16, 10)), log(at(2026, 11, 15, 10)), log(at(2026, 11, 9, 10))], TZ, 3, NOW);
    expect(w.map((x) => x.start)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
    expect(w.map((x) => x.uses)).toEqual([0, 2, 1]);
  });
  it('heatmap uses local weekday + slot', () => {
    const g = heatmap([log(at(2026, 11, 13, 22))], TZ); // Fri late night
    expect(g[5][3]).toBe(1);
  });
});

describe('matchPlace', () => {
  const home = { id: 'h', name: 'Home', emoji: '🏠', lat: 41.8781, lng: -87.6298, radiusM: 150 };
  const park = { id: 'p', name: 'Park', emoji: '🌳', lat: 41.8800, lng: -87.6298, radiusM: 150 };
  it('picks nearest place in radius', () => {
    expect(matchPlace([home, park], { lat: 41.8783, lng: -87.6298 })?.id).toBe('h');
  });
  it('returns null when outside all', () => {
    expect(matchPlace([home], { lat: 41.9, lng: -87.6298 })).toBeNull();
  });
});
