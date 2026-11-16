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

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_NO_API_KEY',
      message: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables Vercel.',
    });
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg', contextSettings = {} } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'Data gambar (imageBase64) wajib disertakan.' });
    }

    const { lockedBuyer = '', lockedJenisSample = '' } = contextSettings;

    const prompt = `You are a Garment Quality Control & Inventory Data Extraction Assistant for Gagaclo R&D.
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
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
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

          return res.status(200).json({
            success: true,
            data: {
              style: String(parsed.style || '').trim().toUpperCase() || 'NA',
              sampleNo: String(parsed.sampleNo || '').trim().toUpperCase() || 'NA',
              buyerNo: String(lockedBuyer || parsed.buyerNo || '').trim().toUpperCase() || 'AN05',
              jenisSample: String(lockedJenisSample || parsed.jenisSample || 'PPS').trim().toUpperCase(),
              size: String(parsed.size || 'ONESIZE').trim().toUpperCase(),
              color: String(parsed.color || '').trim().toUpperCase() || 'NA',
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