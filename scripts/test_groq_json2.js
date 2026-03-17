// test_groq_json2.js
async function test() {
    const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: "Siento mucha tirantez casi siempre que me lavo la cara, sobre todo por las mañanas.",
            context: "Estamos en la pregunta: ¿Sientes tirantez o sequedad en la piel después de lavar la cara?"
        })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
}

test();
