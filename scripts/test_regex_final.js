function matchesWord(text, words) {
    const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const baseWords = Array.isArray(words) ? words : [words];
    const normalizedWords = baseWords.map(w => w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

    return normalizedWords.some(word => {
        const regex = new RegExp(`(^|[\\s,.?!])${word}([\\s,.?!]|$)`, 'i');
        const match = regex.test(t);
        console.log(`  Testing "${word}" against normalized "${t}": ${match}`);
        return match;
    });
}

console.log('Testing "sí":');
matchesWord("sí", ["si", "sí"]);

console.log('Testing "No, qué es el retinol?":');
matchesWord("No, qué es el retinol?", ["no", "nunca"]);

console.log('Testing "perrosí" (should be false):');
matchesWord("perrosí", ["si", "sí"]);
