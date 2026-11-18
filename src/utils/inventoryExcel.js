export const IMPORT_HEADERS = [
  'Kode', 'Deskripsi', 'Warna', 'Jumlah', 'Nomor Box',
  'Satuan', 'Jenis Sample', 'Sample No', 'Size', 'Buyer No', 'Track', 'Tanggal',
];

const REQUIRED_HEADERS = ['Kode', 'Deskripsi', 'Warna', 'Jumlah', 'Nomor Box'];

const normalizeHeader = (value) => String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');

export function resolveDataSheet(workbook) {
  const names = workbook?.SheetNames || [];
  const sheetName = names.find(name => normalizeHeader(name) === 'DATA') || names[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : null;
  if (!sheet) throw new Error('File Excel tidak memiliki lembar kerja yang bisa dibaca.');
  return { sheetName, sheet };
}

export function parseInventoryRows(rows, boxes) {
  const headerRowIndex = rows
    .slice(0, 15)
    .findIndex(row => Array.isArray(row) && row.some(cell => normalizeHeader(cell) === 'DESKRIPSI'));

  if (headerRowIndex < 0) {
    throw new Error('Baris judul kolom tidak ditemukan. Gunakan template Excel Inventory.');
  }

  const headerRow = rows[headerRowIndex];
  const columns = {};
  IMPORT_HEADERS.forEach(label => {
    const index = headerRow.findIndex(cell => normalizeHeader(cell) === normalizeHeader(label));
    if (index >= 0) columns[label] = index;
  });

  const missing = REQUIRED_HEADERS.filter(label => columns[label] === undefined);
  if (missing.length) {
    throw new Error(`Kolom wajib tidak ditemukan: ${missing.join(', ')}. Gunakan template Excel Inventory.`);
  }

  const boxesByNumber = new Map(boxes.map(box => [Number(box.boxNumber), box]));
  const items = [];
  const sourceRows = [];

  rows.slice(headerRowIndex + 1).forEach((record, index) => {
    const values = IMPORT_HEADERS.map(label => {
      const column = columns[label];
      return column === undefined ? '' : String(record[column] ?? '').trim();
    });
    if (values.every(value => !value)) return;

    const [kode, description, color, quantity, boxNumber, unit, jenisSample,
      sampleNo, size, buyerNo, track, dateIn] = values;
    const box = boxesByNumber.get(Number(boxNumber));
    const qty = Number(quantity);
    const sourceRow = headerRowIndex + index + 2;
    const invalid = message => { throw new Error(`Baris ${sourceRow}: ${message}`); };

    if (!description || !color) invalid('isi Deskripsi dan Warna.');
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 2147483647) invalid('Jumlah harus bilangan bulat positif.');
    if (!box) invalid('Nomor Box tidak terdaftar.');
    if (box.isFull) invalid(`Box ${box.boxNumber} ditandai penuh.`);
    if (dateIn) {
      const date = new Date(dateIn);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIn) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateIn) {
        invalid('Tanggal harus valid dengan format YYYY-MM-DD.');
      }
    }

    items.push({
      kode, sku: kode, name: description, description, deskripsi: description,
      style: description, color, qty, jumlah: qty, unit: unit.toUpperCase() || 'PCS',
      jenisSample: jenisSample.toUpperCase() || 'DEVELOP', sampleNo, size, buyerNo,
      track: track || '-', dateIn, tanggal: dateIn, boxNumber: box.boxNumber,
      rackId: box.rackId, rackName: box.rackName, picName: box.picName, category: box.category,
      place: `BOX ${box.boxNumber} (${box.rackName} - ${box.picName})`,
    });
    sourceRows.push(sourceRow);
  });

  if (!items.length) throw new Error('Belum ada data di lembar Data.');
  return { items, sourceRows, kodeColumn: columns.Kode };
}

export function applyCodesToWorkbook(workbook, sheetName, items, sourceRows, kodeColumn, XLSX) {
  const sheet = workbook.Sheets[sheetName];
  items.forEach((item, index) => {
    const row = sourceRows[index];
    if (!row) return;
    const address = XLSX.utils.encode_cell({ r: row - 1, c: kodeColumn });
    sheet[address] = { t: 's', v: item.kode };
  });
  return workbook;
}

export function downloadWorkbook(workbook, fileName, XLSX) {
  XLSX.writeFile(workbook, fileName);
}
