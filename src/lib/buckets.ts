// Single source of truth for every enum + label. Firestore rules mirror these lists.

export type Option<K extends string | number> = { id: K; label: string; emoji: string; hint?: string };

export const METHODS = [
  { id: 'flower', label: 'Flower', emoji: '🍃' },
  { id: 'vape', label: 'Vape', emoji: '💨' },
  { id: 'dab', label: 'Dab', emoji: '🔥' },
  { id: 'edible', label: 'Edible', emoji: '🍪' },
  { id: 'other', label: 'Other', emoji: '✨' },
] as const satisfies readonly Option<string>[];

export const ALTITUDES = [
  { id: 1, label: 'Ground Level', emoji: '🌱', hint: 'Barely felt it' },
  { id: 2, label: 'Mellow', emoji: '🌤️', hint: 'Relaxed, clear-headed' },
  { id: 3, label: 'Cloud Nine', emoji: '☁️', hint: 'Properly high, still functional' },
  { id: 4, label: 'Orbit', emoji: '🛰️', hint: 'Very high, hard to focus' },
  { id: 5, label: 'Deep Space', emoji: '🚀', hint: "Too far — didn't feel great" },
] as const satisfies readonly Option<number>[];

export const REASONS = [
  { id: 'stress', label: 'Stress / anxiety', emoji: '😣' },
  { id: 'bored', label: 'Boredom', emoji: '🥱' },
  { id: 'social', label: 'Social', emoji: '👥' },
  { id: 'sleep', label: 'Sleep', emoji: '😴' },
  { id: 'habit', label: 'Habit / routine', emoji: '🔁' },
  { id: 'down', label: 'Feeling down', emoji: '🌧️' },
  { id: 'fun', label: 'Fun / celebrating', emoji: '🎉' },
  { id: 'pain', label: 'Pain / physical', emoji: '🤕' },
  { id: 'craving', label: 'Craving', emoji: '🧲' },
] as const satisfies readonly Option<string>[];

export const WITH = [
  { id: 'alone', label: 'Alone', emoji: '🙂' },
  { id: 'friends', label: 'Friends', emoji: '👯' },
  { id: 'partner', label: 'Partner', emoji: '💞' },
  { id: 'family', label: 'Family', emoji: '🏠' },
] as const satisfies readonly Option<string>[];

export const AMOUNTS = [
  { id: 'small', label: 'A little', emoji: '🤏' },
  { id: 'medium', label: 'Normal', emoji: '👌' },
  { id: 'large', label: 'A lot', emoji: '💯' },
] as const satisfies readonly Option<string>[];

export const MOODS = [
  { id: 1, label: 'Awful', emoji: '😞' },
  { id: 2, label: 'Meh', emoji: '😕' },
  { id: 3, label: 'OK', emoji: '😐' },
  { id: 4, label: 'Good', emoji: '🙂' },
  { id: 5, label: 'Great', emoji: '😄' },
] as const satisfies readonly Option<number>[];

export type MethodId = (typeof METHODS)[number]['id'];
export type ReasonId = (typeof REASONS)[number]['id'];
export type WithId = (typeof WITH)[number]['id'];
export type AmountId = (typeof AMOUNTS)[number]['id'];

export function find<K extends string | number>(list: readonly Option<K>[], id: K | null | undefined) {
  return list.find((o) => o.id === id);
}

export const OTHER_PLACE = { id: '_other', name: 'Somewhere else', emoji: '📍' };
