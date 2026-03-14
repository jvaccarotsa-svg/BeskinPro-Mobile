import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { imageDataUrl, uvImageDataUrl } = await request.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        // Build the prompt for skin analysis
        const prompt = `Eres un dermatólogo experto en el sistema de clasificación Baumann. Analiza esta imagen facial y proporciona valores numéricos para las siguientes características de la piel, siguiendo los criterios Baumann exactos:

Para cada característica, devuelve un valor numérico entre 0 y 1 (0 = ausente, 1 = muy presente):
- brillo_zona_t: brillo en frente, nariz y mentón (zona T)
- poros_dilatados: poros visibles o dilatados
- comedones: puntos negros o poros obstruidos
- descamacion: descamación o piel seca que se pela (devuelve negativo si presente: -0.5 a -1)
- eritema: enrojecimiento o rojeces en la piel
- acne_inflamatorio: granos inflamatorios, quistes o pápulas
- melasma: manchas oscuras tipo melasma (especialmente mejillas, frente)
- hiperpigmentacion_postinflamatoria: marcas oscuras post-acné o post-inflamatorias
- manchas_visibles: manchas o irregularidades visibles en el tono
- arrugas_visibles: arrugas, líneas de expresión marcadas
- flacidez: pérdida de firmeza o tejido flácido visible
- fotodano: signos de daño solar (manchas solares, textura irregular, capilares rotos)

Responde ÚNICAMENTE con JSON válido sin texto adicional, siguiendo este formato exacto:
{
  "brillo_zona_t": 0.0,
  "poros_dilatados": 0.0,
  "comedones": 0.0,
  "descamacion": 0.0,
  "eritema": 0.0,
  "acne_inflamatorio": 0.0,
  "melasma": 0.0,
  "hiperpigmentacion_postinflamatoria": 0.0,
  "manchas_visibles": 0.0,
  "arrugas_visibles": 0.0,
  "flacidez": 0.0,
  "fotodano": 0.0,
  "confidence": 0.85,
  "analysis_notes": "Breve observación del estado general de la piel en español"
}`;

        // Prepare the request to Gemini Vision
        const parts = [{ text: prompt }];

        if (imageDataUrl) {
            const base64 = imageDataUrl.split(',')[1];
            const mimeType = imageDataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
            parts.push({
                inline_data: { mime_type: mimeType, data: base64 }
            });
        }

        if (uvImageDataUrl) {
            const base64uv = uvImageDataUrl.split(',')[1];
            const mimeTypeUv = uvImageDataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
            parts.push({ text: 'Esta es la imagen con luz UV (Wood) para análisis de pigmentación y daño solar más profundo:' });
            parts.push({
                inline_data: { mime_type: mimeTypeUv, data: base64uv }
            });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 512,
                    }
                })
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API error:', errText);
            return NextResponse.json({ error: 'Gemini API error', details: errText }, { status: 500 });
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        // Extract JSON from the response (handle possible markdown code blocks)
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: 'Invalid response format from Gemini' }, { status: 500 });
        }

        const visionData = JSON.parse(jsonMatch[0]);
        return NextResponse.json(visionData);

    } catch (error) {
        console.error('Photo analysis error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
