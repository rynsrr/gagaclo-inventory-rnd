/**
 * Utility tanggal & pencatatan record PPIC
 */

/**
 * Normalisasi format tanggal apapun ke standar DD-MM-YYYY
 * - Padding leading zero untuk hari & bulan (D-M-YYYY -> DD-MM-YYYY)
 * - Ubah pemisah apapun (/, ., spasi, _, koma) menjadi '-'
 * - Konversi nama bulan huruf (jan, januari, nov, dll.) menjadi angka (01, 11)
 * - Konversi tahun 2 digit (26 -> 2026)
 * - Dukung YYYY-MM-DD -> DD-MM-YYYY
 * - Pertahankan 'NA' atau '-'
 */
export function formatToDDMMYYYY(str) {
  if (!str) return '';
  const cleanStr = String(str).trim();
  if (cleanStr === 'NA' || cleanStr === '-' || cleanStr.toUpperCase() === 'NA') return 'NA';

  const monthNames = {
    jan: '01', januari: '01', january: '01',
    feb: '02', februari: '02', february: '02',
    mar: '03', maret: '03', march: '03',
    apr: '04', april: '04',
    mei: '05', may: '05',
    jun: '06', juni: '06', june: '06',
    jul: '07', juli: '07', july: '07',
    agu: '08', ags: '08', agustus: '08', aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    okt: '10', oktober: '10', oct: '10', october: '10',
    nov: '11', nop: '11', november: '11',
    des: '12', desember: '12', dec: '12', december: '12',
  };

  // 1. Format ISO/Database YYYY-MM-DD atau YYYY/MM/DD
  if (/^\d{4}[-/. _]\d{1,2}[-/. _]\d{1,2}$/.test(cleanStr)) {
    const [y, m, d] = cleanStr.split(/[-/. _]/);
    return `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`;
  }

  // 2. Format tanggal dengan nama bulan di tengah: "15-nov-2026", "1/januari/2026", "15 nov 26"
  const textMonthMatch = cleanStr.match(/^(\d{1,2})[-/. _]+([A-Za-z]+)[-/. _]+(\d{2,4})$/);
  if (textMonthMatch) {
    const d = textMonthMatch[1].padStart(2, '0');
    const mKey = textMonthMatch[2].toLowerCase();
    const m = monthNames[mKey] || monthNames[mKey.slice(0, 3)] || '01';
    let y = textMonthMatch[3];
    if (y.length === 2) y = `20${y}`;
    return `${d}-${m}-${y}`;
  }

  // 3. Format dengan nama bulan di depan: "Nov 15, 2026" atau "Januari 1 2026"
  const textMonthMatch2 = cleanStr.match(/^([A-Za-z]+)[-/. _]+(\d{1,2})[-/. _,]+(\d{2,4})$/);
  if (textMonthMatch2) {
    const mKey = textMonthMatch2[1].toLowerCase();
    const m = monthNames[mKey] || monthNames[mKey.slice(0, 3)] || '01';
    const d = textMonthMatch2[2].padStart(2, '0');
    let y = textMonthMatch2[3];
    if (y.length === 2) y = `20${y}`;
    return `${d}-${m}-${y}`;
  }

  // 4. Format numerik dengan pemisah apapun: "1-5-2026", "15/11/2026", "15.11.2026", "1 5 2026", "1-5-26"
  const numericMatch = cleanStr.match(/^(\d{1,2})[-/. _,]+(\d{1,2})[-/. _,]+(\d{2,4})$/);
  if (numericMatch) {
    const d = numericMatch[1].padStart(2, '0');
    const m = numericMatch[2].padStart(2, '0');
    let y = numericMatch[3];
    if (y.length === 2) y = `20${y}`;
    return `${d}-${m}-${y}`;
  }

  // 5. String 8 digit padat: "15112026" (DDMMYYYY) atau "20261115" (YYYYMMDD)
  if (/^\d{8}$/.test(cleanStr)) {
    if (cleanStr.startsWith('20')) {
      const y = cleanStr.slice(0, 4);
      const m = cleanStr.slice(4, 6);
      const d = cleanStr.slice(6, 8);
      return `${d}-${m}-${y}`;
    } else {
      const d = cleanStr.slice(0, 2);
      const m = cleanStr.slice(2, 4);
      const y = cleanStr.slice(4, 8);
      return `${d}-${m}-${y}`;
    }
  }

  return cleanStr;
}

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
