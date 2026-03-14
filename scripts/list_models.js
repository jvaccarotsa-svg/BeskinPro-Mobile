const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        // The SDK might have a listModels method depending on version
        // But we can also try common names
        const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-2.0-flash-exp'];
        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("test");
                if (result.response) {
                    console.log(`✅ Model ${m} is working.`);
                    process.exit(0);
                }
            } catch (e) {
                console.log(`❌ Model ${m} failed: ${e.message}`);
            }
        }
    } catch (error) {
        console.error('Fatal Error:', error.message);
    }
}

listModels();
