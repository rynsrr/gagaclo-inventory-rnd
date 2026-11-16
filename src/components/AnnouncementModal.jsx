import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  X,
  CheckCircle2,
  Pencil,
  Send,
  AlertCircle,
  FileCheck2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Layers,
} from 'lucide-react';
import { DEFAULT_ANNOUNCEMENT } from '../context/InventoryContext';

export function AnnouncementModal({
  isOpen,
  onClose,
  announcement,
  onSaveAnnouncement,
  currentUser,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [activeEditIndex, setActiveEditIndex] = useState(0);

  // Editable multi-item announcement data
  const [formState, setFormState] = useState({
    title: '',
    isActive: true,
    items: [],
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Normalize items array from announcement prop (always ensure at least 2 default items)
  const items = Array.isArray(announcement?.items) && announcement.items.length >= 2
    ? announcement.items
    : DEFAULT_ANNOUNCEMENT.items;

  // Reset to first slide when modal is opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsEditing(false);
    }
  }, [isOpen]);

  // Sync edit form state whenever announcement prop or edit mode changes
  useEffect(() => {
    const baseItems = Array.isArray(announcement?.items) && announcement.items.length >= 2
      ? announcement.items
      : DEFAULT_ANNOUNCEMENT.items;

    setFormState({
      title: announcement?.title || DEFAULT_ANNOUNCEMENT.title,
      isActive: announcement?.isActive !== false,
      items: baseItems.map((it, idx) => ({
        id: it.id || `point-${idx + 1}`,
        title: it.title || '',
        badge: it.badge || `POIN ${idx + 1}`,
        badgeType: it.badgeType || 'amber',
        content: it.content || '',
        exampleCorrect: it.exampleCorrect || '',
        exampleWrong: it.exampleWrong || '',
        exampleNotes: it.exampleNotes || '',
        author: it.author || currentUser?.name || 'Leader / R&D',
      })),
    });
    setActiveEditIndex(0);
  }, [announcement, currentUser, isEditing]);

  if (!isOpen) return null;
  // Nonaktifkan seluruh modal pengumuman di versi mobile (< 768px) sesuai instruksi pengguna
  if (typeof window !== 'undefined' && window.innerWidth < 768) return null;

  const currentItem = items[currentIndex] || items[0] || {};
  const totalPoints = items.length;

  const handleNext = () => {
    if (currentIndex < totalPoints - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Editor Actions
  const handleAddPoint = () => {
    const newIdx = formState.items.length + 1;
    const newPoint = {
      id: `point-${Date.now()}`,
      title: `Poin Pengumuman #${newIdx}`,
      badge: `POIN ${newIdx} • PEMBERITAHUAN`,
      badgeType: newIdx % 2 === 0 ? 'blue' : 'amber',
      content: '',
      exampleCorrect: '',
      exampleWrong: '',
      exampleNotes: '',
      author: currentUser?.name || 'Leader / R&D',
    };
    setFormState((prev) => ({
      ...prev,
      items: [...prev.items, newPoint],
    }));
    setActiveEditIndex(formState.items.length);
  };

  const handleDeletePoint = (indexToDelete) => {
    if (formState.items.length <= 1) return;
    const updated = formState.items.filter((_, idx) => idx !== indexToDelete);
    setFormState((prev) => ({
      ...prev,
      items: updated,
    }));
    setActiveEditIndex(Math.max(0, indexToDelete - 1));
  };

  const handleUpdateActivePointField = (field, value) => {
    setFormState((prev) => {
      const updated = [...prev.items];
      if (updated[activeEditIndex]) {
        updated[activeEditIndex] = {
          ...updated[activeEditIndex],
          [field]: value,
        };
      }
      return { ...prev, items: updated };
    });
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    if (formState.items.length === 0) return;

    if (onSaveAnnouncement) {
      await onSaveAnnouncement({
        ...formState,
        title: formState.items[0]?.title || formState.title,
      });
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditing(false);
      setCurrentIndex(0);
    }, 700);
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

  const currentBadgeType = isEditing
    ? formState.items[activeEditIndex]?.badgeType || 'amber'
    : currentItem.badgeType || 'amber';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-xl md:max-w-2xl bg-[#0b0f19] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans text-slate-100"
        style={{
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.75), 0 0 45px -10px rgba(245, 158, 11, 0.18)',
        }}
      >
        {/* Glow Accent Bar */}
        <div
          className={`h-1.5 w-full bg-gradient-to-r ${
            currentBadgeType === 'blue'
              ? 'from-blue-600 via-sky-400 to-indigo-500'
              : currentBadgeType === 'emerald'
              ? 'from-emerald-600 via-teal-400 to-cyan-500'
              : currentBadgeType === 'rose'
              ? 'from-rose-600 via-pink-400 to-amber-500'
              : 'from-amber-600 via-orange-400 to-yellow-500'
          }`}
        />

        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${getIconColor(currentBadgeType)}`}>
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-xs ${getBadgeStyles(
                    currentBadgeType
                  )}`}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  {isEditing
                    ? formState.items[activeEditIndex]?.badge || 'PENGUMUMAN'
                    : currentItem.badge || 'PENGUMUMAN RESMI'}
                </span>

                {/* Counter Stepper Pill (Poin X dari Y) */}
                {!isEditing && totalPoints > 1 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    <Layers className="w-2.5 h-2.5 text-amber-400" />
                    Poin {currentIndex + 1} dari {totalPoints}
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
                title="Edit pengumuman & poin-poinnya"
              >
                <Pencil className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Kelola Pengumuman</span>
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

        {/* Multi-step progress bar (Viewer Mode) */}
        {!isEditing && totalPoints > 1 && (
          <div className="flex items-center justify-between px-5 py-2 bg-slate-950/60 border-b border-slate-800/80 text-[11px] text-slate-400">
            <span className="font-medium text-slate-300">
              Pengumuman Bertahap:
            </span>
            <div className="flex items-center gap-1.5">
              {items.map((it, idx) => (
                <button
                  key={it.id || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex
                      ? 'w-7 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                      : idx < currentIndex
                      ? 'w-3 bg-blue-500/80 hover:bg-blue-400'
                      : 'w-2 bg-slate-700 hover:bg-slate-500'
                  }`}
                  title={`Buka Poin #${idx + 1}: ${it.title}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Content Body (Scrollable) */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-5 text-sm">
          {isEditing ? (
            /* ========================================================= */
            /* MODE EDIT: KELOLA MULTI-POIN PENGUMUMAN                   */
            /* ========================================================= */
            <form id="announcement-form" onSubmit={handleSaveAll} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Kelola Poin Pengumuman ({formState.items.length} Poin)
                </span>
                <button
                  type="button"
                  onClick={handleAddPoint}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Poin Baru</span>
                </button>
              </div>

              {/* Point Tabs Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5">
                {formState.items.map((it, idx) => (
                  <button
                    key={it.id || idx}
                    type="button"
                    onClick={() => setActiveEditIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                      idx === activeEditIndex
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Poin #{idx + 1}
                  </button>
                ))}
              </div>

              {/* Active Point Form Fields */}
              {formState.items[activeEditIndex] && (
                <div className="space-y-3.5 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-300">
                      Pengaturan Poin #{activeEditIndex + 1}
                    </span>
                    {formState.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeletePoint(activeEditIndex)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition cursor-pointer"
                        title="Hapus poin pengumuman ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Poin</span>
                      </button>
                    )}
                  </div>

                  {/* Judul Poin */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Judul Poin Pengumuman <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.items[activeEditIndex].title}
                      onChange={(e) => handleUpdateActivePointField('title', e.target.value)}
                      placeholder="Contoh: Standardisasi Kode Sampel IT"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-hidden transition"
                    />
                  </div>

                  {/* Teks Badge & Aksen Warna */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Label Badge / Kategori Poin
                      </label>
                      <input
                        type="text"
                        value={formState.items[activeEditIndex].badge}
                        onChange={(e) => handleUpdateActivePointField('badge', e.target.value)}
                        placeholder={`Contoh: POIN ${activeEditIndex + 1} • SAMPEL IT`}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-hidden transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Warna Aksen Badge
                      </label>
                      <select
                        value={formState.items[activeEditIndex].badgeType}
                        onChange={(e) => handleUpdateActivePointField('badgeType', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-hidden transition cursor-pointer"
                      >
                        <option value="amber">Kuning / Amber (Pemberitahuan Utama)</option>
                        <option value="blue">Biru (Update Sistem / Informasi)</option>
                        <option value="emerald">Hijau / Emerald (Panduan Standar / SOP)</option>
                        <option value="rose">Merah / Rose (Kritis / Perhatian Penting)</option>
                      </select>
                    </div>
                  </div>

                  {/* Isi Poin */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Isi Pesan Poin Ini <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={formState.items[activeEditIndex].content}
                      onChange={(e) => handleUpdateActivePointField('content', e.target.value)}
                      placeholder="Jelaskan aturan atau instruksi untuk poin ini..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm leading-relaxed focus:border-amber-500 focus:outline-hidden transition resize-y font-sans"
                    />
                  </div>

                  {/* Kotak Format Contoh Poin */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 block">
                      Kotak Format Contoh (Opsional untuk Poin Ini)
                    </span>
                    <div>
                      <label className="block text-[10px] text-emerald-400 mb-0.5">
                        ✅ Format yang Benar / Diwajibkan:
                      </label>
                      <input
                        type="text"
                        value={formState.items[activeEditIndex].exampleCorrect}
                        onChange={(e) => handleUpdateActivePointField('exampleCorrect', e.target.value)}
                        placeholder="Contoh: GGC-RND-2026-XXXX (Mengikuti kode master R&D)"
                        className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-rose-400 mb-0.5">
                        ❌ Format yang Dilarang / Dihindari:
                      </label>
                      <input
                        type="text"
                        value={formState.items[activeEditIndex].exampleWrong}
                        onChange={(e) => handleUpdateActivePointField('exampleWrong', e.target.value)}
                        placeholder="Contoh: Format kode bebas / format acak lama"
                        className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-rose-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-amber-400 mb-0.5">
                        💡 Catatan Tambahan:
                      </label>
                      <input
                        type="text"
                        value={formState.items[activeEditIndex].exampleNotes}
                        onChange={(e) => handleUpdateActivePointField('exampleNotes', e.target.value)}
                        placeholder="Contoh: Wajib HURUF BESAR (UPPERCASE) dan satuan PCE"
                        className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Global Setting: Auto Popup Toggle */}
              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="is-active-toggle"
                  checked={formState.isActive}
                  onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="is-active-toggle" className="text-xs text-slate-300 select-none cursor-pointer">
                  Munculkan popup berantai otomatis saat pengguna membuka web
                </label>
              </div>
            </form>
          ) : (
            /* ========================================================= */
            /* MODE BACA (VIEWER): POPUP POINT TERSENDIRI                 */
            /* ========================================================= */
            <div key={`point-card-${currentIndex}`} className="space-y-4 animate-in fade-in duration-200">
              {/* Judul Poin */}
              <div>
                <h2 id="announcement-title" className="text-lg md:text-xl font-extrabold text-white tracking-tight leading-snug">
                  {currentItem.title}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                  <span>Diumumkan oleh: <strong className="text-slate-200">{currentItem.author || 'Leader / R&D'}</strong></span>
                  <span>•</span>
                  <span>Berlaku Hari Ini</span>
                </div>
              </div>

              {/* Isi Teks Poin */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line space-y-2">
                {currentItem.content}
              </div>

              {/* Kotak Perbandingan Contoh (Jika Diisi) */}
              {(currentItem.exampleCorrect || currentItem.exampleWrong || currentItem.exampleNotes) && (
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2 text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                    Panduan &amp; Standar Input Poin Ini:
                  </span>

                  {currentItem.exampleCorrect && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-emerald-300 block text-[11px]">FORMAT WAJIB / STANDAR R&amp;D:</strong>
                        <span>{currentItem.exampleCorrect}</span>
                      </div>
                    </div>
                  )}

                  {currentItem.exampleWrong && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-rose-950/20 border border-rose-500/20 text-rose-300">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-rose-400 block text-[11px]">DILARANG / TIDAK DIGUNAKAN:</strong>
                        <span>{currentItem.exampleWrong}</span>
                      </div>
                    </div>
                  )}

                  {currentItem.exampleNotes && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-950/20 border border-amber-500/20 text-amber-200 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{currentItem.exampleNotes}</span>
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
                  <span>Simpan &amp; Siarkan Semua Poin</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-2">
              {/* Tombol Sebelumnya (Jika Bukan Poin Pertama) */}
              {currentIndex > 0 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Pemberitahuan internal Tim R&amp;D
                </span>
              )}

              {/* Tombol Selanjutnya atau Selesai */}
              <div className="ml-auto flex items-center gap-2">
                {currentIndex < totalPoints - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-95"
                  >
                    <span>Lanjut ke Poin Berikutnya ({currentIndex + 1}/{totalPoints})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-blue-200" />
                    <span>Saya Mengerti &amp; Selesai ({totalPoints}/{totalPoints})</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnnouncementModal;