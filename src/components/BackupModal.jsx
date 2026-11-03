import React, { useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { X, HardDriveDownload, Upload, RotateCcw, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const BackupModal = ({ isOpen, onClose }) => {
  const { exportJsonBackup, importJsonBackup, resetToInitialData } = useInventory();
  const fileInputRef = useRef(null);

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
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
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
          
          {/* Export JSON */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-slate-900">
              <HardDriveDownload className="w-4 h-4 text-blue-600" />
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
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-xs text-xs"
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
