import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  Camera, 
  Copy, 
  Check, 
  Pencil, 
  Trash2, 
  Printer, 
  Calendar, 
  Clock, 
  ChevronDown, 
  Boxes, 
  Package, 
  Users,
  LayoutDashboard,
  ScanLine,
  ArrowRight,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { getItemRecordDate, getLocalTodayIso, formatToDDMMYYYY } from '../utils/dateUtils';
import { CardPrintModal } from './CardPrintModal';
import { TEAM_MEMBERS } from './TargetTeamBanner';

export const MobileQuickEntryView = ({
  onOpenAiScanner,
  onOpen3dView,
  onDirectScanImage,
  onOpenUserProfile,
  onOpenRekap,
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

  // Tab terpisah: 'dashboard' (Monitoring target & rekap) vs 'input' (Input sampel & kamera)
  const [activeTab, setActiveTab] = useState('dashboard');

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

  const todayIso = useMemo(() => getLocalTodayIso(), []);

  // Filter item yang dicatat hari ini
  const todayItems = useMemo(() => {
    return items.filter((it) => {
      if (it.status === 'DELETED') return false;
      const recordDate = it.recordDate || getItemRecordDate(it);
      return recordDate === todayIso;
    });
  }, [items, todayIso]);

  // Info box aktif
  const currentBox = useMemo(() => {
    return boxes.find((b) => Number(b.boxNumber) === activeBoxNumber) || {
      boxNumber: activeBoxNumber,
      rackName: 'RAK 1',
      picName: 'Royan',
    };
  }, [boxes, activeBoxNumber]);

  // Item yang sudah ada di box aktif
  const currentBoxItems = useMemo(() => {
    return items.filter((it) => Number(it.boxNumber) === activeBoxNumber && it.status !== 'DELETED');
  }, [items, activeBoxNumber]);

  const currentBoxPcs = useMemo(() => {
    return currentBoxItems.reduce((acc, it) => acc + (Number(it.jumlah || it.qty || it.pcs) || 1), 0);
  }, [currentBoxItems]);

  // Total PCS hari ini oleh semua tim
  const todayTotalPcs = useMemo(() => {
    return todayItems.reduce((acc, it) => acc + (Number(it.jumlah || it.qty || it.pcs) || 1), 0);
  }, [todayItems]);

  const currentUserName = currentUser?.name?.toLowerCase();

  // Item hari ini oleh user yang sedang aktif
  const myTodayItems = useMemo(() => {
    if (!currentUserName) return [];
    return todayItems.filter((it) => {
      const inputted = (it.inputtedBy || it.createdBy || '').toLowerCase();
      const pic = (it.picName || '').toLowerCase();
      return inputted === currentUserName || pic === currentUserName;
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
  const targetRemaining = Math.max(0, targetPcs - todayTotalPcs);

  // Salin kode ke clipboard
  const handleCopyCode = (code, e) => {
    e?.stopPropagation();
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1800);
      showNotification?.(`Kode ${code} berhasil disalin!`, 'success');
    } catch {
      showNotification?.('Gagal menyalin kode.', 'error');
    }
  };

  // Filter daftar 72 box berdasarkan rak
  const filteredBoxes = useMemo(() => {
    if (boxRackFilter === 'ALL') return boxes;
    return boxes.filter((b) => b.rackName === boxRackFilter);
  }, [boxes, boxRackFilter]);

  // Statistik Target Personal per PIC & Helper
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
    <div className="mobile-quick-entry font-apple space-y-3.5 pb-20 select-none">
      
      {/* 1. SEGMENTED TAB SWITCHER (Apple / Linear Elegance) */}
      <div className="flex p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-semibold select-none">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 min-h-[42px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
            activeTab === 'dashboard'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('input')}
          className={`flex-1 min-h-[42px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
            activeTab === 'input'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ScanLine className="w-4 h-4" />
          <span>Input Sampel</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DASHBOARD MONITORING & REKAP (Bersih, Elegan, Tenang) */}
      {/* ========================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          
          {/* Header Dashboard */}
          <div className="flex items-center justify-between pt-0.5 px-0.5">
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Ringkasan Operasional</h1>
              <p className="text-[11px] text-slate-500 font-normal">Monitoring progres target tim R&amp;D</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white text-slate-600 border border-slate-200 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatToDDMMYYYY(todayIso)}</span>
            </div>
          </div>

          {/* Hero Target Tim Harian (Elegan & Terukur) */}
          <div className="rounded-2xl bg-slate-900 text-white p-4 border border-slate-800 shadow-sm relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Target Harian Tim
                </span>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border tabular-nums ${
                targetPercent >= 100
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {targetPercent}% Tercapai
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums tracking-tight text-white">
                  {todayTotalPcs.toLocaleString('id-ID')}
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  / {targetPcs.toLocaleString('id-ID')} PCE
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {targetRemaining <= 0 ? 'Target selesai' : `Sisa ${targetRemaining} PCE`}
              </span>
            </div>

            {/* Progress Bar Ramping & Presisi */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-3 border border-slate-700/50">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  targetPercent >= 100 ? 'bg-emerald-400' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, targetPercent)}%` }}
              />
            </div>
          </div>

          {/* 2-Kolom Grid Metrik Ramping */}
          <div className="grid grid-cols-2 gap-2.5">
            
            {/* Target Personal */}
            <div className="col-span-1 rounded-2xl bg-white p-3.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Target Anda</span>
                  <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-full border border-blue-100">
                    {myTarget?.role || 'PPIC'}
                  </span>
                </div>
                <div className="text-[13px] font-bold text-slate-800 truncate mt-1">
                  {myTarget?.name || currentUser?.name || 'Personal'}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-bold tabular-nums text-slate-900">
                    {myTarget?.pcs || 0}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    / {myTarget?.target || 52} PCE
                  </span>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100">
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      myTarget?.isAchieved ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, myTarget?.percent || 0)}%` }}
                  />
                </div>
                <span className="text-[9.5px] font-medium text-slate-500 mt-1 block truncate">
                  {myTarget?.isAchieved ? 'Target tercapai' : `Sisa ${myTarget?.remaining || 0} PCE`}
                </span>
              </div>
            </div>

            {/* Kontributor Utama */}
            <div className="col-span-1 rounded-2xl bg-white p-3.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Kontributor Utama</span>
                  <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-[13px] font-bold text-slate-800 truncate mt-1">
                  {topContributor ? topContributor.name : 'Belum Ada'}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-bold tabular-nums text-slate-900">
                    {topContributor ? topContributor.pcs : 0}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">PCE</span>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 text-[9.5px] font-medium text-slate-500 truncate">
                {topContributor && topContributor.pcs > 0 ? `${topContributor.percent}% dari target` : 'Input hari ini'}
              </div>
            </div>

            {/* Total Sampel Gudang */}
            <div className="col-span-1 rounded-2xl bg-white p-3.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Total Sampel</span>
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-base font-bold tabular-nums text-slate-900 mt-1">
                  {totalAllPcs.toLocaleString('id-ID')} <span className="text-[10px] font-normal text-slate-400">PCE</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[9.5px] font-medium text-slate-500 truncate">
                {totalActiveItemsCount.toLocaleString('id-ID')} item terdata
              </div>
            </div>

            {/* Okupansi Box */}
            <div className="col-span-1 rounded-2xl bg-white p-3.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Okupansi Box</span>
                  <Boxes className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-base font-bold tabular-nums text-slate-900 mt-1">
                  {occupiedBoxCount} <span className="text-[10px] font-normal text-slate-400">/ 72 Box</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[9.5px] font-medium text-slate-500 truncate">
                {Math.round((occupiedBoxCount / 72) * 100)}% kapasitas terisi
              </div>
            </div>

            {/* Target 8 Personel */}
            <div className="col-span-2 rounded-2xl bg-white p-3.5 border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Target PIC &amp; Support
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
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
                      className={`p-2 rounded-xl border text-center transition ${
                        isCurrent
                          ? 'bg-blue-50/60 border-blue-200 text-blue-900 font-bold'
                          : m.isAchieved
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 font-semibold'
                          : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="text-[10.5px] truncate">{m.name}</div>
                      <div className="text-[10px] tabular-nums mt-0.5">
                        {m.pcs}<span className="text-[8px] text-slate-400">/{m.target}</span>
                      </div>
                      <div className="w-full bg-slate-200/60 rounded-full h-1 mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${m.isAchieved ? 'bg-emerald-500' : isCurrent ? 'bg-blue-600' : 'bg-slate-400'}`}
                          style={{ width: `${Math.min(100, m.percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: INPUT SAMPEL (Stasiun Kerja Cepat, Fokus Kamera & Box) */}
      {/* ========================================================= */}
      {activeTab === 'input' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          
          {/* Target Box Selector */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Target Box Pengisian
              </span>
              <button
                type="button"
                onClick={() => setIsBoxPickerOpen((p) => !p)}
                className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>{isBoxPickerOpen ? 'Tutup Pilihan' : 'Ganti Box'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isBoxPickerOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Box Card Info */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-sm shrink-0 border border-blue-100">
                  #{activeBoxNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      BOX #{activeBoxNumber}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-white border border-slate-200 text-slate-500">
                      {currentBox.rackName || 'RAK 1'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    PIC: <strong>@{currentBox.picName || 'Royan'}</strong> &bull; {currentBoxItems.length} item ({currentBoxPcs} PCE)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBoxNumber(activeBoxNumber)}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-2xs transition cursor-pointer shrink-0"
              >
                Lihat Box
              </button>
            </div>

            {/* Accordion Box Picker */}
            {isBoxPickerOpen && (
              <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                  {['ALL', 'RAK 1', 'RAK 2', 'RAK 3', 'RAK 4', 'RAK 5'].map((rk) => (
                    <button
                      key={rk}
                      type="button"
                      onClick={() => setBoxRackFilter(rk)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition cursor-pointer ${
                        boxRackFilter === rk
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {rk === 'ALL' ? 'Semua Rak' : rk}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1 bg-slate-50/60 rounded-xl border border-slate-100">
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
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80'
                        }`}
                      >
                        <div className="text-[11px] font-mono leading-tight">#{bNum}</div>
                        <div className={`text-[8px] truncate ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {b.picName || 'PIC'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Kartu Tombol Utama: Formulir Utama Input Sampel */}
          <div className="rounded-2xl bg-blue-600 text-white p-4 shadow-sm border border-blue-500">
            <button
              type="button"
              onClick={() => {
                setItemModalConfig({
                  isOpen: true,
                  item: null,
                  targetBoxNumber: activeBoxNumber,
                });
              }}
              className="w-full flex items-center justify-between text-left cursor-pointer active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold tracking-tight leading-tight">
                    Formulir Utama Input Sampel
                  </div>
                  <div className="text-[11px] text-blue-100 mt-0.5 font-normal">
                    Langsung buka formulir input untuk Box #{activeBoxNumber}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white shrink-0 border border-white/25">
                BOX #{activeBoxNumber}
              </span>
            </button>
          </div>

          {/* Feed: Daftar Sampel Hari Ini */}
          {displayedItems.length > 0 ? (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Sampel Masuk Hari Ini</span>
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.2 rounded-full border border-blue-100 tabular-nums">
                      {displayedItems.length} Item &bull; {displayedPcs} PCE
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Riwayat pendataan ({formatToDDMMYYYY(todayIso)})
                  </p>
                </div>

                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      filterMode === 'all' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('my')}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      filterMode === 'my' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'
                    }`}
                  >
                    Input Saya
                  </button>
                </div>
              </div>

              {/* Feed List Items */}
              <div className="space-y-2">
                {displayedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-blue-600">
                          {item.kode || item.itemCode || '-'}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          BOX #{item.boxNumber}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                        {item.nama || item.name || 'Sample'}
                      </div>
                      <div className="text-[10.5px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{item.buyer || 'Buyer -'}</span>
                        <span>&bull;</span>
                        <span className="font-semibold text-slate-700">{item.jumlah || 1} PCE</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(item.kode || item.itemCode, e)}
                        title="Salin Kode"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        {copiedCode === (item.kode || item.itemCode) ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPrintItem(item)}
                        title="Cetak Kartu"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setItemModalConfig({
                            isOpen: true,
                            item,
                            targetBoxNumber: Number(item.boxNumber),
                          });
                        }}
                        title="Edit Item"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center space-y-2 mt-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200/60">
                <Package className="w-5 h-5 text-slate-400" />
              </div>
              <div className="text-xs font-bold text-slate-700">
                {filterMode === 'my' ? 'Belum Ada Sampel Inputan Anda' : 'Belum Ada Sampel Hari Ini'}
              </div>
              <p className="text-[11px] text-slate-500 max-w-[260px] mx-auto leading-relaxed">
                {filterMode === 'my'
                  ? `Gunakan tombol kamera di atas untuk mencatat sampel fisik ke BOX #${activeBoxNumber}.`
                  : `Stasiun siap. Arahkan kamera ke tag sampel fisik untuk mulai mengisi BOX #${activeBoxNumber}.`}
              </p>
            </div>
          )}

        </div>
      )}

      {/* Modal Cetak Kartu Barcode (Jika Dipilih) */}
      {selectedPrintItem && (
        <CardPrintModal
          isOpen={Boolean(selectedPrintItem)}
          item={selectedPrintItem}
          boxNumber={Number(selectedPrintItem?.boxNumber) || activeBoxNumber}
          onClose={() => setSelectedPrintItem(null)}
        />
      )}

    </div>
  );
};
