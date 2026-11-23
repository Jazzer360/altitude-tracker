import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '../firebase';
import { watchLogs, watchPlaces, watchProfile } from './data';
import type { Log, Place, Profile } from './types';

interface Store {
  user: User | null | undefined; // undefined = loading
  profile: Profile | null | undefined;
  logs: Log[];
  places: Place[];
}

const Ctx = createContext<Store>({ user: undefined, profile: undefined, logs: [], places: [] });
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [logs, setLogs] = useState<Log[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    if (!user) { setProfile(user === null ? null : undefined); setLogs([]); setPlaces([]); return; }
    const u = [watchProfile(user.uid, setProfile), watchLogs(user.uid, setLogs), watchPlaces(user.uid, setPlaces)];
    return () => u.forEach((f) => f());
  }, [user]);

  return <Ctx.Provider value={{ user, profile, logs, places }}>{children}</Ctx.Provider>;
}
