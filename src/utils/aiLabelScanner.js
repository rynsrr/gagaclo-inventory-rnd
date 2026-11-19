/**
 * Utilitas AI Multimodal Vision untuk Pemindaian Tag / Label Sampel Garmen R&D
 * Menggunakan Google Gemini Flash (2.0 / 1.5) dengan respon JSON terstruktur.
 */

import { supabase } from '../lib/supabase';

// Kunci penyimpanan lokal untuk API Key cadangan pengguna
export const GEMINI_API_KEY_STORAGE = 'gagaclo_gemini_api_key';

export function getStoredGeminiKey() {
  try {
    return (
      localStorage.getItem(GEMINI_API_KEY_STORAGE) ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      ''
    );
  } catch {
    return import.meta.env.VITE_GEMINI_API_KEY || '';
  }
}

export function saveStoredGeminiKey(key) {
  try {
    if (key && key.trim()) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    }
  } catch {}
}

/**
 * Mengambil API Key dari Supabase Cloud (SYSTEM_CONFIG_GEMINI_KEY)
 * Digunakan agar seluruh perangkat / user tidak perlu setting ulang.
 */
export async function fetchCloudGeminiKey(client = supabase) {
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('items')
      .select('deskripsi')
      .eq('id', 'SYSTEM_CONFIG_GEMINI_KEY')
      .maybeSingle();

    if (!error && data?.deskripsi) {
      try {
        const parsed = JSON.parse(data.deskripsi);
        if (parsed?.apiKey) {
          saveStoredGeminiKey(parsed.apiKey);
          return parsed.apiKey;
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Gagal membaca Gemini API Key dari cloud:', err);
  }
  return null;
}

/**
 * Menyimpan API Key ke Supabase Cloud (SYSTEM_CONFIG_GEMINI_KEY)
 * agar tersinkronisasi otomatis ke semua perangkat (HP, laptop, tablet).
 */
export async function saveCloudGeminiKey(client = supabase, apiKey = '', userName = 'Admin') {
  const cleanKey = (apiKey || '').trim();
  saveStoredGeminiKey(cleanKey);

  if (!client) return { success: true, cloud: false };

  try {
    const { error } = await client.from('items').upsert({
      id: 'SYSTEM_CONFIG_GEMINI_KEY',
      sku: 'SYSTEM_GEMINI_KEY',
      kode: 'SYSTEM_GEMINI_KEY',
      name: 'SYSTEM GEMINI KEY CONFIG',
      description: 'Google Gemini API Key Cloud Sync',
      deskripsi: JSON.stringify({
        apiKey: cleanKey,
        updatedAt: new Date().toISOString(),
        updatedBy: userName,
      }),
      box_number: 999999,
      status: 'SYSTEM',
    });

    if (error) throw error;
    return { success: true, cloud: true };
  } catch (err) {
    console.error('Gagal sinkronisasi API Key ke Supabase Cloud:', err);
    return { success: false, cloud: false, error: err };
  }
}

/**
 * Ambil API Key yang aktif (cek localStorage terlebih dahulu, lalu fallback ke Supabase Cloud)
 */
export async function getEffectiveGeminiKey(client = supabase) {
  let key = getStoredGeminiKey();
  if (!key && client) {
    key = await fetchCloudGeminiKey(client);
  }
  return key || '';
}

/**
 * Kompresi gambar client-side sebelum dikirim via API
 * Menjaga lebar max 900px dan kualitas 0.75 agar transfer sub-100ms
 */
export async function compressImage(fileOrBlob, maxWidth = 900, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Normalisasi dan ekstraksi pintar untuk sampleNo dan style
 * Memprioritaskan pengenalan pola RDI & RSD sebagai sampleNo standar R&D Gagaclo:
 * - RDI: misal RDI056, RDI1069 (langsung diikuti angka tanpa tanda strip/pagar)
 * - RSD: misal RSD-260022-1, RSD-250015-2 (diawali RSD- dengan tanda strip)
 */
export function normalizeSampleNoAndStyle(rawStyle, rawSampleNo) {
  let style = String(rawStyle || '').trim();
  let sampleNo = String(rawSampleNo || '').trim();

  // Pola kode RDI atau RSD
  const rdiRsdRegex = /\b(RDI|RSD)\s*([#\-_]?)\s*([0-9A-Z]+(?:[\-_][0-9A-Z]+)*)\b/i;

  const formatRdiRsd = (prefixRaw, sepRaw, codeRaw) => {
    const prefix = prefixRaw.toUpperCase();
    const code = codeRaw.toUpperCase();
    if (prefix === 'RDI') {
      // Standar RDI: RDI diikuti angka langsung tanpa pemisah (misal: RDI056, RDI1069)
      return `RDI${code}`;
    }
    // Standar RSD: RSD- diikuti kode sampel dengan tanda strip (misal: RSD-260022-1, RSD-250015-2)
    return `RSD-${code}`;
  };

  // 1. Jika sampleNo sudah mengandung pola RDI atau RSD, rapikan formatnya
  const sampleMatch = sampleNo.match(rdiRsdRegex);
  if (sampleMatch) {
    sampleNo = formatRdiRsd(sampleMatch[1], sampleMatch[2], sampleMatch[3]);
  }

  // 2. Jika style mengandung pola RDI atau RSD
  const styleMatch = style.match(rdiRsdRegex);
  if (styleMatch) {
    const formattedCode = formatRdiRsd(styleMatch[1], styleMatch[2], styleMatch[3]);

    const sampleNoIsDefault = !sampleNo || sampleNo === 'NA' || sampleNo === '-' || sampleNo === 'NONE';
    const sampleNoHasRdiRsd = /^(RDI|RSD)/i.test(sampleNo);

    // Jika sampleNo masih default/kosong atau belum berawalan RDI/RSD, jadikan kode ini sebagai sampleNo
    if (sampleNoIsDefault || !sampleNoHasRdiRsd) {
      sampleNo = formattedCode;
    }

    // Bersihkan kode RDI/RSD dari style agar field style hanya menyisakan nama/model barang
    const cleanedStyle = style
      .replace(styleMatch[0], '')
      .replace(/^[\s\-_:/#]+|[\s\-_:/#]+$/g, '')
      .trim();

    // Jika setelah dibersihkan ada teks nama model garmen, gunakan teks tersebut; jika kosong fallback 'NA'
    style = cleanedStyle || 'NA';
  }

  return {
    style: style.toUpperCase() || 'NA',
    sampleNo: sampleNo.toUpperCase() || 'NA',
  };
}

/**
 * System prompt khusus pengenalan label/tag garmen & tulisan tangan R&D Gagaclo
 */
function buildExtractionPrompt(contextSettings = {}) {
  const { lockedBuyer = '', lockedJenisSample = '', _boxNumber = '' } = contextSettings;

  return `You are an expert Garment Quality Control & Inventory Multimodal AI Assistant for Gagaclo R&D.
Examine this image of a garment sample tag / washing label / handwritten card AND the physical garment fabric in the photo.

Extract the information into a strict JSON object with these EXACT keys:
- "style": (String) Name, style code, AND any additional notes or descriptions written on the card (e.g. "8210ZBK", "POLO SHIRT", "FLEECE HOODIE - STYLE ON HOLD", "BLACK 1.2", "POCKET TEE OVERSIZED", "CORAL BLOOM 35-299661 - ALINA").
  CRITICAL INSTRUCTION FOR STYLE & KETERANGAN TAMBAHAN:
  1. If the card contains additional notes, remarks, descriptions, or variant details (keterangan tambahan), PUT THEM TOGETHER in this "style" field (e.g. "POLO SHIRT STYLE ON HOLD", "8210ZBK (REVISI SAKU)", "CORAL BLOOM 35-299661 - ALINA").
  2. Do NOT put RDI or RSD sample numbers here (those strictly belong in "sampleNo"). For example, if a tag writes "RDI056 POLO SHIRT STYLE ON HOLD", "sampleNo" is "RDI056" and "style" is "POLO SHIRT STYLE ON HOLD".
- "sampleNo": (String) Sample number, article number, or reference code.
  CRITICAL INSTRUCTION FOR SAMPLE NUMBER FORMAT (GAGACLO R&D STANDARDS):
  In Gagaclo R&D, Sample Numbers typically follow these two rules:
  1. Codes starting with "RDI": directly followed by digits without hash or dash (e.g. "RDI056", "RDI1069", "RDI089", "RDI002").
  2. Codes starting with "RSD": formatted with a hyphen "RSD-" followed by numbers (e.g. "RSD-260022-1", "RSD-250015-2", "RSD-01").
  If ANY code starting with "RDI" or "RSD" appears anywhere on the tag/card, you MUST extract it as "sampleNo".
- "buyerNo": (String) Buyer/Brand code. If brand is "Ergodyne" or logo shows Ergodyne, output "AN05". If currently locked context is provided ("${lockedBuyer}"), prefer using "${lockedBuyer}".
- "jenisSample": (String) Sample type (e.g. "PPS", "DEV", "ARCHIVE", "PROTO", "SMS", "FIT"). If "PP sample" is detected, use "PPS". If currently locked context is provided ("${lockedJenisSample}"), use "${lockedJenisSample}".
- "size": (String) Garment size (e.g. "S", "M", "L", "XL", "XXL", "ONESIZE"). If "One size" or "One size, Black", output "ONESIZE".
- "color": (String) Color of the item.
  CRITICAL INSTRUCTION FOR COLOR DETECTION (ALWAYS EXTRACT FROM FABRIC BEHIND/UNDER CARD IF TEXT IS MISSING):
  1. Primary check: If a color name is explicitly written or printed on the tag/card (e.g. "BLACK", "WHITE", "NAVY", "SAGE", "CHARCOAL", "GREY", "OLIVE"), use that written color.
  2. Mandatory fallback (AUTO-DETECT FROM FABRIC): IF THE COLOR IS NOT WRITTEN ON THE CARD (or written as "-", "NA", blank, or missing):
     LOOK AT THE PHYSICAL FABRIC / GARMENT VISIBLE DIRECTLY BEHIND, UNDERNEATH, ATTACHED TO, OR SURROUNDING THE SAMPLE CARD!
     In Gagaclo R&D, sample cards are placed or pinned on top of the actual garment/fabric swatch.
     Detect and output the visual dominant color of that background fabric/garment (e.g. "BLACK", "NAVY", "WHITE", "HEATHER GREY", "OLIVE", "MAROON", "BEIGE", "BROWN", "ROYAL BLUE", "KHAKI", "CHARCOAL", "SAGE", "RED", "YELLOW", "ORANGE", "PURPLE", "PINK", etc.).
     NEVER return "NA" or "-" if the garment fabric behind or around the card is visible in the photo!
- "jumlah": (Number) Quantity in pieces. Default to 1 if not explicitly written.
- "satuan": (String) Must strictly be "PCE".
- "tanggal": (String) Date from tag in DD-MM-YYYY format (e.g. "Jan/15/2021" -> "15-01-2021"). If missing, output current date format.
- "track": (String) Material, fabric weight, composition, or special requirements from the card (e.g. "240GSM 4-WAY STRETCH BLACK FLEECE, PP SAMPLE").

RULES:
1. ALL text values MUST be UPPERCASE (except null or numbers).
2. Satuan MUST be "PCE".
3. Return STRICT JSON ONLY. Do not wrap in markdown or backticks. No commentary.
4. AUTOMATIC FABRIC COLOR FROM BEHIND/AROUND SAMPLE CARD: Whenever color is not explicitly written on the card (or blank / '-'), YOU MUST inspect the physical garment fabric visible behind, beneath, or surrounding the sample card in the photo, and output that exact fabric color.
5. CODES STARTING WITH "RDI" OR "RSD" ARE ALWAYS "sampleNo":
   - "RDI" numbers are written without dash/hash: e.g. "RDI056", "RDI1069".
   - "RSD" numbers are written with a hyphen: e.g. "RSD-260022-1", "RSD-250015-2".
   Any reference code starting with "RDI" or "RSD" MUST be extracted into "sampleNo", NEVER into "style".
6. KETERANGAN TAMBAHAN BELONGS IN "style": Any additional remarks, garment descriptions, variant notes, or comments written on the card must be placed inside the "style" field.`;
}

/**
 * Panggil Gemini Flash Vision API untuk memindai gambar tag garmen
 */
export async function scanGarmentTag(imageBase64, contextSettings = {}) {
  // 1. Bersihkan base64 data prefix jika ada
  let rawBase64 = imageBase64;
  let mimeType = 'image/jpeg';
  if (imageBase64.includes(';base64,')) {
    const parts = imageBase64.split(';base64,');
    mimeType = parts[0].replace('data:', '') || 'image/jpeg';
    rawBase64 = parts[1];
  }

  // 2. Ambil API Key (cek localStorage terlebih dahulu, lalu Supabase Cloud)
  // Ini menghindari cold-start & roundtrip Vercel serverless (menghemat 5-10 detik!)
  const apiKey = await getEffectiveGeminiKey(supabase);

  if (!apiKey) {
    // Jika tidak ada API key di browser maupun cloud, baru coba serverless endpoint di Vercel
    try {
      const serverResponse = await fetch('/api/ai-scan-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: rawBase64,
          mimeType,
          contextSettings,
        }),
      });

      if (serverResponse.ok) {
        const result = await serverResponse.json();
        if (result?.success && result?.data) {
          const { style: finalStyle, sampleNo: finalSampleNo } = normalizeSampleNoAndStyle(
            result.data.style,
            result.data.sampleNo
          );
          return {
            ...result.data,
            style: finalStyle,
            sampleNo: finalSampleNo,
            _source: 'server',
          };
        }
      }
    } catch {}

    throw new Error('API Key Google Gemini belum diatur di Cloud maupun browser. Silakan masukkan API Key di tombol "API Key" untuk disinkronkan ke seluruh perangkat tim.');
  }

  // 3. Direct Ultra-Fast Gemini Multimodal Vision Call
  const prompt = buildExtractionPrompt(contextSettings);

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: rawBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json',
    },
  };

  // Deteksi model Flash terbaik secara dinamis atau gunakan cache pemenang (Sub-1.2s)
  let targetBases = [];
  try {
    const cached = localStorage.getItem('gagaclo_winning_gemini_endpoint');
    if (cached && !cached.includes('-latest') && cached.includes(':generateContent')) {
      targetBases.push(cached);
    } else if (cached) {
      localStorage.removeItem('gagaclo_winning_gemini_endpoint');
    }
  } catch {}

  const getDynamicFlashEndpoints = async () => {
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        const supported = (listData?.models || [])
          .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
          .map((m) => m.name.replace(/^models\//, ''))
          .filter((m) => {
            const lower = m.toLowerCase();
            return (
              !lower.includes('-latest') &&
              !lower.includes('tts') &&
              !lower.includes('transcribe') &&
              !lower.includes('clip') &&
              !lower.includes('embedding')
            );
          });

        // Urutan prioritas model vision: utamakan seri flash-lite dan 3.5/3.8 yang terbukti aktif & super cepat
        const priorityOrder = [
          'gemini-3.5-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-3.5-flash',
          'gemini-3.8-flash',
          'gemini-3.7-flash',
          'gemini-3.6-flash',
          'gemini-4-hydrogen',
          'gemini-1.5-flash',
          'gemini-1.5-flash-002',
          'gemini-2.0-flash',
        ];

        const matched = [];
        for (const p of priorityOrder) {
          if (supported.includes(p)) matched.push(p);
        }

        // Tambahkan model lain yang mengandung flash jika belum ada
        for (const s of supported) {
          if (s.toLowerCase().includes('flash') && !matched.includes(s)) {
            matched.push(s);
          }
        }

        if (matched.length > 0) {
          return matched.slice(0, 4).map((m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`);
        }
      } else {
        const errJson = await listRes.json().catch(() => ({}));
        const msg = errJson?.error?.message || '';
        if (msg.toLowerCase().includes('api key not valid')) {
          throw new Error('API Key Google Gemini tidak valid. Harap periksa dan salin kembali kunci Anda dari Google AI Studio.');
        }
      }
    } catch (err) {
      if (err.message?.includes('tidak valid')) throw err;
    }

    return [
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent',
    ];
  };

  if (targetBases.length === 0) {
    targetBases = await getDynamicFlashEndpoints();
  }

  let lastError = null;

  for (let i = 0; i < targetBases.length; i++) {
    const base = targetBases[i];
    try {
      const url = `${base}?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData?.error?.message || `HTTP ${response.status}`;
        if (errMsg.toLowerCase().includes('api key not valid')) {
          throw new Error('API Key Google Gemini tidak valid. Harap periksa dan salin kembali kunci Anda dari Google AI Studio.');
        }
        throw new Error(errMsg);
      }

      const json = await response.json();
      const textContent = json?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        throw new Error('AI tidak mengembalikan teks respons');
      }

      // Bersihkan kemungkinan markdown code fences
      const cleanedJson = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanedJson);

      // Simpan endpoint pemenang agar pemindaian berikutnya langsung instan tanpa coba-coba!
      try {
        localStorage.setItem('gagaclo_winning_gemini_endpoint', base);
      } catch {}

      // Deteksi fallback warna dari teks style & track jika kolom color tidak terisi
      let detectedColor = String(parsedData.color || '').trim().toUpperCase();
      if (!detectedColor || detectedColor === 'NA' || detectedColor === '-' || detectedColor === 'NONE') {
        const combinedText = `${String(parsedData.style || '')} ${String(parsedData.track || '')}`.toUpperCase();
        const commonColors = [
          'BLACK', 'NAVY', 'WHITE', 'HEATHER GREY', 'GREY', 'GRAY', 'CHARCOAL', 
          'OLIVE', 'MAROON', 'RED', 'BLUE', 'ROYAL BLUE', 'GREEN', 'SAGE', 
          'BEIGE', 'KHAKI', 'BROWN', 'YELLOW', 'ORANGE', 'PURPLE', 'PINK'
        ];
        const matched = commonColors.find(c => new RegExp(`\\b${c}\\b`, 'i').test(combinedText));
        if (matched) detectedColor = matched;
      }

      // Normalisasi sampleNo & style cerdas dengan prioritas RDI & RSD
      const { style: finalStyle, sampleNo: finalSampleNo } = normalizeSampleNoAndStyle(
        parsedData.style,
        parsedData.sampleNo
      );

      // Normalisasi & pastikan format standar
      const normalizedData = {
        style: finalStyle,
        sampleNo: finalSampleNo,
        buyerNo: String(contextSettings.lockedBuyer || parsedData.buyerNo || '').trim().toUpperCase() || 'AN05',
        jenisSample: String(contextSettings.lockedJenisSample || parsedData.jenisSample || 'PPS').trim().toUpperCase(),
        size: String(parsedData.size || 'ONESIZE').trim().toUpperCase(),
        color: detectedColor || 'NA',
        jumlah: Number(parsedData.jumlah) > 0 ? Number(parsedData.jumlah) : 1,
        satuan: 'PCE',
        tanggal: String(parsedData.tanggal || '').trim().toUpperCase(),
        track: String(parsedData.track || '').trim().toUpperCase() || 'SAMPEL FISIK',
        _source: 'direct',
      };

      return normalizedData;
    } catch (err) {
      lastError = err;
      if (err.message?.includes('tidak valid')) throw err;
      // Hapus cache lama jika endpoint tersebut gagal
      try {
        localStorage.removeItem('gagaclo_winning_gemini_endpoint');
      } catch {}

      // Jika cache gagal dan tidak ada kandidat tersisa, ambil daftar model dinamis secara on-the-fly
      if (i === targetBases.length - 1 && targetBases.length === 1) {
        const freshBases = await getDynamicFlashEndpoints();
        const remaining = freshBases.filter((b) => b !== base);
        targetBases.push(...remaining);
      }
    }
  }

  throw new Error(lastError?.message || 'Gagal memindai gambar tag dengan Gemini AI.');
}