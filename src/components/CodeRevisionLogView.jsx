import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardList, Download, Search, Trash2 } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { formatToDDMMYYYY } from '../utils/dateUtils';

const SOURCE_FILTERS = [
  { id: 'ALL', label: 'Semua' },
  { id: 'EDIT', label: 'Edit Manual' },
  { id: 'IMPOR EXCEL', label: 'Impor Excel' },
  { id: 'REKAM HISTORIS', label: 'Rekam Historis' },
];

export function CodeRevisionLogView() {
  const { codeRevisions = [], deleteCodeRevision } = useInventory();
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return codeRevisions.filter((revision) => {
      if (sourceFilter !== 'ALL') {
        const source = String(revision.source || '').toUpperCase();
        if (sourceFilter === 'EDIT' && !source.startsWith('EDIT')) return false;
        if (sourceFilter === 'IMPOR EXCEL' && !source.includes('IMPOR')) return false;
        if (sourceFilter === 'REKAM HISTORIS' && !source.includes('HISTORIS')) return false;
      }
      if (!query) return true;
      return (
        String(revision.oldCode || '').toLowerCase().includes(query) ||
        String(revision.newCode || '').toLowerCase().includes(query) ||
        String(revision.itemName || '').toLowerCase().includes(query) ||
        String(revision.actor || '').toLowerCase().includes(query) ||
        String(revision.boxNumber ?? '').includes(query)
      );
    });
  }, [codeRevisions, sourceFilter, search]);

  const exportCsv = () => {
    const header = ['Tanggal', 'Kode Lama', 'Kode Baru', 'Box', 'Nama Item', 'Sumber', 'Diubah Oleh'];
    const rows = filtered.map(revision => [
      revision.createdAt ? new Date(revision.createdAt).toLocaleString('id-ID') : '',
      revision.oldCode || '',
      revision.newCode || '',
      revision.boxNumber ?? '',
      revision.itemName || '',
      revision.source || '',
      revision.actor || '',
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GAGACLO_REVISI_KODE_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-0 py-4 space-y-4 font-apple">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-black/[0.06] pb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#1d1d1f] tracking-tight">Riwayat Revisi Kode</h1>
          <p className="text-xs text-[#86868b]">
            Jejak audit perubahan kode: dari kode lama menjadi kode baru, beserta pelaku dan waktunya
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1 rounded-full bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/25 tabular-nums">
            {codeRevisions.length} Revisi
          </span>
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0071e3] text-white hover:bg-[#0077ed] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer min-h-[36px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh CSV</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="inline-flex items-center gap-0.5 bg-black/[0.04] p-1 rounded-full border border-black/[0.05] self-start">
          {SOURCE_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSourceFilter(option.id)}
              className={`text-xs px-3 py-1 rounded-full font-semibold transition cursor-pointer select-none ${
                sourceFilter === option.id
                  ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86868b]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode, item, box, atau PIC..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-black/[0.08] bg-black/[0.02] text-[#1d1d1f] placeholder-[#86868b] focus:outline-hidden focus:ring-2 focus:ring-[#0071e3]/20 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Empty & loading states */}
      {codeRevisions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 rounded-[22px] bg-black/[0.02] border border-dashed border-black/[0.08] text-center">
          <ClipboardList className="w-6 h-6 text-[#86868b]" />
          <p className="text-xs font-semibold text-[#1d1d1f]">Belum ada revisi kode tercatat</p>
          <p className="text-[11px] text-[#86868b] max-w-sm leading-relaxed">
            Setiap kali kode item diubah lewat edit item atau impor Excel, perubahan akan otomatis muncul di sini.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 rounded-[22px] bg-black/[0.02] border border-dashed border-black/[0.08] text-center text-xs text-[#86868b]">
          Tidak ada revisi yang cocok dengan filter atau pencarian.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-[18px] border border-black/[0.07] bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/[0.03] text-[#86868b] uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Waktu</th>
                  <th className="px-3 py-2.5 font-semibold">Kode Lama</th>
                  <th className="px-3 py-2.5 font-semibold">Kode Baru</th>
                  <th className="px-3 py-2.5 font-semibold">Box</th>
                  <th className="px-3 py-2.5 font-semibold">Nama Item</th>
                  <th className="px-3 py-2.5 font-semibold">Sumber</th>
                  <th className="px-3 py-2.5 font-semibold">Diubah Oleh</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((revision) => (
                  <tr key={revision.id} className="border-t border-black/[0.05] hover:bg-black/[0.015]">
                    <td className="px-3 py-2.5 text-[#86868b] whitespace-nowrap tabular-nums">
                      {formatRevisionTime(revision.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[#86868b] line-through">{revision.oldCode || '-'}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-[#1d1d1f]">
                        <ArrowRight className="w-3 h-3 text-[#0071e3]" />
                        {revision.newCode || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[#1d1d1f] tabular-nums">
                      {revision.boxNumber ? `Box ${revision.boxNumber}` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-[#1d1d1f] max-w-[280px]">
                      <span className="block truncate">{revision.itemName || '-'}</span>
                      {revision.reason ? (
                        <span className="block text-[10px] text-[#86868b] truncate">{revision.reason}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-black/[0.05] text-[10px] font-semibold text-[#1d1d1f]">
                        {revision.source || 'EDIT'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[#86868b]">{revision.actor || '-'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Hapus catatan revisi ${revision.oldCode} menjadi ${revision.newCode}?`)) {
                            deleteCodeRevision(revision.id);
                          }
                        }}
                        title="Hapus catatan revisi"
                        className="p-1.5 rounded-md text-[#86868b] hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((revision) => (
              <div key={revision.id} className="rounded-[18px] border border-black/[0.07] bg-white p-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="text-[#86868b] line-through">{revision.oldCode}</span>
                    <ArrowRight className="w-3 h-3 text-[#0071e3]" />
                    <span className="font-bold text-[#1d1d1f]">{revision.newCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Hapus catatan revisi ${revision.oldCode} menjadi ${revision.newCode}?`)) {
                        deleteCodeRevision(revision.id);
                      }
                    }}
                    title="Hapus catatan revisi"
                    className="p-1.5 rounded-md text-[#86868b] hover:text-rose-600 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-[#1d1d1f] break-words">{revision.itemName || '-'}</p>
                {revision.reason ? (
                  <p className="mt-0.5 text-[11px] text-[#86868b] break-words">{revision.reason}</p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[#86868b]">
                  {revision.boxNumber ? <span>Box {revision.boxNumber}</span> : null}
                  <span>• {revision.source || 'EDIT'}</span>
                  <span>• @{revision.actor || '-'}</span>
                  <span>• {formatRevisionTime(revision.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-[#86868b]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34c759]" />
            Menampilkan {filtered.length} dari {codeRevisions.length} revisi. Maksimal 500 catatan terbaru disimpan.
          </p>
        </>
      )}
    </div>
  );
}

function formatRevisionTime(value) {
  if (!value) return '-';
  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '-';
    const datePart = formatToDDMMYYYY(value) || date.toISOString().slice(0, 10);
    return `${datePart} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '-';
  }
}

export default CodeRevisionLogView;
