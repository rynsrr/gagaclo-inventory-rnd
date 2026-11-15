import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';

const PIC_OPTIONS = ['Royan', 'Cynara', 'Ami', 'Ryan', 'Hanami'];

export function FeedbackIssuesView() {
  const { issues, addIssue, updateIssue, deleteIssue } = useInventory();
  const [text, setText] = useState('');
  const [selectedPic, setSelectedPic] = useState('Royan');
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'OPEN', 'RESOLVED'
  const [search, setSearch] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    addIssue({
      title: trimmed.length > 60 ? trimmed.slice(0, 57) + '...' : trimmed,
      description: trimmed,
      type: 'IMPROVEMENT',
      priority: 'MEDIUM',
      reporterName: selectedPic,
      location: 'Sistem Inventory',
    });

    setText('');
  };

  const handleToggleStatus = (issue) => {
    const isDone = issue.status === 'RESOLVED' || issue.status === 'CLOSED';
    updateIssue(issue.id, {
      status: isDone ? 'OPEN' : 'RESOLVED',
    });
  };

  const filteredIssues = issues.filter((issue) => {
    const isDone = issue.status === 'RESOLVED' || issue.status === 'CLOSED';
    if (filter === 'OPEN' && isDone) return false;
    if (filter === 'RESOLVED' && !isDone) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchText = (issue.description || issue.title || '').toLowerCase();
      const matchPic = (issue.reporterName || '').toLowerCase();
      if (!matchText.includes(q) && !matchPic.includes(q)) return false;
    }
    return true;
  });

  const openCount = issues.filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED'
  ).length;
  const doneCount = issues.length - openCount;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 font-apple">
      {/* Header Sederhana */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-black/[0.06] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#1d1d1f] tracking-tight">Isu &amp; Usulan Tim</h1>
          <p className="text-xs text-[#86868b]">
            Catat kendala, usulan perbaikan, atau ide fitur dengan cepat
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1 rounded-full bg-[#ff9500]/15 text-[#c96700] border border-[#ff9500]/25 tabular-nums">
            {openCount} Belum Selesai
          </span>
          <span className="px-3 py-1 rounded-full bg-[#34c759]/15 text-[#30d158] border border-[#34c759]/25 tabular-nums">
            {doneCount} Selesai
          </span>
        </div>
      </div>

      {/* Form Input Cepat (Apple Inset Grouped Style) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white/90 backdrop-blur-xl border border-black/[0.08] rounded-[22px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis kendala atau usulan di sini... (contoh: Box 14 di Rak 2 miring / tambah fitur export)"
          rows={3}
          className="w-full text-sm rounded-[14px] border border-black/[0.08] bg-black/[0.02] p-3 focus:outline-hidden focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] focus:bg-white resize-none text-[#1d1d1f] placeholder-[#86868b] transition"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-[#86868b] font-medium mr-1">PPIC:</span>
            {PIC_OPTIONS.map((pic) => (
              <button
                key={pic}
                type="button"
                onClick={() => setSelectedPic(pic)}
                className={`text-xs px-3 py-1 rounded-full font-semibold transition-all cursor-pointer select-none border ${
                  selectedPic === pic
                    ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                    : 'bg-black/[0.03] hover:bg-black/[0.06] text-[#86868b] border-black/[0.06]'
                }`}
              >
                {pic}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!text.trim()}
            className="text-xs px-4 py-2 rounded-full font-semibold bg-[#0071e3] text-white hover:bg-[#0077ed] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
          >
            + Kirim Usulan
          </button>
        </div>
      </form>

      {/* Toolbar Filter & Pencarian (Apple Segmented Capsule) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="inline-flex items-center gap-0.5 bg-black/[0.04] p-1 rounded-full border border-black/[0.05] self-start">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`text-xs px-3 sm:px-3.5 py-1 rounded-full font-semibold transition-all cursor-pointer select-none ${
              filter === 'ALL'
                ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Semua ({issues.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('OPEN')}
            className={`text-xs px-3 sm:px-3.5 py-1 rounded-full font-semibold transition-all cursor-pointer select-none ${
              filter === 'OPEN'
                ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Belum ({openCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('RESOLVED')}
            className={`text-xs px-3 sm:px-3.5 py-1 rounded-full font-semibold transition-all cursor-pointer select-none ${
              filter === 'RESOLVED'
                ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Selesai ({doneCount})
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari catatan..."
          className="text-xs px-3.5 py-1.5 rounded-full border border-black/[0.07] bg-black/[0.03] text-[#1d1d1f] placeholder-[#86868b] focus:outline-hidden focus:ring-2 focus:ring-[#0071e3]/20 focus:bg-white w-full sm:w-56 transition"
        />
      </div>

      {/* List Catatan */}
      <div className="space-y-2">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-10 bg-black/[0.02] border border-dashed border-black/[0.08] rounded-[20px] text-[#86868b] text-xs">
            {issues.length === 0
              ? 'Belum ada isu atau usulan tercatat. Tulis langsung di atas!'
              : 'Tidak ada catatan yang cocok dengan filter.'}
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const isDone =
              issue.status === 'RESOLVED' || issue.status === 'CLOSED';
            const dateStr = issue.createdAt
              ? new Date(issue.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '';

            return (
              <div
                key={issue.id}
                className={`flex items-start gap-3 p-4 rounded-[18px] border transition-colors ${
                  isDone
                    ? 'bg-black/[0.02] border-black/[0.05] text-[#86868b]'
                    : 'bg-white border-black/[0.06] hover:border-black/[0.12] text-[#1d1d1f] shadow-2xs'
                }`}
              >
                {/* Checkbox status */}
                <button
                  type="button"
                  onClick={() => handleToggleStatus(issue)}
                  title={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border text-xs transition-colors cursor-pointer ${
                    isDone
                      ? 'bg-[#34c759] border-[#34c759] text-white'
                      : 'border-black/[0.15] hover:border-[#0071e3] bg-white'
                  }`}
                >
                  {isDone ? '✓' : ''}
                </button>

                {/* Konten */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isDone ? 'line-through text-[#86868b]' : 'text-[#1d1d1f]'
                    }`}
                  >
                    {issue.description || issue.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-[#86868b]">
                    <span className="font-semibold text-[#1d1d1f]">
                      @{issue.reporterName || 'Anonim'}
                    </span>
                    {dateStr && <span>• {dateStr}</span>}
                  </div>
                </div>

                {/* Hapus */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Hapus usulan ini?')) {
                      deleteIssue(issue.id);
                    }
                  }}
                  title="Hapus"
                  className="text-slate-300 hover:text-rose-500 p-1 text-sm transition-colors shrink-0 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default FeedbackIssuesView;
