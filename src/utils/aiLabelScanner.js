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
 * Bersihkan teks cetak template/kop/disclaimer formulir kartu sampel
 * (misal: "RED DRAGON INDONESIA", "PT GAGACLO", "TELEPHONE", "FAX", "ITEM NO", "SAMPLE OF NO COMMERCIAL VALUE")
 * yang merupakan format kartu cetak statis, BUKAN isi data sampel garmen.
 */
export function cleanCardBoilerplate(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text;

  const boilerplatePatterns = [
    /\bREMARK\s*[:.]?\s*SAMPLE\s+OF\s+NO\s+COMMERCIAL\s+VALUE\b/gi,
    /\bREMARK\s*[:.]?\s*NO\s+COMMERCIAL\s+VALUE\b/gi,
    /\bREMARK\s*[:.]?\s*SAMPLE\s+ONLY\b/gi,
    /\bSAMPLE\s+OF\s+NO\s+COMMERCIAL\s+VALUE\b/gi,
    /\bNO\s+COMMERCIAL\s+VALUE\b/gi,
    /\bSAMPLE\s+OF\s+NO\s+COMMERCIAL\b/gi,
    /\bRED\s+DRAGON\s+INDONESIA\b/gi,
    /\bRED\s+DRAGON\b/gi,
    /\bPT\.?\s*GAGACLO\b/gi,
    /\b(TEL|TELEPHONE|TELPHONE|TELP)\s*[:.]?\s*[0-9\s\-+()/\\]+/gi,
    /\b(FAX)\s*[:.]?\s*[0-9\s\-+()/\\]+/gi,
    /\b(TEL|TELEPHONE|TELPHONE|TELP)\b/gi,
    /\bFAX\b/gi,
    /\bITEM\s+INFO\s*[:.]?/gi,
    /\bITEM\s+INFORMATION\s*[:.]?/gi,
    /\bITEM\s+NO\s*[:.]?/gi,
    /\bITEM\s+NUMBER\s*[:.]?/gi,
    /\bSAMPLE\s+CARD\b/gi,
    /\bSAMPLE\s+TAG\b/gi,
    /\bREMARKS?\s*[:.]?$/gi,
    /^\s*REMARKS?\s*[:.]?/gi,
  ];

  for (const pattern of boilerplatePatterns) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  return cleaned
    .replace(/^[\s\-_:,;#/|\\]+|[\s\-_:,;#/|\\]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Gabungkan Item Info, Remark, dan Note ke dalam field style
 * Sesuai instruksi: isi keterangan Item Info, Remark, dan Note semuanya ditaruh di Style
 */
export function mergeStyleRemarkNote(style, remark = '', note = '') {
  let merged = cleanCardBoilerplate(style);
  const rawRemark = cleanCardBoilerplate(remark);
  if (rawRemark && rawRemark !== 'NA' && !merged.toUpperCase().includes(rawRemark.toUpperCase())) {
    merged = merged && merged !== 'NA' ? `${merged} - REMARK: ${rawRemark}` : rawRemark;
  }
  const rawNote = cleanCardBoilerplate(note);
  if (rawNote && rawNote !== 'NA' && !merged.toUpperCase().includes(rawNote.toUpperCase())) {
    merged = merged && merged !== 'NA' ? `${merged} - NOTE: ${rawNote}` : rawNote;
  }
  return cleanCardBoilerplate(merged).toUpperCase() || 'NA';
}

/**
 * Normalisasi dan ekstraksi pintar untuk sampleNo dan style sesuai standar R&D Gagaclo:
 * 1. Style Number ('style'):
 *    - Umumnya berupa 4 angka (misal: 6821, 6823, 6665, 7176, 8250) atau kode alfanumerik (misal: 8210ZBK, WL920FR).
 *    - Kode yang diawali "RSD" juga merupakan NO STYLE (misal: RSD-260022-1, RSD-250015-2, RSD-01).
 *    - Angka 4 digit (misal 6821) maupun kode RSD WAJIB masuk ke 'style', TIDAK BOLEH ke 'sampleNo'.
 *    - Disertai nama model / Item Info, Remark, dan Note yang digabung ke 'style'.
 * 2. Sample Number ('sampleNo'):
 *    - Merupakan NOMOR DOKUMEN (bukan nomor style seperti 6821 ataupun RSD).
 *    - Format standar berupa RDI yang langsung diikuti angka tanpa spasi/tanda hubung (misal: RDI045, RDI056, RDI1069).
 */
export function normalizeSampleNoAndStyle(rawStyle, rawSampleNo) {
  let style = cleanCardBoilerplate(String(rawStyle || '').trim());
  let sampleNo = cleanCardBoilerplate(String(rawSampleNo || '').trim());

  // Pola kode Dokumen RDI: RDI diikuti angka secara langsung (misal: RDI045, RDI056, RDI1069)
  const rdiRegex = /\bRDI\s*([#\-_]?)\s*(\d+[0-9A-Z]*)\b/i;

  // Pola kode Style RSD: diawali RSD (misal: RSD-260022-1, RSD-250015-2)
  const rsdRegex = /\bRSD\s*([#\-_]?)\s*([0-9A-Z]+(?:[\-_][0-9A-Z]+)*)\b/i;

  // Pola nomor Style 4 angka (misal: 6821, 6823, 7176, 8250)
  const fourDigitRegex = /\b(\d{4})\b/;

  let detectedRdi = null;
  let detectedRsd = null;
  let detectedFourDigitStyle = null;

  // 1. Ekstraksi RDI (Nomor Dokumen Sample)
  // Cek di sampleNo terlebih dahulu
  const sampleRdiMatch = sampleNo.match(rdiRegex);
  if (sampleRdiMatch) {
    detectedRdi = `RDI${sampleRdiMatch[2].toUpperCase()}`;
    sampleNo = sampleNo.replace(sampleRdiMatch[0], '').trim();
  }

  // Cek juga di style apakah ada RDI yang terselip
  const styleRdiMatch = style.match(rdiRegex);
  if (styleRdiMatch) {
    if (!detectedRdi) {
      detectedRdi = `RDI${styleRdiMatch[2].toUpperCase()}`;
    }
    style = style.replace(styleRdiMatch[0], '').trim();
  }

  // 2. Ekstraksi RSD (RSD adalah No Style, bukan sampleNo)
  // Cek apakah di sampleNo ada kode RSD yang salah masuk
  const sampleRsdMatch = sampleNo.match(rsdRegex);
  if (sampleRsdMatch) {
    detectedRsd = `RSD-${sampleRsdMatch[2].toUpperCase()}`;
    sampleNo = sampleNo.replace(sampleRsdMatch[0], '').trim();
  }

  // Cek apakah di style ada kode RSD
  const styleRsdMatch = style.match(rsdRegex);
  if (styleRsdMatch) {
    detectedRsd = `RSD-${styleRsdMatch[2].toUpperCase()}`;
    style = style.replace(styleRsdMatch[0], '').trim();
  }

  // 3. Ekstraksi Nomor Style 4 Angka (misal: 6821)
  // Cek apakah di sampleNo ada 4 digit angka (misal AI salah menaruh 6821 di sampleNo)
  const sampleFourDigitMatch = sampleNo.match(fourDigitRegex);
  if (sampleFourDigitMatch) {
    detectedFourDigitStyle = sampleFourDigitMatch[1];
    sampleNo = sampleNo.replace(sampleFourDigitMatch[0], '').trim();
  }

  // Cek apakah di style ada 4 digit angka
  const styleFourDigitMatch = style.match(fourDigitRegex);
  if (styleFourDigitMatch && !detectedFourDigitStyle) {
    detectedFourDigitStyle = styleFourDigitMatch[1];
  }

  // 4. Susun Style Akhir:
  // Prioritas urutan di style: [4 Digit Style / RSD] [Sisa Style / Deskripsi Barang / Remark / Note]
  let combinedStyleParts = [];

  if (detectedFourDigitStyle) {
    combinedStyleParts.push(detectedFourDigitStyle);
  }
  if (detectedRsd) {
    combinedStyleParts.push(detectedRsd);
  }

  // Bersihkan sisa style dari tanda baca awal/akhir
  let remainingStyle = style
    .replace(/^[\s\-_:,;#/|\\]+|[\s\-_:,;#/|\\]+$/g, '')
    .trim();

  // Jika remainingStyle mengandung 4 digit style yang sudah dimasukkan di depan, rapikan
  if (detectedFourDigitStyle && remainingStyle) {
    if (remainingStyle === detectedFourDigitStyle) {
      remainingStyle = '';
    } else {
      remainingStyle = remainingStyle
        .replace(new RegExp(`^\\b${detectedFourDigitStyle}\\b[\\s\\-_:]*`, 'i'), '')
        .trim();
    }
  }

  // Jika remainingStyle mengandung RSD yang sudah dimasukkan di depan, hindari duplikasi
  if (detectedRsd && remainingStyle) {
    if (remainingStyle.toUpperCase() === detectedRsd.toUpperCase()) {
      remainingStyle = '';
    } else {
      remainingStyle = remainingStyle
        .replace(new RegExp(`^\\b${detectedRsd.replace('-', '[-#\\s]?')}\\b[\\s\\-_:]*`, 'i'), '')
        .trim();
    }
  }

  if (remainingStyle && remainingStyle !== 'NA') {
    if (combinedStyleParts.length > 0 && /^(REMARK|NOTE):/i.test(remainingStyle)) {
      combinedStyleParts.push('-');
    }
    combinedStyleParts.push(remainingStyle);
  }

  let finalStyle = combinedStyleParts.join(' ').replace(/\s+-\s+/g, ' - ').trim();
  finalStyle = cleanCardBoilerplate(finalStyle);

  // 5. Susun SampleNo Akhir:
  // SampleNo strictly adalah NOMOR DOKUMEN (format standar: RDI diikuti angka misal: RDI045).
  // Bukan nomer style seperti 6821 atau RSD.
  let finalSampleNo = detectedRdi || '';
  if (!finalSampleNo) {
    const cleanRemainingSample = cleanCardBoilerplate(sampleNo);
    if (
      cleanRemainingSample &&
      cleanRemainingSample !== 'NA' &&
      cleanRemainingSample !== '-' &&
      !/^\d{4}$/.test(cleanRemainingSample) &&
      !/^RSD/i.test(cleanRemainingSample)
    ) {
      finalSampleNo = cleanRemainingSample;
    } else {
      finalSampleNo = 'NA';
    }
  }

  return {
    style: finalStyle.toUpperCase() || 'NA',
    sampleNo: finalSampleNo.toUpperCase() || 'NA',
  };
}

/**
 * System prompt khusus pengenalan label/tag garmen & tulisan tangan R&D Gagaclo
 */
function buildExtractionPrompt(contextSettings = {}) {
  const { lockedBuyer = '', lockedJenisSample = '', _boxNumber = '' } = contextSettings;

  return `You are an expert Garment Quality Control & Inventory Multimodal AI Assistant for Gagaclo R&D.
Examine this image of a garment sample tag / washing label / handwritten card AND the physical garment fabric in the photo.

CRITICAL CONTEXT ON SAMPLE CARD TEMPLATE:
The physical sample card contains pre-printed static form elements:
- Company Letterhead / Header: "RED DRAGON INDONESIA", "PT GAGACLO", "TELEPHONE", "FAX", and phone/fax numbers.
- Pre-printed form labels: "ITEM NO:", "STYLE:", "SAMPLE NO:", "REMARK:", etc.
- Standard legal watermark/disclaimer: "SAMPLE OF NO COMMERCIAL VALUE" or "REMARK: SAMPLE OF NO COMMERCIAL VALUE".
THESE ARE PART OF THE PRINTED FORM TEMPLATE, NOT THE ACTUAL GARMENT DATA!
DO NOT EXTRACT "RED DRAGON INDONESIA", "PT GAGACLO", "TELEPHONE", "FAX", "ITEM NO", OR "SAMPLE OF NO COMMERCIAL VALUE" INTO STYLE, SAMPLE NUMBER, BUYER, OR TRACK!

Extract the information into a strict JSON object with these EXACT keys:
- "style": (String) Garment Style Number, Model Name, and Descriptions from ITEM INFO, REMARK, and NOTE written on the card.
  MANDATORY INSTRUCTION FOR STYLE (4-DIGIT NUMBERS, RSD CODES, ITEM INFO + REMARK + NOTE):
  1. STYLE NUMBER (4 DIGITS OR RSD):
     - Style numbers are typically 4-digit numbers (e.g. "6821", "6823", "6665", "7176", "8250") or alphanumeric codes (e.g. "8210ZBK", "WL920FR").
     - Codes starting with "RSD" ARE ALSO STYLE NUMBERS (e.g. "RSD-260022-1", "RSD-250015-2", "RSD-01").
     - IF A 4-DIGIT NUMBER (e.g. 6821) OR AN "RSD" CODE APPEARS, IT MUST GO INTO "style", NEVER INTO "sampleNo"!
  2. ITEM INFO & MODEL NAME: Extract garment model name or description (e.g. "POLO SHIRT", "FLEECE HOODIE").
  3. REMARK & NOTE: Extract any handwritten or typed remark or note (excluding static disclaimer "SAMPLE OF NO COMMERCIAL VALUE").
  COMBINE Style Number, Item Info, Remark, and Note together into this single "style" field!
  Examples:
  - "6821 POLO SHIRT - REMARK: SAKU DEPAN - NOTE: FIT TEST"
  - "RSD-260022-1 - REMARK: SAKU DEPAN"
  - "6821"
  - "8210ZBK - REMARK: COLLAR 1.5CM"
  - "CORAL BLOOM 35-299661 - ALINA"
  Do NOT put RDI document numbers here (those strictly belong in "sampleNo").
- "remark": (String, Optional) Any written remark from the card (excluding static "SAMPLE OF NO COMMERCIAL VALUE").
- "note": (String, Optional) Any written notes from the card.
- "sampleNo": (String) Document / Tracking Number (Nomer Dokumen).
  CRITICAL INSTRUCTION FOR SAMPLE NUMBER (DOCUMENT NUMBER FORMAT RDI...):
  - In Gagaclo R&D, "sampleNo" is strictly the DOCUMENT TRACKING NUMBER (nomer dokumen).
  - Its standard format is "RDI" directly followed by digits (e.g. "RDI045", "RDI056", "RDI1069", "RDI002").
  - "sampleNo" is NOT a style number! A 4-digit number like "6821" is a Style number and must NEVER be placed in "sampleNo".
  - "RSD" is also a Style number, NEVER a "sampleNo".
  - If an RDI code appears anywhere on the tag/card (e.g. "RDI045"), extract it as "sampleNo".
  - If no RDI document number is found on the card, output "NA".
- "buyerNo": (String) Buyer/Brand code. If brand is "Ergodyne" or logo shows Ergodyne, output "AN05". If currently locked context is provided ("${lockedBuyer}"), prefer using "${lockedBuyer}".
  CRITICAL: "RED DRAGON INDONESIA", "RDI", or "PT GAGACLO" is the company/factory letterhead on the card template, NOT the buyer! Never output them as buyer. If no external buyer is found, output "${lockedBuyer || 'AN05'}".
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
5. STYLE VS SAMPLE NO SEPARATION (GAGACLO R&D STANDARD):
   - "style" captures: 4-digit style numbers (e.g. 6821, 6823, 8250), RSD codes (e.g. RSD-260022-1), alphanumeric models (e.g. 8210ZBK), plus Item Info, Remarks, and Notes.
   - "sampleNo" captures strictly the DOCUMENT NUMBER: format "RDI" followed directly by digits (e.g. "RDI045", "RDI056", "RDI1069").
   - 4-digit numbers (like 6821) and "RSD" codes are STYLE numbers, NEVER "sampleNo"!
6. ITEM INFO, REMARK, DAN NOTE MASUK KE "style": Seluruh keterangan Item Info (model/deskripsi), Remark (di luar disclaimer no commercial value), dan Note yang tertulis di kartu WAJIB digabungkan ke field "style".
7. IGNORE STATIC PRE-PRINTED FORM TEMPLATE / LETTERHEAD / WATERMARKS:
   The following are pre-printed form elements on the sample card and must NEVER be extracted into style, sampleNo, buyerNo, or track:
   - "RED DRAGON INDONESIA" or "PT GAGACLO" (company letterhead)
   - "TELEPHONE", "FAX", and phone/fax numbers
   - "ITEM NO", "ITEM NO.", "SAMPLE CARD" (form field labels)
   - "SAMPLE OF NO COMMERCIAL VALUE" or "REMARK: SAMPLE OF NO COMMERCIAL VALUE" (disclaimer watermark)`;
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
          const finalMergedStyle = mergeStyleRemarkNote(finalStyle, result.data.remark, result.data.note);
          const cleanedTrack = cleanCardBoilerplate(String(result.data.track || '')).toUpperCase() || 'SAMPEL FISIK';
          let buyerClean = String(result.data.buyerNo || '').trim().toUpperCase();
          if (!buyerClean || /RED\s*DRAGON|GAGACLO|NO\s*COMMERCIAL/i.test(buyerClean)) {
            buyerClean = contextSettings.lockedBuyer || 'AN05';
          }
          return {
            ...result.data,
            style: finalMergedStyle,
            sampleNo: finalSampleNo,
            buyerNo: buyerClean,
            track: cleanedTrack,
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

      // Pastikan Item Info, Remark, dan Note semuanya digabung ke Style
      const finalMergedStyle = mergeStyleRemarkNote(finalStyle, parsedData.remark, parsedData.note);

      // Bersihkan teks cetak formulir (Red Dragon Indonesia, PT Gagaclo, Tel/Fax, Sample of no commercial value)
      const cleanedTrack = cleanCardBoilerplate(String(parsedData.track || '')).toUpperCase() || 'SAMPEL FISIK';
      let buyerClean = String(contextSettings.lockedBuyer || parsedData.buyerNo || '').trim().toUpperCase();
      if (!buyerClean || /RED\s*DRAGON|GAGACLO|NO\s*COMMERCIAL/i.test(buyerClean)) {
        buyerClean = contextSettings.lockedBuyer || 'AN05';
      }

      // Normalisasi & pastikan format standar
      const normalizedData = {
        style: finalMergedStyle,
        sampleNo: finalSampleNo,
        buyerNo: buyerClean,
        jenisSample: String(contextSettings.lockedJenisSample || parsedData.jenisSample || 'PPS').trim().toUpperCase(),
        size: String(parsedData.size || 'ONESIZE').trim().toUpperCase(),
        color: detectedColor || 'NA',
        jumlah: Number(parsedData.jumlah) > 0 ? Number(parsedData.jumlah) : 1,
        satuan: 'PCE',
        tanggal: String(parsedData.tanggal || '').trim().toUpperCase(),
        track: cleanedTrack,
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