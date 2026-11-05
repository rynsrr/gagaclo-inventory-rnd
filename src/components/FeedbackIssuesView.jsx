import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  MessageSquarePlus,
  Bug,
  Lightbulb,
  Sparkles,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  Plus,
  Search,
  Filter,
  X,
  Edit3,
  Trash2,
  Check,
  ArrowRight,
  MessageCircle,
  Database,
  ChevronDown
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'BUG',
    label: 'Bug / Error',
    icon: Bug,
    color: 'rose',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    badge: 'bg-rose-600 text-white',
    description: 'Terjadi error, tombol tidak berfungsi, atau tampilan bermasalah',
  },
  {
    id: 'FEATURE',
    label: 'Usulan Fitur',
    icon: Lightbulb,
    color: 'amber',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    badge: 'bg-amber-500 text-slate-950',
    description: 'Ide fitur baru yang diinginkan untuk mempermudah pekerjaan',
  },
  {
    id: 'IMPROVEMENT',
    label: 'Perbaikan Alur',
    icon: Sparkles,
    color: 'indigo',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badge: 'bg-indigo-600 text-white',
    description: 'Saran untuk mempercepat, merapikan, atau menyempurnakan fitur yang ada',
  },
  {
    id: 'OTHER',
    label: 'Lainnya',
    icon: HelpCircle,
    color: 'slate',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    badge: 'bg-slate-700 text-white',
    description: 'Pertanyaan umum, kendala data, atau masukan lainnya',
  },
];

const PRIORITIES = [
  { id: 'URGENT', label: 'Mendesak / Urgent', dot: 'bg-rose-500 animate-pulse', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  { id: 'MEDIUM', label: 'Normal / Sedang', dot: 'bg-amber-500', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'LOW', label: 'Rendah / Santai', dot: 'bg-emerald-500', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
];

const STATUS_CONFIG = {
  OPEN: {
    label: 'Menunggu Review',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  IN_PROGRESS: {
    label: 'Sedang Dikerjakan',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500 animate-pulse',
  },
  RESOLVED: {
    label: 'Selesai / Teratasi',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  CLOSED: {
    label: 'Ditutup',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
};

const APP_LOCATIONS = [
  'Halaman Depan / 3D Warehouse',
  'Detail Box & Daftar Barang',
  'Input / Edit Kartu Sampel (KTP)',
  'Tab Ringkasan Semua Barang',
  'Hitung Mundur / Timer Pendataan',
  'Export / Import Excel & Cetak QR',
  'Koneksi Cloud Supabase',
  'Lainnya / Umum',
];

export const FeedbackIssuesView = () => {
  const {
    issues = [],
    addIssue,
    updateIssue,
    deleteIssue,
    ppicMembers = [],
    supabaseStatus,
  } = useInventory();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [responseIssue, setResponseIssue] = useState(null); // { id, notes, status }

  // Create Form State
  const [formCategory, setFormCategory] = useState('BUG');
  const [formPriority, setFormPriority] = useState('MEDIUM');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formReporter, setFormReporter] = useState(ppicMembers[0]?.name || 'Royan');
  const [formLocation, setFormLocation] = useState(APP_LOCATIONS[0]);
  const [formCustomReporter, setFormCustomReporter] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Response / Follow-up state
  const [responseNotes, setResponseNotes] = useState('');
  const [responseStatus, setResponseStatus] = useState('RESOLVED');

  // Stats calculation
  const stats = useMemo(() => {
    const activeBugs = issues.filter(i => i.type === 'BUG' && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
    const features = issues.filter(i => i.type === 'FEATURE').length;
    const improvements = issues.filter(i => i.type === 'IMPROVEMENT').length;
    const resolved = issues.filter(i => i.status === 'RESOLVED').length;
    return { activeBugs, features, improvements, resolved, total: issues.length };
  }, [issues]);

  // Filtered issues
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      // Category filter
      if (selectedCategory !== 'ALL' && issue.type !== selectedCategory) return false;
      // Status filter
      if (selectedStatus === 'ACTIVE') {
        if (issue.status === 'RESOLVED' || issue.status === 'CLOSED') return false;
      } else if (selectedStatus !== 'ALL' && issue.status !== selectedStatus) {
        return false;
      }
      // Priority filter
      if (selectedPriority !== 'ALL' && issue.priority !== selectedPriority) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (issue.title || '').toLowerCase().includes(q);
        const matchDesc = (issue.description || '').toLowerCase().includes(q);
        const matchReporter = (issue.reporterName || '').toLowerCase().includes(q);
        const matchLocation = (issue.location || '').toLowerCase().includes(q);
        const matchNotes = (issue.notes || '').toLowerCase().includes(q);
        return matchTitle || matchDesc || matchReporter || matchLocation || matchNotes;
      }
      return true;
    });
  }, [issues, selectedCategory, selectedStatus, selectedPriority, searchQuery]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formTitle.trim()) {
      setFormError('Judul kendala / usulan wajib diisi.');
      return;
    }
    if (!formDesc.trim()) {
      setFormError('Detail penjelasan wajib diisi agar mudah dipahami tim.');
      return;
    }

    const effectiveReporter = formReporter === '__CUSTOM__' 
      ? (formCustomReporter.trim() || 'Tim R&D')
      : formReporter;

    setIsSubmitting(true);
    try {
      await addIssue({
        title: formTitle,
        description: formDesc,
        type: formCategory,
        priority: formPriority,
        reporterName: effectiveReporter,
        location: formLocation,
      });

      // Reset form
      setFormTitle('');
      setFormDesc('');
      setFormCategory('BUG');
      setFormPriority('MEDIUM');
      setFormCustomReporter('');
      setIsCreateModalOpen(false);
    } catch (err) {
      setFormError(err?.message || 'Gagal menyimpan laporan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveResponse = async () => {
    if (!responseIssue) return;
    try {
      await updateIssue(responseIssue.id, {
        notes: responseNotes.trim(),
        status: responseStatus,
      });
      setResponseIssue(null);
    } catch (err) {
      alert('Gagal menyimpan respon: ' + err.message);
    }
  };

  const openResponseDialog = (issue) => {
    setResponseIssue(issue);
    setResponseNotes(issue.notes || '');
    setResponseStatus(issue.status || 'RESOLVED');
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getCategoryInfo = (type) => {
    return CATEGORIES.find(c => c.id === type) || CATEGORIES[3];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Intro */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="bg-rose-50 text-rose-600 p-2 rounded-xl border border-rose-200">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                Issue, Error &amp; Usulan Fitur
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Wadah penampungan laporan bug, kendala alur, serta ide dan usulan perbaikan dari pengguna.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {supabaseStatus?.isConnected && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cloud Realtime Synced</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-900/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Laporan / Usulan Baru</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Bug & Error Aktif */}
        <div 
          onClick={() => { setSelectedCategory('BUG'); setSelectedStatus('ACTIVE'); }}
          className="bg-white rounded-xl p-4 border border-slate-200 hover:border-rose-300 shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Kendala &amp; Bug Aktif</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-100 transition">
              <Bug className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-rose-600">{stats.activeBugs}</span>
            <span className="text-[11px] text-slate-400 font-medium">perlu ditangani</span>
          </div>
        </div>

        {/* Card 2: Usulan Fitur Baru */}
        <div 
          onClick={() => { setSelectedCategory('FEATURE'); setSelectedStatus('ALL'); }}
          className="bg-white rounded-xl p-4 border border-slate-200 hover:border-amber-300 shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Usulan Fitur</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition">
              <Lightbulb className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-amber-600">{stats.features}</span>
            <span className="text-[11px] text-slate-400 font-medium">ide tercatat</span>
          </div>
        </div>

        {/* Card 3: Perbaikan Alur */}
        <div 
          onClick={() => { setSelectedCategory('IMPROVEMENT'); setSelectedStatus('ALL'); }}
          className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Perbaikan Alur</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-indigo-600">{stats.improvements}</span>
            <span className="text-[11px] text-slate-400 font-medium">saran optimasi</span>
          </div>
        </div>

        {/* Card 4: Selesai Ditangani */}
        <div 
          onClick={() => { setSelectedCategory('ALL'); setSelectedStatus('RESOLVED'); }}
          className="bg-white rounded-xl p-4 border border-slate-200 hover:border-emerald-300 shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Telah Selesai</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-600">{stats.resolved}</span>
            <span className="text-[11px] text-slate-400 font-medium">telah rilis / fix</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari laporan berdasarkan judul, detail, atau nama pelapor..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Belum Selesai (Aktif)</option>
              <option value="OPEN">Menunggu Review</option>
              <option value="IN_PROGRESS">Sedang Dikerjakan</option>
              <option value="RESOLVED">Selesai / Teratasi</option>
              <option value="CLOSED">Ditutup</option>
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Prioritas</option>
              <option value="URGENT">Mendesak / Urgent</option>
              <option value="MEDIUM">Normal / Sedang</option>
              <option value="LOW">Rendah / Santai</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-500 mr-1 text-[11px] uppercase tracking-wider">Kategori:</span>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({issues.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = issues.filter(i => i.type === cat.id).length;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                  selectedCategory === cat.id
                    ? cat.badge
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span className="ml-1 opacity-80 text-[11px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
            <MessageSquarePlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Belum ada laporan yang sesuai</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Tidak ada kendala atau usulan yang cocok dengan kriteria pencarian dan filter yang dipilih.
            </p>
            <button
              onClick={() => { setSelectedCategory('ALL'); setSelectedStatus('ALL'); setSelectedPriority('ALL'); setSearchQuery(''); }}
              className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs"
            >
              Reset Semua Filter
            </button>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const cat = getCategoryInfo(issue.type);
            const CatIcon = cat.icon;
            const statusInfo = STATUS_CONFIG[issue.status] || STATUS_CONFIG.OPEN;
            const priorityInfo = PRIORITIES.find(p => p.id === issue.priority) || PRIORITIES[1];

            return (
              <div
                key={issue.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition space-y-3"
              >
                {/* Header row: Badges & Status */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center flex-wrap gap-2">
                    {/* Category badge */}
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cat.bg}`}>
                      <CatIcon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </span>

                    {/* Priority badge */}
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${priorityInfo.color}`}>
                      <span className={`w-2 h-2 rounded-full ${priorityInfo.dot}`}></span>
                      <span>{priorityInfo.label}</span>
                    </span>

                    {/* Location */}
                    {issue.location && (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{issue.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Status Dropdown / Pill */}
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <select
                        value={issue.status}
                        onChange={(e) => updateIssue(issue.id, { status: e.target.value })}
                        className={`text-xs font-bold px-3 py-1 rounded-lg border appearance-none pr-7 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusInfo.color}`}
                        title="Klik untuk ubah status secara langsung"
                      >
                        <option value="OPEN">🟡 Menunggu Review</option>
                        <option value="IN_PROGRESS">🔵 Sedang Dikerjakan</option>
                        <option value="RESOLVED">🟢 Selesai / Teratasi</option>
                        <option value="CLOSED">⚪ Ditutup</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 pointer-events-none absolute right-2 top-2 text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    {issue.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">
                    {issue.description}
                  </p>
                </div>

                {/* Follow-up Notes / Developer Response (if any) */}
                {issue.notes && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start space-x-2.5 text-xs">
                    <MessageCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                        Respon / Tindak Lanjut Tim:
                      </span>
                      <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">
                        {issue.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer: Reporter, Date & Actions */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex items-center flex-wrap gap-3">
                    <span className="flex items-center space-x-1 font-semibold text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Pelapor: <strong>{issue.reporterName}</strong></span>
                    </span>
                    <span className="flex items-center space-x-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDate(issue.createdAt)}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => openResponseDialog(issue)}
                      className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
                      title="Beri Catatan Tindak Lanjut"
                    >
                      Respon / Catatan
                    </button>

                    {issue.status !== 'RESOLVED' && (
                      <button
                        type="button"
                        onClick={() => updateIssue(issue.id, { status: 'RESOLVED' })}
                        className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                        title="Tandai Selesai"
                      >
                        Selesai
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`Hapus laporan "${issue.title}"?`)) {
                          try {
                            await deleteIssue(issue.id);
                          } catch (err) {
                            console.error('Delete issue error:', err);
                          }
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Hapus Laporan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Modal: Buat Laporan / Usulan Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="inventory-dialog-heading px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <MessageSquarePlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-black text-slate-900 text-sm uppercase">
                  Buat Laporan Issue / Usulan Baru
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Category selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Pilih Kategori Laporan:</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = formCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex items-start space-x-2 ${
                          isSelected
                            ? `${cat.bg} border-current ring-1 ring-current font-bold`
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-xs">{cat.label}</div>
                          <div className="text-[10px] opacity-80 line-clamp-1">{cat.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Tingkat Urgensi / Prioritas:</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITIES.map(pri => (
                    <button
                      key={pri.id}
                      type="button"
                      onClick={() => setFormPriority(pri.id)}
                      className={`py-2 px-2.5 rounded-xl border text-center transition font-bold flex items-center justify-center space-x-1.5 ${
                        formPriority === pri.id
                          ? `${pri.color} border-current ring-1 ring-current`
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${pri.dot}`}></span>
                      <span>{pri.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Judul Kendala / Usulan <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Misal: Tombol pindah box tidak merespon di browser Safari"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              {/* Detail & Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Detail &amp; Penjelasan Lengkap <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={4}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Jelaskan kronologi kendala, langkah-langkah yang dilakukan saat error muncul, atau gambaran ide fitur yang diinginkan..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              {/* Reporter Name & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Reporter */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Pelapor / PIC:</label>
                  <select
                    value={formReporter}
                    onChange={(e) => setFormReporter(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ppicMembers.map(p => (
                      <option key={p.id} value={p.name}>{p.name} ({p.role || 'PPIC'})</option>
                    ))}
                    <option value="__CUSTOM__">+ Ketik Nama Lain...</option>
                  </select>

                  {formReporter === '__CUSTOM__' && (
                    <input
                      type="text"
                      value={formCustomReporter}
                      onChange={(e) => setFormCustomReporter(e.target.value)}
                      placeholder="Masukkan nama Anda..."
                      className="mt-1.5 w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bagian Terkait:</label>
                  <select
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {APP_LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 font-bold text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-md transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Mengirim...' : 'Kirim Laporan / Usulan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Respon / Tindak Lanjut */}
      {responseIssue && (
        <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden flex flex-col">
            <div className="inventory-dialog-heading px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-black text-slate-900 text-sm uppercase">
                Tindak Lanjut &amp; Respon Tim
              </h3>
              <button
                onClick={() => setResponseIssue(null)}
                className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">Laporan:</span>
                <p className="font-black text-slate-900 text-sm mt-0.5">{responseIssue.title}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Laporan:</label>
                <select
                  value={responseStatus}
                  onChange={(e) => setResponseStatus(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-xs"
                >
                  <option value="OPEN">🟡 Menunggu Review</option>
                  <option value="IN_PROGRESS">🔵 Sedang Dikerjakan</option>
                  <option value="RESOLVED">🟢 Selesai / Teratasi</option>
                  <option value="CLOSED">⚪ Ditutup</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Tindak Lanjut / Solusi:
                </label>
                <textarea
                  rows={3}
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Misal: Sudah ditangani dan bug fix rilis pada build v1.2..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setResponseIssue(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveResponse}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-md transition"
                >
                  Simpan Catatan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
