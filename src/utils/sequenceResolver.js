/**
 * Sequence Resolver: Utilities for calculating and auto-resolving sequential sample codes
 * and preventing race-condition duplicate numbers when multiple users edit simultaneously.
 */

/**
 * Calculates next sequential code: SAMPLE-00001, SAMPLE-00002, etc. (5-digit numbering)
 * Increments sequentially based on existing items in storage.
 */
export function getNextSampleCode(items = []) {
  let maxSeq = 0;
  if (Array.isArray(items)) {
    items.forEach(item => {
      const code = String(item.kode || item.sku || '');
      const match = code.match(/SAMPLE[-_ ]?(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
  }
  const nextSeq = maxSeq + 1;
  return `SAMPLE-${String(nextSeq).padStart(5, '0')}`;
}

/**
 * Resolves race conditions when two or more users attempt to save items with the same sequential code.
 * If the desired code is already in use by another item, it finds the next available unique code.
 *
 * @param {string} desiredCode - The code requested by the user / form
 * @param {Array} existingItems - All items currently stored (local + remote)
 * @param {string|number|null} currentItemId - The item ID being edited (to exclude self)
 * @returns {{ finalCode: string, wasAdjusted: boolean, originalCode: string }}
 */
export function resolveUniqueCode(desiredCode, existingItems = [], currentItemId = null) {
  const codeTrim = String(desiredCode || '').trim();
  if (!codeTrim) {
    const nextCode = getNextSampleCode(existingItems);
    return { finalCode: nextCode, wasAdjusted: true, originalCode: '' };
  }

  const isTaken = (testCode) => {
    const target = String(testCode || '').trim().toUpperCase();
    return existingItems.some(i => 
      String(i.id) !== String(currentItemId) &&
      String(i.kode || i.sku || '').trim().toUpperCase() === target
    );
  };

  if (!isTaken(codeTrim)) {
    return { finalCode: codeTrim, wasAdjusted: false, originalCode: codeTrim };
  }

  // Conflict detected! The code is already taken by another item.
  // Check if it ends with numbers (e.g. SAMPLE-00078 or SMP-123)
  const match = codeTrim.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1]; // e.g. "SAMPLE-" or "SMP-"
    const digitsLen = match[2].length;
    let num = parseInt(match[2], 10);

    // If it's standard SAMPLE- sequence, scan highest existing number across all items
    if (/^SAMPLE[-_ ]?$/i.test(prefix)) {
      let maxSeq = 0;
      existingItems.forEach(i => {
        if (String(i.id) === String(currentItemId)) return;
        const m = String(i.kode || i.sku || '').match(/SAMPLE[-_ ]?(\d+)/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n > maxSeq) maxSeq = n;
        }
      });
      num = Math.max(num, maxSeq);
    }

    let candidate;
    do {
      num++;
      candidate = `${prefix}${String(num).padStart(digitsLen, '0')}`;
    } while (isTaken(candidate));

    return { finalCode: candidate, wasAdjusted: true, originalCode: codeTrim };
  } else {
    // Custom non-numeric code (e.g. "DEVELOP")
    let counter = 2;
    let candidate = `${codeTrim}-${counter}`;
    while (isTaken(candidate)) {
      counter++;
      candidate = `${codeTrim}-${counter}`;
    }
    return { finalCode: candidate, wasAdjusted: true, originalCode: codeTrim };
  }
}
