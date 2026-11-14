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
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header Sederhana */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Isu & Usulan Tim</h1>
          <p className="text-xs text-slate-500">
            Catat kendala, usulan perbaikan, atau ide fitur dengan cepat
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {openCount} Belum Selesai
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {doneCount} Selesai
          </span>
        </div>
      </div>

      {/* Form Input Cepat */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis kendala atau usulan di sini... (contoh: Box 14 di Rak 2 miring / tambah fitur export)"
          rows={3}
          className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none text-slate-800 placeholder-slate-400"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-500 font-medium mr-1">PPIC:</span>
            {PIC_OPTIONS.map((pic) => (
              <button
                key={pic}
                type="button"
                onClick={() => setSelectedPic(pic)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  selectedPic === pic
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pic}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!text.trim()}
            className="text-xs px-4 py-2 rounded-lg font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            + Kirim Usulan
          </button>
        </div>
      </form>

      {/* Toolbar Filter & Pencarian */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
              filter === 'ALL'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({issues.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('OPEN')}
            className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
              filter === 'OPEN'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Belum ({openCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('RESOLVED')}
            className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
              filter === 'RESOLVED'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
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
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 w-full sm:w-56"
        />
      </div>

      {/* List Catatan */}
      <div className="space-y-2">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
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
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                  isDone
                    ? 'bg-slate-50/70 border-slate-200 text-slate-400'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                }`}
              >
                {/* Checkbox status */}
                <button
                  type="button"
                  onClick={() => handleToggleStatus(issue)}
                  title={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
                  className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border text-xs transition-colors ${
                    isDone
                      ? 'bg-emerald-500 border-emerald-600 text-white'
                      : 'border-slate-300 hover:border-sky-500 bg-white'
                  }`}
                >
                  {isDone ? '✓' : ''}
                </button>

                {/* Konten */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isDone ? 'line-through text-slate-400' : 'text-slate-800'
                    }`}
                  >
                    {issue.description || issue.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                    <span className="font-medium text-slate-600">
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
                  className="text-slate-300 hover:text-rose-500 p-1 text-sm transition-colors shrink-0"
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
