/**
 * Utility untuk penomoran tampilan box penyimpanan.
 * - Rak 1 - 5: boxNumber 1 s/d 72 ditampilkan sebagai "1" s/d "72".
 * - Lemari 1 - 12 (rackId 6 s/d 17): boxNumber internal 73 s/d 192 ditampilkan sebagai:
 *   Lemari 1  -> "1A" s/d "1J"   (73 - 82)
 *   Lemari 2  -> "2A" s/d "2J"   (83 - 92)
 *   ...
 *   Lemari 12 -> "12A" s/d "12J" (183 - 192)
 *
 * Secara internal boxNumber tetap integer agar 100% kompatibel dengan skema
 * kolom integer box_number pada tabel Supabase (boxes & items).
 */
export const LEMARI_COUNT = 12;
export const BOXES_PER_LEMARI = 10;
export const LEMARI_BOX_START = 73;
export const LEMARI_BOX_END = LEMARI_BOX_START + LEMARI_COUNT * BOXES_PER_LEMARI - 1; // 192

const PPIC_NAME_TO_LABEL = {
  royan: 'PPIC 1',
  cynara: 'PPIC 2',
  ami: 'PPIC 3',
  ryan: 'PPIC 4',
  hanami: 'PPIC 5',
};

/**
 * Mengonversi nama personal PIC (Royan, Cynara, Ami, Ryan, Hanami)
 * menjadi label standar PPIC 1 - PPIC 5 untuk ditampilkan pada label box & kartu sampel.
 * Jika kosong (seperti box campur pada Lemari 1 - 12), mengembalikan string kosong.
 */
export function formatPicToPpicLabel(picNameOrBox) {
  let rawName = '';
  let ppicNum = 0;
  if (picNameOrBox && typeof picNameOrBox === 'object') {
    rawName = String(picNameOrBox.picName ?? picNameOrBox.pic_name ?? '').trim();
    ppicNum = Number(picNameOrBox.ppicNumber ?? 0);
  } else {
    rawName = String(picNameOrBox ?? '').trim();
  }
  if (!rawName || rawName === '-' || rawName.toUpperCase() === 'NA') return '';
  const mapped = PPIC_NAME_TO_LABEL[rawName.toLowerCase()];
  if (mapped) return mapped;
  if (/^PPIC\s*\d+$/i.test(rawName)) return rawName.toUpperCase();
  if (ppicNum >= 1 && ppicNum <= 5) return `PPIC ${ppicNum}`;
  return rawName;
}

export function isLemariBoxNumber(num) {
  const n = Number(num);
  return Number.isFinite(n) && n >= LEMARI_BOX_START && n <= LEMARI_BOX_END;
}

export function getBoxDisplayNumber(boxOrNumber) {
  if (boxOrNumber && typeof boxOrNumber === 'object') {
    const num = Number(boxOrNumber.boxNumber ?? boxOrNumber.box_number);
    if (isLemariBoxNumber(num)) {
      return formatNumericBoxNumber(num);
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
  // Lemari 1 - 12: 120 box carton coklat (internal 73..192 -> 1A..12J)
  if (num >= LEMARI_BOX_START && num <= LEMARI_BOX_END) {
    const offset = num - LEMARI_BOX_START;
    const lemariIndex = Math.floor(offset / BOXES_PER_LEMARI) + 1; // 1..12
    const boxInLemari = offset % BOXES_PER_LEMARI; // 0..9 -> A..J
    return `${lemariIndex}${String.fromCharCode(65 + boxInLemari)}`;
  }
  return String(num);
}

/**
 * Mengubah input user (seperti "1A", "2b", "12J", "BOX 5C", "16") menjadi internal boxNumber (integer).
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

  // 2. Pola Lemari 1 - 12 langsung (1A - 12J)
  const lemariMatch = clean.match(/^(\d+)([A-J])$/i);
  if (lemariMatch) {
    const lemariIdx = parseInt(lemariMatch[1], 10);
    const letterIdx = lemariMatch[2].toUpperCase().charCodeAt(0) - 65; // A=0..J=9
    if (lemariIdx >= 1 && lemariIdx <= LEMARI_COUNT && letterIdx >= 0 && letterIdx < BOXES_PER_LEMARI) {
      return LEMARI_BOX_START + (lemariIdx - 1) * BOXES_PER_LEMARI + letterIdx;
    }
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
