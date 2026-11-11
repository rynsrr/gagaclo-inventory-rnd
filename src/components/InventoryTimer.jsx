import React, { useEffect, useRef, useState } from 'react';
import { Timer, X, Globe, RefreshCw } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

const TIMER_PIN = '4695';

export function InventoryTimer({ compact = false, fullWidth = false }) {
  const dialogRef = useRef(null);
  const { timerDeadline, timerNote, updateTimerDeadline, resetTimerDeadline } = useInventory();
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [days, setDays] = useState('7');
  const [noteInput, setNoteInput] = useState(timerNote || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (timerNote) setNoteInput(timerNote);
  }, [timerNote]);

  const deadline = Number(timerDeadline) || 0;
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
    const update = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setNow(Date.now());
    };
    const interval = window.setInterval(update, 1000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [deadline, finished]);

  function unlock(event) {
    event.preventDefault();
    if (pin !== TIMER_PIN) {
      setPinError(true);
      return;
    }
    setPin('');
    setPinError(false);
    setUnlocked(true);
  }

  function lock() {
    setPin('');
    setPinError(false);
    setUnlocked(false);
  }

  async function start(event) {
    event.preventDefault();
    if (!unlocked) return;
    const duration = Number(days);
    if (!Number.isInteger(duration) || duration < 1 || duration > 365) return;
    const startedAt = Date.now();
    const end = startedAt + duration * 86_400_000;
    setIsSaving(true);
    await updateTimerDeadline(end, noteInput);
    setIsSaving(false);
    setNow(startedAt);
    dialogRef.current?.close();
  }

  async function saveNoteOnly() {
    if (!unlocked) return;
    setIsSaving(true);
    await updateTimerDeadline(deadline, noteInput);
    setIsSaving(false);
    dialogRef.current?.close();
  }

  async function reset() {
    if (!unlocked) return;
    setIsSaving(true);
    await resetTimerDeadline();
    setIsSaving(false);
    dialogRef.current?.close();
  }

  return (
    <>
      {fullWidth ? (
        <section 
          aria-label="Hitung mundur pendataan inventory" 
          className="w-full bg-slate-900 border-b border-blue-500/40 px-3 sm:px-6 py-2 shadow-md transition-all duration-300 no-print"
        >
          <div className="max-w-[1560px] mx-auto flex flex-wrap items-center justify-between gap-2.5">
            
            {/* Sisi Kiri: Label & Status Sinkronisasi */}
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30 shadow-xs">
                <Timer className="h-4 w-4 animate-pulse" aria-hidden="true" />
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-blue-200">
                  Target Hitung Mundur:
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                  </span>
                  <span>Cloud Real-Time</span>
                </span>
              </div>
            </div>

            {/* Sisi Tengah: Countdown Timer Utama & Note Target */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => dialogRef.current?.showModal()}
                className="group flex items-center gap-2 sm:gap-3.5 bg-slate-950/90 hover:bg-slate-950 border-2 border-blue-500/70 hover:border-blue-400 px-4 py-1.5 rounded-2xl shadow-lg shadow-blue-950/50 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Klik untuk atur durasi target countdown & catatan (PIN: 4695)"
              >
                {finished ? (
                  <span className="text-xs sm:text-sm md:text-base font-black text-rose-400 tracking-wider animate-pulse uppercase">
                    ⚠️ WAKTU PENGERJAAN TELAH BERAKHIR
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2.5 font-black font-mono tracking-normal text-white tabular-nums">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-base sm:text-lg md:text-xl font-black bg-gradient-to-br from-amber-300 to-amber-400 bg-clip-text text-transparent">
                        {countdown[0][1]}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">h</span>
                    </div>
                    <span className="text-slate-600 font-black text-sm select-none">:</span>

                    <div className="flex items-baseline gap-0.5">
                      <span className="text-base sm:text-lg md:text-xl font-black text-white">
                        {String(countdown[1][1]).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">j</span>
                    </div>
                    <span className="text-slate-600 font-black text-sm select-none">:</span>

                    <div className="flex items-baseline gap-0.5">
                      <span className="text-base sm:text-lg md:text-xl font-black text-white">
                        {String(countdown[2][1]).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">m</span>
                    </div>
                    <span className="text-slate-600 font-black text-sm select-none">:</span>

                    <div className="flex items-baseline gap-0.5">
                      <span className="text-base sm:text-lg md:text-xl font-black bg-gradient-to-br from-cyan-300 to-cyan-400 bg-clip-text text-transparent">
                        {String(countdown[3][1]).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">s</span>
                    </div>
                  </div>
                )}

                <span className="relative flex h-2 w-2 ml-1" title="Sinkronisasi Cloud Aktif">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </button>

              {/* Note / Catatan Target Pill */}
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => dialogRef.current?.showModal()}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-950 border border-amber-500/50 hover:border-amber-400 text-amber-200 text-xs font-semibold cursor-pointer transition-all shadow-md shadow-amber-950/20 max-w-[340px] sm:max-w-[480px] truncate"
                title="Klik untuk ubah catatan target countdown (PIN: 4695)"
              >
                <span className="font-black text-amber-400 flex items-center gap-1 shrink-0">
                  <span>📌 Note:</span>
                </span>
                <span className="truncate text-slate-100 font-bold tracking-tight">
                  {timerNote || 'Selesaikan target pendataan seluruh rak & box'}
                </span>
              </button>
            </div>

            {/* Sisi Kanan: Tombol Pengaturan */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => dialogRef.current?.showModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                title="Atur durasi & catatan timer (PIN: 4695)"
              >
                <Timer className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                <span>Atur Timer &amp; Note</span>
              </button>
            </div>

          </div>
        </section>
      ) : compact ? (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => dialogRef.current?.showModal()}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs border bg-white/90 hover:bg-slate-100/90 text-slate-800 border-slate-200 hover:shadow-xs hover:-translate-y-0.5 cursor-pointer shrink-0"
          title="Atur durasi timer (PIN: 4695)"
        >
          <Timer className="h-3.5 w-3.5 text-blue-600 shrink-0" aria-hidden="true" />
          <span className="font-mono font-bold tracking-tight text-slate-900 tabular-nums">
            {finished
              ? 'WAKTU HABIS'
              : `${countdown[0][1]}h ${countdown[1][1]}j ${countdown[2][1]}m ${countdown[3][1]}s`}
          </span>
          <span className="relative flex h-1.5 w-1.5 shrink-0" title="Sinkronisasi Cloud Aktif">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
        </button>
      ) : (
        <section 
          aria-label="Hitung mundur pendataan" 
          className="inventory-panel relative overflow-hidden w-fit mx-auto bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(37,99,235,0.08)] rounded-2xl p-3 sm:px-6 sm:py-3.5 transition-all duration-300 hover:shadow-md hover:border-blue-300/80"
        >
          {/* Subtle ambient gradient accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 opacity-90" />

          {/* Header Row */}
          <div className="flex items-center justify-between gap-5 sm:gap-8 mb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 leading-tight">Hitung Mundur</h2>
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200"
                    title="Tersinkronisasi otomatis real-time"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span>Cloud Sync</span>
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-500 leading-tight">
                  {finished ? '⚠️ Waktu telah berakhir' : deadline ? 'Sisa waktu pengerjaan real-time' : 'Durasi belum diatur'}
                </p>
                {timerNote && (
                  <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 mt-1 max-w-[260px] truncate" title={timerNote}>
                    📌 {timerNote}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => dialogRef.current?.showModal()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              title="Atur durasi & catatan timer (PIN: 4695)"
            >
              <Timer className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              <span>Atur Timer &amp; Note</span>
            </button>
          </div>

          {/* Digital Counter Blocks */}
          <div role="timer" className="flex items-center justify-center gap-1.5 sm:gap-2.5">
            {countdown.map(([label, value], idx) => (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center justify-center min-w-[54px] sm:min-w-[62px] px-2.5 py-1.5 rounded-xl bg-slate-50/90 border border-slate-200/80 shadow-2xs">
                  <div className="text-lg sm:text-xl font-black tabular-nums tracking-tight bg-gradient-to-br from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                    {String(value).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 -mt-0.5">
                    {label}
                  </div>
                </div>
                {idx < countdown.length - 1 && (
                  <span className="text-slate-300 font-black text-xs select-none">:</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </section>
      )}

      <span className="sr-only" role="status">{finished ? 'Waktu pengerjaan data habis.' : ''}</span>
      <dialog
        ref={dialogRef}
        onClose={lock}
        aria-labelledby="inventory-timer-title"
        className="no-print m-auto w-[min(92vw,26rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-black/45"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 id="inventory-timer-title" className="text-base font-bold text-slate-900">Timer &amp; Note Target</h2>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>Cloud Realtime</span>
            </span>
          </div>
          <button type="button" aria-label="Tutup" onClick={() => dialogRef.current?.close()}
            className="rounded-lg p-1 hover:bg-slate-100 transition text-slate-500 hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Timer dan catatan ini tersimpan di cloud &amp; tersinkronisasi otomatis di semua komputer tim R&amp;D.
        </p>

        {!unlocked ? (
          <form onSubmit={unlock} className="mt-4 space-y-4">
            <label className="block text-sm font-semibold text-slate-800">
              PIN Pengaturan (4695)
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                value={pin}
                placeholder="••••"
                onChange={event => { setPin(event.target.value); setPinError(false); }}
                className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
            {pinError && <p role="alert" className="text-sm text-red-600 font-medium">PIN salah. Masukkan PIN yang benar.</p>}
            <button type="submit" className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-xs">
              Buka Pengaturan
            </button>
          </form>
        ) : (
          <form onSubmit={start} className="mt-4 space-y-4">
            <label className="block text-sm font-semibold text-slate-800">
              Catatan / Note Target Countdown
              <textarea
                rows={2}
                value={noteInput}
                onChange={event => setNoteInput(event.target.value)}
                placeholder="Contoh: Selesaikan target pendataan seluruh rak & box R&D sebelum audit"
                className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-xs sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                Catatan ini akan tampil di banner atas dan tersinkronisasi ke semua komputer tim.
              </span>
            </label>

            <label className="block text-sm font-semibold text-slate-800">
              Durasi Pengerjaan (Hari)
              <input
                type="number"
                min="1"
                max="365"
                step="1"
                required
                value={days}
                onChange={event => setDays(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <div className="space-y-2 pt-1">
              {deadline > 0 && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={saveNoteOnly}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/60 bg-amber-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-amber-900 hover:bg-amber-100 transition disabled:opacity-60 cursor-pointer shadow-xs"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>📌 Simpan Perubahan Note Saja</span>
                </button>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>{deadline ? 'Setel Ulang Durasi & Note' : 'Mulai Hitung Mundur'}</span>
                </button>
                {deadline > 0 && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={reset}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-60 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
