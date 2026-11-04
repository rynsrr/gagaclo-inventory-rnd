import React, { useRef, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { X, HardDriveDownload, Upload, RotateCcw, ShieldAlert, Database, CheckCircle2, Trash2 } from 'lucide-react';

export const BackupModal = ({ isOpen, onClose }) => {
  const { 
    exportJsonBackup, 
    importJsonBackup, 
    resetToInitialData, 
    deleteAllItems,
    setIsSupabaseModalOpen,
    supabaseStatus 
  } = useInventory();
  const fileInputRef = useRef(null);
  const [confirming, setConfirming] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          importJsonBackup(content);
          onClose();
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="inventory-dialog-heading px-5 py-4 flex items-center justify-between">
          <h3 className="text-base font-bold">Manajemen Data & Backup</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Cloud Supabase Sync */}
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-2">
            <div className="flex items-center justify-between font-bold text-blue-900">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-blue-600" />
                <span>Supabase Corporate Gagaclo</span>
              </div>
              {supabaseStatus.isConnected && (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Online</span>
                </span>
              )}
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Sinkronisasi data otomatis dengan cloud database Supabase resmi Corporate Gagaclo untuk kolaborasi real-time seluruh tim R&D.
            </p>
            <button
              onClick={() => {
                onClose();
                setIsSupabaseModalOpen(true);
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-xs text-xs flex items-center justify-center space-x-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Kelola Koneksi & Sinkronisasi Cloud</span>
            </button>
          </div>

          {/* Export JSON */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-slate-900">
              <HardDriveDownload className="w-4 h-4 text-slate-700" />
              <span>Export File Backup (JSON)</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Unduh salinan lengkap seluruh data master 72 box, daftar item sample/material, dan riwayat mutasi untuk disimpan di komputer Anda.
            </p>
            <button
              onClick={() => {
                exportJsonBackup();
                onClose();
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition shadow-xs text-xs"
            >
              Unduh Backup JSON
            </button>
          </div>

          {/* Import JSON */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-slate-900">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Pulihkan Data (Import JSON)</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Unggah file backup JSON yang telah Anda unduh sebelumnya untuk memulihkan seluruh data.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition shadow-xs text-xs"
            >
              Pilih File Backup JSON...
            </button>
          </div>

          {/* Reset to Default */}
          <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-rose-900">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Reset ke Data Awal Dokumen</span>
            </div>
            <p className="text-rose-700 text-[11px] leading-relaxed">
              Mengembalikan seluruh konfigurasi Rak 1-5, master 72 Box, dan alokasi tim PPIC (Royan, Cynara, Ami, Ryan, Hanami) persis seperti dokumen awal GAGACLO 20261102.
            </p>
            <button
              onClick={() => {
                resetToInitialData();
                onClose();
              }}
              className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition shadow-xs text-xs flex items-center justify-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Konfigurasi Awal</span>
            </button>
          </div>

          {/* Hapus Semua Item */}
          <div className="bg-red-50/70 p-4 rounded-xl border border-red-200 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-red-900">
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Hapus Semua Item Tersimpan</span>
            </div>
            <p className="text-red-700 text-[11px] leading-relaxed">
              Menghapus SELURUH data item/sample secara permanen dari database (Supabase + lokal).
              Box, rak, dan riwayat transaksi tetap tersimpan. Tindakan ini <strong>TIDAK BISA dibatalkan</strong>.
            </p>
            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition shadow-xs text-xs flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua Item</span>
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-red-800">
                  Yakin? Semua item akan hilang permanen.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const count = await deleteAllItems();
                        setConfirming(false);
                        onClose();
                        console.log(`Deleted ${count} items`);
                      } catch (e) {
                        alert('Gagal menghapus item: ' + (e?.message || e));
                        setConfirming(false);
                      }
                    }}
                    className="flex-1 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg transition shadow-xs text-xs"
                  >
                    Ya, Hapus Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition text-xs"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
