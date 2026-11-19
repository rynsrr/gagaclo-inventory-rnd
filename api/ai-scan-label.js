/**
 * Normalisasi dan ekstraksi pintar untuk sampleNo dan style
 * Memprioritaskan pengenalan pola RDI & RSD sebagai sampleNo standar R&D Gagaclo:
 * - RDI: misal RDI056, RDI1069 (langsung diikuti angka tanpa tanda strip/pagar)
 * - RSD: misal RSD-260022-1, RSD-250015-2 (diawali RSD- dengan tanda strip)
 */
function normalizeSampleNoAndStyle(rawStyle, rawSampleNo) {
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

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || req.body?.apiKey;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_NO_API_KEY',
      message: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables Vercel atau Supabase Cloud.',
    });
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg', contextSettings = {} } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'Data gambar (imageBase64) wajib disertakan.' });
    }

    const { lockedBuyer = '', lockedJenisSample = '' } = contextSettings;

    const prompt = `You are an expert Garment Quality Control & Inventory Multimodal AI Assistant for Gagaclo R&D.
Examine this image of a garment sample tag / washing label / handwritten card AND the physical garment fabric in the photo.

Extract the information into a strict JSON object with these EXACT keys:
- "style": (String) Name or style code of the garment/model (e.g. "8210ZBK", "POLO SHIRT", "FLEECE HOODIE", "BLACK 1.2", "POCKET TEE").
  CRITICAL: Do NOT put RDI or RSD sample numbers here. If a tag writes "RDI056 BLACK 1.2", "sampleNo" is "RDI056" and "style" is "BLACK 1.2". If a tag writes "RSD-260022-1 POLO", "sampleNo" is "RSD-260022-1" and "style" is "POLO".
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
   Any reference code starting with "RDI" or "RSD" MUST be extracted into "sampleNo", NEVER into "style".`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
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

    const candidateUrls = [
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=${apiKey}`,
    ];

    let lastError = null;

    for (const url of candidateUrls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody?.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textContent) {
          const cleaned = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);

          // Deteksi fallback warna dari teks style & track jika kolom color tidak terisi
          let detectedColor = String(parsed.color || '').trim().toUpperCase();
          if (!detectedColor || detectedColor === 'NA' || detectedColor === '-' || detectedColor === 'NONE') {
            const combinedText = `${String(parsed.style || '')} ${String(parsed.track || '')}`.toUpperCase();
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
            parsed.style,
            parsed.sampleNo
          );

          return res.status(200).json({
            success: true,
            data: {
              style: finalStyle,
              sampleNo: finalSampleNo,
              buyerNo: String(lockedBuyer || parsed.buyerNo || '').trim().toUpperCase() || 'AN05',
              jenisSample: String(lockedJenisSample || parsed.jenisSample || 'PPS').trim().toUpperCase(),
              size: String(parsed.size || 'ONESIZE').trim().toUpperCase(),
              color: detectedColor || 'NA',
              jumlah: Number(parsed.jumlah) > 0 ? Number(parsed.jumlah) : 1,
              satuan: 'PCE',
              tanggal: String(parsed.tanggal || '').trim().toUpperCase(),
              track: String(parsed.track || '').trim().toUpperCase() || 'SAMPEL FISIK',
            },
            endpointUsed: url.split('?')[0],
          });
        }
      } catch (err) {
        lastError = err;
      }
    }

    return res.status(500).json({
      success: false,
      message: lastError?.message || 'Gagal memproses gambar dengan AI',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Internal Server Error',
    });
  }
}