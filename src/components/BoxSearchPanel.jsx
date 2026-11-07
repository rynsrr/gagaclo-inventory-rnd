import React, { useEffect, useRef } from 'react';
import { Box as BoxIcon, Package, Pencil, Search, X } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

// Fields scanned when the user searches. Boxes and items use different shapes
// because items come from both the local seed data and Supabase imports.
const BOX_FIELDS = [
  'boxNumber', 'code', 'picName', 'rackName', 'rackDescription', 'location',
  'category', 'rackType', 'notes',
];

const ITEM_FIELDS = [
  'kode', 'sku', 'name', 'style', 'buyerNo', 'buyerNumber', 'sampleNo',
  'color', 'size', 'description', 'status', 'track', 'picName', 'boxNumber',
  'place', 'jenisSample', 'tanggal', 'dateIn', 'tags',
];

const MAX_VISIBLE = 6;

function containsText(value, query) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some((entry) => containsText(entry, query));
  return String(value).toLowerCase().includes(query);
}

function matchesRecord(record, fields, query) {
  return fields.some((field) => containsText(record[field], query));
}

/**
 * Pure search helper shared by App (3D highlighting) and the sidebar panel.
 * Returns a Set of box numbers that match either a box or an item inside it.
 */
export function computeSearchResults(boxes = [], items = [], query = '') {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) {
    return {
      active: false,
      query: '',
      boxMatches: [],
      itemMatches: [],
      matchedBoxNumbers: new Set(),
    };
  }

  const bareNumber = q.replace(/^#/, '').replace(/^box\s*/i, '');

  const boxMatches = boxes
    .filter((box) =>
      matchesRecord(box, BOX_FIELDS, q) ||
      String(box.boxNumber) === bareNumber
    )
    .sort((a, b) => Number(a.boxNumber) - Number(b.boxNumber));

  const itemMatches = items.filter((item) =>
    matchesRecord(item, ITEM_FIELDS, q) ||
    String(item.boxNumber) === bareNumber
  );

  const matchedBoxNumbers = new Set();
  boxMatches.forEach((box) => matchedBoxNumbers.add(Number(box.boxNumber)));
  itemMatches.forEach((item) => matchedBoxNumbers.add(Number(item.boxNumber)));

  return { active: true, query: q, boxMatches, itemMatches, matchedBoxNumbers };
}

const itemTitle = (item) =>
  item.kode || item.sku || item.style || item.name || item.description || 'Tanpa kode';

const itemSubtitle = (item) =>
  [
    item.style && item.style !== itemTitle(item) ? item.style : null,
    item.buyerNo || item.buyerNumber,
    item.color && item.color !== '-' ? item.color : null,
  ].filter(Boolean).join(' • ');

export function BoxSearchPanel({ query, onQueryChange, results }) {
  const inputRef = useRef(null);
  const { setSelectedBoxNumber, setItemModalConfig, getItemsInBox } = useInventory();

  // Ctrl/Cmd + K focuses the search; Escape clears it while focused.
  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && (key === 'f' || key === 'k')) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        onQueryChange('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onQueryChange]);

  const openBox = (boxNumber) => setSelectedBoxNumber(Number(boxNumber));
  const openItem = (item) => setItemModalConfig({
    isOpen: true,
    item,
    targetBoxNumber: Number(item.boxNumber),
  });

  const { active, boxMatches, itemMatches, matchedBoxNumbers } = results;

  return (
    <section className="inventory-search-panel no-print" aria-label="Pencarian box dan barang">
      <label htmlFor="inventory-global-search" className="inventory-sidebar-label">
        PENCARIAN
      </label>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="inventory-global-search"
          ref={inputRef}
          type="text"
          inputMode="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Cari box atau barang..."
          autoComplete="off"
          className="w-full rounded-xl border border-slate-200/90 bg-slate-50/80 py-2.5 pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100/60 transition shadow-2xs"
        />
        {active && (
          <button
            type="button"
            onClick={() => { onQueryChange(''); inputRef.current?.focus(); }}
            aria-label="Hapus pencarian"
            title="Hapus pencarian"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {!active ? (
        <p className="mt-2 text-[10px] leading-relaxed text-slate-400 font-medium">
          Cari nomor box, kode, style, PIC, atau rak. Tekan{' '}
          <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans font-bold text-slate-600 shadow-2xs">Ctrl</kbd> +{' '}
          <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans font-bold text-slate-600 shadow-2xs">F</kbd> untuk fokus cepat.
        </p>
      ) : (
        <div className="inventory-search-results mt-2 space-y-2">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-blue-50/90 border border-blue-200/90 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 shadow-2xs">
            <span>{matchedBoxNumbers.size} box cocok &amp; disorot</span>
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="shrink-0 text-blue-600 underline underline-offset-2 hover:text-blue-800 font-semibold"
            >
              Reset
            </button>
          </div>

          {matchedBoxNumbers.size === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-[11px] text-slate-400 bg-slate-50/50">
              Tidak ada box atau barang yang cocok.
            </p>
          )}

          {boxMatches.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Box ({boxMatches.length})
              </p>
              <div className="space-y-1">
                {boxMatches.slice(0, MAX_VISIBLE).map((box) => (
                  <button
                    key={`box-${box.boxNumber}`}
                    type="button"
                    onClick={() => openBox(box.boxNumber)}
                    className="flex w-full items-center gap-2 rounded-xl border border-transparent p-2 text-left transition hover:border-blue-200 hover:bg-blue-50/80 active:scale-98"
                    title={`Buka detail Box #${box.boxNumber}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-black text-[10px] shadow-2xs">
                      <BoxIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-slate-800">
                        BOX #{box.boxNumber}
                      </span>
                      <span className="block truncate text-[10px] text-slate-500 font-medium">
                        {box.rackName || 'LANTAI'} • {box.picName || '-'}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {getItemsInBox(box.boxNumber).length}
                    </span>
                  </button>
                ))}
                {boxMatches.length > MAX_VISIBLE && (
                  <p className="px-2 text-[10px] text-slate-400">
                    +{boxMatches.length - MAX_VISIBLE} box lainnya, persempit kata kunci.
                  </p>
                )}
              </div>
            </div>
          )}

          {itemMatches.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Barang ({itemMatches.length})
              </p>
              <div className="space-y-1">
                {itemMatches.slice(0, MAX_VISIBLE).map((item, index) => (
                  <div
                    key={item.id || `item-${index}`}
                    className="flex items-center gap-1 rounded-lg border border-transparent px-1.5 py-1.5 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <button
                      type="button"
                      onClick={() => openBox(item.boxNumber)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      title={`Buka BOX #${item.boxNumber} yang berisi barang ini`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                        <Package className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-slate-800">
                          {itemTitle(item)}
                        </span>
                        <span className="block truncate text-[10px] text-slate-500">
                          BOX #{item.boxNumber}
                          {itemSubtitle(item) ? ` • ${itemSubtitle(item)}` : ''}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      aria-label={`Edit ${itemTitle(item)}`}
                      title="Edit barang ini"
                      className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-blue-600"
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {itemMatches.length > MAX_VISIBLE && (
                  <p className="px-2 text-[10px] text-slate-400">
                    +{itemMatches.length - MAX_VISIBLE} barang lainnya, persempit kata kunci.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
