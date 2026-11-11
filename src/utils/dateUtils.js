/**
 * Utility tanggal & pencatatan record PPIC
 */

export function getLocalTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Normalisasi format tanggal apapun ke YYYY-MM-DD
 */
export function normalizeDateKey(val) {
  if (!val || val === 'NA' || val === '-') return null;
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
    const [d, m, y] = str.split(/[-/]/);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

/**
 * Mendapatkan tanggal pengerjaan/input (record date) oleh PPIC
 * BUKAN berdasarkan tanggal sample!
 */
export function getItemRecordDate(item) {
  if (!item) return null;

  // 1. created_at / createdAt dari Supabase / database (Format ISO: '2026-11-10T07:15:23.000Z')
  const rawCreated = item.createdAt || item.created_at;
  if (rawCreated) {
    const d = new Date(rawCreated);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // 2. Ekstrak timestamp dari id format item-TIMESTAMP-RANDOM (contoh: item-1731219800000-abcd)
  if (typeof item.id === 'string' && /^item-(\d{12,14})/i.test(item.id)) {
    const match = item.id.match(/^item-(\d{12,14})/i);
    if (match && match[1]) {
      const ts = Number(match[1]);
      const d = new Date(ts);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2024) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
  }

  // 3. Fallback ke updated_at / updatedAt jika ada
  const rawUpdated = item.updatedAt || item.updated_at;
  if (rawUpdated) {
    const d = new Date(rawUpdated);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // 4. Fallback ke dateIn jika diformat YYYY-MM-DD
  if (item.dateIn && /^\d{4}-\d{2}-\d{2}$/.test(item.dateIn)) {
    return item.dateIn;
  }

  // 5. Fallback terakhir jika data lama tidak ada timestamp
  return normalizeDateKey(item.dateIn) || normalizeDateKey(item.tanggal) || null;
}

/**
 * Format string YYYY-MM-DD ke teks bahasa Indonesia (contoh: 12 Nov 2026)
 */
export function formatDateIndo(isoDateStr) {
  if (!isoDateStr) return '-';
  const parts = String(isoDateStr).split('-');
  if (parts.length !== 3) return isoDateStr;
  const [y, m, d] = parts;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthIdx = Number(m) - 1;
  return `${Number(d)} ${months[monthIdx] || m} ${y}`;
}

/**
 * Format string YYYY-MM-DD ke teks bahasa Indonesia lengkap: Tanggal, Bulan dan Tahun (contoh: 12 November 2026)
 */
export function formatDateIndoFull(isoDateStr) {
  if (!isoDateStr) return '-';
  const parts = String(isoDateStr).split('-');
  if (parts.length !== 3) return isoDateStr;
  const [y, m, d] = parts;
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthIdx = Number(m) - 1;
  return `${Number(d)} ${months[monthIdx] || m} ${y}`;
}
