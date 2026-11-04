import fs from 'fs';
import { generateInitialBoxes, INITIAL_ITEMS, INITIAL_TRANSACTIONS } from '../src/data/initialData.js';

const boxes = generateInitialBoxes();
const items = INITIAL_ITEMS;
const trxs = INITIAL_TRANSACTIONS;

let sql = `-- ========================================================
-- SEED DATA GAGACLO INVENTORY & SAMPLE DATABASE (SUPABASE)
-- Jalankan query ini di SQL Editor Supabase Corporate Gagaclo
-- ========================================================

-- 1. INSERT 72 MASTER BOXES
INSERT INTO public.boxes (box_number, code, rack_id, rack_name, category, pic_name, notes) VALUES
`;

const boxRows = boxes.map(b => {
  const notes = (b.notes || '').replace(/'/g, "''");
  return `(${b.boxNumber}, '${b.code}', ${b.rackId}, '${b.rackName}', '${b.category}', '${b.picName}', '${notes}')`;
}).join(',\n');

sql += boxRows + '\nON CONFLICT (box_number) DO UPDATE SET notes = EXCLUDED.notes;\n\n';

// 2. Items
sql += `-- 2. INSERT INITIAL ITEMS / SAMPLE
INSERT INTO public.items (id, sku, kode, buyer_no, jenis_sample, style, sample_no, size, name, deskripsi, description, color, qty, jumlah, unit, satuan, box_number, rack_id, rack_name, pic_name, category, status, date_in, tanggal, tags) VALUES
`;

const itemRows = items.map(i => {
  const id = i.id;
  const sku = (i.sku || '').replace(/'/g, "''");
  const kode = sku;
  const buyerNo = '-';
  const jenisSample = 'DEVELOP';
  const style = (i.name || '').replace(/'/g, "''");
  const sampleNo = '';
  const size = (i.size || '-').replace(/'/g, "''");
  const name = style;
  const desc = (i.description || '').replace(/'/g, "''");
  const color = (i.color || '-').replace(/'/g, "''");
  const qty = Number(i.qty) || 1;
  const unit = (i.unit || 'PCS').toUpperCase();
  const boxNum = i.boxNumber;
  const rackId = i.rackId;
  const rackName = 'RACK ' + rackId;
  const picName = i.picName;
  const cat = i.category || 'SAMPLE';
  const status = i.status || 'In Storage';
  const dateIn = i.dateIn || '2026-11-01';
  const tags = JSON.stringify(i.tags || []);

  return `('${id}', '${sku}', '${kode}', '${buyerNo}', '${jenisSample}', '${style}', '${sampleNo}', '${size}', '${name}', '${desc}', '${desc}', '${color}', ${qty}, ${qty}, '${unit}', '${unit}', ${boxNum}, ${rackId}, '${rackName}', '${picName}', '${cat}', '${status}', '${dateIn}', '${dateIn}', '${tags}'::jsonb)`;
}).join(',\n');

sql += itemRows + '\nON CONFLICT (id) DO NOTHING;\n\n';

// 3. Transactions
if (trxs && trxs.length > 0) {
  sql += `-- 3. INSERT TRANSACTIONS
INSERT INTO public.transactions (id, item_id, item_name, sku, box_number, type, qty, unit, pic_name, date, notes) VALUES
`;
  const trxRows = trxs.map(t => {
    const id = t.id;
    const itemId = t.itemId || '';
    const itemName = (t.itemName || '').replace(/'/g, "''");
    const sku = (t.sku || '').replace(/'/g, "''");
    const boxNum = t.boxNumber ? Number(t.boxNumber) : 'NULL';
    const type = t.type || 'IN';
    const qty = Number(t.qty) || 1;
    const unit = (t.unit || 'PCS').toUpperCase();
    const pic = (t.picName || '').replace(/'/g, "''");
    const date = t.date || '';
    const notes = (t.notes || '').replace(/'/g, "''");
    return `('${id}', '${itemId}', '${itemName}', '${sku}', ${boxNum}, '${type}', ${qty}, '${unit}', '${pic}', '${date}', '${notes}')`;
  }).join(',\n');

  sql += trxRows + '\nON CONFLICT (id) DO NOTHING;\n';
}

fs.writeFileSync('supabase_seed_data.sql', sql, 'utf8');
console.log('Successfully generated supabase_seed_data.sql');
