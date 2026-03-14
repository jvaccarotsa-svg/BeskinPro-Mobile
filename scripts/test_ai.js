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

const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
    console.log('Testing Gemini API...');
    try {
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hola, ¿qué es el método Baumann? Responde en una frase.");
        const response = await result.response;
        console.log('Response:', response.text());
    } catch (error) {
        console.error('Error:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

test();
