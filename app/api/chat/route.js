export async function POST(req) {
    try {
        const { message, context } = await req.json();

        const systemPrompt = `Eres el experto en dermo-cosmética de BeSkinPro analizando una respuesta al test Baumann.
Tu objetivo es doble:
1. Dar una breve respuesta conversacional (1 frase) empatizando con el usuario y diciendo que lo has anotado.
2. Extraer la intensidad de su respuesta (HIGH, MEDIUM o NONE).
- HIGH (mucho, siempre, muy visible, sí muy claro, muy reseca)
- MEDIUM (algo, a veces, un poco, depende)
- NONE (nada, nunca, no, nunca reacciona)

Contexto pregunta: ${context}
Respuesta del usuario: ${message}

IMPORTANTE: Responde ÚNICA Y EXCLUSIVAMENTE con un JSON válido con este formato:
{
  "text": "Tu frase de respuesta...",
  "intent": "HIGH" | "MEDIUM" | "NONE" | null
}`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt }
                ],
                temperature: 0.1,
                max_tokens: 150
            })
        });

        if (!res.ok) {
            const errTxt = await res.text();
            console.error("Groq Auth/API Error:", res.status, errTxt);
            throw new Error(`Groq API returned ${res.status}`);
        }

        const dataResponse = await res.json();
        const content = dataResponse.choices?.[0]?.message?.content || '{}';

        let parsed = { text: "Anotado. Sigamos.", intent: null };
        try {
            const match = content.match(/\{[\s\S]*?\}/);
            if (match) {
                parsed = JSON.parse(match[0]);
            }
        } catch (e) {
            console.error("Error parsing Groq JSON:", e, "Content was:", content);
        }

        return new Response(JSON.stringify(parsed), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Dermo AI Error:", error);
        return new Response(JSON.stringify({ error: "Ocurrió un error." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
