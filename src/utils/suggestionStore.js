/**
 * Suggestion Store for GAGACLO R&D Inventory
 * 
 * Automatically remembers all inputted values for:
 * - Buyer No
 * - Style (Nama/No Style)
 * - Sample No
 * - Size
 * - Color / Warna
 * - Track (Kurir & AWB)
 * - Satuan (Unit)
 * 
 * "buat smua data yang dinput mudah dipakai ulang, jadi bisa jadi list, jika baru maka otomatis menambah data"
 */

const STORAGE_KEY = 'gagaclo_custom_suggestions_v2';

export const INITIAL_PRESETS = {
  buyerNo: [
    'UNIQLO',
    'GAP',
    'H&M',
    'ZARA',
    'GU',
    'MANGO',
    'PULL&BEAR',
    'ADIDAS',
    'NIKE',
    'LEVIS',
    'TOMMY HILFIGER',
    'CALVIN KLEIN',
    'AMERICAN EAGLE',
    'MASSIMO DUTTI',
    'BERSHKA'
  ],
  style: [
    'OVERSIZED T-SHIRT',
    'BASIC CREWNECK TEE',
    'HEAVYWEIGHT TEE',
    'POLO SHIRT PIQUE',
    'PULLOVER HOODIE FLEECE',
    'ZIPPER HOODIE',
    'CREWNECK SWEATER',
    'CHINO PANTS SLIM',
    'CARGO PANTS RELAXED',
    'DENIM JACKET 14OZ',
    'JOGGER FLEECE PANTS',
    'BERMUDA SHORTS',
    'RAYON SHIRT CASUAL'
  ],
  sampleNo: [
    'SMPL-001',
    'SMPL-002',
    'SMPL-003',
    '1ST FIT',
    '2ND FIT',
    'PROTO-1',
    'PROTO-2',
    'PPS (PRE-PRODUCTION)',
    'SMS (SALESMAN SAMPLE)',
    'SIZE SET',
    'COUNTER SAMPLE',
    'APPROVAL SAMPLE'
  ],
  size: [
    'XS',
    'S',
    'M',
    'L',
    'XL',
    '2XL',
    '3XL',
    '4XL',
    '28',
    '29',
    '30',
    '31',
    '32',
    '33',
    '34',
    '36',
    'FREE SIZE',
    'ALL SIZE'
  ],
  color: [
    'BLACK',
    'WHITE',
    'NAVY',
    'GREY MELANGE',
    'CHARCOAL',
    'BEIGE',
    'KHAKI',
    'OLIVE GREEN',
    'SAGE GREEN',
    'MAROON',
    'BROWN',
    'CREAM',
    'MUSTARD',
    'TERRACOTTA',
    'OFF WHITE',
    'BABY BLUE',
    'DUSTY PINK',
    'LILAC',
    'DARK CHOCOLATE'
  ],
  track: [
    'DHL EXPRESS',
    'FEDEX PRIORITY',
    'JNE REGULER',
    'JNE YES',
    'J&T CARGO',
    'SICEPAT CARGO',
    'INTERNAL R&D',
    'BUYER HAND CARRY',
    'VENDOR DELIVERY',
    'SAMPLE ROOM EXPEDITION'
  ],
  satuan: [
    'PCS',
    'YARD',
    'METER',
    'ROLL',
    'SET',
    'DZN',
    'PACK'
  ]
};

/**
 * Reads user custom-added suggestions from localStorage
 */
export function getCustomSuggestions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca custom suggestions dari localStorage:', err);
  }
  return {};
}

/**
 * Saves custom suggestions into localStorage
 */
export function saveCustomSuggestions(customObj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customObj));
  } catch (err) {
    console.warn('Gagal menyimpan custom suggestions ke localStorage:', err);
  }
}

/**
 * Builds merged, unique suggestion lists from:
 * 1. Initial presets
 * 2. All items currently in inventory (items array)
 * 3. User custom-added suggestions stored in localStorage
 */
export function getMergedSuggestions(items = []) {
  const custom = getCustomSuggestions();
  const merged = {};

  const fields = ['buyerNo', 'style', 'sampleNo', 'size', 'color', 'track', 'satuan'];

  fields.forEach(field => {
    const presetValues = INITIAL_PRESETS[field] || [];
    const customValues = Array.isArray(custom[field]) ? custom[field] : [];

    // Extract values from existing inventory items
    const itemValues = [];
    if (Array.isArray(items)) {
      items.forEach(item => {
        let val = '';
        if (field === 'buyerNo') val = item.buyerNo || item.buyerNumber;
        else if (field === 'style') val = item.style || item.name || item.deskripsi;
        else if (field === 'sampleNo') val = item.sampleNo;
        else if (field === 'size') val = item.size;
        else if (field === 'color') val = item.color;
        else if (field === 'track') val = item.track;
        else if (field === 'satuan') val = item.satuan || item.unit;

        if (val && typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed && trimmed !== '-' && trimmed !== 'NA') {
            itemValues.push(trimmed);
          }
        }
      });
    }

    // Combine all and deduplicate case-insensitively
    const seen = new Set();
    const result = [];

    // Custom and item values have priority at top
    [...customValues, ...itemValues, ...presetValues].forEach(val => {
      if (!val || typeof val !== 'string') return;
      const clean = val.trim();
      if (!clean || clean === '-' || clean === 'NA') return;
      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(clean);
      }
    });

    merged[field] = result;
  });

  return merged;
}

/**
 * Records newly inputted values.
 * If any value is new (not in custom list), automatically appends it and persists.
 * Returns the updated merged suggestions list.
 */
export function recordInputtedData(newRecord = {}, currentItems = []) {
  const custom = getCustomSuggestions();
  let changed = false;

  const fields = ['buyerNo', 'style', 'sampleNo', 'size', 'color', 'track', 'satuan'];

  fields.forEach(field => {
    let val = newRecord[field];
    if (!val || typeof val !== 'string') return;
    const clean = val.trim();
    if (!clean || clean === '-' || clean === 'NA') return;

    if (!Array.isArray(custom[field])) {
      custom[field] = [];
    }

    const lower = clean.toLowerCase();
    const exists = custom[field].some(v => String(v).trim().toLowerCase() === lower);

    if (!exists) {
      // Put newest at the front of custom suggestions!
      custom[field] = [clean, ...custom[field]];
      changed = true;
    }
  });

  if (changed) {
    saveCustomSuggestions(custom);
  }

  return getMergedSuggestions(currentItems);
}

/**
 * Removes an option from custom suggestions (e.g. if user made a typo)
 */
export function removeSuggestionItem(field, valueToRemove, currentItems = []) {
  if (!field || !valueToRemove) return getMergedSuggestions(currentItems);

  const custom = getCustomSuggestions();
  if (Array.isArray(custom[field])) {
    const lowerToRemove = String(valueToRemove).trim().toLowerCase();
    custom[field] = custom[field].filter(v => String(v).trim().toLowerCase() !== lowerToRemove);
    saveCustomSuggestions(custom);
  }

  return getMergedSuggestions(currentItems);
}
