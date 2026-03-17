const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lckwxhtdjrmzhffulwse.supabase.co';
const ANON_KEY = 'sb_publishable_bTddBIeOGgz_HaqtBDfYzA_GZCeRRSQ';
const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function checkSexValidation() {
    console.log("Testeando insert con sex='Mujer'...");
    const { data: patientData, error: patientError } = await supabase.from('patients').insert([{
        first_name: "TestMujer",
        last_name: "Mobile",
        sex: "Mujer"
    }]).select();

    if (patientError) {
        console.error("Error paciente Mujer:", patientError);
    } else {
        console.log("Paciente Mujer guardado:", patientData);
        await supabase.from('patients').delete().eq('id', patientData[0].id);
    }
}

checkSexValidation();
