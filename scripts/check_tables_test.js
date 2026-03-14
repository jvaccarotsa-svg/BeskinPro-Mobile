
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lckwxhtdjrmzhffulwse.supabase.co';
const supabaseKey = 'sb_publishable_bTddBIeOGgz_HaqtBDfYzA_GZCeRRSQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('--- Testing pharmacy_products ---');
    const { data: products, error: prodError } = await supabase.from('pharmacy_products').select('name').limit(1);
    if (prodError) console.error('Products Error:', prodError.message);
    else console.log('Products result:', products);

    console.log('\n--- Testing patients ---');
    const { data: patients, error: patError } = await supabase.from('patients').select('first_name').limit(1);
    if (patError) console.error('Patients Error:', patError.message);
    else console.log('Patients result:', patients);
}

checkTables();
