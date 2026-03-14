export async function POST(req) {
    try {
        const { message, context } = await req.json();

        const systemPrompt = `Eres el asistente experto en dermo-cosmética de BeSkinPro.
Tu objetivo es ayudar al usuario con dudas sobre su piel, ingredientes (como retinol, vit C) o el método Baumann (los 16 tipos de piel).

INSTRUCCIONES:
1. Responde de forma BREVE (máximo 2 frases).
2. Usa un tono profesional y amable.
3. Estamos en una encuesta: ${context}.
4. Al final añade: "Sigamos con tu diagnóstico..."

Pregunta: ${message}`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                temperature: 0.5,
                max_tokens: 150
            })
        });

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "No he podido procesar tu duda, pero podemos seguir.";

        return new Response(JSON.stringify({ text }), {
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
