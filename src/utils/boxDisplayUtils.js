/**
 * Utility untuk penomoran tampilan box penyimpanan.
 * - Rak 1 - 5: boxNumber 1 s/d 72 ditampilkan sebagai "1" s/d "72".
 * - Lemari 1: boxNumber internal 73 s/d 82 ditampilkan sebagai "1A", "1B", ..., "1J" (10 box carton coklat).
 * - Lemari 2 (jika ditambahkan): "2A", "2B", dst.
 *
 * Secara internal boxNumber tetap integer agar 100% kompatibel dengan skema
 * kolom integer box_number pada tabel Supabase (boxes & items).
 */
export function getBoxDisplayNumber(boxOrNumber) {
  if (boxOrNumber && typeof boxOrNumber === 'object') {
    const num = Number(boxOrNumber.boxNumber ?? boxOrNumber.box_number);
    if (num >= 73 && num <= 82) {
      return `1${String.fromCharCode(64 + (num - 72))}`;
    }
    if (boxOrNumber.displayNumber) {
      return String(boxOrNumber.displayNumber).toUpperCase();
    }
    return formatNumericBoxNumber(num);
  }
  return formatNumericBoxNumber(Number(boxOrNumber));
}

function formatNumericBoxNumber(num) {
  if (!Number.isFinite(num) || num <= 0) return String(num || '');
  // Lemari 1: 10 box carton coklat (internal 73..82 -> 1A..1J)
  if (num >= 73 && num <= 82) {
    return `1${String.fromCharCode(64 + (num - 72))}`;
  }
  return String(num);
}

/**
 * Mengubah input user (seperti "1A", "1b", "BOX 1J", "16") menjadi internal boxNumber (integer).
 * Mengembalikan null jika tidak ditemukan.
 */
export function parseBoxInputToNumber(rawInput, boxes = []) {
  const clean = String(rawInput || '').trim().toUpperCase().replace(/^BOX\s*#?\s*/i, '').replace(/^#/, '').trim();
  if (!clean) return null;

  // 1. Cocokkan langsung terhadap displayNumber atau code pada daftar boxes
  if (Array.isArray(boxes) && boxes.length > 0) {
    const matched = boxes.find((b) => {
      const disp = getBoxDisplayNumber(b).toUpperCase();
      const code = String(b.code || '').toUpperCase();
      return disp === clean || code === clean || code === `BOX-${clean}`;
    });
    if (matched) return Number(matched.boxNumber);
  }

  // 2. Pola Lemari 1 langsung (1A - 1J)
  const lemari1Match = clean.match(/^1([A-J])$/i);
  if (lemari1Match) {
    const letterIdx = lemari1Match[1].toUpperCase().charCodeAt(0) - 64; // A=1..J=10
    if (letterIdx >= 1 && letterIdx <= 10) return 72 + letterIdx;
  }

  // 3. Angka biasa
  if (/^\d+$/.test(clean)) {
    const n = parseInt(clean, 10);
    if (Array.isArray(boxes) && boxes.length > 0) {
      return boxes.some((b) => Number(b.boxNumber) === n) ? n : null;
    }
    return n > 0 ? n : null;
  }

  return null;
}
