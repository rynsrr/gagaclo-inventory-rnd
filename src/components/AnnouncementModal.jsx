import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  X,
  CheckCircle2,
  Pencil,
  RotateCcw,
  Send,
  AlertCircle,
  FileCheck2,
  Sparkles,
} from 'lucide-react';

export function AnnouncementModal({
  isOpen,
  onClose,
  announcement,
  onSaveAnnouncement,
  currentUser,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    badge: '',
    badgeType: 'amber',
    content: '',
    exampleCorrect: '',
    exampleWrong: '',
    exampleNotes: '',
    author: '',
    isActive: true,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync form data whenever announcement changes or editing opens
  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title || '',
        badge: announcement.badge || '',
        badgeType: announcement.badgeType || 'amber',
        content: announcement.content || '',
        exampleCorrect: announcement.exampleCorrect || '',
        exampleWrong: announcement.exampleWrong || '',
        exampleNotes: announcement.exampleNotes || '',
        author: announcement.author || currentUser?.name || 'Supervisor / Leader R&D',
        isActive: announcement.isActive !== false,
      });
    }
  }, [announcement, currentUser, isEditing]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    if (onSaveAnnouncement) {
      await onSaveAnnouncement(formData);
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditing(false);
    }, 800);
  };

  const getBadgeStyles = (type) => {
    switch (type) {
      case 'blue':
        return 'bg-blue-950/80 text-blue-300 border-blue-500/50 shadow-blue-500/10';
      case 'emerald':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10';
      case 'rose':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-rose-500/10';
      case 'amber':
      default:
        return 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-amber-500/10';
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'blue':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'emerald':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'rose':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'amber':
      default:
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-xl md:max-w-2xl bg-[#0b0f19] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans text-slate-100"
        style={{
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px -10px rgba(245, 158, 11, 0.15)',
        }}
      >
        {/* Glow accent bar at the top */}
        <div
          className={`h-1.5 w-full bg-gradient-to-r ${
            formData.badgeType === 'blue'
              ? 'from-blue-600 via-sky-400 to-indigo-500'
              : formData.badgeType === 'emerald'
              ? 'from-emerald-600 via-teal-400 to-cyan-500'
              : formData.badgeType === 'rose'
              ? 'from-rose-600 via-pink-400 to-amber-500'
              : 'from-amber-600 via-orange-400 to-yellow-500'
          }`}
        />

        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${getIconColor(formData.badgeType)}`}>
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-xs ${getBadgeStyles(
                    formData.badgeType
                  )}`}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  {formData.badge || 'PENGUMUMAN RESMI'}
                </span>
                {!formData.isActive && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Popup Nonaktif
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                title="Edit isi pengumuman ini"
              >
                <Pencil className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Edit Pengumuman</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Tutup (ESC)"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-5 text-sm">
          {isEditing ? (
            /* ========================================================= */
            /* MODE EDIT: FORMULIR PENGUMUMAN DINAMIS                    */
            /* ========================================================= */
            <form id="announcement-form" onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Form Pengaturan &amp; Siaran Pengumuman
                </span>
                <span className="text-[11px] text-slate-400">Tersinkronisasi ke seluruh monitor tim</span>
              </div>

              {/* Judul */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Judul Pengumuman <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Standardisasi Kode Sampel IT & Sampel Baru"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-hidden transition"
                />
              </div>

              {/* Teks Badge & Aksen Warna */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Label Badge / Kategori
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="Contoh: PENGUMUMAN PPIC • BERLAKU HARI INI"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-hidden transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Warna Aksen Badge
                  </label>
                  <select
                    value={formData.badgeType}
                    onChange={(e) => setFormData({ ...formData, badgeType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-hidden transition cursor-pointer"
                  >
                    <option value="amber">Kuning / Amber (Pemberitahuan Resmi)</option>
                    <option value="blue">Biru (Update Sistem / Informasi)</option>
                    <option value="emerald">Hijau / Emerald (Panduan Standar / SOP)</option>
                    <option value="rose">Merah / Rose (Kritis / Perhatian Penting)</option>
                  </select>
                </div>
              </div>

              {/* Isi Pengumuman */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Isi Pengumuman &amp; Poin-Poin Instruksi <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={6}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Tuliskan isi pengumuman atau instruksi per baris..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm leading-relaxed focus:border-amber-500 focus:outline-hidden transition resize-y font-sans"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Gunakan enter / baris baru untuk memisahkan poin-poin agar mudah dibaca.
                </p>
              </div>

              {/* Kotak Contoh / Panduan Format (Opsional) */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <span className="text-xs font-semibold text-slate-300 block">
                  Kotak Contoh / Perbandingan Format (Opsional)
                </span>
                <div>
                  <label className="block text-[11px] text-emerald-400 mb-0.5">
                    ✅ Format yang Benar / Diwajibkan:
                  </label>
                  <input
                    type="text"
                    value={formData.exampleCorrect}
                    onChange={(e) => setFormData({ ...formData, exampleCorrect: e.target.value })}
                    placeholder="Contoh: Mengikuti format struktur kode resmi inventori R&D Gagaclo"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:border-emerald-500 focus:outline-hidden transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-rose-400 mb-0.5">
                    ❌ Format yang Dilarang / Dihindari:
                  </label>
                  <input
                    type="text"
                    value={formData.exampleWrong}
                    onChange={(e) => setFormData({ ...formData, exampleWrong: e.target.value })}
                    placeholder="Contoh: Menggunakan kode acak non-standar atau format lama"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:border-rose-500 focus:outline-hidden transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-amber-400 mb-0.5">
                    💡 Catatan Penting Tambahan:
                  </label>
                  <input
                    type="text"
                    value={formData.exampleNotes}
                    onChange={(e) => setFormData({ ...formData, exampleNotes: e.target.value })}
                    placeholder="Contoh: Wajib HURUF KAPITAL (UPPERCASE) dan satuan standar PCE"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:border-amber-500 focus:outline-hidden transition"
                  />
                </div>
              </div>

              {/* Pengirim & Toggle Auto Popup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pengumuman Dari / Pembuat
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Contoh: Jasmine (Leader) / Supervisor R&D"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-hidden transition"
                  />
                </div>

                <div className="flex items-center gap-2.5 pt-4">
                  <input
                    type="checkbox"
                    id="is-active-toggle"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="is-active-toggle" className="text-xs text-slate-300 select-none cursor-pointer">
                    Munculkan popup otomatis saat membuka web
                  </label>
                </div>
              </div>
            </form>
          ) : (
            /* ========================================================= */
            /* MODE BACA (VIEWER): TAMPILAN PENGUMUMAN TENGAH LAYAR      */
            /* ========================================================= */
            <div className="space-y-4">
              {/* Judul Utama */}
              <div>
                <h2 id="announcement-title" className="text-lg md:text-xl font-extrabold text-white tracking-tight leading-snug">
                  {formData.title}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                  <span>Diumumkan oleh: <strong className="text-slate-200">{formData.author || 'Leader / R&D'}</strong></span>
                  <span>•</span>
                  <span>Hari Ini</span>
                </div>
              </div>

              {/* Isi Teks Pengumuman */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line space-y-2">
                {formData.content}
              </div>

              {/* Kotak Perbandingan Contoh (Jika Diisi) */}
              {(formData.exampleCorrect || formData.exampleWrong || formData.exampleNotes) && (
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2 text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                    Panduan &amp; Standar Format Input:
                  </span>

                  {formData.exampleCorrect && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-emerald-300 block text-[11px]">FORMAT WAJIB / STANDAR R&amp;D:</strong>
                        <span>{formData.exampleCorrect}</span>
                      </div>
                    </div>
                  )}

                  {formData.exampleWrong && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-rose-950/20 border border-rose-500/20 text-rose-300">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-rose-400 block text-[11px]">DILARANG / TIDAK DIGUNAKAN:</strong>
                        <span>{formData.exampleWrong}</span>
                      </div>
                    </div>
                  )}

                  {formData.exampleNotes && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-950/20 border border-amber-500/20 text-amber-200 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{formData.exampleNotes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-900/80">
          {isEditing ? (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan &amp; Disiarkan!
                  </span>
                )}
                <button
                  type="submit"
                  form="announcement-form"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Simpan &amp; Siarkan Pengumuman</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Pemberitahuan resmi internal Tim Inventory Sample &amp; Material R&amp;D
              </span>

              <button
                type="button"
                onClick={onClose}
                className="ml-auto flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-200" />
                <span>Saya Mengerti &amp; Siap Terapkan</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnnouncementModal;