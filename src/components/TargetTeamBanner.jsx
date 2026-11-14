import React, { useState, useEffect, useMemo } from 'react';
import { Target, Edit2, Check, X, ArrowUpRight, Sparkles } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { getItemRecordDate, getLocalTodayIso } from '../utils/dateUtils';
import { isManager, isSuperuser } from '../utils/authUtils';

// 8 Anggota Tim Resmi
const TEAM_MEMBERS = [
  { name: 'Royan', role: 'PPIC #1' },
  { name: 'Cynara', role: 'PPIC #2' },
  { name: 'Ami', role: 'PPIC #3' },
  { name: 'Ryan', role: 'PPIC #4' },
  { name: 'Hanami', role: 'PPIC #5' },
  { name: 'Sheva', role: 'Support #1' },
  { name: 'Ade', role: 'Support #2' },
  { name: 'Tri', role: 'Support #3' },
];

export function TargetTeamBanner({ onOpenRekap }) {
  const {
    items = [],
    boxes = [],
    currentUser,
    showNotification,
    isDemoAllAchievedActive,
    applyAllMembersAchievedDemo,
    revertAllMembersAchievedDemo,
  } = useInventory();
  const isMgr = isManager(currentUser) || isSuperuser(currentUser);

  // Target Harian Tim (disimpan di localStorage agar persisten)
  const [dailyTarget, setDailyTarget] = useState(() => {
    try {
      const saved = localStorage.getItem('gagaclo_daily_target_pcs');
      return saved ? Math.max(1, Number(saved)) : 150;
    } catch {
      return 150;
    }
  });

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(dailyTarget.toString());

  // Dengarkan perubahan target dari komponen lain
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('gagaclo_daily_target_pcs');
        if (saved) setDailyTarget(Math.max(1, Number(saved)));
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('gagaclo_target_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gagaclo_target_updated', handleStorageChange);
    };
  }, []);

  const handleSaveTarget = (e) => {
    e?.preventDefault?.();
    const num = Math.max(1, parseInt(tempTarget, 10) || 150);
    setDailyTarget(num);
    try {
      localStorage.setItem('gagaclo_daily_target_pcs', num.toString());
      window.dispatchEvent(new Event('gagaclo_target_updated'));
    } catch {}
    setIsEditingTarget(false);
    if (showNotification) {
      showNotification(`Target team berhasil disetel ke ${num} PCS oleh ${currentUser?.name || 'Manager'}.`, 'success', 3000);
    }
  };

  // Hitung total PCS dan jumlah sampel yang di-input hari ini
  const todayIso = getLocalTodayIso();
  const todayStats = useMemo(() => {
    let sum = 0;
    let sampleCount = 0;
    items.forEach((item) => {
      const dateKey = item.recordDate || getItemRecordDate(item);
      if (dateKey === todayIso) {
        sum += Number(item.jumlah) || 0;
        sampleCount += 1;
      }
    });
    return { pcs: sum, samples: sampleCount };
  }, [items, todayIso]);

  const isAchieved = todayStats.pcs >= dailyTarget;
  const percent = Math.round((todayStats.pcs / dailyTarget) * 100);
  const remaining = Math.max(0, dailyTarget - todayStats.pcs);

  // Map box ke PIC untuk deteksi penginput
  const boxRackMap = useMemo(() => {
    const map = {};
    boxes.forEach((b) => {
      map[b.boxNumber] = b;
    });
    return map;
  }, [boxes]);

  // Deteksi personil yang telah berhasil mencapai target harian individu hari ini
  const memberAchievers = useMemo(() => {
    let savedTargets = {};
    try {
      const saved = localStorage.getItem('gagaclo_individual_targets');
      if (saved) savedTargets = JSON.parse(saved);
    } catch {}

    const pcsMap = {};
    TEAM_MEMBERS.forEach((m) => {
      pcsMap[m.name] = 0;
    });

    items.forEach((item) => {
      const box = boxRackMap[Number(item.boxNumber)];
      const dateKey = item.recordDate || getItemRecordDate(item);
      if (dateKey !== todayIso) return;

      const pcs = Number(item.jumlah) || 0;
      const boxPic = String(item.picName || (box ? box.picName : 'Lainnya')).trim();

      // Deteksi penginput riil (Support vs PPIC)
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const supportTag = tags.find((t) => typeof t === 'string' && (t.startsWith('support:') || t.startsWith('helper:')));
      const inputtedByTag = tags.find((t) => typeof t === 'string' && t.startsWith('inputted_by:'));
      const rawSupport =
        item.supportName ||
        item.helperName ||
        (supportTag ? decodeURIComponent(supportTag.slice(supportTag.indexOf(':') + 1)) : null) ||
        (inputtedByTag ? decodeURIComponent(inputtedByTag.slice(12)) : null) ||
        (item.inputtedBy && ['sheva', 'ade', 'tri', 'helper 1', 'helper 2', 'helper 3'].some((n) => String(item.inputtedBy).toLowerCase().includes(n))
          ? item.inputtedBy
          : null) ||
        (item.createdBy && ['sheva', 'ade', 'tri', 'helper 1', 'helper 2', 'helper 3'].some((n) => String(item.createdBy).toLowerCase().includes(n))
          ? item.createdBy
          : null);

      let resolvedSupport = null;
      if (rawSupport) {
        const sStr = String(rawSupport).trim();
        if (/helper\s*1/i.test(sStr)) resolvedSupport = 'Sheva';
        else if (/helper\s*2/i.test(sStr)) resolvedSupport = 'Ade';
        else if (/helper\s*3/i.test(sStr)) resolvedSupport = 'Tri';
        else {
          const match = ['Sheva', 'Ade', 'Tri'].find((s) => s.toLowerCase() === sStr.toLowerCase());
          if (match) resolvedSupport = match;
        }
      }

      let contributor = null;
      if (resolvedSupport) {
        contributor = resolvedSupport;
      } else {
        const inputByStr = String(item.inputtedBy || item.createdBy || '').trim().toLowerCase();
        const foundMember = TEAM_MEMBERS.find((m) => m.name.toLowerCase() === inputByStr);
        if (foundMember) {
          contributor = foundMember.name;
        } else {
          const matchPic = TEAM_MEMBERS.find((m) => m.name.toLowerCase() === boxPic.toLowerCase());
          if (matchPic) contributor = matchPic.name;
        }
      }

      if (contributor && pcsMap[contributor] !== undefined) {
        pcsMap[contributor] += pcs;
      }
    });

    const achievers = [];
    TEAM_MEMBERS.forEach((m) => {
      const target = Number(savedTargets[m.name]) > 0 ? Number(savedTargets[m.name]) : 20;
      const currentPcs = pcsMap[m.name] || 0;
      if (currentPcs >= target) {
        achievers.push({
          name: m.name,
          role: m.role,
          pcs: currentPcs,
          target,
          surplus: currentPcs - target,
        });
      }
    });

    return achievers;
  }, [items, boxRackMap, todayIso]);

  // Web Notification & In-App Notification saat ada orang yang capai target
  useEffect(() => {
    if (memberAchievers.length === 0) return;

    const storageKey = `gagaclo_notified_target_${todayIso}`;
    let notifiedList = [];
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) notifiedList = JSON.parse(stored);
    } catch {}

    const newAchievers = memberAchievers.filter((a) => !notifiedList.includes(a.name));

    if (newAchievers.length > 0) {
      const updatedList = [...notifiedList, ...newAchievers.map((a) => a.name)];
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(updatedList));
      } catch {}

      newAchievers.forEach((achiever) => {
        // 1. In-App Floating Toast Notification
        if (showNotification) {
          showNotification(
            `Target tercapai: ${achiever.name} (${achiever.role}) berhasil menyelesaikan input harian ${achiever.pcs}/${achiever.target} PCS.`,
            'target',
            5000
          );
        }

        // 2. Full-Page Flare Perayaan Layar Penuh
        try {
          window.dispatchEvent(
            new CustomEvent('gagaclo_trigger_celebration_flare', { detail: achiever })
          );
        } catch {}

        // 3. Browser Desktop Notification (jika diizinkan)
        try {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(`Target Tercapai: ${achiever.name}`, {
                body: `${achiever.name} (${achiever.role}) telah menyelesaikan target input harian ${achiever.pcs}/${achiever.target} PCS.`,
                icon: '/favicon.ico',
              });
            } else if (Notification.permission === 'default') {
              Notification.requestPermission();
            }
          }
        } catch {}
      });
    }
  }, [memberAchievers, todayIso, showNotification]);

  return (
    <section
      aria-label="Target Team Inventory R&D"
      className="w-full bg-slate-900 text-slate-100 border-b border-slate-800 px-3 sm:px-5 lg:px-6 py-2 shadow-xs no-print transition-all"
    >
      <div className="max-w-[1560px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
        {/* Kolom Kiri: Label Target Harian & Angka Real-Time (Hierarki Tipografi Jelas) */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/90 border border-slate-700/80 text-slate-300 shadow-2xs">
            <Target className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              TARGET HARI INI
            </span>
          </div>

          {/* Edit Form (untuk Manager) vs Tampilan Angka */}
          {isEditingTarget ? (
            <form onSubmit={handleSaveTarget} className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-md border border-slate-700">
              <span className="text-xs font-bold text-slate-400">Target:</span>
              <input
                type="number"
                min="1"
                max="10000"
                autoFocus
                value={tempTarget}
                onChange={(e) => setTempTarget(e.target.value)}
                className="w-20 px-2 py-0.5 bg-slate-900 border border-slate-600 text-white font-mono font-bold text-xs rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <span className="text-xs font-bold text-slate-400">PCS</span>
              <button
                type="submit"
                className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition"
                title="Simpan Target"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTarget(false)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer transition"
                title="Batal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-baseline gap-1">
                {/* Angka Capaian Utama: Lebih Menonjol & Kontras */}
                <span className="text-lg sm:text-xl font-black text-white font-mono tabular-nums tracking-tight">
                  {todayStats.pcs.toLocaleString('id-ID')}
                </span>
                {/* Target Total: Kontras Terang Slate-300 */}
                <span className="text-xs sm:text-sm font-semibold text-slate-300 font-mono">
                  / {dailyTarget.toLocaleString('id-ID')} PCS
                </span>
              </div>

              {/* Persentase Capaian */}
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md border font-mono ${
                  isAchieved
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                    : 'bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                {percent}%
              </span>

              {isMgr && (
                <button
                  type="button"
                  onClick={() => {
                    setTempTarget(dailyTarget.toString());
                    setIsEditingTarget(true);
                  }}
                  className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
                  title="Ubah Target Harian"
                >
                  <Edit2 className="w-3 h-3 text-slate-400" />
                  <span>Ubah</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Kolom Tengah: Progress Bar Terintegrasi Rapi dengan Sisa Target */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-[180px] max-w-full md:max-w-md lg:max-w-lg">
          <div className="flex-1 bg-slate-950/90 rounded-full h-2.5 sm:h-3 overflow-hidden border border-slate-700/80 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isAchieved ? 'bg-emerald-400 shadow-xs shadow-emerald-500/50' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
          <div className="text-xs font-medium text-slate-300 shrink-0 whitespace-nowrap">
            {isAchieved ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Target Tercapai
              </span>
            ) : (
              <span>Sisa <strong className="text-white font-mono font-bold">{remaining.toLocaleString('id-ID')}</strong> PCS</span>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Status Capaian Personil & Tombol Rekap Harian */}
        <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
          {memberAchievers.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {memberAchievers.map((achiever) => (
                <button
                  type="button"
                  key={achiever.name}
                  onClick={() => {
                    try {
                      window.dispatchEvent(
                        new CustomEvent('gagaclo_trigger_celebration_flare', { detail: achiever })
                      );
                    } catch {}
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/60 hover:border-emerald-500 text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                  title={`Lihat selebrasi capaian target ${achiever.name} (${achiever.pcs} PCS)`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{achiever.name} tercapai</span>
                  <span className="text-emerald-400 font-mono font-bold">· {achiever.pcs} PCS</span>
                </button>
              ))}
            </div>
          )}

          {/* Tombol Contoh Semua Capai Target */}
          <button
            type="button"
            onClick={isDemoAllAchievedActive ? revertAllMembersAchievedDemo : applyAllMembersAchievedDemo}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all shadow-2xs cursor-pointer active:scale-95 ${
              isDemoAllAchievedActive
                ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-600/60 text-amber-300'
                : 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-600/60 text-emerald-300'
            }`}
            title={isDemoAllAchievedActive ? 'Klik untuk kembalikan data asli' : 'Klik untuk contoh saat semua 8 akun mencapai target hari ini'}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{isDemoAllAchievedActive ? 'Reset Contoh' : 'Contoh: Semua Capai Target'}</span>
            <span className="sm:hidden">{isDemoAllAchievedActive ? 'Reset' : 'Contoh'}</span>
          </button>

          {onOpenRekap && (
            <button
              type="button"
              onClick={onOpenRekap}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Buka rincian Rekap Harian tim"
            >
              <span>Rekap Harian</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
