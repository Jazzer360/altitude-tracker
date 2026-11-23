import type { Option } from '../lib/buckets';

interface Props<K extends string | number> {
  options: readonly Option<K>[];
  value: K | K[] | null;
  onChange: (v: K) => void;
  big?: boolean;
}

/** Tap-to-select chip row. Pass an array value for multi-select (onChange toggles). */
export function Chips<K extends string | number>({ options, value, onChange, big }: Props<K>) {
  const on = (id: K) => (Array.isArray(value) ? value.includes(id) : value === id);
  return (
    <div className={big ? 'chips chips-big' : 'chips'}>
      {options.map((o) => (
        <button key={o.id} type="button" className={on(o.id) ? 'chip on' : 'chip'} aria-pressed={on(o.id)} onClick={() => onChange(o.id)}>
          <span className="chip-emoji">{o.emoji}</span>
          <span>{o.label}</span>
          {big && o.hint && <small>{o.hint}</small>}
        </button>
      ))}
    </div>
  );
}

export function toggle<T>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}
