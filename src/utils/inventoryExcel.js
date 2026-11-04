export const IMPORT_HEADERS = [
  'Kode', 'Deskripsi', 'Warna', 'Jumlah', 'Nomor Box',
  'Satuan', 'Jenis Sample', 'Sample No', 'Size', 'Buyer No', 'Track', 'Tanggal',
];

export function parseInventoryRows(rows, boxes) {
  const [headers, ...records] = rows;
  if (!headers || IMPORT_HEADERS.some((name, index) => String(headers[index] ?? '').trim() !== name)) {
    throw new Error('Judul kolom tidak cocok. Gunakan template Excel Inventory.');
  }

  const boxesByNumber = new Map(boxes.map(box => [box.boxNumber, box]));
  const items = records.flatMap((record, index) => {
    const values = IMPORT_HEADERS.map((_, column) => String(record[column] ?? '').trim());
    if (values.every(value => !value)) return [];
    const [kode, description, color, quantity, boxNumber, unit, jenisSample,
      sampleNo, size, buyerNo, track, dateIn] = values;
    const box = boxesByNumber.get(Number(boxNumber));
    const qty = Number(quantity);
    const invalid = message => { throw new Error(`Baris ${index + 2}: ${message}`); };

    if (!kode || !description || !color) invalid('isi Kode, Deskripsi, dan Warna.');
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 2147483647) invalid('Jumlah harus bilangan bulat positif.');
    if (!box) invalid('Nomor Box tidak terdaftar.');
    if (box.isFull) invalid(`Box ${box.boxNumber} ditandai penuh.`);
    if (dateIn) {
      const date = new Date(dateIn);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIn) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateIn) {
        invalid('Tanggal harus valid dengan format YYYY-MM-DD.');
      }
    }

    return [{
      kode, sku: kode, name: description, description, deskripsi: description,
      style: description, color, qty, jumlah: qty, unit: unit.toUpperCase() || 'PCS',
      jenisSample: jenisSample.toUpperCase() || 'DEVELOP', sampleNo, size, buyerNo,
      track: track || '-', dateIn, tanggal: dateIn, boxNumber: box.boxNumber,
      rackId: box.rackId, rackName: box.rackName, picName: box.picName, category: box.category,
      place: `BOX ${box.boxNumber} (${box.rackName} - ${box.picName})`,
    }];
  });

  if (!items.length) throw new Error('Belum ada data di lembar Data.');
  return items;
}
