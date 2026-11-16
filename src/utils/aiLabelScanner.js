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
 * Menjaga lebar max 1024px dan kualitas 0.8 agar transfer sub-100ms
 */
export async function compressImage(fileOrBlob, maxWidth = 1024, quality = 0.8) {
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

  // 2. Coba kirim via serverless backend endpoint (/api/ai-scan-label) jika tersedia
  let serverHadNoKey = false;
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
          _model: result.modelUsed || 'gemini-flash',
        };
      }
    } else {
      const errJson = await serverResponse.json().catch(() => ({}));
      if (errJson?.error === 'SERVER_NO_API_KEY') {
        serverHadNoKey = true;
      }
    }
  } catch (err) {
    // Lanjutkan ke direct client call jika serverless belum di-deploy atau di lingkungan lokal
    console.warn('Serverless endpoint not reachable, trying direct Gemini API...', err);
  }

  // 3. Fallback: Panggil direct Google Gemini Vision API
  const apiKey = getStoredGeminiKey();
  if (!apiKey) {
    if (serverHadNoKey) {
      throw new Error('API Key Google Gemini belum dikonfigurasi. Klik tombol "API Key" di pojok kanan atas untuk memasukkan API Key Google Gemini (gratis), atau pasang GEMINI_API_KEY di Vercel Environment Variables.');
    }
    throw new Error('Google Gemini API Key belum diatur. Klik tombol "API Key" di pojok kanan atas untuk memasukkan API Key gratis dari Google AI Studio.');
  }

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

  // Coba Gemini 2.0 Flash dulu, fallback ke Gemini 1.5 Flash jika belum tersedia di regional
  const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `API Error HTTP ${response.status}`);
      }

      const json = await response.json();
      const textContent = json?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        throw new Error('AI tidak mengembalikan teks respons');
      }

      // Bersihkan kemungkinan markdown code fences
      const cleanedJson = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanedJson);

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
        _model: model,
      };

      return normalizedData;
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed, trying next...`, err);
    }
  }

  throw new Error(lastError?.message || 'Gagal memindai gambar tag dengan Gemini AI.');
}