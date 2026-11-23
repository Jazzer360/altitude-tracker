import { StatsView } from '../components/StatsView';
import { useStore } from '../lib/store';

export function Stats() {
  const { logs, profile } = useStore();
  if (!profile) return null;
  return (
    <main className="page">
      <h1>Stats</h1>
      <StatsView logs={logs} tz={profile.timezone} />
    </main>
  );
}
