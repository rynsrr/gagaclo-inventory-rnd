/**
 * Utilitas AI Multimodal Vision untuk Pemindaian Tag / Label Sampel Garmen R&D
 * Menggunakan Google Gemini Flash (2.0 / 1.5) dengan respon JSON terstruktur.
 */

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
 * System prompt khusus pengenalan label/tag garmen & tulisan tangan R&D Gagaclo
 */
function buildExtractionPrompt(contextSettings = {}) {
  const { lockedBuyer = '', lockedJenisSample = '', _boxNumber = '' } = contextSettings;

  return `You are a Garment Quality Control & Inventory Data Extraction Assistant for Gagaclo R&D.
Examine this image of a garment sample tag / washing label / handwritten card.

Extract the information into a strict JSON object with these EXACT keys:
- "style": (String) Name or style code of the garment/model (e.g. "RDI#6823 BLACK 1.2" or "POLO SHIRT").
- "sampleNo": (String) Sample number, article number, or reference number (e.g. "RD1069").
- "buyerNo": (String) Buyer/Brand code. If brand is "Ergodyne" or logo shows Ergodyne, output "AN05". If currently locked context is provided ("${lockedBuyer}"), prefer using "${lockedBuyer}".
- "jenisSample": (String) Sample type (e.g. "PPS", "DEV", "ARCHIVE", "PROTO", "SMS", "FIT"). If "PP sample" is detected, use "PPS". If currently locked context is provided ("${lockedJenisSample}"), use "${lockedJenisSample}".
- "size": (String) Garment size (e.g. "S", "M", "L", "XL", "XXL", "ONESIZE"). If "One size" or "One size, Black", output "ONESIZE".
- "color": (String) Color of the item (e.g. "BLACK", "WHITE", "NAVY", "GREY").
- "jumlah": (Number) Quantity in pieces. Default to 1 if not explicitly written.
- "satuan": (String) Must strictly be "PCE".
- "tanggal": (String) Date from tag in DD-MM-YYYY format (e.g. "Jan/15/2021" -> "15-01-2021"). If missing, output current date format.
- "track": (String) Material, fabric weight, composition, or special requirements from the card (e.g. "240GSM 4-WAY STRETCH BLACK FLEECE, PP SAMPLE").

RULES:
1. ALL text values MUST be UPPERCASE (except null or numbers).
2. Satuan MUST be "PCE".
3. Return STRICT JSON ONLY. Do not wrap in markdown or backticks. No commentary.`;
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

  // 2. Jika user memiliki API Key di browser, prioritaskan pemanggilan LANGSUNG ke Google AI Studio
  // Ini menghindari cold-start & roundtrip Vercel serverless (menghemat 5-10 detik!)
  const apiKey = getStoredGeminiKey();

  if (!apiKey) {
    // Jika tidak ada API key di browser, baru coba serverless endpoint di Vercel
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
          return {
            ...result.data,
            _source: 'server',
          };
        }
      }
    } catch {}

    throw new Error('API Key Google Gemini belum diatur. Klik tombol "API Key" di pojok kanan atas untuk memasukkan API Key gratis dari Google AI Studio.');
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

  // Endpoint kurasi khusus Vision Flash berkecepatan tinggi (Sub-1.2s)
  // v1/gemini-1.5-flash adalah endpoint resmi stabil Google AI Studio saat ini
  const cachedWinner = (() => {
    try {
      return localStorage.getItem('gagaclo_winning_gemini_endpoint');
    } catch {
      return null;
    }
  })();

  const curatedBases = [
    'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
    'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent',
  ];

  // Dahulukan endpoint yang sudah terbukti bekerja di browser ini
  const orderedBases = cachedWinner
    ? [cachedWinner, ...curatedBases.filter((b) => b !== cachedWinner)]
    : curatedBases;

  let lastError = null;

  for (const base of orderedBases) {
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

      // Normalisasi & pastikan format standar
      const normalizedData = {
        style: String(parsedData.style || '').trim().toUpperCase() || 'NA',
        sampleNo: String(parsedData.sampleNo || '').trim().toUpperCase() || 'NA',
        buyerNo: String(contextSettings.lockedBuyer || parsedData.buyerNo || '').trim().toUpperCase() || 'AN05',
        jenisSample: String(contextSettings.lockedJenisSample || parsedData.jenisSample || 'PPS').trim().toUpperCase(),
        size: String(parsedData.size || 'ONESIZE').trim().toUpperCase(),
        color: String(parsedData.color || '').trim().toUpperCase() || 'NA',
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
      // Jika endpoint gagal/404, coba kandidat kurasi berikutnya
    }
  }

  throw new Error(lastError?.message || 'Gagal memindai gambar tag dengan Gemini AI.');
}