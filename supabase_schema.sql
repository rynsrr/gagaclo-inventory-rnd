-- ========================================================
-- GAGACLO INVENTORY & SAMPLE DATABASE SCHEMA (SUPABASE)
-- R&D Storage Management • 5 Racks • 72 Boxes
-- Jalankan query ini di SQL Editor dashboard Supabase Anda:
-- ========================================================

-- 1. Tabel Items (Sampel Barang & Material)
CREATE TABLE IF NOT EXISTS public.items (
    id TEXT PRIMARY KEY,
    sku TEXT,
    kode TEXT,
    buyer_no TEXT DEFAULT '-',
    jenis_sample TEXT DEFAULT 'DEVELOP',
    style TEXT,
    sample_no TEXT DEFAULT '',
    size TEXT,
    name TEXT,
    description TEXT,
    deskripsi TEXT,
    color TEXT,
    qty NUMERIC DEFAULT 1,
    jumlah NUMERIC DEFAULT 1,
    unit TEXT DEFAULT 'PCS',
    satuan TEXT DEFAULT 'PCS',
    box_number INTEGER DEFAULT 1,
    rack_id INTEGER DEFAULT 1,
    rack_name TEXT DEFAULT 'RACK 1',
    pic_name TEXT DEFAULT 'Royan',
    category TEXT DEFAULT 'SAMPLE',
    status TEXT DEFAULT 'In Storage',
    track TEXT DEFAULT '-',
    place TEXT,
    date_in TEXT,
    tanggal TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Boxes (Status 72 Kotak & Catatan)
CREATE TABLE IF NOT EXISTS public.boxes (
    box_number INTEGER PRIMARY KEY,
    code TEXT,
    rack_id INTEGER,
    rack_name TEXT,
    category TEXT,
    pic_name TEXT,
    notes TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Transactions (Riwayat Keluar Masuk & Peminjaman)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    item_id TEXT,
    item_name TEXT,
    sku TEXT,
    box_number INTEGER,
    type TEXT, -- 'IN', 'OUT', 'BORROW', 'RETURN', 'RELOCATE'
    qty NUMERIC DEFAULT 1,
    unit TEXT DEFAULT 'PCS',
    pic_name TEXT,
    date TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Issues & Usulan (Laporan Bug, Error, Usulan Fitur & Perbaikan)
CREATE TABLE IF NOT EXISTS public.issues (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT DEFAULT 'BUG', -- 'BUG', 'FEATURE', 'IMPROVEMENT', 'OTHER'
    priority TEXT DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    status TEXT DEFAULT 'OPEN', -- 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    reporter_name TEXT DEFAULT 'Royan',
    location TEXT DEFAULT 'Umum',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant full DML permissions to anon and authenticated roles
GRANT ALL ON public.items TO anon, authenticated, service_role;
GRANT ALL ON public.boxes TO anon, authenticated, service_role;
GRANT ALL ON public.transactions TO anon, authenticated, service_role;
GRANT ALL ON public.issues TO anon, authenticated, service_role;

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Buat Policy Akses Penuh untuk Public / Anon Key
DROP POLICY IF EXISTS "Public Full Access Items" ON public.items;
CREATE POLICY "Public Full Access Items" ON public.items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Boxes" ON public.boxes;
CREATE POLICY "Public Full Access Boxes" ON public.boxes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Transactions" ON public.transactions;
CREATE POLICY "Public Full Access Transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Issues" ON public.issues;
CREATE POLICY "Public Full Access Issues" ON public.issues FOR ALL USING (true) WITH CHECK (true);

-- Aktifkan Realtime Replication untuk tabel items, boxes, dan issues
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'boxes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.boxes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'issues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.issues;
  END IF;
END $$;
