import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  Camera, 
  Sparkles, 
  Copy, 
  Check, 
  Pencil, 
  Trash2, 
  Printer, 
  Calendar, 
  Clock, 
  ChevronDown, 
  Boxes, 
  Zap, 
  Users, 
  Package, 
  Flame, 
  Trophy 
} from 'lucide-react';
import { getItemRecordDate, getLocalTodayIso, formatToDDMMYYYY } from '../utils/dateUtils';
import { CardPrintModal } from './CardPrintModal';
import { TEAM_MEMBERS } from './TargetTeamBanner';

export const MobileQuickEntryView = ({
  onOpenAiScanner,
  onOpen3dView,
  onDirectScanImage,
  onOpenUserProfile,
}) => {
  const {
    items,
    boxes,
    currentUser,
    dailyTarget,
    deleteItem,
    setItemModalConfig,
    setSelectedBoxNumber,
    showNotification,
  } = useInventory();

  // State target box yang sedang aktif diisi (default ke Box #1 atau box terakhir)
  const [activeBoxNumber, setActiveBoxNumber] = useState(() => {
    return Number(localStorage.getItem('gagaclo_mobile_target_box')) || 1;
  });

  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'my'
  const [selectedPrintItem, setSelectedPrintItem] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [isBoxPickerOpen, setIsBoxPickerOpen] = useState(false);
  const [boxRackFilter, setBoxRackFilter] = useState('ALL');

  // Simpan activeBoxNumber ke localStorage saat berubah
  const handleSelectBox = (num) => {
    const boxNum = Number(num);
    setActiveBoxNumber(boxNum);
    localStorage.setItem('gagaclo_mobile_target_box', String(boxNum));
    setIsBoxPickerOpen(false);
  };

  // Detail box yang sedang aktif
  const currentBox = useMemo(() => {
    return boxes.find((b) => Number(b.boxNumber) === activeBoxNumber) || boxes[0] || { boxNumber: activeBoxNumber, rackName: 'RAK 1', picName: 'Royan' };
  }, [boxes, activeBoxNumber]);

  // Sampel di dalam box yang sedang aktif
  const currentBoxItems = useMemo(() => {
    return items.filter((it) => Number(it.boxNumber || it.box_number) === activeBoxNumber && it.status !== 'DELETED');
  }, [items, activeBoxNumber]);

  const currentBoxPcs = useMemo(() => {
    return currentBoxItems.reduce((acc, it) => acc + (Number(it.jumlah || it.qty || it.pcs) || 1), 0);
  }, [currentBoxItems]);

  // Filter sampel yang diinput HARI INI
  const todayIso = getLocalTodayIso();

  const todayItems = useMemo(() => {
    return items
      .filter((it) => {
        if (it.status === 'DELETED') return false;
        const recDate = getItemRecordDate(it);
        return recDate === todayIso;
      })
      .sort((a, b) => {
        // Urutkan dari yang terbaru (newest first)
        const timeA = new Date(a.createdAt || a.created_at || 0).getTime() || 0;
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime() || 0;
        return timeB - timeA;
      });
  }, [items, todayIso]);

  // Total PCS hari ini oleh semua tim
  const todayTotalPcs = useMemo(() => {
    return todayItems.reduce((acc, it) => acc + (Number(it.jumlah || it.qty || it.pcs) || 1), 0);
  }, [todayItems]);

  // Sampel hari ini khusus user yang sedang login
  const currentUserName = currentUser?.name ? String(currentUser.name).trim().toLowerCase() : '';
  const myTodayItems = useMemo(() => {
    if (!currentUserName) return todayItems;
    return todayItems.filter((it) => {
      const penginput = String(it.penginput || it.picName || it.pic || '').trim().toLowerCase();
      return penginput === currentUserName;
    });
  }, [todayItems, currentUserName]);

  const myTodayPcs = useMemo(() => {
    return myTodayItems.reduce((acc, it) => acc + (Number(it.jumlah || it.qty || it.pcs) || 1), 0);
  }, [myTodayItems]);

  // Items to display in feed based on filter
  const displayedItems = filterMode === 'my' ? myTodayItems : todayItems;
  const displayedPcs = filterMode === 'my' ? myTodayPcs : todayTotalPcs;

  // Persentase target tim hari ini
  const targetPcs = Math.max(1, dailyTarget || 400);
  const targetPercent = Math.min(100, Math.round((todayTotalPcs / targetPcs) * 100));

  // Salin kode ke clipboard
  const handleCopyCode = (code, e) => {
    e?.stopPropagation();
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      showNotification(`Kode ${code} disalin ke clipboard!`, 'info', 2000);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {}
  };

  // Hapus item dengan konfirmasi
  const handleDeleteItem = async (item, e) => {
    e?.stopPropagation();
    const name = item.style || item.sampleNo || item.kode || 'item';
    if (window.confirm(`Yakin ingin menghapus sampel "${name}"?`)) {
      await deleteItem(item.id);
      showNotification('Sampel berhasil dihapus.', 'info');
    }
  };

  // Filter 72 box untuk picker
  const filteredBoxes = useMemo(() => {
    if (boxRackFilter === 'ALL') return boxes;
    return boxes.filter((b) => String(b.rackName || '').toUpperCase() === boxRackFilter);
  }, [boxes, boxRackFilter]);

  // Target personal harian untuk seluruh 8 personil tim (5 PIC + 3 Support)
  const allMemberTargets = useMemo(() => {
    const pcsMap = {};
    (TEAM_MEMBERS || []).forEach((m) => {
      pcsMap[m.name] = 0;
    });

    const boxRackMap = {};
    boxes.forEach((b) => {
      boxRackMap[Number(b.boxNumber)] = b;
    });

    items.forEach((item) => {
      const box = boxRackMap[Number(item.boxNumber)];
      const dateKey = item.recordDate || getItemRecordDate(item);
      if (dateKey !== todayIso) return;

      const pcs = Number(item.jumlah) || 0;
      const boxPic = String(item.picName || (box ? box.picName : 'Lainnya')).trim();

      const tags = Array.isArray(item.tags) ? item.tags : [];
      const inputtedByTag = tags.find((t) => typeof t === 'string' && t.startsWith('inputted_by:'));
      const supportTag = tags.find((t) => typeof t === 'string' && (t.startsWith('support:') || t.startsWith('helper:')));

      const rawInputtedBy =
        item.inputtedBy ||
        item.createdBy ||
        (inputtedByTag ? decodeURIComponent(inputtedByTag.slice(12)) : null) ||
        item.supportName ||
        item.helperName ||
        (supportTag ? decodeURIComponent(supportTag.slice(supportTag.indexOf(':') + 1)) : null);

      let contributor = null;
      if (rawInputtedBy) {
        const sStr = String(rawInputtedBy).trim().toLowerCase();
        if (/helper\s*1/i.test(sStr)) contributor = 'Sheva';
        else if (/helper\s*2/i.test(sStr)) contributor = 'Ade';
        else if (/helper\s*3/i.test(sStr)) contributor = 'Tri';
        else {
          const match = (TEAM_MEMBERS || []).find((m) => m.name.toLowerCase() === sStr);
          if (match) contributor = match.name;
        }
      }

      if (!contributor) {
        const matchPic = (TEAM_MEMBERS || []).find((m) => m.name.toLowerCase() === boxPic.toLowerCase());
        contributor = matchPic ? matchPic.name : (boxPic || 'Royan');
      }

      if (contributor && pcsMap[contributor] !== undefined) {
        pcsMap[contributor] += pcs;
      }
    });

    const supportTargetCalc = Math.max(1, Math.round(targetPcs / 8.5));
    const picTargetCalc = Math.max(1, Math.round((targetPcs / 8.5) * 1.1));

    return (TEAM_MEMBERS || []).map((m) => {
      const isPicAsli = m.isPicAsli ?? !m.role?.toLowerCase()?.includes('support');
      const target = isPicAsli ? picTargetCalc : supportTargetCalc;
      const currentPcs = pcsMap[m.name] || 0;
      const isAchieved = currentPcs >= target;
      return {
        name: m.name,
        role: m.role,
        isPicAsli,
        pcs: currentPcs,
        target,
        isAchieved,
        surplus: isAchieved ? currentPcs - target : 0,
        remaining: Math.max(0, target - currentPcs),
        percent: Math.round((currentPcs / target) * 100),
      };
    });
  }, [items, boxes, todayIso, targetPcs]);

  // Target akun yang sedang aktif login
  const myTarget = useMemo(() => {
    if (!currentUserName) return allMemberTargets[0];
    return allMemberTargets.find((m) => m.name.toLowerCase() === currentUserName) || allMemberTargets[0];
  }, [allMemberTargets, currentUserName]);

  // Peringkat 1 / Top Contributor hari ini
  const topContributor = useMemo(() => {
    const sorted = [...allMemberTargets].sort((a, b) => b.pcs - a.pcs);
    return sorted[0]?.pcs > 0 ? sorted[0] : null;
  }, [allMemberTargets]);

  const memberAchievers = useMemo(() => {
    return allMemberTargets.filter((m) => m.isAchieved);
  }, [allMemberTargets]);

  // Statistik okupansi 72 box & total sampel gudang
  const occupiedBoxCount = useMemo(() => {
    const boxSet = new Set();
    items.forEach((it) => {
      if (it.status !== 'DELETED') {
        const num = Number(it.boxNumber || it.box_number);
        if (num) boxSet.add(num);
      }
    });
    return boxSet.size;
  }, [items]);

  const totalAllPcs = useMemo(() => {
    return items.reduce((acc, it) => {
      if (it.status === 'DELETED') return acc;
      return acc + (Number(it.jumlah || it.qty || it.pcs) || 1);
    }, 0);
  }, [items]);

  const totalActiveItemsCount = useMemo(() => {
    return items.filter((it) => it.status !== 'DELETED').length;
  }, [items]);

  return (
    <div className="mobile-quick-entry font-apple space-y-3 pb-20 select-none">
      
      {/* 1. DASHBOARD HEADER - ENERGETIK */}
      <div className="flex items-center justify-between pt-1 pb-0.5">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h1 className="text-xl font-black text-[#111827] tracking-tight flex items-center gap-1.5">
              <span>Misi R&amp;D Hari Ini</span>
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            </h1>
          </div>
          <p className="text-[11px] text-gray-500 font-semibold">Gagaclo Inventory &bull; Target Fisik 72 Box</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-white text-gray-700 border border-black/[0.08] shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-[#0071e3]" />
          <span>{formatToDDMMYYYY(todayIso)}</span>
        </div>
      </div>

      {/* 2. HERO TARGET TIM: 400 PCE GASPOL */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-[#0e1726] to-[#080d17] text-white p-4 border border-emerald-500/30 shadow-lg relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2 relative z-10">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <Flame className="w-3.5 h-3.5 fill-emerald-400" />
            </div>
            <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-300">
              Target Tim: 400 PCE
            </span>
          </div>
          <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border tabular-nums ${
            targetPercent >= 100
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              : 'bg-white/10 text-white border-white/20'
          }`}>
            {targetPercent}% Tercapai
          </span>
        </div>

        <div className="flex items-baseline justify-between relative z-10">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black tabular-nums tracking-tight text-white">
              {todayTotalPcs.toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-slate-300 font-bold">
              / {targetPcs.toLocaleString('id-ID')} PCE
            </span>
          </div>
          <span className="text-[11px] text-emerald-400 font-extrabold flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-emerald-400" />
            <span>{targetRemaining <= 0 ? '✓ Target Tuntas!' : `Sisa ${targetRemaining} PCE`}</span>
          </span>
        </div>

        {/* Chunky Neon Progress Bar */}
        <div className="w-full bg-slate-900/90 rounded-full h-3 overflow-hidden mt-2.5 p-0.5 border border-white/10 relative z-10">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              targetPercent >= 100
                ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_15px_#10b981]'
                : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.6)]'
            }`}
            style={{ width: `${Math.min(100, Math.max(targetPercent, 2))}%` }}
          />
        </div>
      </div>

      {/* 3. MOTOR PENGGERAK UTAMA: SCAN AI (Langsung di Jangkauan Jempol) */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-0.5 shadow-xl shadow-blue-900/30">
        <button
          type="button"
          onClick={() => onOpenAiScanner?.(activeBoxNumber)}
          className="w-full py-3.5 px-4 rounded-[14px] bg-slate-950/20 backdrop-blur-sm hover:bg-slate-950/10 active:scale-[0.98] transition-all flex items-center justify-between text-white cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white text-blue-600 flex items-center justify-center shrink-0 shadow-md">
              <Camera className="w-6 h-6 stroke-[2.3] animate-pulse" />
            </div>
            <div className="text-left">
              <div className="text-[14px] sm:text-base font-black tracking-tight leading-tight flex items-center gap-1.5">
                <span>JEPRET TAG SAMPEL (AI)</span>
                <Sparkles className="w-4 h-4 text-amber-300 animate-bounce shrink-0" />
              </div>
              <div className="text-[10.5px] text-cyan-200 mt-0.5 font-semibold">
                Ekstrak tulisan tangan otomatis &lt; 1.5 detik
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 pl-2">
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/20 border border-white/30 text-white uppercase tracking-wider block">
              BOX #{activeBoxNumber}
            </span>
          </div>
        </button>
      </div>

      {/* 4. BENTO GRID: METRIK PERSONAL, LEADERBOARD & GUDANG */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* Bento 2: Target Akun Anda */}
        <div className="col-span-1 rounded-2xl bg-gradient-to-b from-blue-950/40 to-slate-900/60 p-3.5 border border-blue-500/25 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-blue-400">
                Target Anda
              </span>
              <span className="text-[9px] font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.2 rounded-full">
                {myTarget?.role || 'PPIC'}
              </span>
            </div>
            <div className="text-sm font-black text-white truncate mt-1">
              {myTarget?.name || currentUser?.name || 'Personal'}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black tabular-nums text-white">
                {myTarget?.pcs || 0}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                / {myTarget?.target || 52} PCE
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/10">
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  myTarget?.isAchieved ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(myTarget?.percent || 0, 3))}%` }}
              />
            </div>
            <span className="text-[9.5px] font-bold text-slate-300 mt-1 block truncate">
              {myTarget?.isAchieved ? '🔥 Target tercapai mantap!' : `Sisa ${myTarget?.remaining || 0} PCE lagi!`}
            </span>
          </div>
        </div>

        {/* Bento 3: Top Input Hari Ini */}
        <div className="col-span-1 rounded-2xl bg-gradient-to-b from-amber-950/30 to-slate-900/60 p-3.5 border border-amber-500/25 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-400">
                Top Input
              </span>
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-sm font-black text-white truncate mt-1 flex items-center gap-1">
              <span>👑</span>
              <span className="truncate">{topContributor ? topContributor.name : 'Belum Ada'}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black tabular-nums text-white">
                {topContributor ? topContributor.pcs : 0}
              </span>
              <span className="text-[10px] text-amber-400 font-semibold">PCE</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/10 text-[9.5px] font-bold text-amber-300 truncate">
            {topContributor && topContributor.pcs > 0 ? `${topContributor.percent}% capaian juara!` : 'Ayo pimpin nomor 1!'}
          </div>
        </div>

        {/* Bento 4: Total Sampel Gudang */}
        <div className="col-span-1 rounded-2xl bg-white p-3 border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">Total Sampel</span>
              <Package className="w-3.5 h-3.5 text-[#0071e3]" />
            </div>
            <div className="text-base font-black tabular-nums text-[#111827] mt-1">
              {totalAllPcs.toLocaleString('id-ID')} <span className="text-[9px] font-semibold text-gray-400">PCE</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-black/[0.04] text-[9px] font-medium text-gray-500 truncate">
            {totalActiveItemsCount.toLocaleString('id-ID')} item terdata
          </div>
        </div>

        {/* Bento 5: Okupansi Box */}
        <div className="col-span-1 rounded-2xl bg-white p-3 border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">Okupansi Box</span>
              <Boxes className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-base font-black tabular-nums text-[#111827] mt-1">
              {occupiedBoxCount} <span className="text-[9px] font-semibold text-gray-400">/ 72 Box</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-black/[0.04] text-[9px] font-medium text-gray-500 truncate">
            {Math.round((occupiedBoxCount / 72) * 100)}% kapasitas terisi
          </div>
        </div>

        {/* Bento 6: Target 8 Personel */}
        <div className="col-span-2 rounded-2xl bg-white p-3 border border-black/[0.08] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-600">
                Arena Target PIC &amp; Support
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {memberAchievers.length}/8 Tercapai
            </span>
          </div>

          {/* 4 Kolom Tile PIC */}
          <div className="grid grid-cols-4 gap-1.5">
            {allMemberTargets.map((m) => {
              const isCurrent = currentUser?.name?.toLowerCase() === m.name.toLowerCase();
              return (
                <div
                  key={m.name}
                  className={`p-1.5 rounded-xl border text-center transition ${
                    isCurrent
                      ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-2xs ring-1 ring-blue-300'
                      : m.isAchieved
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-black/[0.02] border-black/[0.06] text-[#374151]'
                  }`}
                >
                  <div className="text-[10px] font-bold truncate">{m.name}</div>
                  <div className="text-[10px] tabular-nums font-black mt-0.5">
                    {m.pcs}<span className="text-[8px] font-normal text-gray-400">/{m.target}</span>
                  </div>
                  <div className="w-full bg-black/[0.08] rounded-full h-1 mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.isAchieved ? 'bg-emerald-500' : isCurrent ? 'bg-blue-600' : 'bg-gray-400'}`}
                      style={{ width: `${Math.min(100, m.percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 5. TARGET BOX SELECTOR (Pilih Box yang Sedang Diisi) */}
      <div className="bg-white rounded-2xl border border-black/[0.08] p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#86868b]">
            Target Box Pengisian
          </span>
          <button
            type="button"
            onClick={() => setIsBoxPickerOpen((p) => !p)}
            className="text-[11px] font-bold text-[#0071e3] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>{isBoxPickerOpen ? 'Tutup Pilihan' : 'Ganti Box'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isBoxPickerOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Box Card Info */}
        <div className="flex items-center justify-between bg-black/[0.03] border border-black/[0.06] rounded-xl p-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0071e3]/10 text-[#0071e3] font-bold text-sm shrink-0 border border-[#0071e3]/20 shadow-2xs">
              #{activeBoxNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1d1d1f]">
                  BOX #{activeBoxNumber}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-white border border-black/[0.08] text-[#86868b]">
                  {currentBox.rackName || 'RAK 1'}
                </span>
              </div>
              <p className="text-[11px] text-[#86868b] mt-0.5">
                PIC: <strong>@{currentBox.picName || 'Royan'}</strong> &bull; {currentBoxItems.length} item ({currentBoxPcs} PCE)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedBoxNumber(activeBoxNumber)}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-black/[0.04] border border-black/[0.08] text-[11px] font-semibold text-[#1d1d1f] shadow-2xs transition cursor-pointer shrink-0"
          >
            Lihat Box
          </button>
        </div>

        {/* Accordion Box Picker (Jika Dibuka) */}
        {isBoxPickerOpen && (
          <div className="pt-2 border-t border-black/[0.06] space-y-2 animate-in fade-in duration-150">
            {/* Filter Rak */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              {['ALL', 'RAK 1', 'RAK 2', 'RAK 3', 'RAK 4', 'RAK 5'].map((rk) => (
                <button
                  key={rk}
                  type="button"
                  onClick={() => setBoxRackFilter(rk)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                    boxRackFilter === rk
                      ? 'bg-[#1d1d1f] text-white shadow-2xs'
                      : 'bg-black/[0.04] text-[#86868b] hover:bg-black/[0.08]'
                  }`}
                >
                  {rk === 'ALL' ? 'Semua Rak' : rk}
                </button>
              ))}
            </div>

            {/* Grid 72 Box (Scrollable) */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1 bg-black/[0.02] rounded-xl border border-black/[0.04]">
              {filteredBoxes.map((b) => {
                const bNum = Number(b.boxNumber);
                const isSelected = bNum === activeBoxNumber;
                return (
                  <button
                    key={bNum}
                    type="button"
                    onClick={() => handleSelectBox(bNum)}
                    className={`p-1.5 rounded-lg text-center transition cursor-pointer border ${
                      isSelected
                        ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs font-bold'
                        : 'bg-white hover:bg-black/[0.04] text-[#1d1d1f] border-black/[0.06]'
                    }`}
                  >
                    <div className="text-[11px] font-mono leading-tight">#{bNum}</div>
                    <div className={`text-[8px] truncate ${isSelected ? 'text-white/80' : 'text-[#86868b]'}`}>
                      {b.picName || 'PIC'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. FEED: DAFTAR SAMPEL BARU DIMASUKKAN HARI INI (Hanya Tampil Jika Ada Item Hari Ini) */}
      {displayedItems.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#1d1d1f] flex items-center gap-1.5">
                <span>Sampel Masuk Hari Ini</span>
                <span className="text-[10px] font-bold bg-[#0071e3]/10 text-[#0071e3] px-2 py-0.2 rounded-full tabular-nums">
                  {displayedItems.length} Item &bull; {displayedPcs} PCE
                </span>
              </h3>
              <p className="text-[10px] text-[#86868b] mt-0.5">
                Riwayat pendataan real-time hari ini ({formatToDDMMYYYY(todayIso)})
              </p>
            </div>

            {/* Filter Pill: Semua vs Saya */}
            <div className="flex items-center p-0.5 bg-black/[0.04] rounded-full border border-black/[0.06] shrink-0">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white text-[#1d1d1f] shadow-2xs font-bold'
                    : 'text-[#86868b]'
                }`}
              >
                Semua ({todayItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('my')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                  filterMode === 'my'
                    ? 'bg-white text-[#1d1d1f] shadow-2xs font-bold'
                    : 'text-[#86868b]'
                }`}
              >
                Saya ({myTodayItems.length})
              </button>
            </div>
          </div>

          {/* List of Cards */}
          <div className="space-y-2">
            {displayedItems.map((item) => {
              const qty = Number(item.jumlah || item.qty || item.pcs) || 1;
              const isDispatched = item.status === 'Dispatched' || item.status === 'Terkirim';
              const isBorrowed = item.status === 'Borrowed' || item.status === 'Dipinjam';

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-black/[0.08] p-3 shadow-xs space-y-2 hover:border-[#0071e3]/30 transition"
                >
                  {/* Row 1: Box Badge, Code & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {/* Box Number Pill */}
                      <button
                        type="button"
                        onClick={() => setSelectedBoxNumber(Number(item.boxNumber || item.box_number))}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0071e3]/10 text-[#0071e3] text-[10px] font-extrabold border border-[#0071e3]/20 hover:bg-[#0071e3] hover:text-white transition cursor-pointer"
                        title="Klik untuk membuka box ini"
                      >
                        <Boxes className="w-3 h-3" />
                        <span>BOX #{item.boxNumber || item.box_number || 1}</span>
                      </button>

                      {/* Unique Code Pill with 1-tap Copy */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(item.kode || item.sku, e)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/[0.04] hover:bg-black/[0.08] text-[#1d1d1f] text-[10px] font-mono font-bold border border-black/[0.08] transition cursor-pointer"
                        title="Salin kode sampel"
                      >
                        {copiedCode === (item.kode || item.sku) ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#86868b]" />
                        )}
                        <span>{item.kode || item.sku || '-'}</span>
                      </button>

                      {/* Jenis Sample Pill */}
                      {item.jenisSample && item.jenisSample !== 'NA' && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20">
                          {item.jenisSample}
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                      isDispatched
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : isBorrowed
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                      {isDispatched ? 'Terkirim' : isBorrowed ? 'Dipinjam' : 'Dalam Box'}
                    </span>
                  </div>

                  {/* Row 2: Style & Sample No */}
                  <div>
                    <h4 className="text-xs font-bold text-[#1d1d1f] leading-snug">
                      {item.style || item.name || 'Sample Garmen Tanpa Nama'}
                    </h4>
                    {item.sampleNo && item.sampleNo !== 'NA' && (
                      <p className="text-[11px] font-medium text-[#86868b] mt-0.5">
                        Artikel: <strong className="text-[#1d1d1f]">{item.sampleNo}</strong>
                      </p>
                    )}
                  </div>

                  {/* Row 3: Detail Chips (Size, Color, Qty, Buyer) */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-[#86868b] pt-0.5">
                    {item.size && item.size !== 'NA' && (
                      <span className="bg-black/[0.03] px-2 py-0.5 rounded border border-black/[0.06] font-medium text-[#1d1d1f]">
                        Size: <strong>{item.size}</strong>
                      </span>
                    )}
                    {item.color && item.color !== 'NA' && (
                      <span className="bg-black/[0.03] px-2 py-0.5 rounded border border-black/[0.06] font-medium text-[#1d1d1f]">
                        Warna: <strong>{item.color}</strong>
                      </span>
                    )}
                    <span className="bg-[#0071e3]/10 text-[#0071e3] px-2 py-0.5 rounded font-bold">
                      {qty} PCE
                    </span>
                    {item.buyerNo && item.buyerNo !== 'NA' && (
                      <span className="text-[#86868b]">
                        &bull; Buyer: {item.buyerNo}
                      </span>
                    )}
                  </div>

                  {/* Row 4: Penginput info & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-black/[0.04] text-[10px] text-[#86868b]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#86868b]" />
                      <span>{item.penginput || item.picName || 'Tim'} &bull; Hari ini</span>
                    </div>

                    {/* Action Buttons: Edit, Print, Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPrintItem(item)}
                        className="p-1.5 rounded-lg text-[#86868b] hover:text-[#0071e3] hover:bg-black/[0.04] transition cursor-pointer"
                        title="Cetak KTP Sampel"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setItemModalConfig({
                            isOpen: true,
                            item,
                            targetBoxNumber: Number(item.boxNumber || item.box_number || 1),
                          });
                        }}
                        className="p-1.5 rounded-lg text-[#86868b] hover:text-[#0071e3] hover:bg-black/[0.04] transition cursor-pointer"
                        title="Edit rincian sampel"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item, e)}
                        className="p-1.5 rounded-lg text-[#86868b] hover:text-[#ff3b30] hover:bg-red-50 transition cursor-pointer"
                        title="Hapus sampel ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Cetak KTP Sampel (Jika Dipilih) */}
      {selectedPrintItem && (
        <CardPrintModal
          itemsToPrint={[selectedPrintItem]}
          onClose={() => setSelectedPrintItem(null)}
        />
      )}

    </div>
  );
};
