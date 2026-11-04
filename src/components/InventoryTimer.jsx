import React, { useEffect, useRef, useState } from 'react';
import { Timer, X } from 'lucide-react';

const STORAGE_KEY = 'gagaclo_inventory_timer_deadline';

export function InventoryTimer() {
  const dialogRef = useRef(null);
  const [days, setDays] = useState('7');
  const [deadline, setDeadline] = useState(() => Number(localStorage.getItem(STORAGE_KEY)) || 0);
  const [now, setNow] = useState(Date.now);
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const finished = deadline > 0 && remaining === 0;
  const countdown = [
    ['Hari', Math.floor(remaining / 86400)],
    ['Jam', Math.floor(remaining / 3600) % 24],
    ['Menit', Math.floor(remaining / 60) % 60],
    ['Detik', remaining % 60],
  ];

  useEffect(() => {
    if (!deadline || finished) return;
    const update = () => setNow(Date.now());
    const interval = window.setInterval(update, 250);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
    };
  }, [deadline, finished]);

  function start(event) {
    event.preventDefault();
    const duration = Number(days);
    if (!Number.isInteger(duration) || duration < 1 || duration > 365) return;
    const startedAt = Date.now();
    const end = startedAt + duration * 86_400_000;
    localStorage.setItem(STORAGE_KEY, String(end));
    setNow(startedAt);
    setDeadline(end);
    dialogRef.current.close();
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    setDeadline(0);
  }

  return (
    <>
      <section aria-label="Hitung mundur pendataan" className="inventory-panel flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        <div>
          <h2 className="text-sm font-bold">Hitung Mundur Pendataan</h2>
          <p className="text-xs text-slate-600">{finished ? 'Waktu habis' : deadline ? 'Sisa waktu pendataan' : 'Atur durasi untuk memulai'}</p>
        </div>
        <div role="timer" className="flex gap-3 text-center sm:gap-6">
          {countdown.map(([label, value]) => (
            <div key={label} className="min-w-10">
              <div className="text-2xl leading-none font-bold tabular-nums text-blue-700 sm:text-4xl">{String(value).padStart(2, '0')}</div>
              <div className="mt-1 text-xs text-slate-600">{label}</div>
            </div>
          ))}
        </div>
        <button type="button" aria-haspopup="dialog" onClick={() => dialogRef.current.showModal()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-100">
          <Timer className="h-4 w-4" aria-hidden="true" /> Atur Timer
        </button>
      </section>
      <span className="sr-only" role="status">{finished ? 'Waktu pengerjaan data habis.' : ''}</span>
      <dialog
        ref={dialogRef}
        aria-labelledby="inventory-timer-title"
        className="no-print m-auto w-[min(92vw,24rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-black/45"
      >
        <div className="flex items-center justify-between">
          <h2 id="inventory-timer-title" className="text-base font-bold">Timer pengerjaan data</h2>
          <button type="button" aria-label="Tutup" onClick={() => dialogRef.current.close()}
            className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={start} className="mt-4 space-y-4">
          <label className="block text-sm font-semibold">
            Durasi (hari)
            <input type="number" min="1" max="365" step="1" required value={days}
              onChange={event => setDays(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 p-2" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
              {deadline ? 'Mulai ulang' : 'Mulai'}
            </button>
            {deadline > 0 && (
              <button type="button" onClick={reset}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">
                Reset
              </button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
