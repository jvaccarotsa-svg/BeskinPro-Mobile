const fs = require('fs');

// Manual env parsing
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
        }
        env[match[1].trim()] = value;
    }
});

async function testGroq() {
    console.log('Testing Groq API...');
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: 'Hola, ¿qué es el método Baumann? Responde en una frase.' }]
            })
        });
        const data = await response.json();
        if (data.choices && data.choices[0]) {
            console.log('✅ Groq logic working:', data.choices[0].message.content);
        } else {
            console.log('❌ Groq failed:', JSON.stringify(data));
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testGroq();
