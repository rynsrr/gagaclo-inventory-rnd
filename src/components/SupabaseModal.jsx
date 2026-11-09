import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  Database, 
  Cloud, 
  CloudOff, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud, 
  Copy, 
  Check, 
  ExternalLink, 
  X,
  KeyRound,
  Globe,
  FileCode2,
  ShieldCheck
} from 'lucide-react';
import { testSupabaseConnection } from '../lib/supabase';

export const SupabaseModal = ({ isOpen, onClose }) => {
  const {
    supabaseConfig,
    supabaseStatus,
    saveSupabaseCredentials,
    syncFromSupabase,
    pushLocalToSupabase,
    items,
    boxes
  } = useInventory();

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrl(supabaseConfig.url || '');
      setAnonKey(supabaseConfig.anonKey || '');
      setFeedback(null);
    }
  }, [isOpen, supabaseConfig]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url || !anonKey) {
      setFeedback({ type: 'error', message: 'Harap masukkan Project URL dan Anon Key terlebih dahulu.' });
      return;
    }
    setTesting(true);
    setFeedback(null);

    const res = await testSupabaseConnection(url, anonKey);
    setTesting(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Koneksi Berhasil! Database Supabase Corporate Gagaclo siap digunakan.' });
    } else {
      setFeedback({ type: 'error', message: res.message });
      if (res.code === 'TABLE_NOT_FOUND') {
        setShowSqlGuide(true);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setTesting(true);
    setFeedback(null);

    const res = await saveSupabaseCredentials(url, anonKey);
    setTesting(false);

    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
    } else {
      setFeedback({ type: 'error', message: res.message });
      if (res.code === 'TABLE_NOT_FOUND') {
        setShowSqlGuide(true);
      }
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Yakin ingin memutuskan koneksi Supabase? Aplikasi akan beralih ke penyimpanan lokal di browser ini.')) {
      await saveSupabaseCredentials('', '');
      setUrl('');
      setAnonKey('');
      setFeedback({ type: 'info', message: 'Koneksi Supabase diputuskan. Data sekarang tersimpan lokal di browser.' });
    }
  };

  const handlePushData = async () => {
    if (!window.confirm(`Unggah semua data lokal (${items.length} item, 72 box) ke database Supabase Corporate Gagaclo? Data di server akan diperbarui/disinkronkan.`)) {
      return;
    }
    setIsPushing(true);
    setFeedback(null);
    const res = await pushLocalToSupabase();
    setIsPushing(false);

    if (res.success) {
      setFeedback({ type: 'success', message: `Berhasil mengunggah ${items.length} item dan master box ke Supabase!` });
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handlePullData = async () => {
    setIsPulling(true);
    setFeedback(null);
    const res = await syncFromSupabase();
    setIsPulling(false);

    if (res.success) {
      setFeedback({ type: 'success', message: `Data berhasil ditarik dari Supabase! (${res.itemCount} item tersinkronisasi)` });
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const sqlSchemaCode = `-- GAGACLO INVENTORY DATABASE SCHEMA (SUPABASE)
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

CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    item_id TEXT,
    item_name TEXT,
    sku TEXT,
    box_number INTEGER,
    type TEXT,
    qty NUMERIC DEFAULT 1,
    unit TEXT DEFAULT 'PCS',
    pic_name TEXT,
    date TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Full Access Items" ON public.items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access Boxes" ON public.boxes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access Transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- Atomic Multi-User Sequence Counter (Anti-Collision)
CREATE TABLE IF NOT EXISTS public.sequence_counters (
    category TEXT PRIMARY KEY,
    last_value INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT ALL ON public.sequence_counters TO anon, authenticated, service_role;
ALTER TABLE public.sequence_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access Sequence Counters" ON public.sequence_counters;
CREATE POLICY "Public Full Access Sequence Counters" ON public.sequence_counters FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_next_sequence_code(p_category TEXT DEFAULT 'SAMPLE')
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_cat TEXT := UPPER(TRIM(COALESCE(p_category, 'SAMPLE')));
    v_prefix TEXT := CASE WHEN UPPER(TRIM(COALESCE(p_category, 'SAMPLE'))) = 'MATERIAL' THEN 'MAT-' ELSE 'SAMPLE-' END;
    v_next_val INTEGER;
    v_max_existing INTEGER := 0;
BEGIN
    SELECT COALESCE(MAX(
        CASE WHEN kode ~ '\d+' THEN ((regexp_match(kode, '(\d+)'))[1])::INTEGER ELSE 0 END
    ), 0)
    INTO v_max_existing FROM public.items WHERE kode ILIKE v_prefix || '%' AND status != 'DELETED' AND box_number > 0;

    INSERT INTO public.sequence_counters (category, last_value, updated_at)
    VALUES (v_cat, GREATEST(v_max_existing, 0) + 1, NOW())
    ON CONFLICT (category) DO UPDATE
    SET last_value = GREATEST(sequence_counters.last_value, v_max_existing) + 1, updated_at = NOW()
    RETURNING last_value INTO v_next_val;

    RETURN v_prefix || LPAD(v_next_val::TEXT, 5, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_next_sequence_code(TEXT) TO anon, authenticated, service_role;

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_unique_kode 
ON public.items (UPPER(TRIM(kode))) 
WHERE (status != 'DELETED' AND box_number > 0 AND kode IS NOT NULL AND kode != '');

-- Trigger Auto-Assign Code (Multi-user concurrency protection)
CREATE OR REPLACE FUNCTION public.trg_auto_assign_item_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
EXECUTE FUNCTION public.trg_auto_assign_item_code();`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlSchemaCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="inventory-dialog-heading p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${supabaseStatus.isConnected ? 'bg-emerald-100 text-emerald-600 border border-emerald-300' : 'bg-blue-100 text-blue-600 border border-blue-300'}`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 tracking-wide">
                  Database Supabase Corporate Gagaclo
                </h3>
                {supabaseStatus.isConnected ? (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>ONLINE</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    <span>OFFLINE LOKAL</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Penyimpanan cloud terpusat untuk tim R&D & PPIC Gagaclo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          
          {/* Status Alert Banner */}
          {supabaseStatus.isConnected ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start space-x-3 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-emerald-950 text-sm">Tersambung ke Supabase Cloud</div>
                <p>Data inventory tersinkronisasi otomatis secara real-time. Setiap perubahan item, mutasi, atau catatan box langsung disimpan ke cloud.</p>
                {supabaseStatus.lastSync && (
                  <p className="text-emerald-700 font-medium">Terakhir sinkron: {supabaseStatus.lastSync}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-900">
              <CloudOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-amber-950 text-sm">Mode Penyimpanan Lokal (Offline)</div>
                <p>Data saat ini hanya tersimpan di browser komputer ini. Hubungkan URL & Anon Key Supabase Corporate Gagaclo untuk mengaktifkan sinkronisasi cloud.</p>
              </div>
            </div>
          )}

          {/* Feedback message */}
          {feedback && (
            <div className={`p-3.5 rounded-xl text-xs flex items-start space-x-2.5 ${
              feedback.type === 'success' ? 'bg-emerald-100/80 text-emerald-900 border border-emerald-300' :
              feedback.type === 'error' ? 'bg-rose-100/80 text-rose-900 border border-rose-300' :
              'bg-blue-100/80 text-blue-900 border border-blue-300'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          {/* Configuration Form */}
          <form onSubmit={handleSave} className="space-y-4">
            
            {/* Supabase URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>Supabase Project URL</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Dapat dilihat di Supabase Dashboard → Project Settings → API → Project URL.
              </p>
            </div>

            {/* Supabase Anon Key */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span>Supabase Anon Public Key (anon / public)</span>
              </label>
              <textarea
                rows={2}
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition resize-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Gunakan kunci <code className="font-bold text-slate-700">anon public</code> (bukan service role).
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || !url || !anonKey}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>{testing ? 'Menguji...' : 'Test Koneksi'}</span>
                </button>

                {supabaseConfig.isConfigured && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                  >
                    Putuskan
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={testing}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/20 transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Simpan & Aktifkan</span>
              </button>
            </div>
          </form>

          {/* Cloud Sync Tools (When Connected) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-sky-600" />
              <span>Sinkronisasi Manual & Migrasi Data Awal</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Push local data up */}
              <button
                type="button"
                onClick={handlePushData}
                disabled={isPushing || !supabaseConfig.isConfigured}
                className="p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition disabled:opacity-50 group"
              >
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 group-hover:text-blue-600">
                  <UploadCloud className="w-4 h-4 text-blue-600" />
                  <span>Upload Data Lokal ke Cloud</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Kirim {items.length} item & 72 box lokal ke database Supabase (berguna saat setup awal).
                </p>
              </button>

              {/* Pull cloud data down */}
              <button
                type="button"
                onClick={handlePullData}
                disabled={isPulling || !supabaseConfig.isConfigured}
                className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition disabled:opacity-50 group"
              >
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 group-hover:text-emerald-600">
                  <DownloadCloud className="w-4 h-4 text-emerald-600" />
                  <span>Tarik Data dari Cloud</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ambil pembaruan item terbaru dari server Supabase ke browser ini.
                </p>
              </button>

            </div>
          </div>

          {/* SQL Setup Guide (Collapsible) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSqlGuide(!showSqlGuide)}
              className="w-full px-4 py-3 bg-slate-100/70 hover:bg-slate-100 flex items-center justify-between text-left transition"
            >
              <div className="flex items-center space-x-2">
                <FileCode2 className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">
                  Instruksi SQL Schema Tabel (Jalankan di Supabase SQL Editor)
                </span>
              </div>
              <span className="text-xs text-blue-600 font-semibold">
                {showSqlGuide ? 'Sembunyikan' : 'Buka Panduan SQL'}
              </span>
            </button>

            {showSqlGuide && (
              <div className="p-4 bg-slate-900 text-slate-200 space-y-3">
                <div className="text-xs text-slate-300 space-y-1">
                  <p>1. Buka <strong>Supabase Dashboard → SQL Editor</strong></p>
                  <p>2. Buat <strong>New Query</strong>, salin script SQL di bawah ini, dan klik <strong>Run</strong>:</p>
                </div>

                <div className="relative">
                  <pre className="text-[11px] font-mono bg-slate-950 p-3 rounded-lg overflow-x-auto text-emerald-400 max-h-48 border border-slate-800">
                    {sqlSchemaCode}
                  </pre>
                  <button
                    type="button"
                    onClick={copySqlToClipboard}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 border border-slate-700 transition"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin SQL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Gagaclo R&D Inventory Management System</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
