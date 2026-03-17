const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lckwxhtdjrmzhffulwse.supabase.co';
const ANON_KEY = 'sb_publishable_bTddBIeOGgz_HaqtBDfYzA_GZCeRRSQ';
const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function checkSchema() {
    console.log("Testeando fetch de columns desde patients...");
    const { data: patientData, error: patientError } = await supabase.from('patients').select().limit(1);

    if (patientError) {
        console.error("Error:", patientError);
    } else {
        console.log("Columnas de patients:", Object.keys(patientData[0] || {}));
    }

    console.log("\nTesteando fetch de columns desde skin_analyses...");
    const { data: saData, error: saError } = await supabase.from('skin_analyses').select().limit(1);
    if (saError) {
        console.error("Error:", saError);
    } else {
        console.log("Columnas de skin_analyses:", Object.keys(saData[0] || {}));
    }
}

checkSchema();
