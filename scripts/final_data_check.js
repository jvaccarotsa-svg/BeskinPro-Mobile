
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lckwxhtdjrmzhffulwse.supabase.co';
const supabaseKey = 'sb_publishable_bTddBIeOGgz_HaqtBDfYzA_GZCeRRSQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStock() {
    console.log('Fetching products with ANON KEY...');
    const { data, error } = await supabase.from('pharmacy_products').select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data ? data.length : 0} products.`);
    if (data && data.length > 0) {
        console.log('First product:', data[0].name);
        console.log('Total categories found in data:', [...new Set(data.map(p => p.category))]);
    }
}

checkStock();
