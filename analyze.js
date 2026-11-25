exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'חסר GEMINI_API_KEY בהגדרות השרת (Environment Variables) של Netlify' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { textDesc, imageBase64, imageMime } = body;
  if (!textDesc && !imageBase64) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'נא לשלוח תמונה או תיאור ארוחה' }) };
  }

  const promptText = `אתה תזונאי קליני מומחה. נתח את הארוחה המוצגת בתמונה ו/או בתיאור הבא: "${textDesc || 'מבוסס על התמונה המצורפת'}".
פרק את הארוחה למרכיבים ברורים בעברית.
חשוב מאוד: זהה והפרד גם "רכיבים נסתרים" עתירי קלוריות אם סביר שהם קיימים במנה (כגון שמן טיגון, חמאה, רוטב, טחינה, מיונז, גבינה מגורדת או אגוזים), וסמן עבורם isHiddenCalorie: true.
עבור כל רכיב ספק משקל מוערך בגרמים (grams) וערכים תזונתיים ל-100 גרם (caloriesPer100, proteinPer100, carbsPer100, fatPer100, fiberPer100).`;

  const parts = [{ text: promptText }];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: imageMime || 'image/jpeg', data: imageBase64 } });
  }

  const payload = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                grams: { type: 'NUMBER' },
                isHiddenCalorie: { type: 'BOOLEAN' },
                caloriesPer100: { type: 'NUMBER' },
                proteinPer100: { type: 'NUMBER' },
                carbsPer100: { type: 'NUMBER' },
                fatPer100: { type: 'NUMBER' },
                fiberPer100: { type: 'NUMBER' }
              },
              required: ['name', 'grams', 'isHiddenCalorie', 'caloriesPer100', 'proteinPer100', 'carbsPer100', 'fatPer100']
            }
          }
        },
        required: ['items']
      }
    }
  };

  const models = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
  let lastErr = 'שגיאה לא ידועה';

  for (const modelId of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw) {
          return { statusCode: 200, headers, body: raw };
        }
      }
      lastErr = data?.error?.message || `HTTP ${res.status}`;
      const isTransient = res.status === 429 || res.status === 503 || res.status === 500 ||
        /high demand|overloaded|unavailable|quota|rate|try again/i.test(lastErr);
      if (!isTransient) {
        return { statusCode: res.status, headers, body: JSON.stringify({ error: lastErr }) };
      }
    } catch (err) {
      lastErr = err.message || 'Network error';
    }
  }

  return { statusCode: 503, headers, body: JSON.stringify({ error: `כל המודלים עמוסים כרגע (${lastErr})` }) };
};
