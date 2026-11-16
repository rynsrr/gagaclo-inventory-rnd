import React, { useState } from 'react';
import {
  Boxes,
  Database,
  Truck,
  TrendingUp,
  LayoutGrid,
  X,
  Search,
  AlertCircle,
  Users,
  ShoppingBasket,
  ShieldCheck,
  FileSpreadsheet,
  Upload,
  Layers,
  ChevronRight,
  Box as BoxIcon
} from 'lucide-react';

export const MobileBottomNav = ({
  appMode,
  setAppMode,
  activeIssuesCount = 0,
  cartCount = 0,
  onOpenSearch,
  onOpenCart,
  onOpenBoxManage,
  onOpenBackup,
  onExportExcel,
  onImportExcel,
  onOpenSupabase,
  onToggle3dView,
  mobileWarehouseView,
  currentUser,
  onOpenUserProfile,
  supabaseConnected = false,
  usageLabel = '',
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const navItems = [
    {
      id: '3d-warehouse',
      label: 'Gudang',
      icon: Boxes,
      action: () => {
        setAppMode('3d-warehouse');
        window.dispatchEvent(new CustomEvent('gagaclo_reset_3d_home_view'));
      },
    },
    {
      id: 'summary',
      label: 'Database',
      icon: Database,
      action: () => setAppMode('summary'),
    },
    {
      id: 'dispatch',
      label: 'Kirim',
      icon: Truck,
      badge: cartCount > 0 ? cartCount : null,
      action: () => setAppMode('dispatch'),
    },
    {
      id: 'ppic-performance',
      label: 'Rekap',
      icon: TrendingUp,
      action: () => setAppMode('ppic-performance'),
    },
  ];

  const handleSelectDrawerItem = (callback) => {
    setIsDrawerOpen(false);
    if (callback) callback();
  };

  const hasMenuBadge = activeIssuesCount > 0 || cartCount > 0;

  return (
    <>
      {/* 1. FIXED BOTTOM DOCK (Mobile Navigation Bar) */}
      <nav
        aria-label="Navigasi Menu Mobile"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] font-apple select-none"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = appMode === item.id && !isDrawerOpen;

            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className={`relative flex flex-col items-center justify-center h-full min-h-[44px] transition-colors cursor-pointer active:scale-95 ${
                  isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10.5px] mt-1 tracking-tight leading-none">{item.label}</span>
                {isActive && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>
            );
          })}

          {/* Tombol Menu Lainnya (Drawer Toggle) */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            className={`relative flex flex-col items-center justify-center h-full min-h-[44px] transition-colors cursor-pointer active:scale-95 ${
              isDrawerOpen || appMode === 'issues' || appMode === 'team-structure'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className="relative">
              <LayoutGrid className={`w-5 h-5 ${isDrawerOpen ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
              {hasMenuBadge && (
                <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
              )}
            </div>
            <span className="text-[10.5px] mt-1 tracking-tight leading-none">Menu</span>
            {(isDrawerOpen || appMode === 'issues' || appMode === 'team-structure') && (
              <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-blue-600" />
            )}
          </button>
        </div>
      </nav>

      {/* 2. MOBILE ACTION DRAWER / SHEET */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 flex flex-col justify-end"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="w-full max-h-[85vh] bg-white rounded-t-[28px] border-t border-slate-200 shadow-2xl p-5 overflow-y-auto animate-in slide-in-from-bottom duration-250 font-apple"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle Drag Bar */}
            <div className="w-12 h-1.2 rounded-full bg-slate-300 mx-auto mb-4" />

            {/* Header Drawer */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {currentUser?.name || 'Gagaclo R&D'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {currentUser?.role || 'Menu Operasional Gudang'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem(onOpenUserProfile)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-semibold transition cursor-pointer"
                >
                  Ganti Akun
                </button>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Tutup Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Section 1: Navigasi Fitur Tambahan */}
            <div className="space-y-1 mb-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
                Navigasi Halaman
              </div>

              <button
                type="button"
                onClick={() =>
                  handleSelectDrawerItem(() => {
                    setAppMode('3d-warehouse');
                    if (onToggle3dView) onToggle3dView();
                  })
                }
                className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between transition cursor-pointer border border-transparent hover:border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <BoxIcon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-slate-800">
                      {mobileWarehouseView === '3d' ? 'Tampilan Mode Cepat' : 'Denah 3D Rak Gudang'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {mobileWarehouseView === '3d' ? 'Kembali ke kartu input & dashboard' : 'Lihat rak dan posisi 72 box 3D'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectDrawerItem(() => setAppMode('issues'))}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between transition cursor-pointer border ${
                  appMode === 'issues'
                    ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                    : 'hover:bg-slate-50 border-transparent hover:border-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold">Isu &amp; Kendala R&amp;D</div>
                    <div className="text-[10px] text-slate-500">Laporan hambatan &amp; catatan perbaikan</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {activeIssuesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold tabular-nums">
                      {activeIssuesCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDrawerItem(() => setAppMode('team-structure'))}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between transition cursor-pointer border ${
                  appMode === 'team-structure'
                    ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                    : 'hover:bg-slate-50 border-transparent hover:border-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold">Struktur Tim R&amp;D</div>
                    <div className="text-[10px] text-slate-500">Bagan 9 personel &amp; matriks RACI</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectDrawerItem(onOpenCart)}
                className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between transition cursor-pointer border border-transparent hover:border-slate-100 text-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <ShoppingBasket className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold">Keranjang Kirim Sampel</div>
                    <div className="text-[10px] text-slate-500">Daftar item untuk dikirim keluar</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {cartCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold tabular-nums">
                      {cartCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            </div>

            {/* Section 2: Alat & Operasional Gudang */}
            <div className="space-y-1 mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
                Alat &amp; Manajemen Data
              </div>

              <button
                type="button"
                onClick={() => handleSelectDrawerItem(onOpenSearch)}
                className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between transition cursor-pointer border border-transparent hover:border-slate-100 text-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Search className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold">Pencarian Cepat (Spotlight)</div>
                    <div className="text-[10px] text-slate-500">Cari kode sampel, buyer, PIC, atau box</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectDrawerItem(onOpenBoxManage)}
                className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between transition cursor-pointer border border-transparent hover:border-slate-100 text-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold">Kelola Box &amp; Rak</div>
                    <div className="text-[10px] text-slate-500">Atur nomor box, rak, dan penugasan PIC</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectDrawerItem(onOpenBackup)}
                className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between transition cursor-pointer border border-transparent hover:border-slate-100 text-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold">Backup &amp; Pulihkan</div>
                    <div className="text-[10px] text-slate-500">Snapshot data aman &amp; pemulihan sistem</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectDrawerItem(onExportExcel)}
                className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between transition cursor-pointer border border-transparent hover:border-slate-100 text-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold">Unduh Excel (.xlsx)</div>
                    <div className="text-[10px] text-slate-500">Ekspor seluruh data sampel aktif</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectDrawerItem(onImportExcel)}
                className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between transition cursor-pointer border border-transparent hover:border-slate-100 text-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold">Impor Excel (.xlsx)</div>
                    <div className="text-[10px] text-slate-500">Unggah file data sampel baru</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Cloud Status Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span>{supabaseConnected ? 'Cloud Supabase Terhubung' : 'Mode Offline / Lokal'}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">{usageLabel || ''}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
