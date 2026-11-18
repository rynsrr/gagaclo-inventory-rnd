/**
 * Pengumpul rekam historis revisi kode.
 *
 * Sumber bukti yang nyata di data (tanpa mengarang):
 * 1. Tag item `reclassified_from:<KODE_LAMA>` pada item yang kodenya sudah diganti sistem.
 * 2. Transaksi lama yang `sku`-nya berbeda dengan kode item saat ini.
 */

export const HISTORICAL_SOURCE = 'REKAM HISTORIS';

const upper = (value) => String(value ?? '').trim().toUpperCase();

function decodeTagValue(tag) {
  try {
    return decodeURIComponent(String(tag).slice('reclassified_from:'.length));
  } catch {
    return String(tag).slice('reclassified_from:'.length);
  }
}

function resolveItemActor(item) {
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  const inputted = tags.find(tag => typeof tag === 'string' && tag.startsWith('inputted_by:'));
  if (inputted) {
    try {
      return decodeURIComponent(inputted.slice('inputted_by:'.length));
    } catch {
      return null;
    }
  }
  return item?.inputtedBy || null;
}

export function collectHistoricalCodeRevisions(items = [], transactions = []) {
  const safeItems = Array.isArray(items) ? items : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const found = [];

  safeItems.forEach(item => {
    const tags = Array.isArray(item?.tags) ? item.tags : [];
    const tag = tags.find(entry => typeof entry === 'string' && entry.startsWith('reclassified_from:'));
    if (!tag) return;

    const oldCode = upper(decodeTagValue(tag));
    const newCode = upper(item.kode || item.sku);
    if (!oldCode || !newCode || oldCode === newCode) return;

    found.push({
      oldCode,
      newCode,
      itemId: item.id ? String(item.id) : null,
      itemName: item.name || item.description || item.style || '',
      boxNumber: item.boxNumber !== undefined ? Number(item.boxNumber) : null,
      source: HISTORICAL_SOURCE,
      reason: 'Reklasifikasi kategori material menjadi sample',
      actor: resolveItemActor(item) || 'Sistem',
      createdAt: item.updatedAt || item.createdAt || null,
    });
  });

  const itemById = new Map(safeItems.map(item => [String(item.id), item]));
  safeTransactions.forEach(trx => {
    if (!trx?.itemId) return;
    const item = itemById.get(String(trx.itemId));
    if (!item) return;

    const oldCode = upper(trx.sku);
    const newCode = upper(item.kode || item.sku);
    if (!oldCode || !newCode || oldCode === newCode) return;

    found.push({
      oldCode,
      newCode,
      itemId: String(item.id),
      itemName: item.name || trx.itemName || '',
      boxNumber: item.boxNumber !== undefined ? Number(item.boxNumber) : null,
      source: HISTORICAL_SOURCE,
      reason: `Transaksi ${trx.type || 'IN'} ${trx.date || ''} memakai kode lama`.trim(),
      actor: trx.picName || resolveItemActor(item) || 'Sistem',
      createdAt: item.updatedAt || item.createdAt || trx.date || null,
    });
  });

  return found;
}

export function filterUnrecordedRevisions(candidates = [], existing = [], skippedKeys = []) {
  const seen = new Set(
    (Array.isArray(existing) ? existing : []).map(rev => revisionKey(rev))
  );
  (Array.isArray(skippedKeys) ? skippedKeys : []).forEach(key => seen.add(String(key)));

  return (Array.isArray(candidates) ? candidates : []).filter(candidate => {
    const key = revisionKey(candidate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function revisionKey(revision) {
  return `${revision?.itemId || ''}|${upper(revision?.oldCode)}|${upper(revision?.newCode)}`;
}
