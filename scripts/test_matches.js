
function matchesWord(text, words) {
    const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const baseWords = Array.isArray(words) ? words : [words];
    const normalizedWords = baseWords.map(w => w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

    return normalizedWords.some(word => {
        const regex = new RegExp(`(^|[\\s,.?!])${word}([\\s,.?!]|$)`, 'i');
        const res = regex.test(t);
        console.log(`Testing text: "${t}" against word: "${word}" | Result: ${res}`);
        return res;
    });
}

const siWords = ['mucho', 'bastante', 'siempre', 'si', 'sí', 'claro', 'totalmente'];
const noWords = ['no', 'nunca', 'nada', 'ningun', 'ninguno', 'ninguna'];

console.log("--- SI tests ---");
matchesWord("si", siWords);
matchesWord("SÍ", siWords);
matchesWord("sí.", siWords);
matchesWord("si, mucho", siWords);
matchesWord("claro que si", siWords);

console.log("\n--- NO tests ---");
matchesWord("no", noWords);
matchesWord("NO", noWords);
matchesWord("no, nunca", noWords);
