import type { AmountId, MethodId, ReasonId, WithId } from './buckets';

export type LogKind = 'use' | 'urge_skipped';

/** Client-side shape; `at` is epoch ms (Firestore Timestamp converted at the edge). */
export interface Log {
  id: string;
  kind: LogKind;
  at: number;
  placeId: string | null;
  placeLabel: string | null;
  method: MethodId | null; // null for urge_skipped
  altitude: number | null; // 1..5, null for urge_skipped
  reasons: ReasonId[];
  with: WithId | null;
  amount: AmountId | null;
  moodBefore: number | null;
  note: string | null;
}

export interface Place {
  id: string;
  name: string;
  emoji: string;
  lat: number;
  lng: number;
  radiusM: number;
}

export interface ShareSettings {
  showPlaces: boolean;
  showReasons: boolean;
  showLogList: boolean;
}

export const DEFAULT_SHARE: ShareSettings = { showPlaces: true, showReasons: true, showLogList: true };

export interface Profile {
  firstName: string;
  timezone: string;
  shareToken: string | null;
  shareSettings: ShareSettings;
}

/** What the share endpoint returns. Logs never include `note`; places omitted if hidden. */
export interface SharedPayload {
  firstName: string;
  timezone: string;
  settings: ShareSettings;
  logs: Log[];
}
