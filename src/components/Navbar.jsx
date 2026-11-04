import React, { useState } from 'react';
import { 
  Boxes, 
  Layers, 
  Users, 
  ArrowLeftRight, 
  Printer, 
  Search, 
  FileSpreadsheet, 
  RotateCcw, 
  Plus, 
  QrCode,
  HardDriveDownload,
  Upload,
  Info,
  Database
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const Navbar = ({ onOpenBackupModal }) => {
  const { 
    activeTab, 
    setActiveTab, 
    exportToExcel, 
    setItemModalConfig, 
    setQuickScannerOpen,
    getStats,
    supabaseStatus,
    setIsSupabaseModalOpen
  } = useInventory();

  const stats = getStats();

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-30 border-b border-slate-800">
      {/* Top Bar with System Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Brand & Organization Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-xl shadow-md flex items-center justify-center">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight text-white uppercase">
                  GAGACLO
                </span>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs px-2 py-0.5 rounded-full font-semibold">
                  Storage R&D
                </span>
                <span className="text-slate-400 text-xs hidden sm:inline">| Dokumen Ref: 20261102</span>
              </div>
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                INVENTORY MANAGEMENT RND • 5 RACKS • 72 BOXES
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* Quick Box Jump Scanner Button */}
            <button
              onClick={() => setQuickScannerOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Cari Box Berdasarkan Nomor atau QR"
            >
              <QrCode className="w-4 h-4 text-sky-400" />
              <span>Cari / Scan Box</span>
            </button>

            {/* Export Excel Button */}
            <button
              onClick={exportToExcel}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700/80 hover:bg-emerald-600 text-white border border-emerald-500/40 shadow-sm transition"
              title="Export Semua Data ke Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            {/* Supabase Cloud Connection Button */}
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                supabaseStatus?.isConnected
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700/60'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Koneksi Cloud Supabase Corporate Gagaclo"
            >
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Supabase</span>
              {supabaseStatus?.isConnected ? (
                <span className="text-[10px] bg-emerald-800 text-emerald-200 px-1.5 py-0.2 rounded font-mono">ON</span>
              ) : (
                <span className="text-[10px] bg-blue-900/60 text-blue-300 px-1.5 py-0.2 rounded">Setup</span>
              )}
            </button>

            {/* Backup & Reset Settings */}
            <button
              onClick={onOpenBackupModal}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Backup, Restore & Reset Data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Data / Reset</span>
            </button>

            {/* Add New Item Button */}
            <button
              onClick={() => setItemModalConfig({ isOpen: true, item: null, targetBoxNumber: 1 })}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/40 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Item Baru</span>
            </button>
          </div>
        </div>

        {/* Quick status counters */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300 overflow-x-auto gap-4 scrollbar-none">
          <div className="flex items-center space-x-5 whitespace-nowrap">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Sample: <strong className="text-white">36 Box (Rack 1-2)</strong></span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Material: <strong className="text-white">36 Box (Rack 3-5)</strong></span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Box Terisi: <strong className="text-white">{stats.occupiedBoxesCount} / 72</strong></span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>Total Item Fisik: <strong className="text-white">{stats.totalItems} item ({stats.totalQuantity} unit)</strong></span>
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono hidden lg:block">
            5 PPIC: Royan (16) • Cynara (14) • Ami (14) • Ryan (14) • Hanami (14)
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-slate-950 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex space-x-1 overflow-x-auto py-1.5 scrollbar-none">
          <button
            onClick={() => setActiveTab('racks')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'racks'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Denah Rak & Box (Visual 1-72)</span>
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'items'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Daftar Item Inventory</span>
            <span className="ml-1.5 bg-slate-800 text-slate-200 text-xs px-2 py-0.5 rounded-full font-bold">
              {stats.totalItems}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ppic')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'ppic'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Alokasi Tim PPIC (5 PIC)</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Log Mutasi Masuk / Keluar</span>
          </button>

          <button
            onClick={() => setActiveTab('manifests')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'manifests'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Dokumen Cetak & Label QR</span>
          </button>
        </div>
      </div>
    </header>
  );
};
