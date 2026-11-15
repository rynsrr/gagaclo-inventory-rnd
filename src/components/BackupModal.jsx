import React, { useRef, useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  X,
  HardDriveDownload,
  Upload,
  RotateCcw,
  ShieldAlert,
  Database,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  FileSpreadsheet,
  History,
  Download,
  Clock,
  RefreshCw,
} from 'lucide-react';
import {
  isAutoBackupEnabled,
  setAutoBackupEnabled,
  getLastAutoBackupInfo,
  getLocalSnapshots,
  downloadBackupFile,
} from '../utils/autoBackupService';

export const BackupModal = ({ isOpen, onClose }) => {
  const {
    items = [],
    boxes = [],
    exportJsonBackup,
    importJsonBackup,
    exportToExcel,
    triggerManualBackup,
    restoreFromSnapshotPayload,
    resetToInitialData,
    deleteAllItems,
    setIsSupabaseModalOpen,
    supabaseStatus,
  } = useInventory();

  const fileInputRef = useRef(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingRestoreSnapshot, setConfirmingRestoreSnapshot] = useState(null);
  const [autoEnabled, setAutoEnabled] = useState(isAutoBackupEnabled());
  const [lastInfo, setLastInfo] = useState(getLastAutoBackupInfo());
  const [snapshots, setSnapshots] = useState(getLocalSnapshots());

  useEffect(() => {
    if (isOpen) {
      setAutoEnabled(isAutoBackupEnabled());
      setLastInfo(getLastAutoBackupInfo());
      setSnapshots(getLocalSnapshots());
      setConfirmingDelete(false);
      setConfirmingRestoreSnapshot(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAutoBackup = () => {
    const nextVal = !autoEnabled;
    setAutoEnabled(nextVal);
    setAutoBackupEnabled(nextVal);
  };

  const handleBackupNow = () => {
    if (triggerManualBackup) {
      triggerManualBackup();
    } else {
      exportJsonBackup();
    }
    setLastInfo(getLastAutoBackupInfo());
    setSnapshots(getLocalSnapshots());
  };

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

  const handleRestoreSnapshot = (snapshot) => {
    if (restoreFromSnapshotPayload && snapshot?.payload) {
      restoreFromSnapshotPayload(snapshot.payload);
      setConfirmingRestoreSnapshot(null);
      onClose();
    }
  };

  return (
    <div className="font-apple fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-[26px] shadow-[0_30px_70px_rgba(0,0,0,0.2)] border border-black/[0.08] w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden text-[#1d1d1f]">
        
        {/* Apple Style Header Dialog */}
        <div className="px-6 py-4 bg-[#fbfbfd] border-b border-black/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0071e3]/10 text-[#0071e3]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">Pusat Cadangan &amp; Pemulihan Data</h3>
              <p className="text-[12px] text-[#86868b]">Proteksi data otomatis harian, unduhan fisik &amp; riwayat snapshot</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#86868b] hover:text-[#1d1d1f] transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Isi Dialog */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Card 1: Proteksi Auto-Backup Harian (Apple Inset Grouped) */}
          <div className="p-4.5 rounded-[20px] border border-black/[0.05] bg-[#f5f5f7] space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#34c759]/15 text-[#34c759]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-[14px] text-[#1d1d1f]">Auto-Download &amp; Backup Harian</h4>
                  <p className="text-[#86868b] text-[12px] leading-relaxed">
                    Mencadangkan file JSON ke folder Downloads laptop dan menyimpan snapshot lokal setiap hari baru secara otomatis.
                  </p>
                </div>
              </div>

              {/* iOS Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleAutoBackup}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  autoEnabled ? 'bg-[#34c759]' : 'bg-[#e5e5ea]'
                }`}
                title={autoEnabled ? 'Klik untuk nonaktifkan auto-backup' : 'Klik untuk aktifkan auto-backup'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    autoEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Status Backup Terkini */}
            <div className="pt-3 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-[#1d1d1f] font-medium">
                <Clock className="w-3.5 h-3.5 text-[#86868b]" />
                <span>
                  Backup Hari Ini: {lastInfo.isToday ? (
                    <strong className="text-[#248a3d] font-semibold">Sudah Diunduh &amp; Tersimpan</strong>
                  ) : (
                    <span className="text-[#86868b]">Siap diunduh untuk hari ini</span>
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={handleBackupNow}
                className="px-4 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Unduh file backup JSON hari ini sekarang juga"
              >
                <HardDriveDownload className="w-3.5 h-3.5" />
                <span>Unduh Backup Hari Ini (JSON)</span>
              </button>
            </div>
          </div>

          {/* Card 2: Riwayat Snapshot Otomatis 7 Hari Terakhir (Pulihkan Cepat 1-Klik) */}
          <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <History className="w-4 h-4 text-blue-600" />
                <span>Riwayat Snapshot Otomatis di Browser ({snapshots.length} Hari Tersedia)</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">Rotasi otomatis 7 hari</span>
            </div>
            <p className="text-slate-500 text-xs">
              Jika sewaktu-waktu laptop mati atau data salah input, Anda dapat memulihkan seluruh data langsung dari arsip tanggal di bawah ini tanpa perlu mencari file fisik.
            </p>

            {snapshots.length === 0 ? (
              <div className="py-4 text-center text-slate-400 bg-slate-50 rounded-md border border-dashed border-slate-200">
                Belum ada arsip snapshot tersimpan. Klik "Unduh Backup Hari Ini" di atas untuk membuat snapshot pertama.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-slate-50 hover:bg-blue-50/60 border border-slate-200 transition text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <span>{snap.date}</span>
                        {snap.formattedTime && (
                          <span className="text-slate-400 font-normal">({snap.formattedTime})</span>
                        )}
                      </div>
                      <div className="text-slate-500 font-medium text-xs">
                        Tersimpan: {snap.summary?.totalItems ?? items.length} item • {snap.summary?.totalBoxes ?? boxes.length} box
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => downloadBackupFile(snap.payload, `GAGACLO_BACKUP_${snap.date}.json`)}
                        className="px-2 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Unduh file JSON untuk snapshot tanggal ini"
                      >
                        <Download className="w-3 h-3 text-slate-600" />
                        <span className="hidden sm:inline">File</span>
                      </button>

                      {confirmingRestoreSnapshot === snap.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRestoreSnapshot(snap)}
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold transition text-xs cursor-pointer"
                          >
                            Ya, Pulihkan
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingRestoreSnapshot(null)}
                            className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingRestoreSnapshot(snap.id)}
                          className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Pulihkan seluruh data master ke kondisi tanggal ini"
                        >
                          <RefreshCw className="w-3 h-3 text-blue-600" />
                          <span>Pulihkan</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Ekspor Excel & Cloud Supabase Sync */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Unduh Excel (.xlsx) */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Spreadsheet Excel</span>
              </div>
              <p className="text-slate-500 text-xs">
                Ekspor seluruh item inventory ke format `.xlsx` untuk laporan fisik atau analisis offline.
              </p>
              <button
                type="button"
                onClick={exportToExcel}
                className="w-full py-1.5 px-3 rounded-md bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh Excel (.xlsx)</span>
              </button>
            </div>

            {/* Cloud Supabase Sync Status */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>Cloud Supabase</span>
                </div>
                {supabaseStatus?.isConnected && (
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Aktif</span>
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs">
                Data Anda juga otomatis disinkronkan ke server cloud resmi Gagaclo secara real-time.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setIsSupabaseModalOpen(true);
                }}
                className="w-full py-1.5 px-3 rounded-md bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Status &amp; Log Cloud</span>
              </button>
            </div>
          </div>

          {/* Card 4: Pulihkan dari File JSON Komputer */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Pulihkan dari File Backup Eksternal (Upload JSON)</span>
              </div>
            </div>
            <p className="text-slate-500 text-xs">
              Punya file cadangan `GAGACLO_AUTO_BACKUP_*.json` dari komputer lain? Unggah di sini untuk memulihkan seluruh data master.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-md border border-slate-300 transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Pilih File Backup JSON dari Komputer...</span>
            </button>
          </div>

          {/* Tindakan Berbahaya: Reset & Hapus */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Kembalikan konfigurasi rak dan alokasi box ke dokumen awal?')) {
                  resetToInitialData();
                  onClose();
                }
              }}
              className="text-slate-500 hover:text-slate-800 font-medium transition flex items-center gap-1 cursor-pointer"
              title="Reset struktur master box & rak ke konfigurasi awal dokumen"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Struktur ke Data Awal</span>
            </button>

            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="text-rose-600 hover:text-rose-800 font-medium transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus Semua Item</span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-rose-700 font-bold">Yakin hapus semua item?</span>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteAllItems?.();
                    setConfirmingDelete(false);
                    onClose();
                  }}
                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Ya
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium"
                >
                  Batal
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Footer Dialog */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Total master saat ini: <strong>{items.length} item</strong> di <strong>{boxes.length} box</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
