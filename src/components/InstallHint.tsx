import { useEffect, useState } from 'react';

interface BIPEvent extends Event { prompt: () => Promise<void> }

const KEY = 'installHintDismissed';
const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Android: native install button. iOS: Share → Add to Home Screen hint. Hidden once installed/dismissed. */
export function InstallHint() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [hidden, setHidden] = useState(() => {
    try { return standalone() || localStorage.getItem(KEY) === '1'; } catch { return standalone(); }
  });

  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  if (hidden || (!evt && !isIos())) return null;
  const dismiss = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } setHidden(true); };

  return (
    <div className="card install">
      {evt ? (
        <>
          <span>Add Altitude to your home screen</span>
          <button className="btn primary" onClick={async () => { await evt.prompt(); dismiss(); }}>Install</button>
        </>
      ) : (
        <span>Add to home screen: tap <b>Share</b> <span aria-hidden>⬆️</span> then <b>Add to Home Screen</b>.</span>
      )}
      <button className="icon-btn" onClick={dismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}
