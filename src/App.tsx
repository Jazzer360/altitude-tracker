import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './lib/store';
import { History } from './routes/History';
import { Home } from './routes/Home';
import { Login } from './routes/Login';
import { Onboard } from './routes/Onboard';
import { Settings } from './routes/Settings';
import { SharedView } from './routes/SharedView';
import { Stats } from './routes/Stats';

export default function App() {
  const { pathname } = useLocation();
  // Share pages are public: no auth, no store.
  if (pathname.startsWith('/s/')) return <Routes><Route path="/s/:token" element={<SharedView />} /></Routes>;
  return <StoreProvider><Authed /></StoreProvider>;
}

function Authed() {
  const { user, profile } = useStore();
  if (user === undefined || (user && profile === undefined)) return <main className="center"><div className="logo pulse">🛰️</div></main>;
  if (!user) return <Login />;
  if (!profile) return <Onboard />;
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <nav className="tabs">
        <NavLink to="/" end><span>🏠</span>Log</NavLink>
        <NavLink to="/stats"><span>📊</span>Stats</NavLink>
        <NavLink to="/history"><span>🗓️</span>History</NavLink>
        <NavLink to="/settings"><span>⚙️</span>Settings</NavLink>
      </nav>
    </>
  );
}
