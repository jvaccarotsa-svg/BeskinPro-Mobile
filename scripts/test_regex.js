const text = "sí";
const regex = /\b(sí|si)\b/;
console.log(`Text: "${text}"`);
console.log(`Regex: ${regex}`);
console.log(`Match: ${regex.test(text.toLowerCase())}`);

const text2 = "si";
console.log(`Text: "${text2}"`);
console.log(`Match: ${regex.test(text2.toLowerCase())}`);

const text3 = "sí mucho";
console.log(`Text: "${text3}"`);
console.log(`Match: ${regex.test(text3.toLowerCase())}`);

const text4 = "perrosí"; // Should NOT match
console.log(`Text: "${text4}"`);
console.log(`Match: ${regex.test(text4.toLowerCase())}`);
