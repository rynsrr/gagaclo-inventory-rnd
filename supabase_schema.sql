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

-- ========================================================
-- 5. ATOMIC MULTI-USER SEQUENCE COUNTERS & UNIQUE INDEX
-- (Perlindungan Anti-Bentrok Kode Sample & Material Antar Komputer)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.sequence_counters (
    category TEXT PRIMARY KEY,
    last_value INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL ON public.sequence_counters TO anon, authenticated, service_role;
ALTER TABLE public.sequence_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access Sequence Counters" ON public.sequence_counters;
CREATE POLICY "Public Full Access Sequence Counters" ON public.sequence_counters FOR ALL USING (true) WITH CHECK (true);

-- Fungsi Atomik Postgres: Mengunci dan mengambil nomor urut berikutnya tanpa bentrok
CREATE OR REPLACE FUNCTION public.get_next_sequence_code(p_category TEXT DEFAULT 'SAMPLE')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cat TEXT := UPPER(TRIM(COALESCE(p_category, 'SAMPLE')));
    v_prefix TEXT := CASE WHEN v_cat = 'MATERIAL' THEN 'MAT-' ELSE 'SAMPLE-' END;
    v_next_val INTEGER;
    v_max_existing INTEGER := 0;
BEGIN
    -- Cari nomor urut tertinggi secara aman (tidak akan crash jika ada kode teks/kosong)
    SELECT COALESCE(MAX(
        CASE 
            WHEN kode ~ '\d+' THEN ((regexp_match(kode, '(\d+)'))[1])::INTEGER 
            ELSE 0 
        END
    ), 0)
    INTO v_max_existing
    FROM public.items
    WHERE kode ILIKE v_prefix || '%'
      AND status != 'DELETED'
      AND box_number > 0;

    -- Upsert atomic sequence counter dengan row-level lock
    INSERT INTO public.sequence_counters (category, last_value, updated_at)
    VALUES (v_cat, GREATEST(v_max_existing, 0) + 1, NOW())
    ON CONFLICT (category) DO UPDATE
    SET last_value = GREATEST(sequence_counters.last_value, v_max_existing) + 1,
        updated_at = NOW()
    RETURNING last_value INTO v_next_val;

    -- Format kode 5 digit: SAMPLE-00001 atau MAT-00001
    v_code := v_prefix || LPAD(v_next_val::TEXT, 5, '0');
    RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_sequence_code(TEXT) TO anon, authenticated, service_role;

-- Index unik pada kode untuk mencegah duplikasi di level database engine
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_unique_kode 
ON public.items (UPPER(TRIM(kode))) 
WHERE (status != 'DELETED' AND box_number > 0 AND kode IS NOT NULL AND kode != '');

-- Trigger Auto-Assign Code jika kode kosong/null saat insert (Multi-user concurrency protection)
CREATE OR REPLACE FUNCTION public.trg_auto_assign_item_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.kode IS NULL OR NEW.kode = '' OR NEW.kode = 'AUTO' THEN
        NEW.kode := public.get_next_sequence_code(COALESCE(NEW.category, 'SAMPLE'));
        NEW.sku := NEW.kode;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_items_auto_code ON public.items;
CREATE TRIGGER trg_items_auto_code
BEFORE INSERT ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_assign_item_code();

